import { getBeijingDateKey, toPublicRecord } from './_shared.js';

export async function onRequestGet(context) {
  const { request, env, waitUntil } = context;
  const url = new URL(request.url);
  const dateKey = url.searchParams.get('date') || getBeijingDateKey();

  // 边缘缓存：15 秒内同一天的排行直接返回，不再查库
  const cache = caches.default;
  const cacheKey = new Request(`https://cache/ranking?date=${dateKey}`);
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const { results } = await env.DB.prepare(
    `SELECT id, name, phone, score, total, correct_count, question_count, duration_ms, submitted_at, date_key
     FROM exam_results
     WHERE date_key = ?
     ORDER BY score DESC, duration_ms ASC, submitted_at ASC
     LIMIT 100`,
  )
    .bind(dateKey)
    .all();

  const resp = new Response(
    JSON.stringify({
      ok: true,
      dateKey,
      ranking: results.map((record, index) => toPublicRecord(record, index + 1)),
    }),
    { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=15' } },
  );
  if (waitUntil) waitUntil(cache.put(cacheKey, resp.clone()));
  return resp;
}
