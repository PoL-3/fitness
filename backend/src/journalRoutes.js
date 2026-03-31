const express = require('express');
const { pool } = require('./db');
const { authMiddleware } = require('./authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/workouts', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, title, duration_min, type_text, notes, created_at
       FROM app_workouts WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.userId],
    );
    res.json({ ok: true, items: r.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/workouts/:id', async (req, res) => {
  const id = req.params?.id;
  if (!id) {
    return res.status(400).json({ ok: false, error: 'Нужен id' });
  }
  try {
    const r = await pool.query(`DELETE FROM app_workouts WHERE id = $1 AND user_id = $2`, [String(id), req.userId]);
    if (r.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'Не найдено' });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/workouts', async (req, res) => {
  const { id, title, durationMin, type, notes, createdAt } = req.body || {};
  if (!id || !title) {
    return res.status(400).json({ ok: false, error: 'Нужны id и title' });
  }
  try {
    await pool.query(
      `INSERT INTO app_workouts (id, user_id, title, duration_min, type_text, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         duration_min = EXCLUDED.duration_min,
         type_text = EXCLUDED.type_text,
         notes = EXCLUDED.notes,
         created_at = EXCLUDED.created_at
       WHERE app_workouts.user_id = EXCLUDED.user_id`,
      [
        String(id),
        req.userId,
        String(title).slice(0, 255),
        durationMin != null ? Number(durationMin) : null,
        type != null ? String(type).slice(0, 120) : null,
        notes != null ? String(notes) : null,
        Number(createdAt) || Date.now(),
      ],
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/meals', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, meal_label, calories, description, protein_g, fat_g, carbs_g, created_at
       FROM app_meals WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.userId],
    );
    res.json({ ok: true, items: r.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/meals/:id', async (req, res) => {
  const id = req.params?.id;
  if (!id) {
    return res.status(400).json({ ok: false, error: 'Нужен id' });
  }
  try {
    const r = await pool.query(`DELETE FROM app_meals WHERE id = $1 AND user_id = $2`, [String(id), req.userId]);
    if (r.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'Не найдено' });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/meals', async (req, res) => {
  const { id, mealLabel, calories, description, proteinG, fatG, carbsG, createdAt } = req.body || {};
  if (!id || !mealLabel) {
    return res.status(400).json({ ok: false, error: 'Нужны id и mealLabel' });
  }
  try {
    await pool.query(
      `INSERT INTO app_meals (id, user_id, meal_label, calories, description, protein_g, fat_g, carbs_g, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         meal_label = EXCLUDED.meal_label,
         calories = EXCLUDED.calories,
         description = EXCLUDED.description,
         protein_g = EXCLUDED.protein_g,
         fat_g = EXCLUDED.fat_g,
         carbs_g = EXCLUDED.carbs_g,
         created_at = EXCLUDED.created_at
       WHERE app_meals.user_id = EXCLUDED.user_id`,
      [
        String(id),
        req.userId,
        String(mealLabel).slice(0, 255),
        calories != null ? parseInt(calories, 10) : null,
        description != null ? String(description) : null,
        proteinG != null && proteinG !== '' ? Number(proteinG) : null,
        fatG != null && fatG !== '' ? Number(fatG) : null,
        carbsG != null && carbsG !== '' ? Number(carbsG) : null,
        Number(createdAt) || Date.now(),
      ],
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
