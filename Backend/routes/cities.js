const express = require('express');
const { getPool, parsePositiveInt, parseNonNegativeInt } = require('../db');

const router = express.Router();

const GEOCODE_USER_AGENT = 'CIS5500-TravelApp/1.0 (educational project)';
const geocodeCache = new Map();
let geocodeLastRequestAt = 0;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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
    const res = await fetch(url, { headers: { 'User-Agent': GEOCODE_USER_AGENT } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) { geocodeCache.set(key, null); return null; }
    const lat = Number(data[0].lat);
    const lon = Number(data[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) { geocodeCache.set(key, null); return null; }
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

function attachHotelMapPins(rows) {
  return rows.map((row, index) => {
    const { rest, cityLat, cityLng } = stripInternalCityCoords(row);
    if (!Number.isFinite(cityLat) || !Number.isFinite(cityLng)) {
      return { ...rest, map_latitude: null, map_longitude: null, map_location_approximate: null };
    }
    return { ...rest, ...approximateMapPin(rest, index, cityLat, cityLng) };
  });
}

async function attachHotelMapPinsGeocoded(rows) {
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const { rest, cityLat, cityLng } = stripInternalCityCoords(row);
    let map_latitude = null, map_longitude = null, map_location_approximate = null;

    const street = rest.street_address && String(rest.street_address).trim();
    if (street && rest.city) {
      const g = await nominatimGeocode(street, rest.city);
      if (g) { map_latitude = g.lat; map_longitude = g.lng; map_location_approximate = false; }
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
    SELECT city, AVG(hotel_avg_overall) AS mean_of_hotel_avgs
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

router.get('/', async (req, res) => {
  try {
    const result = await getPool().query(`SELECT DISTINCT city FROM offerings ORDER BY city;`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/safest', async (req, res) => {
  try {
    const limit = Math.min(parsePositiveInt(req.query.limit, 10), 100);
    const result = await getPool().query(
      `SELECT city, (100 - crime_index) AS safety_index FROM city_crime_index ORDER BY safety_index DESC NULLS LAST LIMIT $1;`,
      [limit]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/population', async (req, res) => {
  try {
    const city = req.query.city;
    if (!city) return res.status(400).json({ error: 'Missing required query param: city' });
    const result = await getPool().query(
      `SELECT city, population FROM population WHERE LOWER(city) = LOWER($1)`,
      [String(city)]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'City not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/most-dangerous', async (req, res) => {
  try {
    const limit = Math.min(parsePositiveInt(req.query.limit, 10), 100);
    const result = await getPool().query(
      `SELECT city, crime_index FROM city_crime_index ORDER BY crime_index DESC NULLS LAST LIMIT $1;`,
      [limit]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q ?? '').toString().trim();
    const minPopulation = Number(req.query.min_population);
    const maxPopulation = Number(req.query.max_population);
    const minSafety = Number(req.query.min_safety);
    const maxCrime = Number(req.query.max_crime);
    const minHotelCount = Number(req.query.min_hotels);
    const minAvgHotelRating = Number(req.query.min_avg_hotel_rating);
    const limit = Math.min(parsePositiveInt(req.query.limit, 50), 200);
    const offset = Math.max(0, parsePositiveInt(req.query.offset, 0));

    const sortRaw = (req.query.sort ?? 'safety_desc').toString();
    const sort =
      sortRaw === 'population_desc' ? 'population_desc' :
      sortRaw === 'crime_asc' ? 'crime_asc' :
      sortRaw === 'hotels_desc' ? 'hotels_desc' :
      sortRaw === 'avg_rating_desc' ? 'avg_rating_desc' :
      'safety_desc';

    const params = [q];
    let idx = 2;
    const where = [];
    where.push(`($1 = '' OR LOWER(p.city) LIKE '%' || LOWER($1) || '%')`);

    if (Number.isFinite(minPopulation)) { params.push(minPopulation); where.push(`p.population >= $${idx++}`); }
    if (Number.isFinite(maxPopulation)) { params.push(maxPopulation); where.push(`p.population <= $${idx++}`); }
    if (Number.isFinite(minSafety)) { params.push(minSafety); where.push(`(100 - ci.crime_index) >= $${idx++}`); }
    if (Number.isFinite(maxCrime)) { params.push(maxCrime); where.push(`ci.crime_index <= $${idx++}`); }
    if (Number.isFinite(minHotelCount)) { params.push(minHotelCount); where.push(`COALESCE(h.hotel_count, 0) >= $${idx++}`); }
    if (Number.isFinite(minAvgHotelRating)) { params.push(minAvgHotelRating); where.push(`h.avg_hotel_rating >= $${idx++}`); }

    const orderBy =
      sort === 'population_desc' ? 'p.population DESC NULLS LAST, p.city ASC' :
      sort === 'crime_asc' ? 'ci.crime_index ASC NULLS LAST, p.city ASC' :
      sort === 'hotels_desc' ? 'COALESCE(h.hotel_count, 0) DESC NULLS LAST, p.city ASC' :
      sort === 'avg_rating_desc' ? 'h.avg_hotel_rating DESC NULLS LAST, p.city ASC' :
      '(100 - ci.crime_index) DESC NULLS LAST, p.city ASC';

    const result = await getPool().query(
      `
        WITH hotel_ratings AS (
          SELECT offering_id, AVG(overall_rating) AS avg_overall FROM reviews GROUP BY offering_id
        ),
        hotel_by_city AS (
          SELECT o.city, COUNT(*)::int AS hotel_count, AVG(hr.avg_overall) AS avg_hotel_rating
          FROM offerings o
          LEFT JOIN hotel_ratings hr ON hr.offering_id = o.id
          GROUP BY o.city
        )
        SELECT
          p.city, p.population, p.latitude, p.longitude,
          ci.crime_index, (100 - ci.crime_index) AS safety_index,
          COALESCE(h.hotel_count, 0) AS hotel_count, h.avg_hotel_rating
        FROM population p
        JOIN city_crime_index ci ON ci.city = p.city
        LEFT JOIN hotel_by_city h ON h.city = p.city
        WHERE ${where.join(' AND ')}
        ORDER BY ${orderBy}
        LIMIT $${idx++}
        OFFSET $${idx++};
      `,
      [...params, limit, offset]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:cityName/hotels/standouts', async (req, res) => {
  try {
    const cityName = decodeURIComponent(req.params.cityName);
    const minReviews = Math.min(Math.max(parsePositiveInt(req.query.min_reviews, 20), 1), 500);
    const limit = Math.min(parsePositiveInt(req.query.limit, 50), 100);
    const offset = parseNonNegativeInt(req.query.offset, 0);
    const result = await getPool().query(HOTEL_STANDOUTS_SQL, [cityName, minReviews, limit, offset]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:cityName/hotels', async (req, res) => {
  try {
    const cityName = decodeURIComponent(req.params.cityName);
    const result = await getPool().query(
      `
        SELECT
          o.id, o.name, o.city, o.street_address, o.type, o.hotel_class, o.url,
          (SELECT p.latitude FROM population p WHERE LOWER(TRIM(p.city)) = LOWER(TRIM(o.city)) LIMIT 1) AS city_latitude,
          (SELECT p.longitude FROM population p WHERE LOWER(TRIM(p.city)) = LOWER(TRIM(o.city)) LIMIT 1) AS city_longitude
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

router.get('/:cityName', async (req, res) => {
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
          AND EXISTS (SELECT 1 FROM offerings o WHERE LOWER(o.city) = LOWER(p.city))
        GROUP BY p.city, p.latitude, p.longitude, ci.crime_index;
      `,
      [cityName]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
