import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ayarOku } from './hooks/hafiz-ayar.mjs';

export const KAYNAK = fileURLToPath(new URL('./hooks/', import.meta.url));
export const DOSYALAR = ['compact-ortak.mjs', 'compact-oncesi.mjs', 'compact-sonrasi-kaydet.mjs', 'compact-geri-yukle.mjs', 'hafiz-ayar.mjs', 'hafiz-ayar.json'];
const alinti = s => "'" + s.replace(/'/g, "'\"'\"'") + "'";
export function yollar() {
  const claude = path.join(os.homedir(), '.claude');
  const hedef = path.join(claude, 'hafiz');
  return { claude, hedef, ayar: path.join(claude, 'settings.json'), kayit: path.join(hedef, 'kurulum-kaydi.json') };
}
export function secenekler(args, kaldir = false) {
  let kuru = false; let pencere;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--kuru') kuru = true;
    else if (args[i] === '--pencere' && !kaldir) {
      const s = args[++i];
      if (!/^\d+$/.test(s || '') || !Number.isSafeInteger(Number(s)) || Number(s) < 1) throw new Error('Pencere pozitif bir tam sayı olmalı.');
      pencere = Number(s);
    } else throw new Error(`Bilinmeyen seçenek: ${args[i]}`);
  }
  return { kuru, pencere };
}
export function jsonOku(yol, eksik = {}) {
  try {
    const v = JSON.parse(fs.readFileSync(yol, 'utf8'));
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Bir nesne bekleniyor.');
    return v;
  } catch (e) { if (e.code === 'ENOENT') return eksik; throw new Error(`Ayar okunamadı: ${e.message}`); }
}
export function kancaListesi(hedef, sayi) {
  const komut = ad => `${alinti(process.execPath)} ${alinti(path.join(hedef, ad))}`;
  return [
    { olay: 'PreCompact', kanca: { type: 'command', command: komut('compact-oncesi.mjs'), timeout: 10 } },
    { olay: 'PostCompact', kanca: { type: 'command', command: komut('compact-sonrasi-kaydet.mjs'), timeout: 10 } },
    ...Array.from({ length: sayi }, (_, i) => ({ olay: 'SessionStart', matcher: 'compact', kanca: { type: 'command', command: `${komut('compact-geri-yukle.mjs')} --parca ${i + 1}`, timeout: 10 } }))
  ];
}
function listeDogrula(s) {
  if (s.hooks === undefined) return;
  if (!s.hooks || typeof s.hooks !== 'object' || Array.isArray(s.hooks)) throw new Error('Kanca ayarlarının biçimi tanınmıyor.');
  for (const ad of ['PreCompact', 'PostCompact', 'SessionStart']) {
    const l = s.hooks[ad];
    if (l === undefined) continue;
    if (!Array.isArray(l) || l.some(g => !g || typeof g !== 'object' || !Array.isArray(g.hooks))) throw new Error(`Kanca listesi tanınmıyor: ${ad}`);
  }
}
// Komutun tamamı ve olay eşleşir. Benzer adlı başka kancalara dokunulmaz.
export function bizeAit(g, k, olay, kayitlar) {
  return kayitlar.some(r => r.olay === olay && (r.matcher || '') === (g.matcher || '') && r.kanca.type === k.type && r.kanca.command === k.command);
}
export function kancalariKaldir(s, kayitlar) {
  listeDogrula(s);
  const v = structuredClone(s);
  for (const olay of ['PreCompact', 'PostCompact', 'SessionStart']) {
    if (!v.hooks?.[olay]) continue;
    const kalan = [];
    for (const g of v.hooks[olay]) {
      const yeni = g.hooks.filter(k => !bizeAit(g, k, olay, kayitlar));
      if (yeni.length === g.hooks.length) kalan.push(g);
      else if (yeni.length) kalan.push({ ...g, hooks: yeni });
    }
    if (kalan.length) v.hooks[olay] = kalan;
    else delete v.hooks[olay];
  }
  if (v.hooks && !Object.keys(v.hooks).length) delete v.hooks;
  return v;
}
export function kurulumPlani(s, y, pencere) {
  const ayarYolu = fs.existsSync(path.join(y.hedef, 'hafiz-ayar.json')) ? path.join(y.hedef, 'hafiz-ayar.json') : path.join(KAYNAK, 'hafiz-ayar.json');
  const istenen = kancaListesi(y.hedef, ayarOku(ayarYolu).parcaSayisi);
  const onceki = jsonOku(y.kayit).kancalar;
  if (onceki !== undefined && !Array.isArray(onceki)) throw new Error('Kurulum kaydı tanınmıyor.');
  // Eski yürütücü yolu / parça sayısı da kayıttan tanınır.
  const v = kancalariKaldir(s, [...(onceki || []), ...kancaListesi(y.hedef, 20)]);
  v.hooks ||= {};
  for (const r of istenen) {
    v.hooks[r.olay] ||= [];
    v.hooks[r.olay].push({ ...(r.matcher ? { matcher: r.matcher } : {}), hooks: [r.kanca] });
  }
  if (pencere !== undefined) v.autoCompactWindow = pencere;
  return { ayar: v, kancalar: istenen };
}
export function atomik(yol, metin) {
  const tmp = `${yol}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try { fs.writeFileSync(tmp, metin, { mode: 0o600, flag: 'wx' }); fs.renameSync(tmp, yol); }
  finally { try { fs.unlinkSync(tmp); } catch {} }
}
export function ayarYedekle(y, onceki, sonraki) {
  if (JSON.stringify(onceki) === JSON.stringify(sonraki) || !fs.existsSync(y.ayar)) return null;
  const yedek = `${y.ayar}.hafiz-yedek-${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID()}`;
  fs.copyFileSync(y.ayar, yedek, fs.constants.COPYFILE_EXCL);
  fs.chmodSync(yedek, 0o600);
  return yedek;
}
export function ayarYaz(y, onceki, sonraki, hazirYedek) {
  if (JSON.stringify(onceki) === JSON.stringify(sonraki)) return null;
  const yedek = hazirYedek === undefined ? ayarYedekle(y, onceki, sonraki) : hazirYedek;
  atomik(y.ayar, JSON.stringify(sonraki, null, 2) + '\n');
  return yedek;
}

export function dosyalariKopyala(y) {
  fs.mkdirSync(y.hedef, { recursive: true, mode: 0o700 });
  fs.chmodSync(y.hedef, 0o700);
  for (const ad of DOSYALAR) {
    const hedef = path.join(y.hedef, ad);
    if (ad === 'hafiz-ayar.json' && fs.existsSync(hedef)) continue;
    atomik(hedef, fs.readFileSync(path.join(KAYNAK, ad)));
  }
}
