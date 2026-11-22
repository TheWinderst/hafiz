#!/usr/bin/env node
import { yollar, secenekler, klasorVarMi, jsonOku, metinOku, kayitOku, kurulumPlani, dosyalariKopyala, yedekliYaz, kayitYaz, DOSYALAR } from './codex/kurulum-codex.mjs';

function rapor(y, plan, kuru) {
  const g = plan.guven;
  if (plan.prompt.durum === 'kullanici') console.log(`Özet talimatı: mevcut ${plan.prompt.anahtar} ayarınız korundu, Hafız'ın beş kuralı özete eklenmez.`);
  else if (plan.prompt.durum === 'zaten') console.log('Özet talimatı: ayar satırı zaten kurulu.');
  else console.log(`Özet talimatı: ${y.config} dosyasına experimental_compact_prompt_file satırı ${kuru ? 'eklenecek' : 'eklendi'}.`);
  if (g.durum === 'uyusmazlik') console.log("Kanca güveni YAZILMADI: güven formülü mevcut kayıtlarla uyuşmadı. Codex'te /hooks ya da Ayarlar > Kancalar'dan Hafız kancalarına güvenin.");
  else if (g.durum === 'sinanamadi') console.log(`Kanca güveni ${kuru ? 'yazılacak' : 'yazıldı'}, ama formülü sınayacak mevcut bir kayıt yoktu. Kancalar çalışmazsa Codex'te /hooks ya da Ayarlar > Kancalar'dan güvenin.`);
  else console.log(`Kanca güveni: ${g.eklenen} tablo ${kuru ? 'eklenecek' : 'eklendi'}, ${g.guncellenen} ${kuru ? 'güncellenecek' : 'güncellendi'}, ${g.eslesen} mevcut kayıt formülle uyuştu.`);
}

try {
  const { kuru } = secenekler(process.argv.slice(2));
  const y = yollar();
  klasorVarMi(y);
  const hooksEski = jsonOku(y.hooks);
  const configEski = metinOku(y.config);
  const plan = kurulumPlani(y, hooksEski, configEski, kayitOku(y));
  if (kuru) {
    console.log('KURU ÇALIŞMA: hiçbir dosya yazılmadı.');
    console.log(`Codex klasörü: ${y.codex}`);
    console.log(`Kopyalanacak yer: ${y.hedef} (${DOSYALAR.length} dosya + özet talimatı; mevcut Hafız ayarı korunur).`);
    for (const r of plan.istenen) console.log(`${r.olay}${r.matcher ? ` (${r.matcher})` : ''}: ${r.kanca.command}`);
    console.log(`hooks.json değişikliği: ${plan.hooksDegisti ? 'var' : 'yok'}; config.toml değişikliği: ${plan.configDegisti ? 'var' : 'yok'}.`);
    console.log('Değişen dosyaların önce zaman damgalı yedeği alınacak. Diğer kancalar korunacak.');
    rapor(y, plan, true);
  } else {
    // Kancalar eklenmeden önce çalışacak bütün dosyalar hazır olur.
    dosyalariKopyala(y);
    const yedekler = [];
    if (plan.configDegisti) yedekler.push(yedekliYaz(y.config, plan.configYeni));
    if (plan.hooksDegisti) yedekler.push(yedekliYaz(y.hooks, JSON.stringify(plan.hooksYeni, null, 2) + '\n'));
    kayitYaz(y, plan, kayitOku(y));
    console.log('Hafız (Codex) hazır. Sonraki konuşma kısaltmasında devreye girer.');
    rapor(y, plan, false);
    for (const yd of yedekler.filter(Boolean)) console.log(`Yedek: ${yd}`);
  }
} catch (e) { console.error(`Kurulum yapılmadı: ${e.message}`); process.exitCode = 1; }
