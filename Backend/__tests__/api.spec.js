require('dotenv').config();
const request = require('supertest');
const { Pool } = require('pg');

const app = require('../index');
jest.setTimeout(60_000);

const REQUEST_TIMEOUT_MS = 20_000;
const RESPONSE_TIMEOUT_MS = 15_000;

function apiGet(path, query) {
  const req = request(app)
    .get(path)
    .timeout({ response: RESPONSE_TIMEOUT_MS, deadline: REQUEST_TIMEOUT_MS });
  return query ? req.query(query) : req;
}

function dbConfig() {
  return {
    host: "database-1.cbam8vucodhx.us-east-1.rds.amazonaws.com",
    port: 5432,
    user: "postgres",
    password: "cis5550databaseworldtravel",
    ssl: { rejectUnauthorized: false },
    database: "postgres",
  };
}

describe('Backend API (integration)', () => {
  let checkPool;
  let data;

  beforeAll(async () => {
    checkPool = new Pool(dbConfig());
    await checkPool.query('SELECT 1 AS ok');

    const [{ rows: cityRows }, { rows: hotelRows }] = await Promise.all([
      checkPool.query(`
        SELECT p.city
        FROM population p
        JOIN city_crime_index ci ON LOWER(p.city) = LOWER(ci.city)
        WHERE p.city IS NOT NULL AND p.city <> ''
        LIMIT 1;
      `),
      checkPool.query(`
        SELECT o.name AS hotel_name, o.city
        FROM offerings o
        JOIN reviews r ON r.offering_id = o.id
        WHERE o.name IS NOT NULL AND o.name <> '' AND o.city IS NOT NULL
        LIMIT 1;
      `),
    ]);

    data = {
      city: cityRows[0]?.city ?? 'New York',
      hotelName: hotelRows[0]?.hotel_name ?? 'Test Hotel',
      hotelCity: hotelRows[0]?.city ?? 'New York',
    };
  });

  afterAll(async () => {
    if (checkPool) await checkPool.end();
    const getPool = app?.locals?.getPool;
    if (typeof getPool === 'function') await getPool().end();
  });

  // City routes
  test('GET /cities returns an array of city objects', async () => {
    const res = await apiGet('/cities');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('city');
  });

  test('GET /cities/safest returns rows with safety_index', async () => {
    const res = await apiGet('/cities/safest', { limit: 3 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('city');
      expect(res.body[0]).toHaveProperty('safety_index');
    }
  });

  test('GET /cities/most-dangerous returns rows with crime_index', async () => {
    const res = await apiGet('/cities/most-dangerous', { limit: 3 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('city');
      expect(res.body[0]).toHaveProperty('crime_index');
    }
  });

  test('GET /cities/population returns 400 when city param is missing', async () => {
    const res = await apiGet('/cities/population');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /cities/population returns population for a real city', async () => {
    const res = await apiGet('/cities/population', { city: data.city });
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('city');
      expect(res.body).toHaveProperty('population');
    }
  });

  test('GET /cities/search returns an array', async () => {
    const res = await apiGet('/cities/search', { limit: 5 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /cities/:cityName returns city overview for a real city', async () => {
    const res = await apiGet(`/cities/${encodeURIComponent(data.city)}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const matched = res.body.some(
      (r) => String(r.city || '').toLowerCase() === data.city.toLowerCase()
    );
    expect(matched).toBe(true);
  });

  test('GET /cities/:cityName/hotels returns hotels for a real city', async () => {
    const res = await apiGet(`/cities/${encodeURIComponent(data.hotelCity)}/hotels`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('name');
  });

  test('GET /cities/:cityName/hotels/standouts returns array', async () => {
    const res = await apiGet(
      `/cities/${encodeURIComponent(data.city)}/hotels/standouts`,
      { limit: 3, min_reviews: 20 }
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('hotel_name');
      expect(res.body[0]).toHaveProperty('margin_above_city');
    }
  });

  // Hotel routes
  test('GET /hotel/url returns 400 when name param is missing', async () => {
    const res = await apiGet('/hotel/url');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /hotel/url returns 404 for an unknown hotel name', async () => {
    const res = await apiGet('/hotel/url', { name: 'Definitely Not A Real Hotel 99999' });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /hotels/overhyped returns array with expected shape', async () => {
    const res = await apiGet('/hotels/overhyped');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[0]).toHaveProperty('city');
      expect(res.body[0]).toHaveProperty('review_count');
      expect(res.body[0]).toHaveProperty('avg_rating');
    }
  });

  test('GET /hotels/hidden-gems returns array', async () => {
    const res = await apiGet('/hotels/hidden-gems', { limit: 5 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('hotel_name');
      expect(res.body[0]).toHaveProperty('avg_overall');
    }
  });

  test('GET /hotels/top-overall returns array with safety and population', async () => {
    const res = await apiGet('/hotels/top-overall', { limit: 5 });
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

  test('GET /hotels/search returns array and X-Total-Count header', async () => {
    const res = await apiGet('/hotels/search', { limit: 5, city: data.hotelCity });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.headers).toHaveProperty('x-total-count');
  });

  test('GET /hotels/:hotelName/reviews returns reviews for a known hotel', async () => {
    const res = await apiGet(`/hotels/${encodeURIComponent(data.hotelName)}/reviews`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
