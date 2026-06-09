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

  const statements = [
    env.DB.prepare(
      `INSERT INTO exam_results
        (id, name, phone, score, total, correct_count, question_count, duration_ms, submitted_at, date_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      record.id, record.name, record.phone, record.score, record.total,
      record.correctCount, record.questionCount, record.durationMs, record.submittedAt, record.dateKey,
    ),
  ];

  // 逐题统计 + 错题留痕（items 由前端可选上报）
  const items = Array.isArray(body.items) ? body.items.slice(0, 200) : [];
  for (const it of items) {
    const no = Number(it.no);
    if (!Number.isInteger(no)) continue;
    const wrong = it.wrong ? 1 : 0;
    const type = String(it.type || '').slice(0, 8);
    statements.push(
      env.DB.prepare(
        `INSERT INTO question_stats (question_no, type, asked, wrong)
         VALUES (?, ?, 1, ?)
         ON CONFLICT(question_no) DO UPDATE SET asked = asked + 1, wrong = wrong + excluded.wrong, type = excluded.type`,
      ).bind(no, type, wrong),
    );
    if (wrong) {
      statements.push(
        env.DB.prepare(
          `INSERT INTO wrong_answers (id, name, phone, question_no, user_answer, correct_answer, date_key, submitted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(
          crypto.randomUUID(), record.name, record.phone, no,
          String(it.ua || '').slice(0, 16), String(it.ca || '').slice(0, 16),
          record.dateKey, submittedAt,
        ),
      );
    }
  }

  await env.DB.batch(statements);

  return json({ ok: true, record: toPublicRecord(record) });
}
