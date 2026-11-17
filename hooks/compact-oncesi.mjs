#!/usr/bin/env node
// PreCompact kancasi: compact BASLAMADAN once Kullanıcının son mesajlarini birebir saklar ve
// ozet talimatini basar (stdout compact ozet talimatina eklenir). Compact'i ASLA engellemez:
// her hatada talimati basip 0 ile cikar.
import * as O from './compact-ortak.mjs';

const TALIMAT = O.yazi(`ÖZET TALİMATI (Hafız compact kuralı):
1. Kullanıcının her düzeltmesini, yasağını, kararını ve onayını tırnak içinde, kelimesi kelimesine ve tarihiyle "All user messages" bölümünde koru; özetleme, yorumlama.
2. Bu oturumda açılan skill'leri ve hangi işin hangi işçiye verildiğini iş kimliğiyle ve son durumuyla yaz.
3. Süren işin tam durumu: biten, kalan, doğrulanmamış adımlar; dokunulan dosyaların tam yolları; onay bekleyen kapılar ve kullanıcının neyi onaylayıp neyi onaylamadığı.
4. "Files and Code Sections" bölümünde kodun tamamını değil yol + bir satırlık değişiklik yaz; yer kullanıcının sözlerine kalsın.
5. Kullanıcının son mesajları ayrıca birebir saklandı ve compact sonrası geri basılacak; özet onlarla çelişmesin.`,
`SUMMARY INSTRUCTIONS (Hafız compact rule):
1. Preserve each user correction, prohibition, decision and approval verbatim, in quotes with its date, in "All user messages"; do not summarize or interpret it.
2. List skills opened in this session and delegated tasks, with task IDs and current status.
3. Record work completed, remaining and unverified; full paths of changed files; pending approvals and exactly what the user has approved.
4. In "Files and Code Sections", use a path and a one-line change description instead of full code, leaving room for the user's words.
5. The latest user messages are saved separately and will be restored after compact; the summary must agree with them.`);

let basildi = false;
function cikti() { if (basildi) return; basildi = true; O.bas(TALIMAT); }
process.on('uncaughtException', e => { O.logla('compact-oncesi', O.yazi(`yakalanmayan: ${e?.message}`, `uncaught: ${e?.message}`)); cikti(); process.exit(0); });

try {
  const g = JSON.parse((await O.stdinOku()) || '{}');
  const sid = g.session_id;
  const k = O.kendiTranskripti(g.transcript_path);
  if (!k.ok) throw new Error(O.yazi(`reddedildi: ${k.neden}`, `rejected: ${k.neden}`)); // yalniz talimat basilir, durum yazilmaz
  const sonuc = O.topla(k.yol);
  O.durumYaz(sid, g.trigger, sonuc);
  O.temizlik(O.durumKok(), { haric: O.oturumAdi(sid) });
} catch (e) {
  O.logla('compact-oncesi', e?.message || e);
}
cikti();
process.exit(0);
