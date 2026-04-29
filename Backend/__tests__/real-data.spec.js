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
    host: process.env.PGHOST,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
    query_timeout: 10_000,
    statement_timeout: 10_000,
  };
}

describe('Real-data API integration', () => {
  let pool;
  let data;

  beforeAll(async () => {
    const required = ['PGHOST', 'PGUSER', 'PGPASSWORD', 'PGDATABASE'];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length) {
      throw new Error(`Missing required env vars: ${missing.join(', ')}`);
    }

    pool = new Pool(dbConfig());
    await pool.query('SELECT 1 AS ok');

    const [{ rows: overviewRows }, { rows: populationRows }, { rows: hotelRows }, { rows: countryRows }] =
      await Promise.all([
        pool.query(`
          SELECT p.city, p.country
          FROM population p
          JOIN city_crime_index ci
            ON LOWER(p.city) = LOWER(ci.city)
           AND LOWER(p.country) = LOWER(ci.country)
          WHERE p.city IS NOT NULL
            AND p.country IS NOT NULL
            AND p.city <> ''
            AND p.country <> ''
          LIMIT 1;
        `),
        pool.query(`
          SELECT city, country
          FROM population
          WHERE city IS NOT NULL
            AND country IS NOT NULL
            AND city <> ''
            AND country <> ''
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
        pool.query(`
          SELECT country
          FROM city_crime_index
          WHERE country IS NOT NULL
            AND country <> ''
          GROUP BY country
          ORDER BY COUNT(*) DESC
          LIMIT 1;
        `),
      ]);

    if (!overviewRows[0] || !populationRows[0] || !hotelRows[0] || !countryRows[0]) {
      throw new Error('Could not find required datapoints in DB for real-data tests.');
    }

    data = {
      overviewCity: overviewRows[0].city,
      overviewCountry: overviewRows[0].country,
      populationCity: populationRows[0].city,
      populationCountry: populationRows[0].country,
      hotelName: hotelRows[0].hotel_name,
      hotelCity: hotelRows[0].city,
      safestCountry: countryRows[0].country,
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
      (row) =>
        String(row.city || '').toLowerCase() === String(data.overviewCity).toLowerCase() &&
        String(row.country || '').toLowerCase() === String(data.overviewCountry).toLowerCase()
    );
    expect(matched).toBe(true);
  });

  test('GET /cities/population returns population for a real city/country', async () => {
    const res = await apiGet('/cities/population', {
      city: data.populationCity,
      country: data.populationCountry,
    });
    expect(res.status).toBe(200);
    expect(String(res.body.city || '').toLowerCase()).toBe(String(data.populationCity).toLowerCase());
    expect(String(res.body.country || '').toLowerCase()).toBe(String(data.populationCountry).toLowerCase());
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

  test('GET /cities/safest returns rows for real country from DB', async () => {
    const res = await apiGet('/cities/safest', { country: data.safestCountry, limit: 5 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const allCountryMatch = res.body.every(
      (row) => String(row.country || '').toLowerCase() === String(data.safestCountry).toLowerCase()
    );
    expect(allCountryMatch).toBe(true);
  });
});
