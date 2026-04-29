require('dotenv').config();
const request = require('supertest');
const { Pool } = require('pg');

function hasDbEnv() {
  const required = ['PGHOST', 'PGUSER', 'PGPASSWORD', 'PGDATABASE'];
  return required.every((k) => Boolean(process.env[k]));
}

const describeIf = hasDbEnv() ? describe : describe.skip;
const REQUEST_TIMEOUT_MS = 20_000;
const RESPONSE_TIMEOUT_MS = 15_000;

const TEST_COUNTRY = process.env.TEST_COUNTRY || 'United States';
const TEST_CITY = process.env.TEST_CITY || 'New York';
const TEST_LIMIT = Number(process.env.TEST_LIMIT || 3);

function apiGet(app, path, query) {
  const req = request(app)
    .get(path)
    .timeout({ response: RESPONSE_TIMEOUT_MS, deadline: REQUEST_TIMEOUT_MS });
  return query ? req.query(query) : req;
}

describeIf('Backend API (integration)', () => {
  // Import after env check so we can skip cleanly.
  // The app lazily creates the DB pool on first query.
  // eslint-disable-next-line global-require
  const app = require('../index');
  let checkPool;

  jest.setTimeout(60_000);

  beforeAll(async () => {
    checkPool = new Pool({
      host: process.env.PGHOST,
      port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 10_000,
      query_timeout: 10_000,
      statement_timeout: 10_000,
    });

    await checkPool.query('SELECT 1 AS ok');
  });

  afterAll(async () => {
    if (checkPool) {
      await checkPool.end();
    }

    const getPool = app?.locals?.getPool;
    if (typeof getPool === 'function') {
      await getPool().end();
    }
  });

  test('GET /cities returns an array', async () => {
    const res = await apiGet(app, '/cities');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /cities/safest validates required country', async () => {
    const res = await apiGet(app, '/cities/safest');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /cities/safest returns rows for configured country', async () => {
    const res = await apiGet(app, '/cities/safest', { country: TEST_COUNTRY, limit: TEST_LIMIT });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('city');
      expect(res.body[0]).toHaveProperty('country');
      expect(res.body[0]).toHaveProperty('safety_index');
    }
  });

  test('GET /cities/most-dangerous returns array', async () => {
    const res = await apiGet(app, '/cities/most-dangerous', { limit: TEST_LIMIT });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('city');
      expect(res.body[0]).toHaveProperty('country');
      expect(res.body[0]).toHaveProperty('crime_index');
    }
  });

  test('GET /cities/population validates required params', async () => {
    const res = await apiGet(app, '/cities/population', { city: TEST_CITY });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /cities/population returns a single object for configured city/country', async () => {
    const res = await apiGet(app, '/cities/population', { city: TEST_CITY, country: TEST_COUNTRY });
    // Some datasets might not include this exact pairing; allow 404.
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('city');
      expect(res.body).toHaveProperty('country');
      expect(res.body).toHaveProperty('population');
    }
  });

  test('GET /hotels/top-rated validates required city', async () => {
    const res = await apiGet(app, '/hotels/top-rated');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /hotels/top-rated returns array for configured city', async () => {
    const res = await apiGet(app, '/hotels/top-rated', { city: TEST_CITY });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[0]).toHaveProperty('rating');
    }
  });

  test('GET /cities/:cityName/hotels/average_ratings returns per-hotel average ratings', async () => {
    const res = await apiGet(
      app,
      `/cities/${encodeURIComponent(TEST_CITY)}/hotels/average_ratings`
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[0]).toHaveProperty('url');
      expect(res.body[0]).toHaveProperty('average_rating');
    }
  });

  test('GET /hotel/url validates required name', async () => {
    const res = await apiGet(app, '/hotel/url');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /hotel/url returns 404 for unknown hotel', async () => {
    const res = await apiGet(app, '/hotel/url', { name: 'Definitely Not A Real Hotel 1234' });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /hotels/overhyped returns array', async () => {
    const res = await apiGet(app, '/hotels/overhyped');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[0]).toHaveProperty('city');
      expect(res.body[0]).toHaveProperty('review_count');
      expect(res.body[0]).toHaveProperty('avg_rating');
    }
  });

  test('GET /hotels/top-safe-rated returns array', async () => {
    const res = await apiGet(app, '/hotels/top-safe-rated', { limit: Math.max(TEST_LIMIT, 5) });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('hotel_name');
      expect(res.body[0]).toHaveProperty('city');
      expect(res.body[0]).toHaveProperty('average_rating');
      expect(res.body[0]).toHaveProperty('safety_index');
    }
  });

  test('GET /hotels/room-ratings returns array', async () => {
    const res = await apiGet(app, '/hotels/room-ratings');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /hotels/filtered returns array', async () => {
    const res = await apiGet(app, '/hotels/filtered');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /hotels/top-overall returns array', async () => {
    const res = await apiGet(app, '/hotels/top-overall', { limit: Math.max(TEST_LIMIT, 5) });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('hotel_name');
      expect(res.body[0]).toHaveProperty('city');
      expect(res.body[0]).toHaveProperty('average_rating');
      expect(res.body[0]).toHaveProperty('safety_index');
      expect(res.body[0]).toHaveProperty('city_population');
    }
  });
});

