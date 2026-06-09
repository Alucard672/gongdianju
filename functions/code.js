import { json, getDailyCode, getBeijingDateKey, ADMIN_TOKEN } from './_shared.js';

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  if (token !== ADMIN_TOKEN) return json({ ok: false, error: 'forbidden' }, 403);
  const dateKey = getBeijingDateKey();
  const code = await getDailyCode(dateKey);
  return json({ ok: true, date: dateKey, code });
}
