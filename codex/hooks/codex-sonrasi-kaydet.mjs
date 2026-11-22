#!/usr/bin/env node
// Codex PostCompact kancası: dökümdeki düz compact özetini oturum klasörüne kaydeder (son 5 kalır).
// OpenAI modellerinde özet şifrelidir; okunamayan ya da boş özet sessizce atlanır. Hiçbir şey basmaz.
process.on('uncaughtException', () => process.exit(0));
process.on('unhandledRejection', () => process.exit(0));

const bekle = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
let C;
try {
  C = await import('./codex-ortak.mjs');
  const g = JSON.parse((await C.stdinOku()) || '{}');
  const k = C.codexOturumu(g);
  if (!k.ok) throw new Error(C.yazi(`reddedildi: ${k.neden}`, `rejected: ${k.neden}`));
  // PreCompact'in durumundan eski kayıt bu compact'ın özeti sayılmaz.
  const baslangic = Date.parse(C.durumOku(g.session_id)?.olusturma) || 0;
  const aralik = process.env.HAFIZ_TEST === '1' && process.env.HAFIZ_CODEX_YENIDEN_MS ? Number(process.env.HAFIZ_CODEX_YENIDEN_MS) : 300;
  let kayit = null;
  for (let deneme = 0; deneme <= 5; deneme++) {
    if (deneme) bekle(aralik);
    const c = C.enYeniCompacted(k.yol);
    const ms = c ? Date.parse(c.zaman) : NaN;
    if (c && (!baslangic || Number.isNaN(ms) || ms >= baslangic - 1000)) { kayit = c; break; }
  }
  if (kayit && typeof kayit.message === 'string' && kayit.message.trim()) C.ozetKaydet(g.session_id, kayit.message);
} catch (e) {
  try { C?.logla('codex-sonrasi-kaydet', e?.message || e); } catch {}
}
process.exit(0);
