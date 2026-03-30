-- Запустите после базовой schema.sql (один раз на существующей БД)
-- psql -U postgres -d fitness_db -f schema_migration_v2.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS height_cm NUMERIC(6, 2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(6, 2);

-- Дневник приложения (отдельно от workouts/meals внутри AI-плана)
CREATE TABLE IF NOT EXISTS app_workouts (
  id VARCHAR(80) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  duration_min NUMERIC(8, 2),
  type_text VARCHAR(120),
  notes TEXT,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_meals (
  id VARCHAR(80) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  meal_label VARCHAR(255) NOT NULL,
  calories INTEGER,
  description TEXT,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_workouts_user ON app_workouts (user_id);
CREATE INDEX IF NOT EXISTS idx_app_meals_user ON app_meals (user_id);
