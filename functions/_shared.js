export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export function getDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function maskName(name) {
  const value = String(name || '').trim();
  if (!value) return '';
  if (value.length === 1) return `${value}*`;
  if (value.length === 2) return `${value[0]}*`;
  return `${value[0]}*${value[value.length - 1]}`;
}

export function maskPhone(phone) {
  const value = String(phone || '').trim();
  if (value.length < 8) return value.replace(/.(?=.{2})/g, '*');
  return `${value.slice(0, 3)}****${value.slice(-4)}`;
}

export function validateRecord(record) {
  if (!record || typeof record !== 'object') return '提交数据无效';
  if (!String(record.name || '').trim()) return '姓名不能为空';
  if (!/^1[3-9]\d{9}$/.test(String(record.phone || '').trim())) return '手机号无效';
  if (!Number.isFinite(Number(record.score))) return '成绩无效';
  if (!Number.isFinite(Number(record.durationMs))) return '用时无效';
  return '';
}

export function toPublicRecord(record, rank) {
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
