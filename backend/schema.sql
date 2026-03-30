-- ============================================================
-- Схема БД для FitTrack: пользователи, планы, тренировки, питание
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  display_name VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Один сгенерированный план (ответ ИИ + параметры запроса)
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  goal VARCHAR(40) NOT NULL,
  level VARCHAR(40) NOT NULL,
  weight_kg NUMERIC(6, 2) NOT NULL,
  height_cm NUMERIC(6, 2) NOT NULL,
  summary TEXT,
  raw_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Дни/блоки тренировок внутри плана (нормализованно, удобно для выборок)
CREATE TABLE IF NOT EXISTS workouts (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES plans (id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL DEFAULT 1,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Приёмы пищи внутри плана
CREATE TABLE IF NOT EXISTS meals (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES plans (id) ON DELETE CASCADE,
  meal_type VARCHAR(80),
  description TEXT,
  calories INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_plans_user ON plans (user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_plan ON workouts (plan_id);
CREATE INDEX IF NOT EXISTS idx_meals_plan ON meals (plan_id);

-- Демо-пользователь для локальной разработки (без регистрации)
INSERT INTO users (email, display_name)
VALUES ('demo@local.test', 'Локальный демо-пользователь')
ON CONFLICT (email) DO NOTHING;

-- Связи: users 1 —* plans —* workouts
--                    \—* meals
--
-- Пример INSERT плана вручную (в приложении это делает POST /generate-plan):
--
-- INSERT INTO plans (user_id, goal, level, weight_kg, height_cm, summary, raw_json)
-- VALUES (
--   1,
--   'weight_loss',
--   'beginner',
--   75.5,
--   178,
--   'Пример',
--   '{"summary":"...","workouts":[],"meals":[]}'::jsonb
-- );
--
-- INSERT INTO workouts (plan_id, day_number, title, content, sort_order)
-- VALUES (1, 1, 'Верх тела', 'Жим, тяга…', 0);
--
-- INSERT INTO meals (plan_id, meal_type, description, calories, sort_order)
-- VALUES (1, 'завтрак', 'Овсянка + яйца', 450, 0);
