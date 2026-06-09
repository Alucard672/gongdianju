import { json } from './_shared.js';

export async function onRequestGet({ env }) {
  const stats = await env.DB.prepare(
    `SELECT question_no, type, asked, wrong
     FROM question_stats
     WHERE asked > 0
     ORDER BY wrong DESC, (CAST(wrong AS REAL) / asked) DESC`,
  ).all();

  const totals = await env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM exam_results) AS examCount,
       (SELECT COUNT(*) FROM wrong_answers) AS wrongCount`,
  ).first();

  return json({
    ok: true,
    examCount: totals?.examCount ?? 0,
    wrongCount: totals?.wrongCount ?? 0,
    questions: (stats.results || []).map((r) => ({
      no: r.question_no,
      type: r.type,
      asked: r.asked,
      wrong: r.wrong,
      rate: r.asked ? Math.round((r.wrong / r.asked) * 1000) / 10 : 0,
    })),
  });
}
