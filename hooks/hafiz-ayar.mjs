import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AYAR_YOLU = fileURLToPath(new URL('./hafiz-ayar.json', import.meta.url));
const VARSAYILAN = {
  durumDizini: '~/.claude/hafiz-durum', saklamaGunu: 7, boyutMB: 50,
  toplamKarakter: 80000, mesajKarakter: 4000, parcaSayisi: 3,
  parcaKarakter: 9500, ozetSayisi: 5, dil: 'tr'
};
const sayi = (n, fallback, min, max) =>
  typeof n === 'number' && Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : fallback;

export function ayarOku(yol = process.env.HAFIZ_AYAR_DOSYASI || AYAR_YOLU) {
  let v = {};
  try { const a = JSON.parse(fs.readFileSync(yol, 'utf8')); if (a && typeof a === 'object' && !Array.isArray(a)) v = a; } catch {}
  const a = { ...VARSAYILAN };
  a.parcaKarakter = sayi(v.parcaKarakter, a.parcaKarakter, 2000, 9500);
  a.parcaSayisi = sayi(v.parcaSayisi, a.parcaSayisi, 1, 20);
  a.saklamaGunu = sayi(v.saklamaGunu, a.saklamaGunu, 1, 365);
  a.boyutMB = sayi(v.boyutMB, a.boyutMB, 1, 1024);
  a.toplamKarakter = sayi(v.toplamKarakter, a.toplamKarakter, 1, 1000000);
  const ilkPay = Math.min(1500, Math.floor(a.parcaKarakter / 3));
  const mesajMax = a.parcaKarakter - 200 - ilkPay - 200;
  a.mesajKarakter = Math.min(sayi(v.mesajKarakter, a.mesajKarakter, 100, mesajMax), a.toplamKarakter);
  a.ozetSayisi = sayi(v.ozetSayisi, a.ozetSayisi, 1, 100);
  a.dil = v.dil === 'en' ? 'en' : 'tr';
  if (typeof v.durumDizini === 'string' && v.durumDizini.trim()) a.durumDizini = v.durumDizini;
  a.ayarDizini = path.dirname(path.resolve(yol));
  return a;
}
export const AYAR = ayarOku();
export const yazi = (tr, en) => AYAR.dil === 'en' ? en : tr;
export function durumDizini() {
  const d = process.env.HAFIZ_DURUM_DIZIN || AYAR.durumDizini;
  if (d === '~') return os.homedir();
  if (d.startsWith('~/')) return path.join(os.homedir(), d.slice(2));
  return path.resolve(AYAR.ayarDizini, d);
}
