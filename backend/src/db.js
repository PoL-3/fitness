const { Pool } = require('pg');

/**
 * Пул соединений к PostgreSQL.
 * Строка подключения задаётся в .env как DATABASE_URL.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

pool.on('error', (err) => {
  console.error('Неожиданная ошибка пула PostgreSQL:', err.message);
});

module.exports = { pool };
