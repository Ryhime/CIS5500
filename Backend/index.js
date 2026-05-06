require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());

function parsePositiveInt(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function parseNonNegativeInt(value, fallback, cap = 100000) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(Math.floor(n), cap);
}

const GEOCODE_USER_AGENT = 'CIS5500-TravelApp/1.0 (educational project)';

/** address+city -> { lat, lng } | null (null means "tried and failed", do not re-query) */
const geocodeCache = new Map();
let geocodeLastRequestAt = 0;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * OpenStreetMap Nominatim: ~1 request/sec, identify with User-Agent.
 * https://operations.osmfoundation.org/policies/nominatim/
 */
async function nominatimGeocode(street, city) {
  const s = String(street || '').trim();
  const c = String(city || '').trim();
  if (!s || !c) return null;
  const key = `${s.toLowerCase()}|${c.toLowerCase()}`;
  if (geocodeCache.has(key)) return geocodeCache.get(key);

  const elapsed = Date.now() - geocodeLastRequestAt;
  if (elapsed < 1100) await sleep(1100 - elapsed);
  geocodeLastRequestAt = Date.now();

  const q = `${s}, ${c}, United States`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': GEOCODE_USER_AGENT },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      geocodeCache.set(key, null);
      return null;
    }
    const lat = Number(data[0].lat);
    const lon = Number(data[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      geocodeCache.set(key, null);
      return null;
    }
    const coords = { lat, lng: lon };
    geocodeCache.set(key, coords);
    return coords;
  } catch (err) {
    console.warn('Nominatim geocode failed:', err?.message || err);
    geocodeCache.set(key, null);
    return null;
  }
}

function stripInternalCityCoords(row) {
  const { city_latitude, city_longitude, ...rest } = row;
  return {
    rest,
    cityLat: city_latitude != null ? Number(city_latitude) : NaN,
    cityLng: city_longitude != null ? Number(city_longitude) : NaN,
  };
}

/** Fallback ring around city centroid when geocoding is off or fails */
function approximateMapPin(rest, index, cityLat, cityLng) {
  const idNum = rest.id != null ? Number(rest.id) : index;
  const angle = ((idNum * 9301 + 49297) % 233280) * ((2 * Math.PI) / 233280);
  const radius = 0.0025 + (Math.abs(idNum) % 47) * 0.00011;
  return {
    map_latitude: cityLat + radius * Math.cos(angle),
    map_longitude: cityLng + radius * Math.sin(angle) * 1.12,
    map_location_approximate: true,
  };
}

/** Fast path: no external API (e.g. hotel picker on Reviews). */
function attachHotelMapPins(rows) {
  return rows.map((row, index) => {
    const { rest, cityLat, cityLng } = stripInternalCityCoords(row);
    if (!Number.isFinite(cityLat) || !Number.isFinite(cityLng)) {
      return {
        ...rest,
        map_latitude: null,
        map_longitude: null,
        map_location_approximate: null,
      };
    }
    return { ...rest, ...approximateMapPin(rest, index, cityLat, cityLng) };
  });
}

/** Geocode street_address + city via Nominatim; fall back to approximate ring. */
async function attachHotelMapPinsGeocoded(rows) {
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const { rest, cityLat, cityLng } = stripInternalCityCoords(row);
    let map_latitude = null;
    let map_longitude = null;
    let map_location_approximate = null;

    const street = rest.street_address && String(rest.street_address).trim();
    if (street && rest.city) {
      const g = await nominatimGeocode(street, rest.city);
      if (g) {
        map_latitude = g.lat;
        map_longitude = g.lng;
        map_location_approximate = false;
      }
    }
    if (map_latitude == null && Number.isFinite(cityLat) && Number.isFinite(cityLng)) {
      const a = approximateMapPin(rest, i, cityLat, cityLng);
      map_latitude = a.map_latitude;
      map_longitude = a.map_longitude;
      map_location_approximate = true;
    }
    out.push({ ...rest, map_latitude, map_longitude, map_location_approximate });
  }
  return out;
}

let pool;
function getPool() {
  if (pool) return pool;
  pool = new Pool({
    host: "database-1.cbam8vucodhx.us-east-1.rds.amazonaws.com",
    port: 5432,
    user: "postgres",
    password: "cis5550databaseworldtravel",
    ssl: { rejectUnauthorized: false },
    database: "postgres"
  });
  // Prevent transient network/TLS issues from crashing the server.
  pool.on('error', (err) => {
    console.error('Unexpected PG pool error', err);
  });
  return pool;
}

/** Nested aggregation: hotels in one city beating mean of hotel averages (≥ minReviews reviews each). */
const HOTEL_STANDOUTS_SQL = `
        WITH hotel_ratings AS (
          SELECT
            o.id,
            o.name,
            o.city,
            ROUND(AVG(r.overall_rating)::numeric, 3) AS hotel_avg_overall,
            COUNT(r.id)::int AS review_count
          FROM offerings o
          JOIN reviews r ON r.offering_id = o.id
          WHERE LOWER(TRIM(o.city)) = LOWER(TRIM($1))
          GROUP BY o.id, o.name, o.city
          HAVING COUNT(r.id) >= $2::int
        ),
        city_hotel_mean AS (
          SELECT
            city,
            AVG(hotel_avg_overall) AS mean_of_hotel_avgs
          FROM hotel_ratings
          GROUP BY city
        )
        SELECT
          hr.name AS hotel_name,
          hr.city,
          hr.hotel_avg_overall,
          hr.review_count,
          ROUND(chm.mean_of_hotel_avgs::numeric, 3) AS city_baseline_avg,
          ROUND((hr.hotel_avg_overall - chm.mean_of_hotel_avgs)::numeric, 3) AS margin_above_city
        FROM hotel_ratings hr
        JOIN city_hotel_mean chm ON LOWER(TRIM(hr.city)) = LOWER(TRIM(chm.city))
        WHERE hr.hotel_avg_overall > chm.mean_of_hotel_avgs
        ORDER BY margin_above_city DESC NULLS LAST, hr.review_count DESC
        LIMIT $3::int OFFSET $4::int;
`;

async function queryHotelStandoutsRows(city, minReviews, limit, offset = 0) {
  const result = await getPool().query(HOTEL_STANDOUTS_SQL, [
    city,
    minReviews,
    limit,
    offset,
  ]);
  return result.rows;
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

app.get('/cities/safest', async (req, res) => {
  try {
    const limit = Math.min(parsePositiveInt(req.query.limit, 10), 100);
    const result = await getPool().query(
      `
        SELECT city, (100 - crime_index) AS safety_index
        FROM city_crime_index
        ORDER BY safety_index DESC NULLS LAST
        LIMIT $1;
      `,
      [limit]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/cities/population', async (req, res) => {
  try {
    const city = req.query.city;
    if (!city) return res.status(400).json({ error: 'Missing required query param: city' });

    const result = await getPool().query(
      `
        SELECT city, population
        FROM population
        WHERE LOWER(city) = LOWER($1)
      `,
      [String(city)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'City not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/cities/most-dangerous', async (req, res) => {
  try {
    const limit = Math.min(parsePositiveInt(req.query.limit, 10), 100);
    const result = await getPool().query(
      `
        SELECT city, crime_index
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
          SUM(p.population) AS population,
          p.latitude,
          p.longitude,
          (100 - ci.crime_index) AS safety_index,
          ci.crime_index
        FROM population p
        LEFT JOIN city_crime_index ci ON LOWER(p.city) = LOWER(ci.city)
        WHERE LOWER(p.city) = LOWER($1)
        GROUP BY
          p.city,
          p.latitude,
          p.longitude,
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
          o.id,
          o.name,
          o.city,
          o.street_address,
          o.type,
          o.hotel_class,
          o.url,
          (
            SELECT p.latitude
            FROM population p
            WHERE LOWER(TRIM(p.city)) = LOWER(TRIM(o.city))
            LIMIT 1
          ) AS city_latitude,
          (
            SELECT p.longitude
            FROM population p
            WHERE LOWER(TRIM(p.city)) = LOWER(TRIM(o.city))
            LIMIT 1
          ) AS city_longitude
        FROM offerings o
        WHERE LOWER(o.city) = LOWER($1)
        ORDER BY o.name ASC
      `,
      [cityName]
    );
    const wantGeocode = String(req.query.geocode || '') === '1';
    const payload = wantGeocode
      ? await attachHotelMapPinsGeocoded(result.rows)
      : attachHotelMapPins(result.rows);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/cities/:cityName/hotels/standouts', async (req, res) => {
  try {
    const cityName = decodeURIComponent(req.params.cityName);
    const minReviews = Math.min(Math.max(parsePositiveInt(req.query.min_reviews, 20), 1), 500);
    const limit = Math.min(parsePositiveInt(req.query.limit, 50), 100);
    const offset = parseNonNegativeInt(req.query.offset, 0);
    const rows = await queryHotelStandoutsRows(cityName, minReviews, limit, offset);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

app.get('/hotels/overhyped', async (req, res) => {
  try {
    const result = await getPool().query(`
      SELECT
        o.name AS name,
        o.city AS city,
        COUNT(r.id)::int AS review_count,
        ROUND(AVG(r.overall_rating)::numeric, 2) AS avg_rating
      FROM offerings o
      JOIN reviews r ON r.offering_id = o.id
      GROUP BY o.id, o.name, o.city
      HAVING COUNT(r.id) > 50 AND AVG(r.overall_rating) < 3.0
      ORDER BY review_count DESC, avg_rating ASC
      LIMIT 100;
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/hotels/hidden-gems', async (req, res) => {
  try {
    const limit = Math.min(parsePositiveInt(req.query.limit, 50), 200);
    const offset = parseNonNegativeInt(req.query.offset, 0, 1000000);
    const minRating = Number(req.query.min_rating);
    const minReviews = Number(req.query.min_reviews);
    const maxReviews = Number(req.query.max_reviews);

    const ratingFloor = Number.isFinite(minRating) ? minRating : 4.5;
    const reviewsMin = Number.isFinite(minReviews) ? minReviews : 5;
    const reviewsMax = Number.isFinite(maxReviews) ? maxReviews : 30;

    const result = await getPool().query(
      `
        WITH hotel_stats AS (
          SELECT
            o.id,
            o.name,
            o.city,
            COUNT(r.id)::int AS review_count,
            AVG(r.overall_rating) AS avg_overall
          FROM offerings o
          JOIN reviews r ON r.offering_id = o.id
          GROUP BY o.id, o.name, o.city
        )
        SELECT
          name AS hotel_name,
          city,
          review_count,
          ROUND(avg_overall::numeric, 2) AS avg_overall
        FROM hotel_stats
        WHERE review_count BETWEEN $1::int AND $2::int
          AND avg_overall >= $3::numeric
        ORDER BY avg_overall DESC NULLS LAST, review_count ASC, hotel_name ASC
        LIMIT $4::int
        OFFSET $5::int;
      `,
      [reviewsMin, reviewsMax, ratingFloor, limit, offset]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/hotels/top-overall', async (req, res) => {
  try {
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 100);
    const offset = parseNonNegativeInt(req.query.offset, 0, 1000000);
    const result = await getPool().query(
      `
        WITH city_stats AS (
          SELECT
            LOWER(city) AS city_key,
            ROUND(SUM(population))::bigint AS city_population
          FROM population
          GROUP BY LOWER(city)
        ),
        hotel_ratings AS (
          SELECT
            offering_id,
            AVG(overall_rating) AS average_rating
          FROM reviews
          GROUP BY offering_id
        )
        SELECT
          o.name AS hotel_name,
          o.city,
          o.hotel_class,
          hr.average_rating AS average_rating,
          (100 - ci.crime_index) AS safety_index,
          cs.city_population
        FROM offerings o
        JOIN hotel_ratings hr ON hr.offering_id = o.id
        JOIN city_stats cs ON LOWER(o.city) = cs.city_key
        JOIN city_crime_index ci ON LOWER(ci.city) = cs.city_key
        ORDER BY hr.average_rating DESC NULLS LAST
        LIMIT $1
        OFFSET $2;
      `,
      [limit, offset]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/hotels/search', async (req, res) => {
  try {
    const q = (req.query.q ?? '').toString().trim();
    const city = (req.query.city ?? '').toString().trim();
    const citiesRaw = (req.query.cities ?? '').toString().trim();
    const cities = citiesRaw
      ? citiesRaw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];
    const minOverall = Number(req.query.min_overall);
    const minRooms = Number(req.query.min_rooms);
    const minSafety = Number(req.query.min_safety);
    const minPopulation = Number(req.query.min_population);
    const minReviews = Number(req.query.min_reviews);
    const maxOverall = Number(req.query.max_overall);
    const maxRooms = Number(req.query.max_rooms);
    const maxSafety = Number(req.query.max_safety);
    const maxPopulation = Number(req.query.max_population);
    const maxReviews = Number(req.query.max_reviews);
    const minCleanliness = Number(req.query.min_cleanliness);
    const maxCleanliness = Number(req.query.max_cleanliness);
    const minService = Number(req.query.min_service);
    const maxService = Number(req.query.max_service);
    const minValue = Number(req.query.min_value);
    const maxValue = Number(req.query.max_value);
    const minLocation = Number(req.query.min_location);
    const maxLocation = Number(req.query.max_location);
    const minSleep = Number(req.query.min_sleep);
    const maxSleep = Number(req.query.max_sleep);
    const limit = Math.min(parsePositiveInt(req.query.limit, 50), 200);
    const offset = Math.max(0, parsePositiveInt(req.query.offset, 0));

    const sortRaw = (req.query.sort ?? 'overall_desc').toString();
    const sort =
      sortRaw === 'rooms_desc' ? 'rooms_desc' :
      sortRaw === 'safety_desc' ? 'safety_desc' :
      sortRaw === 'reviews_desc' ? 'reviews_desc' :
      sortRaw === 'name_asc' ? 'name_asc' :
      sortRaw === 'cleanliness_desc' ? 'cleanliness_desc' :
      sortRaw === 'service_desc' ? 'service_desc' :
      sortRaw === 'value_desc' ? 'value_desc' :
      sortRaw === 'location_desc' ? 'location_desc' :
      sortRaw === 'sleep_desc' ? 'sleep_desc' :
      'overall_desc';

    const params = [q, city];
    let idx = params.length + 1;

    const where = [];
    // text search on name/address
    where.push(`($1 = '' OR LOWER(o.name) LIKE '%' || LOWER($1) || '%' OR LOWER(COALESCE(o.street_address, '')) LIKE '%' || LOWER($1) || '%')`);
    // optional city filter
    where.push(`($2 = '' OR LOWER(o.city) = LOWER($2))`);
    if (cities.length > 0) {
      params.push(cities);
      where.push(`LOWER(o.city) = ANY($${idx++}::text[])`);
    }

    if (Number.isFinite(minOverall)) { params.push(minOverall); where.push(`hs.avg_overall >= $${idx++}`); }
    if (Number.isFinite(minRooms)) { params.push(minRooms); where.push(`hs.avg_rooms >= $${idx++}`); }
    if (Number.isFinite(minSafety)) { params.push(minSafety); where.push(`(100 - ci.crime_index) >= $${idx++}`); }
    if (Number.isFinite(minPopulation)) { params.push(minPopulation); where.push(`cs.city_population >= $${idx++}`); }
    if (Number.isFinite(minReviews)) { params.push(minReviews); where.push(`hs.review_count >= $${idx++}`); }
    if (Number.isFinite(maxOverall)) { params.push(maxOverall); where.push(`hs.avg_overall <= $${idx++}`); }
    if (Number.isFinite(maxRooms)) { params.push(maxRooms); where.push(`hs.avg_rooms <= $${idx++}`); }
    if (Number.isFinite(maxSafety)) { params.push(maxSafety); where.push(`(100 - ci.crime_index) <= $${idx++}`); }
    if (Number.isFinite(maxPopulation)) { params.push(maxPopulation); where.push(`cs.city_population <= $${idx++}`); }
    if (Number.isFinite(maxReviews)) { params.push(maxReviews); where.push(`hs.review_count <= $${idx++}`); }
    if (Number.isFinite(minCleanliness)) { params.push(minCleanliness); where.push(`hs.avg_cleanliness >= $${idx++}`); }
    if (Number.isFinite(maxCleanliness)) { params.push(maxCleanliness); where.push(`hs.avg_cleanliness <= $${idx++}`); }
    if (Number.isFinite(minService)) { params.push(minService); where.push(`hs.avg_service >= $${idx++}`); }
    if (Number.isFinite(maxService)) { params.push(maxService); where.push(`hs.avg_service <= $${idx++}`); }
    if (Number.isFinite(minValue)) { params.push(minValue); where.push(`hs.avg_value >= $${idx++}`); }
    if (Number.isFinite(maxValue)) { params.push(maxValue); where.push(`hs.avg_value <= $${idx++}`); }
    if (Number.isFinite(minLocation)) { params.push(minLocation); where.push(`hs.avg_location >= $${idx++}`); }
    if (Number.isFinite(maxLocation)) { params.push(maxLocation); where.push(`hs.avg_location <= $${idx++}`); }
    if (Number.isFinite(minSleep)) { params.push(minSleep); where.push(`hs.avg_sleep >= $${idx++}`); }
    if (Number.isFinite(maxSleep)) { params.push(maxSleep); where.push(`hs.avg_sleep <= $${idx++}`); }

    // Non-overall sorts: do not tie-break on avg_overall — that made e.g. sleep_desc look like an overall sort
    // when many rows shared the same NULL/missing dimension average.
    const orderBy =
      sort === 'rooms_desc' ? '(hs.avg_rooms IS NULL) ASC, hs.avg_rooms DESC NULLS LAST, o.city ASC, o.name ASC' :
      sort === 'safety_desc' ? '(100 - ci.crime_index) DESC NULLS LAST, o.city ASC, o.name ASC' :
      sort === 'reviews_desc' ? '(hs.review_count IS NULL) ASC, hs.review_count DESC NULLS LAST, o.city ASC, o.name ASC' :
      sort === 'cleanliness_desc' ? '(hs.avg_cleanliness IS NULL) ASC, hs.avg_cleanliness DESC NULLS LAST, o.city ASC, o.name ASC' :
      sort === 'service_desc' ? '(hs.avg_service IS NULL) ASC, hs.avg_service DESC NULLS LAST, o.city ASC, o.name ASC' :
      sort === 'value_desc' ? '(hs.avg_value IS NULL) ASC, hs.avg_value DESC NULLS LAST, o.city ASC, o.name ASC' :
      sort === 'location_desc' ? '(hs.avg_location IS NULL) ASC, hs.avg_location DESC NULLS LAST, o.city ASC, o.name ASC' :
      sort === 'sleep_desc' ? '(hs.avg_sleep IS NULL) ASC, hs.avg_sleep DESC NULLS LAST, o.city ASC, o.name ASC' :
      sort === 'name_asc' ? 'o.city ASC, o.name ASC' :
      '(hs.avg_overall IS NULL) ASC, hs.avg_overall DESC NULLS LAST, o.city ASC, o.name ASC';

    const baseSql = `
      WITH city_stats AS (
        SELECT city, ROUND(SUM(population))::bigint AS city_population
        FROM population
        GROUP BY city
      ),
      hotel_stats AS (
        SELECT
          offering_id,
          COUNT(*)::int AS review_count,
          AVG(overall_rating) AS avg_overall,
          AVG(rooms_rating) AS avg_rooms,
          AVG(cleanliness_rating) AS avg_cleanliness,
          AVG(service_rating) AS avg_service,
          AVG(value_rating) AS avg_value,
          AVG(location_rating) AS avg_location,
          AVG(sleep_quality_rating) AS avg_sleep
        FROM reviews
        GROUP BY offering_id
      )
      SELECT
        o.id,
        o.name,
        o.city,
        o.street_address,
        o.type,
        o.hotel_class,
        o.url,
        hs.review_count,
        hs.avg_overall,
        hs.avg_rooms,
        hs.avg_cleanliness,
        hs.avg_service,
        hs.avg_value,
        hs.avg_location,
        hs.avg_sleep,
        ci.crime_index,
        (100 - ci.crime_index) AS safety_index,
        cs.city_population
      FROM offerings o
      LEFT JOIN hotel_stats hs ON hs.offering_id = o.id
      LEFT JOIN city_crime_index ci ON ci.city = o.city
      LEFT JOIN city_stats cs ON cs.city = o.city
      WHERE ${where.join(' AND ')}
    `;

    const countResult = await getPool().query(
      `SELECT COUNT(*)::bigint AS total_count FROM (${baseSql}) t`,
      params
    );
    const totalCount = countResult.rows?.[0]?.total_count ?? null;
    if (totalCount != null) res.set('X-Total-Count', String(totalCount));

    const result = await getPool().query(
      `${baseSql} ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset};`,
      params
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