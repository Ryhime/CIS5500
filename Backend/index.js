require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parsePositiveInt(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

let pool;
function getPool() {
  if (pool) return pool;
  pool = new Pool({
    host: requireEnv('PGHOST'),
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    user: requireEnv('PGUSER'),
    password: requireEnv('PGPASSWORD'),
    database: requireEnv('PGDATABASE'),
    ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
  });
  return pool;
}

app.locals.getPool = getPool;

app.get('/cities', async (req, res) => {
  try {
    const result = await getPool().query(`
      SELECT DISTINCT city
      FROM offerings
      ORDER BY city;
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route 1: Get Safest Cities
// GET /cities/safest?country=...&limit=...
app.get('/cities/safest', async (req, res) => {
  try {
    const country = req.query.country;
    if (!country) return res.status(400).json({ error: 'Missing required query param: country' });

    const limit = Math.min(parsePositiveInt(req.query.limit, 10), 100);
    const result = await getPool().query(
      `
        SELECT city, country, safety_index
        FROM city_crime_index
        WHERE LOWER(country) = LOWER($1)
        ORDER BY safety_index DESC NULLS LAST
        LIMIT $2;
      `,
      [String(country), limit]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route 5: Get City Population
// GET /cities/population?city=...&country=...
app.get('/cities/population', async (req, res) => {
  try {
    const city = req.query.city;
    const country = req.query.country;
    if (!city) return res.status(400).json({ error: 'Missing required query param: city' });
    if (!country) return res.status(400).json({ error: 'Missing required query param: country' });

    const result = await getPool().query(
      `
        SELECT city, country, SUM(population) AS population
        FROM population
        WHERE LOWER(city) = LOWER($1) AND LOWER(country) = LOWER($2)
        GROUP BY city, country;
      `,
      [String(city), String(country)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'City not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route 6: Get Most Dangerous Cities
// GET /cities/most-dangerous?limit=...
app.get('/cities/most-dangerous', async (req, res) => {
  try {
    const limit = Math.min(parsePositiveInt(req.query.limit, 10), 100);
    const result = await getPool().query(
      `
        SELECT city, country, crime_index
        FROM city_crime_index
        ORDER BY crime_index DESC NULLS LAST
        LIMIT $1;
      `,
      [limit]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/cities/:cityName', async (req, res) => {
  try {
    const cityName = decodeURIComponent(req.params.cityName);
    const result = await getPool().query(
      `
        SELECT
          p.city,
          p.country,
          SUM(p.population) AS population,
          p.latitude,
          p.longitude,
          ci.safety_index,
          ci.crime_index
        FROM population p
        JOIN city_crime_index ci ON LOWER(p.city) = LOWER(ci.city)
        WHERE LOWER(p.city) = LOWER($1)
        GROUP BY
          p.city,
          p.country,
          p.latitude,
          p.longitude,
          ci.safety_index,
          ci.crime_index;
      `,
      [cityName]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/cities/:cityName/hotels', async (req, res) => {
  try {
    const cityName = decodeURIComponent(req.params.cityName);
    const result = await getPool().query(
      `
        SELECT
          name,
          city,
          state,
          hotel_class,
          url
        FROM offerings
        WHERE LOWER(city) = LOWER($1)
      `,
      [cityName]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/cities/:cityName/hotels/average_ratings', async (req, res) => {
  try {
    const cityName = decodeURIComponent(req.params.cityName);
    const result = await getPool().query(
      `
        SELECT
          o.name,
          o.url,
          AVG(NULLIF(BTRIM(r.overall_rating::text), '')::float) AS average_rating
        FROM offerings o
        JOIN reviews r ON r.offering_id = o.id
        WHERE LOWER(o.city) = LOWER($1)
        GROUP BY o.id, o.name, o.url
        ORDER BY average_rating DESC NULLS LAST, o.name
      `,
      [cityName]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route 2: Get Top Rated Hotels in a City
// GET /hotels/top-rated?city=...
app.get('/hotels/top-rated', async (req, res) => {
  try {
    const city = req.query.city;
    if (!city) return res.status(400).json({ error: 'Missing required query param: city' });

    const result = await getPool().query(
      `
        SELECT
          o.name AS name,
          AVG(NULLIF(BTRIM(r.overall_rating::text), '')::float) AS rating
        FROM offerings o
        JOIN reviews r ON r.offering_id = o.id
        WHERE LOWER(o.city) = LOWER($1)
        GROUP BY o.name
        HAVING AVG(NULLIF(BTRIM(r.overall_rating::text), '')::float) >= 4.0
        ORDER BY rating DESC NULLS LAST;
      `,
      [String(city)]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route 3: Get Hotel URL
// GET /hotel/url?name=...
app.get('/hotel/url', async (req, res) => {
  try {
    const name = req.query.name;
    if (!name) return res.status(400).json({ error: 'Missing required query param: name' });

    const result = await getPool().query(
      `
        SELECT url
        FROM offerings
        WHERE LOWER(name) = LOWER($1)
        ORDER BY id
        LIMIT 1;
      `,
      [String(name)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hotel not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route 4: Get Overhyped Hotels
// GET /hotels/overhyped
app.get('/hotels/overhyped', async (req, res) => {
  try {
    const result = await getPool().query(`
      SELECT
        o.name AS name,
        o.city AS city,
        COUNT(*)::int AS review_count,
        AVG(NULLIF(BTRIM(r.overall_rating::text), '')::float) AS avg_rating
      FROM offerings o
      JOIN reviews r ON r.offering_id = o.id
      GROUP BY o.id, o.name, o.city
      HAVING COUNT(*) >= 50 AND AVG(NULLIF(BTRIM(r.overall_rating::text), '')::float) < 3.0
      ORDER BY review_count DESC, avg_rating ASC
      LIMIT 100;
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route 7: Get Top Hotels by Rating and Safety
// GET /hotels/top-safe-rated?limit=...
app.get('/hotels/top-safe-rated', async (req, res) => {
  try {
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 100);
    const result = await getPool().query(
      `
        WITH city_country AS (
          SELECT LOWER(city) AS city_key, LOWER(country) AS country_key, city, country
          FROM population
          GROUP BY LOWER(city), LOWER(country), city, country
        ),
        hotel_ratings AS (
          SELECT
            r.offering_id,
            AVG(NULLIF(BTRIM(r.overall_rating::text), '')::float) AS average_rating
          FROM reviews r
          GROUP BY r.offering_id
        )
        SELECT
          o.name AS hotel_name,
          o.city,
          o.state,
          o.hotel_class,
          hr.average_rating AS average_rating,
          ci.safety_index
        FROM offerings o
        JOIN hotel_ratings hr ON hr.offering_id = o.id
        JOIN city_country cc ON LOWER(o.city) = cc.city_key
        JOIN city_crime_index ci
          ON LOWER(ci.city) = cc.city_key
         AND LOWER(ci.country) = cc.country_key
        ORDER BY hr.average_rating DESC NULLS LAST, ci.safety_index DESC NULLS LAST
        LIMIT $1;
      `,
      [limit]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route 8: Get Hotels by Room Rating
// GET /hotels/room-ratings
app.get('/hotels/room-ratings', async (req, res) => {
  try {
    const result = await getPool().query(`
      SELECT
        o.name AS name,
        o.city AS city,
        AVG(NULLIF(BTRIM(r.rooms_rating::text), '')::float) AS rooms_rating
      FROM offerings o
      JOIN reviews r ON r.offering_id = o.id
      GROUP BY o.id, o.name, o.city
      HAVING AVG(NULLIF(BTRIM(r.rooms_rating::text), '')::float) > 3.0
      ORDER BY rooms_rating DESC NULLS LAST
      LIMIT 200;
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route 9: Get Hotels by Rating, Safety, and Population
// GET /hotels/filtered
app.get('/hotels/filtered', async (req, res) => {
  try {
    const result = await getPool().query(`
      WITH city_stats AS (
        SELECT
          LOWER(city) AS city_key,
          LOWER(country) AS country_key,
          SUM(population)::bigint AS city_population
        FROM population
        GROUP BY LOWER(city), LOWER(country)
      ),
      hotel_room_ratings AS (
        SELECT
          offering_id,
          AVG(NULLIF(BTRIM(rooms_rating::text), '')::float) AS average_rooms_rating
        FROM reviews
        GROUP BY offering_id
      )
      SELECT
        o.name AS hotel_name,
        o.city,
        o.hotel_class,
        hrr.average_rooms_rating,
        ci.safety_index,
        cs.city_population
      FROM offerings o
      JOIN hotel_room_ratings hrr ON hrr.offering_id = o.id
      JOIN city_stats cs ON LOWER(o.city) = cs.city_key
      JOIN city_crime_index ci
        ON LOWER(ci.city) = cs.city_key
       AND LOWER(ci.country) = cs.country_key
      WHERE cs.city_population >= 100000 AND ci.safety_index > 50
      ORDER BY hrr.average_rooms_rating DESC NULLS LAST, ci.safety_index DESC NULLS LAST, cs.city_population DESC
      LIMIT 200;
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route 10: Get Top Hotels with City Info
// GET /hotels/top-overall?limit=...
app.get('/hotels/top-overall', async (req, res) => {
  try {
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 100);
    const result = await getPool().query(
      `
        WITH city_stats AS (
          SELECT
            LOWER(city) AS city_key,
            LOWER(country) AS country_key,
            SUM(population)::bigint AS city_population
          FROM population
          GROUP BY LOWER(city), LOWER(country)
        ),
        hotel_ratings AS (
          SELECT
            offering_id,
            AVG(NULLIF(BTRIM(overall_rating::text), '')::float) AS average_rating
          FROM reviews
          GROUP BY offering_id
        )
        SELECT
          o.name AS hotel_name,
          o.city,
          o.hotel_class,
          hr.average_rating AS average_rating,
          ci.safety_index,
          cs.city_population
        FROM offerings o
        JOIN hotel_ratings hr ON hr.offering_id = o.id
        JOIN city_stats cs ON LOWER(o.city) = cs.city_key
        JOIN city_crime_index ci
          ON LOWER(ci.city) = cs.city_key
         AND LOWER(ci.country) = cs.country_key
        ORDER BY hr.average_rating DESC NULLS LAST
        LIMIT $1;
      `,
      [limit]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/hotels/:hotelName/reviews', async (req, res) => {
  try {
    const hotelName = decodeURIComponent(req.params.hotelName);
    const result = await getPool().query(
      `
        SELECT *
        FROM reviews r
        JOIN offerings o ON r.offering_id = o.id
        WHERE LOWER(o.name) = LOWER($1)
      `,
      [hotelName]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Running on port ${PORT}`);
  });
}

module.exports = app;