#!/usr/bin/env node
import { yollar, secenekler, jsonOku, kurulumPlani, dosyalariKopyala, atomik, ayarYaz, ayarYedekle, DOSYALAR } from './kurulum-ortak.mjs';

try {
  const { kuru, pencere } = secenekler(process.argv.slice(2));
  const y = yollar();
  const eski = jsonOku(y.ayar);
  const plan = kurulumPlani(eski, y, pencere);
  if (kuru) {
    console.log('KURU ÇALIŞMA: hiçbir dosya yazılmadı.');
    console.log(`Okunan ayar: ${y.ayar}`);
    console.log(`Kopyalanacak yer: ${y.hedef} (${DOSYALAR.length} dosya; mevcut Hafız ayarı korunur).`);
    console.log('Ayar değişecekse önce zaman damgalı yedeği alınacak. Diğer kancalar korunacak.');
    for (const r of plan.kancalar) console.log(`${r.olay}${r.matcher ? ` (${r.matcher})` : ''}: ${r.kanca.command}`);
    if (pencere !== undefined) console.log(`autoCompactWindow: ${pencere}`);
    console.log(`Ayar değişikliği: ${JSON.stringify(eski) === JSON.stringify(plan.ayar) ? 'yok' : 'var'}`);
  } else {
    // Ayara kancaları eklemeden önce çalışacak bütün dosyalar hazır olur.
    const yedek = ayarYedekle(y, eski, plan.ayar);
    dosyalariKopyala(y);
    ayarYaz(y, eski, plan.ayar, yedek);
    atomik(y.kayit, JSON.stringify({ kancalar: plan.kancalar }, null, 2) + '\n');
    console.log('Hafız hazır. Sonraki konuşma kısaltmasında devreye girer.');
    if (yedek) console.log(`Ayar yedeği: ${yedek}`);
  }
} catch (e) { console.error(`Kurulum yapılmadı: ${e.message}`); process.exitCode = 1; }
