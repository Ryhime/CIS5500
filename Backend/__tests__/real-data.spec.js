require('dotenv').config();
const request = require('supertest');
const { Pool } = require('pg');

const app = require('../index');
jest.setTimeout(60_000);

const REQUEST_TIMEOUT_MS = 25_000;
const RESPONSE_TIMEOUT_MS = 20_000;

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
    database: "postgres"
  };
}

describe('Real-data API integration', () => {
  let pool;
  let data;

  beforeAll(async () => {
    pool = new Pool(dbConfig());
    await pool.query('SELECT 1 AS ok');

    const [{ rows: overviewRows }, { rows: populationRows }, { rows: hotelRows }] =
      await Promise.all([
        pool.query(`
          SELECT p.city
          FROM population p
          JOIN city_crime_index ci ON LOWER(p.city) = LOWER(ci.city)
          WHERE p.city IS NOT NULL AND p.city <> ''
          LIMIT 1;
        `),
        pool.query(`
          SELECT city
          FROM population
          WHERE city IS NOT NULL AND city <> ''
          LIMIT 1;
        `),
        pool.query(`
          SELECT o.name AS hotel_name, o.city
          FROM offerings o
          JOIN reviews r ON r.offering_id = o.id
          WHERE o.name IS NOT NULL
            AND o.name <> ''
            AND o.city IS NOT NULL
            AND o.city <> ''
          LIMIT 1;
        `),
      ]);

    if (!overviewRows[0] || !populationRows[0] || !hotelRows[0]) {
      throw new Error('Could not find required datapoints in DB for real-data tests.');
    }

    data = {
      overviewCity: overviewRows[0].city,
      populationCity: populationRows[0].city,
      hotelName: hotelRows[0].hotel_name,
      hotelCity: hotelRows[0].city,
    };
  });

  afterAll(async () => {
    if (pool) await pool.end();
    const getPool = app?.locals?.getPool;
    if (typeof getPool === 'function') await getPool().end();
  });

  test('GET /cities includes a known city from offerings', async () => {
    const res = await apiGet('/cities');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const names = res.body.map((r) => String(r.city || '').toLowerCase());
    expect(names).toContain(String(data.hotelCity).toLowerCase());
  });

  test('GET /cities/:cityName returns joined city overview from real DB', async () => {
    const res = await apiGet(`/cities/${encodeURIComponent(data.overviewCity)}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const matched = res.body.some(
      (row) => String(row.city || '').toLowerCase() === String(data.overviewCity).toLowerCase()
    );
    expect(matched).toBe(true);
  });

  test('GET /cities/population returns population for a real city', async () => {
    const res = await apiGet('/cities/population', { city: data.populationCity });
    expect(res.status).toBe(200);
    expect(String(res.body.city || '').toLowerCase()).toBe(String(data.populationCity).toLowerCase());
    expect(res.body).toHaveProperty('population');
  });

  test('GET /cities/:cityName/hotels returns hotels for known city', async () => {
    const res = await apiGet(`/cities/${encodeURIComponent(data.hotelCity)}/hotels`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const hasMatchingCity = res.body.some(
      (row) => String(row.city || '').toLowerCase() === String(data.hotelCity).toLowerCase()
    );
    expect(hasMatchingCity).toBe(true);
  });

  test('GET /hotels/:hotelName/reviews returns reviews for known hotel', async () => {
    const res = await apiGet(`/hotels/${encodeURIComponent(data.hotelName)}/reviews`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const hasMatchingHotel = res.body.some(
      (row) => String(row.name || '').toLowerCase() === String(data.hotelName).toLowerCase()
    );
    expect(hasMatchingHotel).toBe(true);
  });

  test('GET /cities/safest returns rows', async () => {
    const res = await apiGet('/cities/safest', { limit: 5 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('city');
      expect(res.body[0]).toHaveProperty('safety_index');
    }
  });
});
