const axios = require('axios');

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = 'deepseek-chat';

function extractJsonFromText(text) {
  const trimmed = String(text).trim();
  const block = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = block ? block[1].trim() : trimmed;
  return JSON.parse(raw);
}

function buildUserPrompt({ goal, level, weightKg, heightCm }) {
  const goalRu =
    goal === 'weight_loss'
      ? 'похудение'
      : goal === 'muscle_gain'
        ? 'набор мышечной массы'
        : goal;

  const levelRu =
    level === 'beginner'
      ? 'начальный'
      : level === 'intermediate'
        ? 'средний'
        : level === 'advanced'
          ? 'продвинутый'
          : level;

  return `Составь персональный план на МЕСЯЦ (4 недели): тренировки и питание + ежедневные задачи.

Параметры человека:
- Цель: ${goalRu}
- Уровень подготовки: ${levelRu}
- Вес: ${weightKg} кг
- Рост: ${heightCm} см

Верни ТОЛЬКО валидный JSON без пояснений до или после, строго в такой структуре:
{
  "summary": "краткое описание плана на месяц одним абзацем",
  "monthly_overview": "как распределены недели и акценты",
  "workouts": [
    {
      "week_number": 1,
      "day_number": 1,
      "title": "название тренировки",
      "content": "подробное описание упражнений, подходов, отдыха"
    }
  ],
  "meals": [
    {
      "meal_type": "завтрак|обед|ужин|перекус|принцип_дня",
      "description": "что есть и примерные порции / правила питания",
      "calories": 500
    }
  ],
  "daily_tasks": [
    {
      "day_index": 1,
      "label": "День 1",
      "tasks": ["короткие напоминания в свободной форме"],
      "workout_duration_min": 45,
      "workout_exercises": [
        {
          "name": "название упражнения",
          "sets": 4,
          "reps": 8,
          "weight_kg": 70,
          "duration_min": null
        },
        {
          "name": "бег / эллипс",
          "sets": null,
          "reps": null,
          "weight_kg": null,
          "duration_min": 20
        }
      ],
      "nutrition": {
        "calories": 2300,
        "protein_g": 140,
        "fat_g": 65,
        "carbs_g": 260,
        "meals_count": 4
      }
    }
  ]
}

Требования:
- минимум 8 элементов в workouts (по нескольким неделям);
- минимум 6 элементов в meals;
- минимум 7 элементов в daily_tasks (хотя бы неделя ежедневных задач; day_index 1..7);
- calories — целые оценки где уместно.
- для КАЖДОГО дня из daily_tasks заполняй блоки workout_exercises и nutrition числами; workout_duration_min — ориентировочная длительность сессии.`;
}

async function generatePlanWithDeepSeek(params) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY не задан в .env');
  }

  const systemPrompt =
    'Ты спортивный и диетологический консультант. Отвечай только JSON по заданной схеме, без markdown вокруг JSON.';

  let response;
  try {
    response = await axios.post(
      DEEPSEEK_URL,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: buildUserPrompt(params) },
        ],
        temperature: 0.6,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000,
      },
    );
  } catch (err) {
    const msg =
      err.response?.data?.error?.message ||
      err.response?.data ||
      err.message ||
      'Ошибка запроса к DeepSeek';
    const httpStatus = err.response?.status;
    const e = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    e.status = httpStatus || 502;
    throw e;
  }

  const text = response.data?.choices?.[0]?.message?.content;
  if (!text) {
    const e = new Error('Пустой ответ от DeepSeek');
    e.status = 502;
    throw e;
  }

  let parsed;
  try {
    parsed = extractJsonFromText(text);
  } catch (parseErr) {
    const e = new Error('Не удалось разобрать JSON из ответа модели');
    e.status = 502;
    e.detail = text.slice(0, 500);
    throw e;
  }

  if (!parsed.summary || typeof parsed.summary !== 'string') {
    const e = new Error('Модель вернула JSON без summary');
    e.status = 502;
    throw e;
  }
  if (!Array.isArray(parsed.workouts) || parsed.workouts.length < 6) {
    const e = new Error('Мало блоков workouts в ответе (нужно ≥6)');
    e.status = 502;
    throw e;
  }
  if (!Array.isArray(parsed.meals) || parsed.meals.length < 5) {
    const e = new Error('Мало блоков meals в ответе (нужно ≥5)');
    e.status = 502;
    throw e;
  }
  if (!Array.isArray(parsed.daily_tasks) || parsed.daily_tasks.length < 7) {
    const e = new Error('Мало daily_tasks (нужно ≥7 дней с задачами)');
    e.status = 502;
    throw e;
  }

  return parsed;
}

module.exports = {
  generatePlanWithDeepSeek,
  extractJsonFromText,
};
