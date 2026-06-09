import { json, getDailyCode } from './_shared.js';

export async function onRequestPost({ request }) {
  const body = await request.json().catch(() => null);
  const input = String(body?.code ?? '').trim();
  if (!/^\d{4}$/.test(input)) return json({ ok: false, error: '请输入 4 位授权码' }, 400);
  const today = await getDailyCode();
  if (input !== today) return json({ ok: false, error: '授权码错误' }, 403);
  return json({ ok: true });
}
