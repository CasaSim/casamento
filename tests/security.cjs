/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS test harness. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { registerHooks, createRequire } = require('node:module');
const path = require('node:path');

const buildRoot = path.resolve(__dirname, '../.test-build');
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const file = path.join(buildRoot, `${specifier.slice(2)}.js`);
      return nextResolve(file, context);
    }
    return nextResolve(specifier, context);
  },
});

function load(file, mocks = {}) {
  const compiled = path.join(buildRoot, file.replace(/^src\//, '').replace(/\.ts$/, '.js'));
  const localRequire = createRequire(compiled);
  const originals = new Map();
  try {
    for (const [name, exports] of Object.entries(mocks)) {
      const id = name.startsWith('@/')
        ? path.join(buildRoot, `${name.slice(2)}.js`)
        : localRequire.resolve(name);
      originals.set(id, require.cache[id]);
      require.cache[id] = { id, filename: id, loaded: true, exports };
    }
    return localRequire(compiled);
  } finally {
    for (const [id, original] of originals) {
      if (original) require.cache[id] = original;
      else delete require.cache[id];
    }
  }
}
const security = load('src/lib/security.ts');
const request = (body, headers = {}) => new Request('https://casasim.test/api/test', {
  method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
});

test('rejects NoSQL operators, malformed email, weak/oversized passwords and invalid amounts', () => {
  for (const value of [undefined, null, { $ne: null }, ['a@b.com'], 'invalid', '@b.com', 'a@@b.com', 'a@b', 'a@.com', 'a@b.', 'a b@c.com', 'a@b c.com']) {
    assert.throws(() => security.emailAddress(value));
  }
  assert.equal(security.emailAddress(' A@B.COM '), 'a@b.com');
  assert.equal(security.emailAddress('first.last+tag@sub.example.com'), 'first.last+tag@sub.example.com');
  for (const value of ['short', 'a'.repeat(73), '💍'.repeat(20), { $gt: '' }]) {
    assert.throws(() => security.passwordValue(value));
  }
  for (const valor of [Number.NaN, Infinity, -1, 0, '10', { $gt: 0 }]) {
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

test('limits streamed request bodies and cancels oversized input', async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(Buffer.from('{"value":"'));
      controller.enqueue(Buffer.alloc(17000, 'x'));
    },
    cancel() { cancelled = true; },
  });
  const req = new Request('https://casasim.test/api/test', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: stream, duplex: 'half',
  });
  await assert.rejects(security.jsonBody(req), { status: 413 });
  assert.equal(cancelled, true);

  const valid = new ReadableStream({
    start(controller) {
      controller.enqueue(Buffer.from('{"valid":'));
      controller.enqueue(Buffer.from('true}'));
      controller.close();
    },
  });
  const body = await security.jsonBody(new Request('https://casasim.test/api/test', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: valid, duplex: 'half',
  }));
  assert.equal(body.valid, true);
});

test('password reset requires a valid unexpired token, consumes it once and revokes sessions', async () => {
  const { createHash } = require('node:crypto');
  const bcrypt = require('bcryptjs');
  const token = 'ab'.repeat(32);
  const tokenHash = createHash('sha256').update(token).digest('hex');
  let stored = { tokenHash, expires: new Date(Date.now() + 60000) };
  let captured;
  const limits = [];
  const route = load('src/app/api/auth/reset/route.ts', {
    '@/lib/security': { ...security, rateLimit: async (...args) => limits.push(args) },
    '@/models/User': { findOneAndUpdate: async (filter, update) => {
      captured = { filter, update };
      if (!stored || filter.resetPasswordToken !== stored.tokenHash || stored.expires <= filter.resetPasswordExpires.$gt) return null;
      stored = null;
      return { _id: 'user' };
    } },
  });
  const password = 'a secure password';
  for (const body of [
    { email: 'a@example.test', password },
    { token: { $ne: null }, password },
    { token: 'invalid', password },
    { token, password: 'short' },
    { token, password: '💍'.repeat(20) },
    { token, password: { $gt: '' } },
  ]) assert.equal((await route.POST(request(body))).status, 400);
  assert.equal((await route.POST(request({ token, password }, { origin: 'https://attacker.test' }))).status, 403);
  assert.equal(captured, undefined);
  const response = await route.POST(request({ token, password }));
  assert.equal(response.status, 200);
  assert.equal(captured.filter.resetPasswordToken, tokenHash);
  assert.ok(captured.filter.resetPasswordExpires.$gt instanceof Date);
  assert.equal(await bcrypt.compare(password, captured.update.$set.password), true);
  assert.equal(bcrypt.getRounds(captured.update.$set.password), 12);
  assert.equal(captured.update.$inc.sessionVersion, 1);
  assert.deepEqual(captured.update.$unset, { resetPasswordToken: 1, resetPasswordExpires: 1 });
  assert.deepEqual(limits.slice(0, 2), [['reset-global', 'all', 100], ['reset', tokenHash, 5]]);
  assert.equal((await route.POST(request({ token, password }))).status, 400);
  stored = { tokenHash, expires: new Date(0) };
  assert.equal((await route.POST(request({ token, password }))).status, 400);
  stored = { tokenHash: 'other-token', expires: new Date(Date.now() + 60000) };
  assert.equal((await route.POST(request({ token, password }))).status, 400);
});

test('forgot sends only for existing accounts, stores hashed tokens and rolls back failed deliveries', async t => {
  const { createHash } = require('node:crypto');
  const updates = [];
  const deliveries = [];
  const limits = [];
  let deliveryFails = false;
  let limited = false;
  t.mock.method(console, 'error', () => {});
  const route = load('src/app/api/auth/forgot/route.ts', {
    '@/lib/security': { ...security, rateLimit: async (...args) => {
      limits.push(args);
      if (limited) throw new security.HttpError(429, 'Muitas tentativas.');
    } },
    '@/lib/password-recovery': {
      recoveryConfig: () => ({}),
      sendRecoveryEmail: async (email, token) => {
        deliveries.push({ email, token });
        if (deliveryFails) throw new Error('Delivery failed');
      },
    },
    '@/models/User': {
      findOne: async ({ email }) => email === 'a@example.test' ? { _id: 'user' } : null,
      updateOne: async (filter, update) => { updates.push({ filter, update }); },
    },
  });
  assert.equal((await route.POST(request({ email: { $ne: null } }))).status, 400);
  const response = await route.POST(request({ email: ' A@EXAMPLE.TEST ' }));
  assert.equal(response.status, 200);
  assert.deepEqual(limits, [['forgot-global', 'all', 100], ['forgot', 'a@example.test', 3]]);
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0].email, 'a@example.test');
  assert.match(deliveries[0].token, /^[a-f0-9]{64}$/);
  const firstHash = createHash('sha256').update(deliveries[0].token).digest('hex');
  assert.equal(updates[0].update.$set.resetPasswordToken, firstHash);
  const expires = updates[0].update.$set.resetPasswordExpires.getTime();
  assert.ok(expires > Date.now() + 3500000 && expires <= Date.now() + 3600000);
  assert.equal(updates[0].update.$set.password, undefined);
  const responseBody = await response.json();
  assert.equal(JSON.stringify(responseBody).includes(deliveries[0].token), false);
  const unknown = await route.POST(request({ email: 'unknown@example.test' }));
  assert.deepEqual(await unknown.json(), responseBody);
  assert.equal(deliveries.length, 1);
  assert.equal(updates.length, 1);
  deliveryFails = true;
  const failed = await route.POST(request({ email: 'a@example.test' }));
  assert.deepEqual(await failed.json(), responseBody);
  const failedHash = createHash('sha256').update(deliveries[1].token).digest('hex');
  assert.notEqual(failedHash, firstHash);
  assert.deepEqual(updates[2].filter, { _id: 'user', resetPasswordToken: failedHash });
  assert.deepEqual(updates[2].update.$unset, { resetPasswordToken: 1, resetPasswordExpires: 1 });
  limited = true;
  assert.equal((await route.POST(request({ email: 'a@example.test' }))).status, 429);
  assert.equal(deliveries.length, 2);
});

test('Resend delivery uses configured credentials and canonical URL and rejects provider errors', async t => {
  const keys = ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'NEXTAUTH_URL'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  t.after(() => {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });
  process.env.RESEND_API_KEY = 'test-key';
  process.env.RESEND_FROM_EMAIL = 'CasaSim <reset@example.test>';
  process.env.NEXTAUTH_URL = 'https://casasim.test';
  const recovery = load('src/lib/password-recovery.ts');
  let captured;
  let rejectDelivery = false;
  t.mock.method(console, 'error', () => {});
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    captured = { url, options };
    return new Response('{}', { status: rejectDelivery ? 422 : 200 });
  });
  const token = 'cd'.repeat(32);
  await recovery.sendRecoveryEmail('a@example.test', token);
  assert.equal(captured.url, 'https://api.resend.com/emails');
  assert.equal(captured.options.headers.Authorization, 'Bearer test-key');
  assert.ok(captured.options.signal instanceof AbortSignal);
  const body = JSON.parse(captured.options.body);
  assert.equal(body.from, 'CasaSim <reset@example.test>');
  assert.deepEqual(body.to, ['a@example.test']);
  assert.ok(body.text.includes('https://casasim.test/auth/reset-password?token=' + token));
  rejectDelivery = true;
  await assert.rejects(recovery.sendRecoveryEmail('a@example.test', token));
  delete process.env.RESEND_API_KEY;
  assert.throws(() => recovery.recoveryConfig());
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

test('login compares a generated dummy hash for unknown accounts and authenticates valid accounts', async () => {
  const bcrypt = require('bcryptjs');
  const comparisons = [];
  let account = null;
  const auth = load('src/lib/auth.ts', {
    '@/models/User': { findOne: async () => account },
    './security': { ...security, rateLimit: async () => {} },
    bcryptjs: {
      ...bcrypt,
      compare(password, hash) {
        comparisons.push(hash);
        return bcrypt.compare(password, hash);
      },
    },
  });
  const authorize = auth.authOptions.providers[0].options.authorize;
  const credentials = { email: 'a@example.test', password: 'valid test password' };
  assert.equal(await authorize(credentials), null);
  assert.equal(await authorize(credentials), null);
  assert.equal(comparisons.length, 2);
  assert.equal(comparisons[0], comparisons[1]);
  assert.equal(bcrypt.getRounds(comparisons[0]), 12);

  account = { _id: 'owner', email: credentials.email, name: 'Test', password: await bcrypt.hash(credentials.password, 12) };
  assert.deepEqual(await authorize(credentials), { id: 'owner', email: credentials.email, name: 'Test' });
  assert.equal(await authorize({ ...credentials, password: 'wrong password' }), null);
});
