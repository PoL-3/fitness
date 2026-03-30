const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('./db');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function register({ email, password, displayName }) {
  if (!email || !EMAIL_RE.test(String(email).trim())) {
    const e = new Error('Некорректный email');
    e.status = 400;
    throw e;
  }
  if (!password || String(password).length < 6) {
    const e = new Error('Пароль минимум 6 символов');
    e.status = 400;
    throw e;
  }

  const hash = await bcrypt.hash(String(password), 10);
  const em = String(email).trim().toLowerCase();

  try {
    const r = await pool.query(
      `INSERT INTO users (email, display_name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name, age, height_cm, weight_kg`,
      [em, displayName?.trim() || null, hash],
    );
    return r.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      const e = new Error('Email уже зарегистрирован');
      e.status = 409;
      throw e;
    }
    throw err;
  }
}

async function login({ email, password }) {
  const em = String(email || '').trim().toLowerCase();
  const r = await pool.query(
    `SELECT id, email, display_name, password_hash, age, height_cm, weight_kg FROM users WHERE email = $1`,
    [em],
  );
  const row = r.rows[0];
  if (!row || !row.password_hash) {
    const e = new Error('Неверный email или пароль');
    e.status = 401;
    throw e;
  }
  const ok = await bcrypt.compare(String(password), row.password_hash);
  if (!ok) {
    const e = new Error('Неверный email или пароль');
    e.status = 401;
    throw e;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET не задан в .env');
  }
  const token = jwt.sign({ sub: String(row.id), email: row.email }, secret, { expiresIn: '30d' });

  return {
    token,
    user: {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      age: row.age,
      heightCm: row.height_cm != null ? Number(row.height_cm) : null,
      weightKg: row.weight_kg != null ? Number(row.weight_kg) : null,
    },
  };
}

async function getProfile(userId) {
  const r = await pool.query(
    `SELECT id, email, display_name, age, height_cm, weight_kg FROM users WHERE id = $1`,
    [userId],
  );
  return r.rows[0];
}

async function updateProfile(userId, { displayName, age, heightCm, weightKg }) {
  const r = await pool.query(
    `UPDATE users SET
       display_name = $2,
       age = $3,
       height_cm = $4,
       weight_kg = $5
     WHERE id = $1
     RETURNING id, email, display_name, age, height_cm, weight_kg`,
    [
      userId,
      displayName != null ? String(displayName).trim() : null,
      age === '' || age === null || age === undefined ? null : parseInt(age, 10),
      heightCm === '' || heightCm === null || heightCm === undefined ? null : Number(heightCm),
      weightKg === '' || weightKg === null || weightKg === undefined ? null : Number(weightKg),
    ],
  );
  return r.rows[0];
}

module.exports = { register, login, getProfile, updateProfile };
