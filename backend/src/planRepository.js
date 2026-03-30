const { pool } = require('./db');

/**
 * Сохраняет план и связанные тренировки/приёмы пищи в одной транзакции.
 */
async function savePlanToDb({
  userId,
  goal,
  level,
  weightKg,
  heightCm,
  parsed,
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertPlan = await client.query(
      `INSERT INTO plans (user_id, goal, level, weight_kg, height_cm, summary, raw_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       RETURNING id`,
      [
        userId,
        goal,
        level,
        weightKg,
        heightCm,
        parsed.summary,
        JSON.stringify(parsed),
      ],
    );

    const planId = insertPlan.rows[0].id;

    let wOrder = 0;
    const maxWorkouts = 60;
    for (const w of parsed.workouts.slice(0, maxWorkouts)) {
      const dayNum = Number(w.day_number) || Number(w.week_number) || 1;
      await client.query(
        `INSERT INTO workouts (plan_id, day_number, title, content, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          planId,
          dayNum,
          String(w.title || 'Тренировка').slice(0, 255),
          w.content != null ? String(w.content) : null,
          wOrder++,
        ],
      );
    }

    let mOrder = 0;
    for (const m of parsed.meals) {
      await client.query(
        `INSERT INTO meals (plan_id, meal_type, description, calories, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          planId,
          m.meal_type != null ? String(m.meal_type).slice(0, 80) : null,
          m.description != null ? String(m.description) : null,
          m.calories != null ? parseInt(m.calories, 10) : null,
          mOrder++,
        ],
      );
    }

    await client.query('COMMIT');
    return planId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { savePlanToDb };
