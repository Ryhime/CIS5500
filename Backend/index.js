const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

app.use(express.json());

const pool = new Pool({
  host: 'database-1.crwkw2g8ywa2.us-east-2.rds.amazonaws.com',
  port: 5432,
  user: 'postgres',
  password: 'cis5550databaseworldtravel',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

app.get('/cities', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT city
      FROM offerings
      ORDER BY city;
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/cities/:cityName', async (req, res) => {
  try {
    const cityName = decodeURIComponent(req.params.cityName);
    const result = await pool.query(`
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
    WHERE LOWER(p.city) = LOWER('${cityName}')
    GROUP BY
        p.city,
        p.country,
        p.latitude,
        p.longitude,
        ci.safety_index,
        ci.crime_index;
      `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/cities/:cityName/hotels', async (req, res) => {
  try {
    const cityName = decodeURIComponent(req.params.cityName);
    const result = await pool.query(`
    SELECT
      name,
      city,
      state,
      hotel_class,
      url
    FROM offerings WHERE LOWER(city) = LOWER('${cityName}')
      `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/cities/:cityName/hotels/average_ratings', async (req, res) => {
  try {
    const cityName = decodeURIComponent(req.params.cityName);
    const result = await pool.query(`
    SELECT
      name,
      url
    FROM offerings WHERE LOWER(city) = LOWER('${cityName}')
      `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/hotels/:hotelName/reviews', async (req, res) => {
  try {
    const hotelName = decodeURIComponent(req.params.hotelName);
    const result = await pool.query(`
      SELECT * FROM reviews r JOIN offerings o ON r.offering_id = o.id
      WHERE LOWER(o.name) = LOWER('${hotelName}')
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`);
});

module.exports = app;