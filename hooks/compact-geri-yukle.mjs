#!/usr/bin/env node
// SessionStart kancasi (yalniz source=compact): Kullanıcının compact oncesi son mesajlarini
// birebir geri basar. Kanca basina 10.000 karakter tavani oldugu icin settings'te uc kez
// cagrilir: --parca 1, --parca 2, --parca 3 (parcalar ayni sirali listeden belirleyici dilimlenir).
// Hata: sessiz, hata.log'a yazar, 0 ile cikar.
import * as O from './compact-ortak.mjs';

process.on('uncaughtException', e => { O.logla('compact-geri-yukle', O.yazi(`yakalanmayan: ${e?.message}`, `uncaught: ${e?.message}`)); process.exit(0); });

function parcaNo(argv) {
  for (let i = 0; i < argv.length; i++) {
    const m = /^--parca(?:=(\d+))?$/.exec(argv[i]);
    if (m) { const n = Number(m[1] ?? argv[i + 1]); return n >= 1 && n <= O.AYAR.parcaSayisi ? n : 0; }
  }
  return 0;
}

try {
  const g = JSON.parse((await O.stdinOku()) || '{}');
  const n = parcaNo(process.argv.slice(2));
  if (g.source === 'compact' && n && O.altAjanKimligi(g)) {
    // Alt ajan compact'i: kullanici mesajlari ve skill hatirlatmasi basilmaz (ana oturuma aittir); yalniz
    // 1. parcada alt ajanin kendi gorev tanimi birebir geri basilir. Dokum yoksa ya da yol disariya
    // cikarsa sessiz.
    const metin = O.altAjanGorevMetni(n, g);
    if (metin) O.bas(metin);
  } else if (g.source === 'compact' && n) {
    const k = O.kendiTranskripti(g.transcript_path);
    if (!k.ok) throw new Error(O.yazi(`reddedildi: ${k.neden}`, `rejected: ${k.neden}`));
    const veri = O.durumHazirla({ ...g, transcript_path: k.yol });
    if (veri) { const metin = O.parcaMetni(n, veri, g.session_id); if (metin) O.bas(metin); }
  }
} catch (e) {
  O.logla('compact-geri-yukle', e?.message || e);
}
process.exit(0);
