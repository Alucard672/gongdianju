import { json, getDateKey, validateRecord, toPublicRecord } from './_shared.js';

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  const error = validateRecord(body);
  if (error) return json({ ok: false, error }, 400);

  const submittedAt = new Date().toISOString();
  const record = {
    id: crypto.randomUUID(),
    name: String(body.name).trim(),
    phone: String(body.phone).trim(),
    score: Number(body.score),
    total: Number(body.total || 100),
    correctCount: Number(body.correctCount || 0),
    questionCount: Number(body.questionCount || 95),
    durationMs: Math.max(0, Math.floor(Number(body.durationMs))),
    submittedAt,
    dateKey: getDateKey(submittedAt),
  };

  await env.DB.prepare(
    `INSERT INTO exam_results
      (id, name, phone, score, total, correct_count, question_count, duration_ms, submitted_at, date_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      record.id,
      record.name,
      record.phone,
      record.score,
      record.total,
      record.correctCount,
      record.questionCount,
      record.durationMs,
      record.submittedAt,
      record.dateKey,
    )
    .run();

  return json({ ok: true, record: toPublicRecord(record) });
}
