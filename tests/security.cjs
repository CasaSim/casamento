/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS test harness. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(source, {
    module: loaded, exports: loaded.exports, require: name => mocks[name] ?? require(name),
    Buffer, process, console, URL, Request, Response,
  }, { filename: file });
  return loaded.exports;
}
const security = load('src/lib/security.ts');
const request = (body, headers = {}) => new Request('https://casasim.test/api/test', {
  method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
});

test('rejects NoSQL operators, malformed email, weak/oversized passwords and invalid amounts', () => {
  for (const value of [undefined, null, { $ne: null }, ['a@b.com'], 'invalid']) {
    assert.throws(() => security.emailAddress(value));
  }
  assert.equal(security.emailAddress(' A@B.COM '), 'a@b.com');
  for (const value of ['short', 'a'.repeat(73), '💍'.repeat(20), { $gt: '' }]) {
    assert.throws(() => security.passwordValue(value));
  }
  for (const valor of [NaN, Infinity, -1, 0, '10', { $gt: 0 }]) {
    assert.throws(() => security.expenseValues({ categoria: 'Buffet', valor }));
  }
  assert.throws(() => security.expenseValues({ categoria: { $ne: null }, valor: 10 }));
  for (const data of ['2026-02-30', '2026-13-01', '01/11/2026', { $gt: '' }]) {
    assert.throws(() => security.expenseValues({ categoria: 'Buffet', valor: 10, data }));
  }
  assert.throws(() => security.expenseValues({ categoria: 'Buffet', valor: 10, descricao: { $ne: null } }));
  const values = security.expenseValues({ categoria: 'Buffet', valor: 10, descricao: ' Entrada ', data: '2026-11-01' });
  assert.equal(values.descricao, 'Entrada');
  assert.equal(values.data.toISOString(), '2026-11-01T00:00:00.000Z');
  assert.equal(security.expenseValues({ categoria: 'Buffet', valor: 10, data: '' }).data, null);
});

test('rejects cross-origin writes, malformed JSON and oversized bodies', async () => {
  await assert.rejects(security.jsonBody(request({}, { origin: 'https://attacker.test' })), { status: 403 });
  await assert.rejects(security.jsonBody(request({}, { 'sec-fetch-site': 'cross-site' })), { status: 403 });
  await assert.rejects(security.jsonBody(request({ data: 'x'.repeat(17000) })), { status: 413 });
  await assert.rejects(security.jsonBody(request([])), { status: 400 });
  const malformed = new Request('https://casasim.test/api', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
  await assert.rejects(security.jsonBody(malformed), { status: 400 });
  assert.equal((await security.jsonBody(request({ valid: true }))).valid, true);
});

test('password reset hashes and consumes token atomically, revokes sessions, rejects reuse', async () => {
  let captured;
  const route = load('src/app/api/auth/reset/route.ts', {
    '@/lib/security': { ...security, rateLimit: async () => {} },
    '@/models/User': { findOneAndUpdate: async (filter, update) => {
      if (captured) return null;
      captured = { filter, update };
      return { _id: 'user' };
    } },
  });
  const token = 'ab'.repeat(32);
  const password = 'a secure password';
  assert.equal((await route.POST(request({ token, password }))).status, 200);
  assert.notEqual(captured.filter.resetPasswordToken, token);
  assert.equal(captured.filter.resetPasswordToken, require('node:crypto').createHash('sha256').update(token).digest('hex'));
  assert.equal(await require('bcryptjs').compare(password, captured.update.$set.password), true);
  assert.equal(captured.update.$inc.sessionVersion, 1);
  assert.equal(captured.update.$unset.resetPasswordToken, 1);
  assert.equal((await route.POST(request({ token, password }))).status, 400);
  assert.equal((await route.POST(request({ token: { $ne: null }, password }))).status, 400);
});

test('expense object operations require session and bind all queries to owner', async () => {
  let session = null;
  const filters = [];
  const expense = { _id: 'a'.repeat(24) };
  const record = async filter => { filters.push(filter); return expense; };
  const route = load('src/app/api/expenses/[id]/route.ts', {
    '@/lib/security': { ...security, connectDB: async () => {} },
    '@/lib/auth': {},
    'next-auth': { getServerSession: async () => session },
    '@/models/Expense': { findOne: record, findOneAndUpdate: record, findOneAndDelete: record },
    '@/models/Dashboard': { updateOne: async () => {} },
  });
  const context = { params: Promise.resolve({ id: expense._id }) };
  assert.equal((await route.GET(request({}), context)).status, 401);
  assert.equal(filters.length, 0);
  session = { user: { id: 'owner' } };
  assert.equal((await route.GET(request({}), context)).status, 200);
  assert.equal((await route.PUT(request({ categoria: 'Buffet', valor: 10, user: 'victim' }), context)).status, 200);
  assert.equal((await route.DELETE(request({}), context)).status, 200);
  for (const filter of filters) {
    assert.equal(filter.user, 'owner');
    assert.equal(filter._id, expense._id);
  }
});
