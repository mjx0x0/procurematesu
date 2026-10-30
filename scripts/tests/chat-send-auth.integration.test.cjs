'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const users = new Map([
  ['user-a', { id: 'user-a', aud: 'authenticated', role: 'authenticated', email: 'user-a@example.test', app_metadata: {}, user_metadata: {} }],
  ['user-b', { id: 'user-b', aud: 'authenticated', role: 'authenticated', email: 'user-b@example.test', app_metadata: {}, user_metadata: {} }],
  ['user-inactive', { id: 'user-inactive', aud: 'authenticated', role: 'authenticated', email: 'inactive@example.test', app_metadata: {}, user_metadata: {} }],
]);
const tokens = new Map([
  ['user-a-token', users.get('user-a')],
  ['user-b-token', users.get('user-b')],
  ['inactive-token', users.get('user-inactive')],
]);
const profiles = new Map([
  ['user-a', { id: 'user-a', is_active: true, role: 'user' }],
  ['user-b', { id: 'user-b', is_active: true, role: 'user' }],
  ['user-inactive', { id: 'user-inactive', is_active: false, role: 'user' }],
]);
const sessions = new Map([
  ['session-user-a', { id: 'session-user-a', user_id: 'user-a', is_active: true, state: {} }],
  ['session-user-b', { id: 'session-user-b', user_id: 'user-b', is_active: true, state: {} }],
  ['session-inactive', { id: 'session-inactive', user_id: 'user-inactive', is_active: true, state: {} }],
]);
const storedMessages = [];
const storedInquiries = [];
const purchaseRequests = [
  {
    pr_no: 'PR-2026-0002',
    user_id: 'user-b',
    purpose: 'Laboratory supplies',
    total: 1500,
    current_stage: 'draft',
    created_at: '2026-10-01T00:00:00.000Z',
    department: 'College of Education',
  },
];
let mockSupabase;
let nextProcess;
let appUrl;
let nextOutput = '';
let mockUrl;

function sendJSON(response, status, payload) {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

function eqValue(url, key) {
  const value = url.searchParams.get(key);
  return value && value.startsWith('eq.') ? value.slice(3) : null;
}

async function readJSON(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return null;
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function handleMockSupabase(request, response) {
  const url = new URL(request.url, mockUrl || 'http://127.0.0.1');
  if (url.pathname === '/auth/v1/user' && request.method === 'GET') {
    const authorization = request.headers.authorization || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    const user = tokens.get(token);
    return user ? sendJSON(response, 200, user) : sendJSON(response, 401, { message: 'Invalid test token', code: 'invalid_token' });
  }

  if (url.pathname === '/rest/v1/users' && request.method === 'GET') {
    const userId = eqValue(url, 'id');
    const profile = userId ? profiles.get(userId) : null;
    return sendJSON(response, 200, profile ? [profile] : []);
  }

  if (url.pathname === '/rest/v1/chat_sessions' && request.method === 'GET') {
    const id = eqValue(url, 'id');
    const userId = eqValue(url, 'user_id');
    const session = id ? sessions.get(id) : null;
    return sendJSON(response, 200, session && (!userId || session.user_id === userId) ? [session] : []);
  }

  if (url.pathname === '/rest/v1/purchase_requests' && request.method === 'GET') {
    const userId = eqValue(url, 'user_id');
    const prFilter = url.searchParams.get('pr_no');
    const requestedPrNo = prFilter && prFilter.startsWith('ilike.') ? prFilter.slice(6).toLowerCase() : null;
    const rows = purchaseRequests.filter((pr) =>
      (!userId || pr.user_id === userId) &&
      (!requestedPrNo || pr.pr_no.toLowerCase() === requestedPrNo)
    );
    return sendJSON(response, 200, rows);
  }

  if (url.pathname === '/rest/v1/pr_stages_completed' && request.method === 'GET') {
    return sendJSON(response, 200, []);
  }

  if (url.pathname === '/rest/v1/chat_sessions' && request.method === 'PATCH') {
    const id = eqValue(url, 'id');
    const userId = eqValue(url, 'user_id');
    const patch = await readJSON(request);
    const session = id ? sessions.get(id) : null;
    if (session && (!userId || session.user_id === userId) && patch && typeof patch === 'object') {
      Object.assign(session, patch);
    }
    response.statusCode = 204;
    return response.end();
  }

  if (url.pathname === '/rest/v1/chat_messages' && request.method === 'POST') {
    const body = await readJSON(request);
    storedMessages.push(...(Array.isArray(body) ? body : [body]));
    response.statusCode = 201;
    response.setHeader('content-type', 'application/json');
    return response.end('[]');
  }

  if (url.pathname === '/rest/v1/monitor_inquiries' && request.method === 'POST') {
    const body = await readJSON(request);
    storedInquiries.push(body);
    response.statusCode = 201;
    response.setHeader('content-type', 'application/json');
    return response.end('[]');
  }

  return sendJSON(response, 404, {
    message: 'The authenticated chatbot test hit an unexpected Supabase endpoint.',
    method: request.method,
    path: url.pathname,
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve(server.address().port);
    });
  });
}

function stopProcess(child) {
  if (!child || child.killed) return Promise.resolve();
  return new Promise((resolve) => {
    child.once('exit', resolve);
    child.kill('SIGTERM');
    const killTimer = setTimeout(() => {
      if (!child.killed) child.kill('SIGKILL');
    }, 5000);
    killTimer.unref();
  });
}

async function waitForNextReady(baseUrl, child) {
  const deadline = Date.now() + 150000;
  let lastError = '';
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error('Next.js test server exited before becoming ready.\n' + nextOutput);
    }
    try {
      const response = await fetch(baseUrl + '/api/chat/send', { method: 'GET' });
      if (response.status === 405 || response.status === 401) return;
      lastError = 'Unexpected readiness status: ' + response.status;
    } catch (error) {
      lastError = String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Timed out waiting for Next.js test server: ' + lastError + '\n' + nextOutput);
}

async function postChat(options) {
  const headers = { 'content-type': 'application/json' };
  if (options.token) headers.authorization = 'Bearer ' + options.token;
  const response = await fetch(appUrl + '/api/chat/send', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sessionId: options.sessionId || 'session-user-a',
      message: options.message || 'Help me draft a PR',
    }),
  });
  const payload = await response.json();
  return { status: response.status, payload };
}

test('authenticated chatbot API enforces identity, account status, session ownership, PR ownership, and persistence', { timeout: 180000 }, async (t) => {
  mockSupabase = http.createServer((request, response) => {
    Promise.resolve(handleMockSupabase(request, response)).catch((error) => {
      sendJSON(response, 500, { message: String(error) });
    });
  });
  const supabasePort = await listen(mockSupabase);
  mockUrl = 'http://127.0.0.1:' + supabasePort;

  const portProbe = http.createServer();
  const appPort = await listen(portProbe);
  await new Promise((resolve) => portProbe.close(resolve));
  appUrl = 'http://127.0.0.1:' + appPort;

  nextProcess = spawn(process.execPath, [
    path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next'),
    'dev',
    '-p',
    String(appPort),
    '-H',
    '127.0.0.1',
  ], {
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      NEXT_TELEMETRY_DISABLED: '1',
      NEXT_PUBLIC_SUPABASE_URL: mockUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  nextProcess.stdout.on('data', (chunk) => { nextOutput += chunk.toString(); });
  nextProcess.stderr.on('data', (chunk) => { nextOutput += chunk.toString(); });

  try {
    await waitForNextReady(appUrl, nextProcess);

    await t.test('unauthenticated chatbot requests are rejected', async () => {
      const result = await postChat({ sessionId: 'session-user-a' });
      assert.equal(result.status, 401);
      assert.match(result.payload.error, /unauthorized/i);
    });

    await t.test('an authenticated user cannot use another user’s chat session', async () => {
      const result = await postChat({ token: 'user-a-token', sessionId: 'session-user-b' });
      assert.equal(result.status, 404);
      assert.match(result.payload.error, /chat session not found/i);
      assert.deepEqual(sessions.get('session-user-b').state, {});
    });

    await t.test('inactive accounts are blocked even when their auth token is valid', async () => {
      const result = await postChat({ token: 'inactive-token', sessionId: 'session-inactive' });
      assert.equal(result.status, 403);
      assert.match(result.payload.error, /account is not authorized/i);
    });

    await t.test('users cannot track another user’s Purchase Request', async () => {
      const result = await postChat({
        token: 'user-a-token',
        sessionId: 'session-user-a',
        message: 'Track PR-2026-0002',
      });
      assert.equal(result.status, 403);
      assert.match(result.payload.error, /not associated with your account/i);
    });

    await t.test('an authenticated owner can track their own Purchase Request', async () => {
      const result = await postChat({
        token: 'user-b-token',
        sessionId: 'session-user-b',
        message: 'Track PR-2026-0002',
      });
      assert.equal(result.status, 200, JSON.stringify(result.payload));
      assert.match(result.payload.response, /Purchase Request Tracking: PR-2026-0002/i);
      assert.match(result.payload.response, /Draft — awaiting printed-form receipt/i);
    });

    await t.test('an authenticated active user can start a PR draft and persist the chat turn', async () => {
      const beforeMessages = storedMessages.length;
      const beforeInquiries = storedInquiries.length;
      const result = await postChat({
        token: 'user-a-token',
        sessionId: 'session-user-a',
        message: 'Help me draft a PR',
      });

      assert.equal(result.status, 200, JSON.stringify(result.payload));
      assert.match(result.payload.response, /purpose of this procurement/i);
      assert.equal(result.payload.state.drafting, true);
      assert.equal(result.payload.state.step, 'purpose');

      const savedSession = sessions.get('session-user-a');
      assert.equal(savedSession.state.drafting, true);
      assert.equal(savedSession.state.step, 'purpose');
      assert.equal(storedMessages.length - beforeMessages, 2);
      assert.deepEqual(storedMessages.slice(-2).map((message) => message.sender), ['user', 'ai']);
      assert.equal(storedInquiries.length - beforeInquiries, 1);
      assert.equal(storedInquiries.at(-1).user_id, 'user-a');
    });

    await t.test('a closed chat session cannot accept a new message', async () => {
      sessions.get('session-user-a').is_active = false;
      const result = await postChat({
        token: 'user-a-token',
        sessionId: 'session-user-a',
        message: 'I need laboratory supplies',
      });
      assert.equal(result.status, 409);
      assert.match(result.payload.error, /conversation is closed/i);
      sessions.get('session-user-a').is_active = true;
    });
  } finally {
    await stopProcess(nextProcess);
    if (mockSupabase) {
      mockSupabase.closeAllConnections?.();
      await new Promise((resolve) => mockSupabase.close(resolve));
    }
  }
});

test('the Edge Runtime session proxy handles refresh errors locally without process event listeners', () => {
  const source = require('node:fs').readFileSync(path.join(ROOT, 'lib', 'supabase', 'proxy.ts'), 'utf8');
  assert.doesNotMatch(source, /\bprocess\s*\.\s*on\s*\(/);
  assert.match(source, /const originalGetUser = supabase\.auth\.getUser\.bind\(supabase\.auth\)/);
  assert.match(source, /catch \(err: any\) \{\s*if \(isStaleRefreshTokenError\(err\)\)/);
});
