-- Один раз после v2: пол пользователя и БЖУ в дневнике питания
-- psql -U postgres -d fitness_db -f schema_migration_v3.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);

ALTER TABLE app_meals ADD COLUMN IF NOT EXISTS protein_g NUMERIC(10, 2);
ALTER TABLE app_meals ADD COLUMN IF NOT EXISTS fat_g NUMERIC(10, 2);
ALTER TABLE app_meals ADD COLUMN IF NOT EXISTS carbs_g NUMERIC(10, 2);
