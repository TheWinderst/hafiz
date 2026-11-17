#!/usr/bin/env node
import { yollar, secenekler, jsonOku, kancaListesi, kancalariKaldir, ayarYaz } from './kurulum-ortak.mjs';

try {
  const { kuru } = secenekler(process.argv.slice(2), true);
  const y = yollar();
  const eski = jsonOku(y.ayar);
  const kayitlar = jsonOku(y.kayit).kancalar || [];
  if (!Array.isArray(kayitlar)) throw new Error('Kurulum kaydı tanınmıyor.');
  const yeni = kancalariKaldir(eski, [...kayitlar, ...kancaListesi(y.hedef, 20)]);
  if (kuru) {
    console.log('KURU ÇALIŞMA: hiçbir dosya yazılmadı.');
    console.log(`Yalnız Hafız kancaları kaldırılacak: ${y.ayar}`);
    console.log(`Ayar değişikliği: ${JSON.stringify(eski) === JSON.stringify(yeni) ? 'yok' : 'var'}`);
  } else {
    const yedek = ayarYaz(y, eski, yeni);
    console.log('Hafız kancaları kaldırıldı. Diğer ayarlar, dosyalar ve arşiv korundu.');
    if (yedek) console.log(`Ayar yedeği: ${yedek}`);
  }
} catch (e) { console.error(`Kaldırma yapılmadı: ${e.message}`); process.exitCode = 1; }
