#!/usr/bin/env node
// Codex SessionStart kancası (yalnız source=compact): kullanıcının compact öncesi son mesajlarını
// birebir geri basar; çıktı additionalContext olarak modele ulaşır. Hata: sessiz, hata.log, 0.
process.on('uncaughtException', () => process.exit(0));
process.on('unhandledRejection', () => process.exit(0));
let C;
try {
  C = await import('./codex-ortak.mjs');
  const g = JSON.parse((await C.stdinOku()) || '{}');
  if (g.source === 'compact') {
    const k = C.codexOturumu(g);
    if (!k.ok) throw new Error(C.yazi(`reddedildi: ${k.neden}`, `rejected: ${k.neden}`));
    const metin = C.geriBasimMetni(C.durumHazirla(g, k.yol), g.session_id);
    if (metin) C.ciktiYaz(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: metin } }));
  }
} catch (e) {
  try { C?.logla('codex-geri-yukle', e?.message || e); } catch {}
}
process.exit(0);
