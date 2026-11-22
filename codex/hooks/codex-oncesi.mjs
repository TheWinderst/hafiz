#!/usr/bin/env node
// Codex PreCompact kancası: compact BAŞLAMADAN önce kullanıcının son mesajlarını birebir saklar.
// Hiçbir şey basmaz, compact'ı ASLA durdurmaz: her hatada 0 ile çıkar.
process.on('uncaughtException', () => process.exit(0));
process.on('unhandledRejection', () => process.exit(0));
let C;
try {
  C = await import('./codex-ortak.mjs');
  const g = JSON.parse((await C.stdinOku()) || '{}');
  const k = C.codexOturumu(g);
  if (!k.ok) throw new Error(C.yazi(`reddedildi: ${k.neden}`, `rejected: ${k.neden}`));
  C.durumYaz(g.session_id, g.trigger, C.topla(k.yol));
  C.temizlik(C.durumKok(), { haric: C.oturumAdi(g.session_id) });
} catch (e) {
  try { C?.logla('codex-oncesi', e?.message || e); } catch {}
}
process.exit(0);
