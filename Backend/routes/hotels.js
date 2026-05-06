const express = require('express');
const { getPool, parsePositiveInt, parseNonNegativeInt } = require('../db');

const router = express.Router();

router.get('/url', async (req, res) => {
  try {
    const name = req.query.name;
    if (!name) return res.status(400).json({ error: 'Missing required query param: name' });
    const result = await getPool().query(
      `SELECT url FROM offerings WHERE LOWER(name) = LOWER($1) ORDER BY id LIMIT 1;`,
      [String(name)]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Hotel not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/overhyped', async (req, res) => {
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

router.get('/hidden-gems', async (req, res) => {
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
            o.id, o.name, o.city,
            COUNT(r.id)::int AS review_count,
            AVG(r.overall_rating) AS avg_overall
          FROM offerings o
          JOIN reviews r ON r.offering_id = o.id
          GROUP BY o.id, o.name, o.city
        )
        SELECT
          name AS hotel_name, city, review_count,
          ROUND(avg_overall::numeric, 2) AS avg_overall
        FROM hotel_stats
        WHERE review_count BETWEEN $1::int AND $2::int AND avg_overall >= $3::numeric
        ORDER BY avg_overall DESC NULLS LAST, review_count ASC, hotel_name ASC
        LIMIT $4::int OFFSET $5::int;
      `,
      [reviewsMin, reviewsMax, ratingFloor, limit, offset]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/top-overall', async (req, res) => {
  try {
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 100);
    const offset = parseNonNegativeInt(req.query.offset, 0, 1000000);
    const result = await getPool().query(
      `
        WITH city_stats AS (
          SELECT LOWER(city) AS city_key, ROUND(SUM(population))::bigint AS city_population
          FROM population GROUP BY LOWER(city)
        ),
        hotel_ratings AS (
          SELECT offering_id, AVG(overall_rating) AS average_rating
          FROM reviews GROUP BY offering_id
        )
        SELECT
          o.name AS hotel_name, o.city, o.hotel_class,
          hr.average_rating AS average_rating,
          (100 - ci.crime_index) AS safety_index,
          cs.city_population
        FROM offerings o
        JOIN hotel_ratings hr ON hr.offering_id = o.id
        JOIN city_stats cs ON LOWER(o.city) = cs.city_key
        JOIN city_crime_index ci ON LOWER(ci.city) = cs.city_key
        ORDER BY hr.average_rating DESC NULLS LAST
        LIMIT $1 OFFSET $2;
      `,
      [limit, offset]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/search', async (req, res) => {
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
    where.push(`($1 = '' OR LOWER(o.name) LIKE '%' || LOWER($1) || '%' OR LOWER(COALESCE(o.street_address, '')) LIKE '%' || LOWER($1) || '%')`);
    where.push(`($2 = '' OR LOWER(o.city) = LOWER($2))`);
    if (cities.length > 0) { params.push(cities); where.push(`LOWER(o.city) = ANY($${idx++}::text[])`); }

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
        SELECT city, ROUND(SUM(population))::bigint AS city_population FROM population GROUP BY city
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
        FROM reviews GROUP BY offering_id
      )
      SELECT
        o.id, o.name, o.city, o.street_address, o.type, o.hotel_class, o.url,
        hs.review_count, hs.avg_overall, hs.avg_rooms, hs.avg_cleanliness,
        hs.avg_service, hs.avg_value, hs.avg_location, hs.avg_sleep,
        ci.crime_index, (100 - ci.crime_index) AS safety_index, cs.city_population
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

router.get('/:hotelName/reviews', async (req, res) => {
  try {
    const hotelName = decodeURIComponent(req.params.hotelName);
    const result = await getPool().query(
      `
        SELECT * FROM reviews r
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

module.exports = router;
