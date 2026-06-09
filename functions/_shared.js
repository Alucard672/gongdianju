export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

// 服务端密钥（仅存在于 Functions，不会下发到前端）
const CODE_SECRET = 'gdj-supply-2026::x7Qm91#kZ@auth';
// 查看授权码的管理员密链 token（请保密，泄露后任何人可看当天码）
export const ADMIN_TOKEN = 'gdj7f3a9c2e8b41d6';

// 北京时间日期 key（UTC+8），北京 0 点切换
export function getBeijingDateKey(now = new Date()) {
  const shifted = new Date(now.getTime() + 8 * 3600 * 1000);
  return shifted.toISOString().slice(0, 10);
}

// 当天授权码：由密钥 + 北京日期确定性生成的 4 位数字，每天 0 点自动变化
export async function getDailyCode(dateKey = getBeijingDateKey()) {
  const data = new TextEncoder().encode(`${CODE_SECRET}|${dateKey}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  const arr = new Uint8Array(buf);
  const num = ((arr[0] << 24) | (arr[1] << 16) | (arr[2] << 8) | arr[3]) >>> 0;
  return String(num % 10000).padStart(4, '0');
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
