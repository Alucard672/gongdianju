const ALLOWED_ORIGINS = new Set([
  'http://localhost:8787',
  'https://alucard672.github.io',
]);

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://alucard672.github.io';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, request, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(request),
    },
  });
}

function getDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function maskName(name) {
  const value = String(name || '').trim();
  if (!value) return '';
  if (value.length === 1) return `${value}*`;
  if (value.length === 2) return `${value[0]}*`;
  return `${value[0]}*${value[value.length - 1]}`;
}

function maskPhone(phone) {
  const value = String(phone || '').trim();
  if (value.length < 8) return value.replace(/.(?=.{2})/g, '*');
  return `${value.slice(0, 3)}****${value.slice(-4)}`;
}

function validateRecord(record) {
  if (!record || typeof record !== 'object') return '提交数据无效';
  if (!String(record.name || '').trim()) return '姓名不能为空';
  if (!/^1[3-9]\d{9}$/.test(String(record.phone || '').trim())) return '手机号无效';
  if (!Number.isFinite(Number(record.score))) return '成绩无效';
  if (!Number.isFinite(Number(record.durationMs))) return '用时无效';
  return '';
}

async function submitResult(request, env) {
  const body = await request.json().catch(() => null);
  const error = validateRecord(body);
  if (error) return json({ ok: false, error }, request, 400);

  const submittedAt = new Date().toISOString();
  const id = crypto.randomUUID();
  const record = {
    id,
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

  return json({ ok: true, record: toPublicRecord(record) }, request);
}

function toPublicRecord(record, rank) {
  return {
    id: record.id,
    rank,
    name: maskName(record.name),
    phone: maskPhone(record.phone),
    score: Number(record.score),
    total: Number(record.total),
    correctCount: Number(record.correctCount ?? record.correct_count),
    questionCount: Number(record.questionCount ?? record.question_count),
    durationMs: Number(record.durationMs ?? record.duration_ms),
    submittedAt: record.submittedAt ?? record.submitted_at,
    dateKey: record.dateKey ?? record.date_key,
  };
}

async function getRanking(request, env) {
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
  }, request);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const url = new URL(request.url);
    if (url.pathname === '/health') return json({ ok: true }, request);
    if (url.pathname === '/submit' && request.method === 'POST') return submitResult(request, env);
    if (url.pathname === '/ranking' && request.method === 'GET') return getRanking(request, env);

    return json({ ok: false, error: 'Not found' }, request, 404);
  },
};
