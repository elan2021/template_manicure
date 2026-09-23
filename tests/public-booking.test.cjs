const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const Module = require('node:module');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');

// Exercise the actual route with an isolated in-memory database, never lib/db.ts.
function loadTypescript(path, dependencies = {}) {
  const filename = resolve(__dirname, '..', path);
  const compiled = new Module(filename, module);
  compiled.filename = filename;
  compiled.paths = module.paths;
  compiled.require = (name) => name in dependencies ? dependencies[name] : require(name);
  compiled._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return compiled.exports;
}

const helpers = loadTypescript('lib/public-booking.ts');
const date = '2099-01-05';
const availability = { days: [0, 1, 2, 3, 4, 5, 6], start: '09:00', end: '19:00', breaks: [{ start: '12:00', end: '13:00' }] };

function fixture(t) {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE studios (id INTEGER PRIMARY KEY, slug TEXT, name TEXT, whatsapp TEXT, settings_json TEXT NOT NULL DEFAULT '{}');
    CREATE TABLE services (id INTEGER PRIMARY KEY, studio_id INTEGER REFERENCES studios(id), name TEXT, duration_minutes INTEGER, price_cents INTEGER, active INTEGER, image_url TEXT);
    CREATE TABLE professionals (id INTEGER PRIMARY KEY, studio_id INTEGER REFERENCES studios(id), name TEXT, status TEXT, availability_json TEXT);
    CREATE TABLE appointments (id INTEGER PRIMARY KEY, studio_id INTEGER REFERENCES studios(id), client_name TEXT, client_phone TEXT, starts_at TEXT, status TEXT, professional_id INTEGER REFERENCES professionals(id), service_id INTEGER REFERENCES services(id), deposit_cents INTEGER);
    CREATE TABLE public_testimonials (id INTEGER PRIMARY KEY, studio_id INTEGER REFERENCES studios(id), client_name TEXT, body TEXT, rating INTEGER, status TEXT, created_at TEXT);
    INSERT INTO studios (id, slug, name, whatsapp) VALUES (1, 'studio', 'Estúdio Real', '5511999999999'), (2, 'other-studio', 'Outro Estúdio', NULL);
    INSERT INTO services VALUES (1, 1, 'Serviço real', 60, 3000, 1, NULL), (2, 1, 'Serviço longo', 90, 4500, 1, NULL), (3, 1, 'Inativo', 60, 2000, 0, NULL), (20, 2, 'Outro estúdio', 60, 5000, 1, NULL);
  `);
  const professional = db.prepare('INSERT INTO professionals VALUES (?, ?, ?, ?, ?)');
  professional.run(1, 1, 'Profissional real', 'active', JSON.stringify(availability));
  professional.run(2, 1, 'Inativa', 'inactive', JSON.stringify(availability));
  professional.run(20, 2, 'Outro estúdio', 'active', JSON.stringify(availability));
  const route = loadTypescript('app/api/public/[slug]/booking/route.ts', {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/db': { db },
    '@/lib/public-booking': helpers,
  });
  const context = { params: Promise.resolve({ slug: 'studio' }) };
  const get = (query = '') => route.GET(new Request('http://localhost/api/public/studio/booking' + query), context);
  const post = (patch = {}) => route.POST(new Request('http://localhost/api/public/studio/booking', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceId: 1, professionalId: 1, name: 'Cliente Teste', phone: '(11) 99999-9999', date, time: '09:00', ...patch }),
  }), context);
  const addAppointment = (time, serviceId = 2, status = 'confirmed') => db.prepare(`
    INSERT INTO appointments (studio_id, client_name, starts_at, status, professional_id, service_id, deposit_cents) VALUES (1, 'Teste isolado', ?, ?, 1, ?, 0)
  `).run(helpers.bookingStartsAt(date, time), status, serviceId);
  return { db, route, get, post, addAppointment };
}

test('availability respects workdays, breaks, duration, start/end boundaries and elapsed times', () => {
  const input = { date, durationMinutes: 60, availabilityJson: JSON.stringify(availability), appointments: [], now: Date.parse(helpers.bookingStartsAt(date, '09:01')) };
  const result = helpers.availableBookingTimes(input);
  assert.equal(result[0], '09:30');
  assert.equal(result.at(-1), '18:00');
  assert(!result.includes('11:30'));
  assert(!result.includes('12:00'));
  assert(result.includes('11:00'));
  assert(result.includes('13:00'));
  assert.deepEqual(helpers.availableBookingTimes({ ...input, availabilityJson: JSON.stringify({ ...availability, days: [] }) }), []);
  assert.deepEqual(helpers.availableBookingTimes({ ...input, availabilityJson: '{invalid' }), []);
  assert.equal(helpers.isBookingDate('2099-02-30'), false);
});

test('GET exposes only real active services and professionals in the requested studio', async (t) => {
  const { get } = fixture(t);
  const response = await get();
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const initial = await response.json();
  assert.deepEqual(initial.studio, { name: 'Estúdio Real', whatsapp: '5511999999999', gallery: [], testimonials: [] });
  assert.deepEqual(initial.services.map((item) => item.id), [2, 1]);
  const professionals = await (await get('?serviceId=1')).json();
  assert.deepEqual(professionals.professionals, [{ id: 1, name: 'Profissional real' }]);
  assert.equal((await get('?serviceId=20')).status, 422);
  assert.equal((await get('?serviceId=1&professionalId=20&date=' + date + '&period=manha')).status, 422);
});

test('GET prevents partial overlaps using existing service duration and offers at most two slots', async (t) => {
  const { get, addAppointment } = fixture(t);
  addAppointment('09:00', 2);
  const result = await (await get('?serviceId=1&professionalId=1&date=' + date + '&period=manha')).json();
  assert.deepEqual(result, { slots: ['10:30', '11:00'], alternatives: [] });
});

test('GET ignores cancelled appointments and returns alternatives when the period is full', async (t) => {
  const { get, db, addAppointment } = fixture(t);
  addAppointment('09:00', 2, 'cancelled');
  assert.deepEqual((await (await get('?serviceId=1&professionalId=1&date=' + date + '&period=manha')).json()).slots, ['09:00', '09:30']);
  db.prepare('UPDATE professionals SET availability_json = ? WHERE id = 1').run(JSON.stringify({ ...availability, start: '13:00' }));
  const result = await (await get('?serviceId=1&professionalId=1&date=' + date + '&period=manha')).json();
  assert.deepEqual(result, { slots: [], alternatives: [{ date, time: '13:00', period: 'tarde' }, { date, time: '13:30', period: 'tarde' }] });
});

test('GET can suggest a later day when the selected day is closed', async (t) => {
  const { get, db } = fixture(t);
  const nextDate = helpers.addBookingDays(date, 1);
  const nextDay = new Date(nextDate + 'T12:00:00Z').getUTCDay();
  db.prepare('UPDATE professionals SET availability_json = ? WHERE id = 1').run(JSON.stringify({ ...availability, days: [nextDay] }));
  const result = await (await get('?serviceId=1&professionalId=1&date=' + date + '&period=manha')).json();
  assert.equal(result.slots.length, 0);
  assert.equal(result.alternatives[0].date, nextDate);
});

test('POST rejects cross-studio IDs, inactive entities, invalid input and out-of-schedule slots', async (t) => {
  const { post, db } = fixture(t);
  for (const patch of [{ serviceId: 20 }, { professionalId: 20 }, { serviceId: 3 }, { professionalId: 2 }, { date: '2099-02-30' }, { phone: '123' }, { name: '' }, { date: '2000-01-01' }]) {
    assert.equal((await post(patch)).status, 422, JSON.stringify(patch));
  }
  for (const time of ['08:00', '11:30', '18:30']) assert.equal((await post({ time })).status, 409);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM appointments').get().count, 0);
});

test('POST saves one isolated booking, normalizes phone, and rejects repeated or overlapping attempts', async (t) => {
  const { post, db } = fixture(t);
  const responses = await Promise.all([post(), post()]);
  assert.deepEqual(responses.map((response) => response.status), [201, 409]);
  assert.equal((await post({ time: '09:30' })).status, 409);
  assert.equal((await post({ time: '10:00' })).status, 201);
  const stored = db.prepare('SELECT client_phone, starts_at FROM appointments ORDER BY id LIMIT 1').get();
  assert.equal(stored.client_phone, '5511999999999');
  assert.equal(stored.starts_at, date + 'T09:00:00-03:00');
});

test('unknown studios and malformed JSON receive clear errors without creating bookings', async (t) => {
  const { route, db } = fixture(t);
  const unknown = { params: Promise.resolve({ slug: 'missing' }) };
  assert.equal((await route.GET(new Request('http://localhost/api/public/missing/booking'), unknown)).status, 404);
  const response = await route.POST(new Request('http://localhost/api/public/studio/booking', { method: 'POST', body: '{invalid' }), { params: Promise.resolve({ slug: 'studio' }) });
  assert.equal(response.status, 400);
  assert.equal(typeof (await response.json()).error, 'string');
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM appointments').get().count, 0);
});
