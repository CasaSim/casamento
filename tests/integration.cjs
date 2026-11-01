/* eslint-disable @typescript-eslint/no-require-imports -- Node integration harness. */
const assert = require('node:assert/strict');
const { MongoClient, ObjectId } = require('mongodb');
const { randomBytes, createHash } = require('node:crypto');
const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const suffix = randomBytes(8).toString('hex');
const emails = [`security-a-${suffix}@example.test`, `security-b-${suffix}@example.test`];
const password = `Test-password-${suffix}`;
const client = new MongoClient(process.env.MONGODB_URI);
async function call(path, method = 'GET', body, cookie, extra = {}) {
  return fetch(new URL(path, base), {
    method, headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...(cookie ? { cookie } : {}), ...extra },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function login(email) {
  const csrf = await call('/api/auth/csrf');
  const cookies = csrf.headers.getSetCookie().map(value => value.split(';')[0]);
  const { csrfToken } = await csrf.json();
  const response = await fetch(new URL('/api/auth/callback/credentials', base), {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookies.join('; ') },
    body: new URLSearchParams({ email, password, csrfToken, json: 'true', callbackUrl: base }),
  });
  return response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
}
async function main() {
  await client.connect();
  const db = client.db();
  try {
    for (const email of emails) {
      assert.equal((await call('/api/auth/signup', 'POST', { name: 'Security test', email, password })).status, 201);
    }
    const cookieA = await login(emails[0]);
    const cookieB = await login(emails[1]);
    assert.ok(cookieA.includes('session-token'));
    assert.ok(cookieB.includes('session-token'));
    assert.equal((await call('/api/expenses/list')).status, 401);
    const created = await call('/api/expenses/list', 'POST', { categoria: 'Test', valor: 42, descricao: 'Entrada do buffet', data: '2026-11-01' }, cookieA);
    assert.equal(created.status, 201);
    const expense = await created.json();
    assert.equal(expense.descricao, 'Entrada do buffet');
    assert.equal(expense.data, '2026-11-01T00:00:00.000Z');
    assert.equal((await call('/api/dashboards/share', 'POST', {})).status, 401);
    const shared = await call('/api/dashboards/share', 'POST', {}, cookieA);
    assert.equal(shared.status, 200);
    const { id: dashboardId } = await shared.json();
    const otherShared = await call('/api/dashboards/share', 'POST', { id: dashboardId }, cookieB);
    const { id: otherDashboardId } = await otherShared.json();
    assert.notEqual(otherDashboardId, dashboardId);
    const publicPath = `/api/dashboards/${dashboardId}`;
    const otherCreated = await call('/api/expenses/list', 'POST', { categoria: 'Other account', valor: 99 }, cookieB);
    const otherExpense = await otherCreated.json();
    // Foreign references must not leak another account's expenses into a shared view.
    await db.collection('dashboards').updateOne({ _id: new ObjectId(dashboardId) }, { $push: { expenses: new ObjectId(otherExpense._id) } });
    for (const cookie of [undefined, cookieA, cookieB]) {
      const response = await call(publicPath, 'GET', undefined, cookie);
      assert.equal(response.status, 200);
      assert.ok(response.headers.get('cache-control').includes('no-store'));
      const visible = await response.json();
      assert.equal(visible.length, 1);
      assert.equal(visible[0]._id, expense._id);
      assert.equal(visible[0].descricao, expense.descricao);
      assert.equal(visible[0].user, undefined);
      assert.equal(visible[0].__v, undefined);
    }
    const sharedPage = await call(`/Dashboard/${dashboardId}`);
    assert.equal(sharedPage.status, 200);
    assert.ok(sharedPage.headers.get('x-robots-tag').includes('noindex'));
    const html = await sharedPage.text();
    assert.ok(html.includes('Somente visualização'));
    assert.ok(html.includes('Exportar para Excel'));
    assert.ok(!html.includes('Cadastrar Gastos'));
    assert.ok(!html.includes('Compartilhar visualização'));
    for (const method of ['POST', 'PUT', 'DELETE']) {
      assert.equal((await call(publicPath, method, {})).status, 405);
    }
    assert.equal((await call('/api/dashboards/not-an-id')).status, 404);
    assert.equal((await call(`/api/dashboards/${new ObjectId()}`)).status, 404);
    const path = `/api/expenses/${expense._id}`;
    assert.equal((await call(path, 'PUT', { categoria: 'Attack', valor: 1 })).status, 401);
    assert.equal((await call(path, 'DELETE')).status, 401);
    assert.equal((await call(path, 'GET', undefined, cookieA)).status, 200);
    assert.equal((await call(path, 'GET', undefined, cookieB)).status, 404);
    assert.equal((await call(path, 'PUT', { categoria: 'Attack', valor: 1 }, cookieB)).status, 404);
    assert.equal((await call(path, 'DELETE', undefined, cookieB)).status, 404);
    assert.equal((await call(path, 'PUT', { categoria: { $ne: null }, valor: 1 }, cookieA)).status, 400);
    assert.equal((await call(path, 'DELETE', undefined, cookieA, { origin: 'https://attacker.test' })).status, 403);
    const edited = await call(path, 'PUT', { categoria: 'Test', valor: 42, descricao: 'Pagamento final', data: '2026-12-05' }, cookieA);
    assert.equal(edited.status, 200);
    const saved = await (await call(path, 'GET', undefined, cookieA)).json();
    assert.equal(saved.descricao, 'Pagamento final');
    assert.equal(saved.data, '2026-12-05T00:00:00.000Z');
    const listed = await (await call('/api/expenses/list', 'GET', undefined, cookieA)).json();
    assert.equal(listed.find(item => item._id === expense._id).data, saved.data);
    assert.equal((await call(path, 'PUT', { categoria: 'Test', valor: 42, data: '2026-02-30' }, cookieA)).status, 400);
    const cleared = await call(path, 'PUT', { categoria: 'Test', valor: 42, descricao: '', data: '' }, cookieA);
    const empty = await cleared.json();
    assert.equal(empty.data, null);
    assert.equal(empty.descricao, '');
    const token = randomBytes(32).toString('hex');
    await db.collection('users').updateOne({ email: emails[0] }, { $set: {
      resetPasswordToken: createHash('sha256').update(token).digest('hex'), resetPasswordExpires: new Date(Date.now() + 60000),
    } });
    assert.equal((await call('/api/auth/reset', 'POST', { token, password: `${password}-new` })).status, 200);
    assert.equal((await call('/api/auth/reset', 'POST', { token, password })).status, 400);
    assert.equal((await call('/api/expenses/list', 'GET', undefined, cookieA)).status, 401);
    const stored = await db.collection('users').findOne({ email: emails[0] });
    assert.equal(stored.sessionVersion, 1);
    assert.equal(stored.resetPasswordToken, undefined);
    assert.equal((await call(path, 'GET', undefined, cookieB)).status, 404);
    assert.ok(await db.collection('expenses').findOne({ _id: new ObjectId(expense._id) }));
    console.log('Integration passed: signup, login, owner isolation, injection, CSRF, reset, token reuse and session revocation.');
  } finally {
    const users = await db.collection('users').find({ email: { $in: emails } }).toArray();
    const ids = users.map(user => user._id);
    await db.collection('expenses').deleteMany({ user: { $in: ids } });
    await db.collection('dashboards').deleteMany({ user: { $in: ids } });
    await db.collection('users').deleteMany({ email: { $in: emails } });
    await client.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
