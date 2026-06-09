import { json, getDateKey, toPublicRecord } from './_shared.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const dateKey = url.searchParams.get('date') || getDateKey();
  const { results } = await env.DB.prepare(
    `SELECT id, name, phone, score, total, correct_count, question_count, duration_ms, submitted_at, date_key
     FROM exam_results
     WHERE date_key = ?
     ORDER BY score DESC, duration_ms ASC, submitted_at ASC
     LIMIT 200`,
  )
    .bind(dateKey)
    .all();

  return json({
    ok: true,
    dateKey,
    ranking: results.map((record, index) => toPublicRecord(record, index + 1)),
  });
}
