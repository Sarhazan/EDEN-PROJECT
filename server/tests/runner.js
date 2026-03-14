/**
 * EDEN API Test Runner
 * Usage: node server/tests/runner.js [--url http://localhost:3002]
 *
 * Runs integration tests against a live server.
 * Each test: setup → HTTP action → DB assertion → cleanup.
 * No external test framework needed.
 */

const http  = require('http');
const https = require('https');
const path  = require('path');
const Database = require('better-sqlite3');

// ── Config ──────────────────────────────────────────────────────────────────
const BASE_URL = process.argv.includes('--url')
  ? process.argv[process.argv.indexOf('--url') + 1]
  : 'http://localhost:3002';

const DB_PATH  = path.join(__dirname, '../../maintenance.db');
const TEST_EMP = 1;   // דוד כהן
const TEST_SYS = 1;   // מיזוג אוויר
const FUTURE_DATE = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
})();
const FUTURE_DATE2 = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().split('T')[0];
})();

// ── Helpers ─────────────────────────────────────────────────────────────────
const db = new Database(DB_PATH);

function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const url  = new URL(urlPath, BASE_URL);
    const mod  = url.protocol === 'https:' ? https : http;
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search, method,
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) },
    };
    const req = mod.request(opts, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

let pass = 0, fail = 0, createdIds = [];

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    pass++;
  } else {
    console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`);
    fail++;
  }
}

async function cleanup(ids) {
  for (const id of ids) {
    try { await request('DELETE', `/api/tasks/${id}`); } catch {}
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

async function testCreateTask() {
  console.log('\n📋 TEST 1: Create task');
  const res = await request('POST', '/api/tasks', {
    title: '__test_create__',
    start_date: FUTURE_DATE,
    start_time: '09:00',
    frequency: 'one-time',
    is_recurring: false,
    employee_id: TEST_EMP,
    status: 'draft',
    estimated_duration_minutes: 30,
  });
  assert('HTTP 201', res.status === 201);
  const id = res.body?.id;
  assert('Returns id', !!id, `got: ${JSON.stringify(res.body)}`);
  if (id) {
    const row = db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
    assert('Saved in DB', !!row);
    assert('Correct title', row?.title === '__test_create__');
    assert('Correct start_date', row?.start_date === FUTURE_DATE);
    createdIds.push(id);
  }
}

async function testUpdateSingle() {
  console.log('\n✏️  TEST 2: Update single task');
  const create = await request('POST', '/api/tasks', {
    title: '__test_update_single__',
    start_date: FUTURE_DATE,
    start_time: '10:00',
    frequency: 'one-time',
    is_recurring: false,
    employee_id: TEST_EMP,
    status: 'draft',
    estimated_duration_minutes: 30,
  });
  const id = create.body?.id;
  if (!id) { assert('Setup create', false, 'no id'); return; }
  createdIds.push(id);

  const res = await request('PUT', `/api/tasks/${id}`, {
    title: '__test_update_single_UPDATED__',
    start_date: FUTURE_DATE,
    start_time: '11:00',
    frequency: 'one-time',
    is_recurring: false,
    status: 'draft',
    estimated_duration_minutes: 45,
  });
  assert('HTTP 200', res.status === 200);
  const row = db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
  assert('Title updated', row?.title === '__test_update_single_UPDATED__');
  assert('Time updated', row?.start_time === '11:00');
  assert('Duration updated', row?.estimated_duration_minutes === 45);
}

async function testUpdateScopeAll() {
  console.log('\n🔁 TEST 3: update_scope=all — update all future siblings');
  // Create 3 weekly siblings manually (simulating what server creates on recurring task)
  const d0 = new Date(); d0.setDate(d0.getDate() + 5);
  const d1 = new Date(); d1.setDate(d1.getDate() + 12);
  const d2 = new Date(); d2.setDate(d2.getDate() + 19);
  const fmt = d => d.toISOString().split('T')[0];

  const ids = [];
  for (const [dt, st] of [[fmt(d0), '08:00'], [fmt(d1), '08:00'], [fmt(d2), '08:00']]) {
    const r = await request('POST', '/api/tasks', {
      title: '__test_scope_all__',
      start_date: dt, start_time: st,
      frequency: 'weekly', is_recurring: true,
      employee_id: TEST_EMP, status: 'draft',
      estimated_duration_minutes: 30,
    });
    if (r.body?.id) { ids.push(r.body.id); createdIds.push(r.body.id); }
  }
  assert('Setup: 3 siblings created', ids.length === 3);
  if (ids.length < 3) return;

  // Update the first sibling with scope=all — should update all 3
  const res = await request('PUT', `/api/tasks/${ids[0]}`, {
    title: '__test_scope_all__',
    start_date: fmt(d0), start_time: '09:30',   // shift time by 1.5h
    frequency: 'weekly', is_recurring: true,
    employee_id: TEST_EMP, status: 'draft',
    estimated_duration_minutes: 30,
    update_scope: 'all',
  });
  assert('HTTP 200', res.status === 200);

  // All 3 should now have start_time = 09:30
  const rows = db.prepare(`SELECT id, start_time FROM tasks WHERE id IN (${ids.join(',')}) ORDER BY start_date`).all();
  const allUpdated = rows.every(r => r.start_time === '09:30');
  assert('All siblings time updated to 09:30', allUpdated, `got: ${JSON.stringify(rows.map(r=>r.start_time))}`);
}

async function testFrequencyChange() {
  console.log('\n🔄 TEST 4: Frequency change — weekly → monthly');
  const d0 = new Date(); d0.setDate(d0.getDate() + 3);
  const fmt = d => d.toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  // Insert 3 weekly siblings directly in DB (avoids server creating 12 instances per POST)
  const ins = db.prepare(`
    INSERT INTO tasks (title, start_date, start_time, frequency, is_recurring, employee_id, status, estimated_duration_minutes)
    VALUES ('__test_freq_change__', ?, '07:00', 'weekly', 1, ?, 'draft', 30)
  `);
  const ids = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(d0); d.setDate(d.getDate() + i * 7);
    const id = ins.run(fmt(d), TEST_EMP).lastInsertRowid;
    ids.push(id); createdIds.push(id);
  }
  assert('Setup: 3 weekly tasks inserted', ids.length === 3);
  // Change frequency to monthly with scope=all — use ids[0] as the trigger task
  const res = await request('PUT', `/api/tasks/${ids[0]}`, {
    title: '__test_freq_change__',
    start_date: fmt(d0), start_time: '07:00',
    frequency: 'monthly', is_recurring: true,
    employee_id: TEST_EMP, status: 'draft',
    estimated_duration_minutes: 30,
    update_scope: 'all',
  });
  assert('HTTP 200', res.status === 200, `got ${res.status}: ${JSON.stringify(res.body)}`);

  // All 3 old weekly tasks should be gone
  const oldRows = db.prepare(`SELECT id FROM tasks WHERE id IN (${ids.join(',')})`).all();
  assert('Old weekly tasks deleted', oldRows.length === 0, `remaining: ${JSON.stringify(oldRows.map(r=>r.id))}`);

  // New monthly tasks should exist
  const newRows = db.prepare(
    "SELECT id FROM tasks WHERE employee_id=? AND start_time='07:00' AND frequency='monthly' AND title='__test_freq_change__' AND start_date >= ?"
  ).all(TEST_EMP, today);
  assert('New monthly tasks created', newRows.length > 0, `found: ${newRows.length}`);
  newRows.forEach(r => createdIds.push(r.id));
}

async function testPastTaskProtection() {
  console.log('\n🛡️  TEST 5: Past task protection — scope=all must not touch past tasks');
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const nextWeek  = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
  const fmt = d => d.toISOString().split('T')[0];

  // Past task: insert directly in DB (API blocks past-date recurring tasks — by design)
  const pastInsert = db.prepare(`
    INSERT INTO tasks (title, start_date, start_time, frequency, is_recurring, employee_id, status, estimated_duration_minutes)
    VALUES ('__test_past_protect__', ?, '06:00', 'weekly', 1, ?, 'draft', 30)
  `);
  const pastId = pastInsert.run(fmt(yesterday), TEST_EMP).lastInsertRowid;

  // Future task: via API
  const futureR = await request('POST', '/api/tasks', {
    title: '__test_past_protect__',
    start_date: fmt(nextWeek), start_time: '06:00',
    frequency: 'weekly', is_recurring: true,
    employee_id: TEST_EMP, status: 'draft',
    estimated_duration_minutes: 30,
  });

  const futureId = futureR.body?.id;
  if (!pastId || !futureId) { assert('Setup', false, `pastId=${pastId} futureId=${futureId}`); return; }
  createdIds.push(pastId, futureId);

  // Try scope=all update — should update future, NOT past
  await request('PUT', `/api/tasks/${futureId}`, {
    title: '__test_past_protect__',
    start_date: fmt(nextWeek), start_time: '07:30',
    frequency: 'weekly', is_recurring: true,
    employee_id: TEST_EMP, status: 'draft',
    estimated_duration_minutes: 30,
    update_scope: 'all',
  });

  const pastRow   = db.prepare('SELECT start_time FROM tasks WHERE id=?').get(pastId);
  const futureRow = db.prepare('SELECT start_time FROM tasks WHERE id=?').get(futureId);
  assert('Past task NOT touched (still 06:00)',   pastRow?.start_time   === '06:00', `got: ${pastRow?.start_time}`);
  assert('Future task updated to 07:30',          futureRow?.start_time === '07:30', `got: ${futureRow?.start_time}`);
}

async function testDeleteTask() {
  console.log('\n🗑️  TEST 6: Delete task');
  const res = await request('POST', '/api/tasks', {
    title: '__test_delete__',
    start_date: FUTURE_DATE2,
    start_time: '15:00',
    frequency: 'one-time', is_recurring: false,
    employee_id: TEST_EMP, status: 'draft',
    estimated_duration_minutes: 30,
  });
  const id = res.body?.id;
  assert('Created', !!id);
  if (!id) return;

  const del = await request('DELETE', `/api/tasks/${id}`);
  assert('DELETE 200', del.status === 200);
  const row = db.prepare('SELECT id FROM tasks WHERE id=?').get(id);
  assert('Removed from DB', !row);
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n🧪 EDEN API Tests — ${BASE_URL}`);
  console.log('━'.repeat(50));

  // Health check
  try {
    const health = await request('GET', '/api/tasks?limit=1');
    if (health.status >= 500) throw new Error(`Server returned ${health.status}`);
  } catch (e) {
    console.error(`\n❌ Cannot reach server at ${BASE_URL}: ${e.message}`);
    process.exit(1);
  }

  await testCreateTask();
  await testUpdateSingle();
  await testUpdateScopeAll();
  await testFrequencyChange();
  await testPastTaskProtection();
  await testDeleteTask();

  // Cleanup leftover test data
  await cleanup(createdIds);

  console.log('\n' + '━'.repeat(50));
  console.log(`Results: ✅ ${pass} passed  ❌ ${fail} failed`);
  if (fail > 0) { console.log('\n⚠️  Some tests failed — check server logs'); process.exit(1); }
  else          { console.log('\n🎉 All tests passed!'); }
})();
