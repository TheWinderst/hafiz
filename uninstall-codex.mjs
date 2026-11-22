#!/usr/bin/env node
import { yollar, secenekler, klasorVarMi, jsonOku, metinOku, kayitOku, kaldirmaPlani, yedekliYaz } from './codex/kurulum-codex.mjs';

try {
  const { kuru } = secenekler(process.argv.slice(2));
  const y = yollar();
  klasorVarMi(y);
  const hooksEski = jsonOku(y.hooks);
  const configEski = metinOku(y.config);
  const plan = kaldirmaPlani(y, hooksEski, configEski, kayitOku(y));
  if (kuru) {
    console.log('KURU ÇALIŞMA: hiçbir dosya yazılmadı.');
    console.log(`Yalnız Hafız kayıtları kaldırılacak: ${y.hooks} ve ${y.config}`);
    console.log(`hooks.json değişikliği: ${plan.hooksDegisti ? 'var' : 'yok'}; config.toml değişikliği: ${plan.configDegisti ? 'var' : 'yok'}.`);
    console.log(`Silinecek güven tablosu: ${plan.silinenGuven.length}; özet talimatı satırı: ${plan.promptSilindi ? 'silinecek' : 'bizim değil ya da yok, dokunulmaz'}.`);
  } else {
    const yedekler = [];
    if (plan.configDegisti) yedekler.push(yedekliYaz(y.config, plan.configYeni));
    if (plan.hooksDegisti) yedekler.push(yedekliYaz(y.hooks, JSON.stringify(plan.hooksYeni, null, 2) + '\n'));
    console.log('Hafız (Codex) kancaları kaldırıldı. Diğer kancalar ve ayarlar korundu.');
    console.log(`Silinen güven tablosu: ${plan.silinenGuven.length}; özet talimatı satırı: ${plan.promptSilindi ? 'silindi' : 'dokunulmadı'}.`);
    for (const yd of yedekler.filter(Boolean)) console.log(`Yedek: ${yd}`);
  }
  if (plan.kayanlar.length) console.log(`Uyarı: ${plan.kayanlar.join(', ')} olayında sonraki kancaların sırası değişti; Codex'te /hooks ile güvenlerini yeniden onaylamanız gerekebilir.`);
  console.log(`Program dosyaları, ayar, özet arşivi ve yedekler silinmedi. Tam silmek için: rm -r ${y.hedef} ${y.durum}`);
} catch (e) { console.error(`Kaldırma yapılmadı: ${e.message}`); process.exitCode = 1; }
