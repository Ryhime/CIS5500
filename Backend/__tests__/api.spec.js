const request = require('supertest');

function hasDbEnv() {
  const required = ['PGHOST', 'PGUSER', 'PGPASSWORD', 'PGDATABASE'];
  return required.every((k) => Boolean(process.env[k]));
}

const describeIf = hasDbEnv() ? describe : describe.skip;

describeIf('Backend API (integration)', () => {
  // Import after env check so we can skip cleanly.
  // The app lazily creates the DB pool on first query.
  // eslint-disable-next-line global-require
  const app = require('../index');

  jest.setTimeout(30_000);

  afterAll(async () => {
    const getPool = app?.locals?.getPool;
    if (typeof getPool === 'function') {
      await getPool().end();
    }
  });

  test('GET /cities returns an array', async () => {
    const res = await request(app).get('/cities');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /cities/safest validates required country', async () => {
    const res = await request(app).get('/cities/safest');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /cities/safest returns rows for United States', async () => {
    const res = await request(app).get('/cities/safest').query({ country: 'United States', limit: 3 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('city');
      expect(res.body[0]).toHaveProperty('country');
      expect(res.body[0]).toHaveProperty('safety_index');
    }
  });

  test('GET /cities/most-dangerous returns array', async () => {
    const res = await request(app).get('/cities/most-dangerous').query({ limit: 3 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('city');
      expect(res.body[0]).toHaveProperty('country');
      expect(res.body[0]).toHaveProperty('crime_index');
    }
  });

  test('GET /cities/population validates required params', async () => {
    const res = await request(app).get('/cities/population').query({ city: 'New York' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /cities/population returns a single object (New York, United States)', async () => {
    const res = await request(app)
      .get('/cities/population')
      .query({ city: 'New York', country: 'United States' });
    // Some datasets might not include this exact pairing; allow 404.
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('city');
      expect(res.body).toHaveProperty('country');
      expect(res.body).toHaveProperty('population');
    }
  });

  test('GET /hotels/top-rated validates required city', async () => {
    const res = await request(app).get('/hotels/top-rated');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /hotels/top-rated returns array for New York', async () => {
    const res = await request(app).get('/hotels/top-rated').query({ city: 'New York' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[0]).toHaveProperty('rating');
    }
  });

  test('GET /hotel/url validates required name', async () => {
    const res = await request(app).get('/hotel/url');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /hotel/url returns 404 for unknown hotel', async () => {
    const res = await request(app).get('/hotel/url').query({ name: 'Definitely Not A Real Hotel 1234' });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /hotels/overhyped returns array', async () => {
    const res = await request(app).get('/hotels/overhyped');
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
    const res = await request(app).get('/hotels/top-safe-rated').query({ limit: 5 });
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
    const res = await request(app).get('/hotels/room-ratings');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /hotels/filtered returns array', async () => {
    const res = await request(app).get('/hotels/filtered');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /hotels/top-overall returns array', async () => {
    const res = await request(app).get('/hotels/top-overall').query({ limit: 5 });
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

