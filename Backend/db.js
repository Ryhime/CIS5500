require('dotenv').config();
const { Pool } = require('pg');

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
  pool.on('error', (err) => {
    console.error('Unexpected PG pool error', err);
  });
  return pool;
}

module.exports = { getPool, parsePositiveInt, parseNonNegativeInt };
