# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

## Backend (Express API) + PostgreSQL

В проекте есть backend в папке `backend/`. Фронт ходит в API через `constants/api.js`:

- В dev (Expo Go) адрес API берётся из `app.json → expo.extra.apiBaseUrl`
- В EAS build (APK/preview/production) адрес API берётся из `EXPO_PUBLIC_API_BASE_URL` на этапе сборки

### Быстрый запуск backend локально

```bash
cd backend
npm install
cp .env.example .env
node src/server.js
```

Проверка здоровья:

```bash
curl http://localhost:3000/health
```

### Инициализация схемы БД (локально или на VPS)

В `backend/` лежат SQL файлы:

- `schema.sql` — базовая схема (users/plans/workouts/meals) + demo user
- `schema_migration_v2.sql` — добавляет auth поля + таблицы дневника (`app_workouts`, `app_meals`)
- `schema_migration_v3.sql` — добавляет поля БЖУ и gender

Пример применения:

```bash
psql "postgresql://<user>:<pass>@<host>:5432/<db>" -f backend/schema.sql
psql "postgresql://<user>:<pass>@<host>:5432/<db>" -f backend/schema_migration_v2.sql
psql "postgresql://<user>:<pass>@<host>:5432/<db>" -f backend/schema_migration_v3.sql
```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
