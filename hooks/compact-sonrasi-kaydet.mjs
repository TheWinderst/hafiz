#!/usr/bin/env node
// PostCompact kancasi: compact ozetini oturum klasorune kaydeder (son 5 tane kalir).
// Hicbir sey basmaz, her zaman 0 ile cikar.
import fs from 'node:fs';
import path from 'node:path';
import * as O from './compact-ortak.mjs';

process.on('uncaughtException', e => { O.logla('compact-sonrasi-kaydet', O.yazi(`yakalanmayan: ${e?.message}`, `uncaught: ${e?.message}`)); process.exit(0); });

try {
  const g = JSON.parse((await O.stdinOku()) || '{}');
  // Alt ajan compact'i: ozet ana oturumun klasorune yazilmaz, ana oturumun eski ozetleri silinmez.
  if (O.altAjanKimligi(g)) process.exit(0);
  const k = O.kendiTranskripti(g.transcript_path);
  if (!k.ok) throw new Error(O.yazi(`reddedildi: ${k.neden}`, `rejected: ${k.neden}`));
  if (typeof g.compact_summary === 'string' && g.compact_summary) {
    const dizin = O.oturumKlasoru(g.session_id);
    const ad = `ozet-${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
    O.atomikYaz(path.join(dizin, ad), g.compact_summary);
    const eskiler = fs.readdirSync(dizin).filter(a => /^ozet-.*\.md$/.test(a)).sort();
    for (const a of eskiler.slice(0, Math.max(0, eskiler.length - O.OZET_SAKLA))) {
      try { fs.unlinkSync(path.join(dizin, a)); } catch {}
    }
  }
} catch (e) {
  O.logla('compact-sonrasi-kaydet', e?.message || e);
}
process.exit(0);
