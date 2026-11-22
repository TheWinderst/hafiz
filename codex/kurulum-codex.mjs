// Hafız'ın Codex kurulumu: hooks.json ve config.toml düzenlenir, kanca dosyaları kopyalanır.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ayarOku } from '../hooks/hafiz-ayar.mjs';

const KAYNAK_CODEX = fileURLToPath(new URL('./hooks/', import.meta.url));
const KAYNAK_ORTAK = fileURLToPath(new URL('../hooks/', import.meta.url));
const KAYNAK_TALIMAT = fileURLToPath(new URL('./', import.meta.url));
export const DOSYALAR = [
  { kaynak: KAYNAK_ORTAK, ad: 'compact-ortak.mjs' }, { kaynak: KAYNAK_ORTAK, ad: 'hafiz-ayar.mjs' },
  { kaynak: KAYNAK_CODEX, ad: 'codex-ortak.mjs' }, { kaynak: KAYNAK_CODEX, ad: 'codex-oncesi.mjs' },
  { kaynak: KAYNAK_CODEX, ad: 'codex-sonrasi-kaydet.mjs' }, { kaynak: KAYNAK_CODEX, ad: 'codex-geri-yukle.mjs' },
  { kaynak: KAYNAK_CODEX, ad: 'hafiz-ayar.json' }
];
export const ISARET = '# hafiz-codex: özet talimatı';
const PROMPT_ANAHTARI = 'experimental_compact_prompt_file';
const alinti = s => "'" + s.replace(/'/g, "'\"'\"'") + "'";
const OLAYLAR = ['PreCompact', 'PostCompact', 'SessionStart'];

export function yollar() {
  const codex = path.resolve(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'));
  const hedef = path.join(codex, 'hafiz');
  return {
    codex, hedef, hooks: path.join(codex, 'hooks.json'), config: path.join(codex, 'config.toml'),
    kayit: path.join(hedef, 'kurulum-kaydi.json'), talimat: path.join(hedef, 'ozet-talimati.md'),
    durum: path.join(codex, 'hafiz-durum')
  };
}
export function secenekler(args) {
  let kuru = false;
  for (const a of args) { if (a === '--kuru') kuru = true; else throw new Error(`Bilinmeyen seçenek: ${a}`); }
  return { kuru };
}
export function klasorVarMi(y) {
  let st; try { st = fs.statSync(y.codex); } catch { st = null; }
  if (!st || !st.isDirectory()) throw new Error(`Codex klasörü bulunamadı: ${y.codex}`);
}
export function jsonOku(yol, eksik = {}) {
  try {
    const v = JSON.parse(fs.readFileSync(yol, 'utf8'));
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Bir nesne bekleniyor.');
    return v;
  } catch (e) { if (e.code === 'ENOENT') return eksik; throw new Error(`Okunamadı (${path.basename(yol)}): ${e.message}`); }
}
export function metinOku(yol) {
  try { return fs.readFileSync(yol, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return ''; throw new Error(`Okunamadı (${path.basename(yol)}): ${e.message}`); }
}

// ---------------------------------------------------------------- hooks.json
// Kararlı node yolu: Homebrew'un sürümlü Cellar yolu yerine aynı ikiliye giden bin bağlantısı
// (node güncellenince kancalar kırılmasın). HAFIZ_NODE verilirse o kullanılır.
export function nodeYolu(calisan = process.execPath) {
  if (process.env.HAFIZ_NODE) return process.env.HAFIZ_NODE;
  const m = /^(.*)\/Cellar\/node(?:@[^/]+)?\/[^/]+\/bin\/node$/.exec(calisan);
  if (m) {
    const aday = path.join(m[1], 'bin', 'node');
    try { if (fs.realpathSync(aday) === fs.realpathSync(calisan)) return aday; } catch {}
  }
  return calisan;
}
export function kancaListesi(hedef) {
  const komut = ad => `${alinti(nodeYolu())} ${alinti(path.join(hedef, ad))}`;
  return [
    { olay: 'PreCompact', kanca: { type: 'command', command: komut('codex-oncesi.mjs'), timeout: 10 } },
    { olay: 'PostCompact', kanca: { type: 'command', command: komut('codex-sonrasi-kaydet.mjs'), timeout: 10 } },
    { olay: 'SessionStart', matcher: '^compact$', kanca: { type: 'command', command: komut('codex-geri-yukle.mjs'), timeout: 10, additionalContextLimit: 15000 } }
  ];
}
export function hooksDogrula(h) {
  if (h.hooks === undefined) return;
  if (!h.hooks || typeof h.hooks !== 'object' || Array.isArray(h.hooks)) throw new Error('hooks.json biçimi tanınmıyor.');
  for (const ad of OLAYLAR) {
    const l = h.hooks[ad];
    if (l === undefined) continue;
    if (!Array.isArray(l) || l.some(g => !g || typeof g !== 'object' || !Array.isArray(g.hooks) || g.hooks.some(k => !k || typeof k !== 'object'))) throw new Error(`hooks.json kanca listesi tanınmıyor: ${ad}`);
  }
}
const bizimKanca = (tanimli, olay, k) => tanimli.some(t => t.olay === olay && t.kanca?.type === k.type && t.kanca?.command === k.command);

// Bizim işleyicileri bulur: [{ gi, ki }].
function bizimKonumlar(liste, tanimli, olay) {
  const s = [];
  liste.forEach((g, gi) => g.hooks.forEach((k, ki) => { if (bizimKanca(tanimli, olay, k)) s.push({ gi, ki }); }));
  return s;
}
// Bizim gruplar olay dizisinin SONUNA eklenir. Var olan, aynı grup yerinde bırakılır; farklıysa
// (örn. eski düğüm yolu) yerinde değiştirilir; başka kancaların sırası ve güven anahtarı kaymasın.
export function kancalariKur(h, istenen, tanimli) {
  hooksDogrula(h);
  const v = structuredClone(h); v.hooks ||= {};
  for (const r of istenen) {
    const l = (v.hooks[r.olay] ||= []);
    const grup = { ...(r.matcher ? { matcher: r.matcher } : {}), hooks: [r.kanca] };
    const m = bizimKonumlar(l, tanimli, r.olay);
    if (m.length === 1 && l[m[0].gi].hooks.length === 1) {
      if (JSON.stringify(sirala(l[m[0].gi])) !== JSON.stringify(sirala(grup))) l[m[0].gi] = grup;
      continue;
    }
    for (let i = l.length - 1; i >= 0; i--) {
      l[i].hooks = l[i].hooks.filter(k => !bizimKanca(tanimli, r.olay, k));
      if (!l[i].hooks.length) l.splice(i, 1);
    }
    l.push(grup);
  }
  return v;
}
export function kancalariKaldir(h, tanimli) {
  hooksDogrula(h);
  const v = structuredClone(h);
  for (const olay of OLAYLAR) {
    if (!v.hooks?.[olay]) continue;
    const kalan = [];
    for (const g of v.hooks[olay]) {
      const yeni = g.hooks.filter(k => !bizimKanca(tanimli, olay, k));
      if (yeni.length === g.hooks.length) kalan.push(g);
      else if (yeni.length) kalan.push({ ...g, hooks: yeni });
    }
    if (kalan.length) v.hooks[olay] = kalan; else delete v.hooks[olay];
  }
  if (v.hooks && !Object.keys(v.hooks).length) delete v.hooks;
  return v;
}
// Kaldırma sonrası dizinin ortasından işleyici çıktıysa, sonrasındakilerin sırası kayar (güven anahtarı değişir).
export function kayanOlaylar(onceki, sonraki) {
  const s = [];
  for (const olay of Object.keys(onceki.hooks || {})) {
    const a = onceki.hooks[olay]; const b = sonraki.hooks?.[olay] || [];
    const bin = g => JSON.stringify(sirala(g));
    for (let i = 0; i < b.length; i++) if (bin(a[i]) !== bin(b[i]) && a.some(g => bin(g) === bin(b[i]))) { s.push(olay); break; }
  }
  return s;
}

// ---------------------------------------------------------------- güven özeti
export const sirala = v => Array.isArray(v) ? v.map(sirala) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sirala(v[k])])) : v;
export const snake = s => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
export function guvenHash(olay, matcher, kanca) {
  const nesne = { event_name: snake(olay), ...(matcher !== undefined ? { matcher } : {}), hooks: [{ async: false, ...kanca }] };
  return 'sha256:' + crypto.createHash('sha256').update(JSON.stringify(sirala(nesne))).digest('hex');
}
export function guvenAnahtari(hooksYolu, olay, gi, ki) { return `${hooksYolu}:${snake(olay)}:${gi}:${ki}`; }
export function tumKancalar(h, hooksYolu) {
  const s = [];
  for (const [olay, liste] of Object.entries(h.hooks || {})) {
    if (!Array.isArray(liste)) continue;
    liste.forEach((g, gi) => (Array.isArray(g?.hooks) ? g.hooks : []).forEach((k, ki) => {
      if (k && typeof k === 'object') s.push({ olay, gi, ki, kanca: k, anahtar: guvenAnahtari(hooksYolu, olay, gi, ki), hash: guvenHash(olay, g.matcher, k) });
    }));
  }
  return s;
}

// ---------------------------------------------------------------- config.toml (satır tabanlı)
const ANAHTAR = String.raw`(?:[A-Za-z0-9_-]+|"(?:[^"\\]|\\.)*"|'[^']*')`;
const BASLIK_RE = new RegExp(String.raw`^\s*(\[\[?)\s*(${ANAHTAR}(?:\s*\.\s*${ANAHTAR})*)\s*\]\]?\s*(?:#.*)?$`);
const GUVEN_RE = /^\s*\[\s*hooks\s*\.\s*state\s*\.\s*("(?:[^"\\]|\\.)*")\s*\]\s*(?:#.*)?$/;
const GUVEN_HASH_RE = /^(\s*trusted_hash\s*=\s*)"([^"]*)"/;

function bolSatir(metin) {
  const eol = metin.includes('\r\n') ? '\r\n' : '\n';
  return { l: metin.split(/\r?\n/), eol };
}
function kapanisBul(s, bas, ayirac) {
  for (let i = bas; i < s.length; i++) {
    if (ayirac.length === 3 ? s.startsWith(ayirac, i) : false) return i + 3;
    if (s[i] === '\\' && ayirac[0] === '"') { i++; continue; }
    if (ayirac.length === 1 && s[i] === ayirac) return i + 1;
  }
  return -1;
}
// Tablo başlığı satırlarını bulur; dizi/çok satırlı metin içindeki köşeli parantezleri başlık saymaz.
export function basliklar(l) {
  const sonuc = []; let derinlik = 0; let cok = null;
  l.forEach((satir, idx) => {
    let i = 0;
    if (cok) { const k = kapanisBul(satir, 0, cok); if (k < 0) return; i = k; cok = null; }
    else if (derinlik === 0 && BASLIK_RE.test(satir)) { sonuc.push(idx); return; }
    while (i < satir.length) {
      const c = satir[i];
      if (c === '#') break;
      if (satir.startsWith('"""', i) || satir.startsWith("'''", i)) {
        const a = satir.slice(i, i + 3); const k = kapanisBul(satir, i + 3, a);
        if (k < 0) { cok = a; break; } i = k; continue;
      }
      if (c === '"' || c === "'") { const k = kapanisBul(satir, i + 1, c); if (k < 0) break; i = k; continue; }
      if (c === '[' || c === '{') derinlik++;
      else if (c === ']' || c === '}') derinlik = Math.max(0, derinlik - 1);
      i++;
    }
  });
  return sonuc;
}
const baslikAdi = satir => { const m = BASLIK_RE.exec(satir); return m && m[1] === '[' ? m[2].replace(/\s*\.\s*/g, '.') : null; };
export function ciftBaslik(l) {
  const gorulen = new Set(); const cift = new Set();
  for (const i of basliklar(l)) { const a = baslikAdi(l[i]); if (a === null) continue; if (gorulen.has(a)) cift.add(a); gorulen.add(a); }
  return [...cift];
}
function tomlDize(s) { return JSON.stringify(s); }
function dizeCoz(ham) { try { return JSON.parse(ham); } catch { return null; } }

function ustDuzeyAnahtar(l, b, ad) {
  const son = b.length ? b[0] : l.length;
  for (let i = 0; i < son; i++) {
    const m = new RegExp(`^\\s*${ad}\\s*=\\s*(.*)$`).exec(l[i]);
    if (!m) continue;
    const d = /^"((?:[^"\\]|\\.)*)"/.exec(m[1].trim());
    return { index: i, deger: d ? dizeCoz(`"${d[1]}"`) : m[1].trim() };
  }
  return null;
}
export function guvenTablolari(l) {
  const b = basliklar(l); const t = new Map();
  b.forEach((idx, n) => {
    const m = GUVEN_RE.exec(l[idx]); if (!m) return;
    const anahtar = dizeCoz(m[1]); if (anahtar === null) return;
    const son = n + 1 < b.length ? b[n + 1] : l.length;
    let hashIdx = -1; let hash = null;
    for (let i = idx + 1; i < son; i++) { const h = GUVEN_HASH_RE.exec(l[i]); if (h) { hashIdx = i; hash = h[2]; break; } }
    if (!t.has(anahtar)) t.set(anahtar, { bas: idx, son, hashIdx, hash });
  });
  return t;
}
function sonaEkle(l, blok) {
  if (l.length && l[l.length - 1] === '') l.pop();
  if (l.length && l[l.length - 1].trim() !== '') l.push('');
  l.push(...blok, '');
}

// Prompt satırı: kullanıcının kendi ayarı varsa dokunulmaz; yoksa ilk tablo başlığından önce eklenir.
export function promptEkle(l, talimatYolu) {
  const b = basliklar(l);
  for (const ad of ['compact_prompt', PROMPT_ANAHTARI]) {
    const m = ustDuzeyAnahtar(l, b, ad);
    if (!m) continue;
    return { durum: ad === PROMPT_ANAHTARI && m.deger === talimatYolu ? 'zaten' : 'kullanici', anahtar: ad, deger: m.deger };
  }
  const blok = [ISARET, `${PROMPT_ANAHTARI} = ${tomlDize(talimatYolu)}`, ''];
  if (b.length) {
    const i = b[0];
    if (i > 0 && l[i - 1].trim() !== '') blok.unshift('');
    l.splice(i, 0, ...blok);
  } else sonaEkle(l, blok.slice(0, 2));
  return { durum: 'eklendi', anahtar: PROMPT_ANAHTARI, deger: talimatYolu };
}
export function promptKaldir(l, talimatYolu) {
  const m = ustDuzeyAnahtar(l, basliklar(l), PROMPT_ANAHTARI);
  if (!m || m.deger !== talimatYolu) return false;
  let bas = m.index; let say = 1;
  if (bas > 0 && l[bas - 1] === ISARET) { bas--; say++; }
  if (l[bas + say] === '' ) say++;
  l.splice(bas, say);
  return true;
}
// Formülü mevcut güven kayıtlarıyla sınar: { eslesen, uyusmayan }.
export function formulSina(h, hooksYolu, tablolar) {
  let eslesen = 0; let uyusmayan = 0;
  for (const k of tumKancalar(h, hooksYolu)) {
    const t = tablolar.get(k.anahtar);
    if (!t || !t.hash) continue;
    if (t.hash === k.hash) eslesen++; else uyusmayan++;
  }
  return { eslesen, uyusmayan };
}
// Bizim işleyiciler için güven tablolarını yazar. Aynı başlıklı tablo varsa yenisi eklenmez, hash satırı güncellenir.
export function guvenYaz(l, kayitlar) {
  let eklenen = 0; let guncellenen = 0;
  for (const k of kayitlar) {
    const t = guvenTablolari(l).get(k.anahtar);
    if (t) {
      if (t.hash === k.hash) continue;
      if (t.hashIdx >= 0) l[t.hashIdx] = l[t.hashIdx].replace(GUVEN_HASH_RE, `$1"${k.hash}"`);
      else l.splice(t.bas + 1, 0, `trusted_hash = "${k.hash}"`);
      guncellenen++;
    } else {
      sonaEkle(l, [`[hooks.state.${tomlDize(k.anahtar)}]`, `trusted_hash = "${k.hash}"`]);
      eklenen++;
    }
  }
  return { eklenen, guncellenen };
}
// Yalnız anahtarı ve hash'i bizimkiyle aynı olan tabloları siler; başka satırı olan tabloda yalnız hash satırı gider.
export function guvenKaldir(l, kayitlar) {
  const silinen = [];
  for (const k of kayitlar) {
    const t = guvenTablolari(l).get(k.anahtar);
    if (!t || t.hash !== k.hash) continue;
    const icerik = l.slice(t.bas + 1, t.son).filter((s, i) => t.bas + 1 + i !== t.hashIdx && s.trim() !== '' && !/^\s*#/.test(s));
    if (icerik.length) l.splice(t.hashIdx, 1);
    else l.splice(t.bas, t.son - t.bas);
    silinen.push(k.anahtar);
  }
  if (silinen.length) { while (l.length > 1 && l[l.length - 1] === '' && l[l.length - 2] === '') l.pop(); }
  return silinen;
}

// ---------------------------------------------------------------- plan
export function kayitOku(y) {
  const k = jsonOku(y.kayit);
  for (const ad of ['kancalar', 'guven']) if (k[ad] !== undefined && !Array.isArray(k[ad])) throw new Error('Kurulum kaydı tanınmıyor.');
  return k;
}
function tanimliKancalar(y, kayit) {
  return [...(kayit.kancalar || []).filter(r => r?.kanca), ...kancaListesi(y.hedef)];
}
function bizimGuven(h, y, tanimli) {
  return tumKancalar(h, y.hooks).filter(k => bizimKanca(tanimli, k.olay, k.kanca));
}

export function kurulumPlani(y, hooksEski, configEski, kayit) {
  const istenen = kancaListesi(y.hedef);
  const tanimli = tanimliKancalar(y, kayit);
  const hooksYeni = kancalariKur(hooksEski, istenen, tanimli);
  const { l, eol } = bolSatir(configEski);
  if (ciftBaslik(l).length) throw new Error(`config.toml içinde çift tablo başlığı var, önce düzeltin: ${ciftBaslik(l).join(', ')}`);
  const prompt = promptEkle(l, y.talimat);
  // Güven: formül önce var olan kayıtlarla sınanır.
  const tablolar = guvenTablolari(configEski === '' ? [] : bolSatir(configEski).l);
  const sina = formulSina(hooksEski, y.hooks, tablolar);
  const kayitlar = bizimGuven(hooksYeni, y, istenen.map(r => ({ olay: r.olay, kanca: r.kanca }))).map(k => ({ anahtar: k.anahtar, hash: k.hash, olay: k.olay }));
  let guven = { durum: 'yazildi', ...sina, eklenen: 0, guncellenen: 0, kayitlar };
  if (sina.uyusmayan > 0) guven = { ...guven, durum: 'uyusmazlik', kayitlar: [] };
  else {
    if (sina.eslesen === 0) guven.durum = 'sinanamadi';
    Object.assign(guven, guvenYaz(l, kayitlar));
  }
  const bitis = ciftBaslik(l);
  if (bitis.length) throw new Error(`config.toml çift tablo başlığı oluşacaktı, yazılmadı: ${bitis.join(', ')}`);
  const configYeni = l.join(eol);
  return { istenen, hooksYeni, configYeni, prompt, guven, hooksDegisti: JSON.stringify(hooksEski) !== JSON.stringify(hooksYeni), configDegisti: configEski !== configYeni };
}
export function kaldirmaPlani(y, hooksEski, configEski, kayit) {
  const tanimli = tanimliKancalar(y, kayit);
  const hooksYeni = kancalariKaldir(hooksEski, tanimli);
  const { l, eol } = bolSatir(configEski);
  const adaylar = new Map();
  for (const k of bizimGuven(hooksEski, y, tanimli)) adaylar.set(k.anahtar, { anahtar: k.anahtar, hash: k.hash });
  for (const g of kayit.guven || []) if (g && typeof g.anahtar === 'string' && typeof g.hash === 'string') adaylar.set(g.anahtar, { anahtar: g.anahtar, hash: g.hash });
  const silinen = guvenKaldir(l, [...adaylar.values()]);
  const promptSilindi = promptKaldir(l, y.talimat);
  const configYeni = l.join(eol);
  return { hooksYeni, configYeni, silinenGuven: silinen, promptSilindi, kayanlar: kayanOlaylar(hooksEski, hooksYeni), hooksDegisti: JSON.stringify(hooksEski) !== JSON.stringify(hooksYeni), configDegisti: configEski !== configYeni };
}

// ---------------------------------------------------------------- dosya işleri
export function atomik(yol, veri, mod) {
  const tmp = `${yol}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try { fs.writeFileSync(tmp, veri, { mode: 0o600, flag: 'wx' }); if (mod) fs.chmodSync(tmp, mod); fs.renameSync(tmp, yol); }
  finally { try { fs.unlinkSync(tmp); } catch {} }
}
export function yedekle(yol) {
  if (!fs.existsSync(yol)) return null;
  const yedek = `${yol}.hafiz-yedek-${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID()}`;
  fs.copyFileSync(yol, yedek, fs.constants.COPYFILE_EXCL);
  fs.chmodSync(yedek, 0o600);
  return yedek;
}
// Yedek al, sonra atomik yaz; mevcut dosyanın izni korunur.
export function yedekliYaz(yol, metin) {
  const yedek = yedekle(yol);
  let mod = 0o600; try { mod = fs.statSync(yol).mode & 0o777; } catch {}
  atomik(yol, metin, mod);
  return yedek;
}
export function ayarYolu(y) {
  return fs.existsSync(path.join(y.hedef, 'hafiz-ayar.json')) ? path.join(y.hedef, 'hafiz-ayar.json') : path.join(KAYNAK_CODEX, 'hafiz-ayar.json');
}
export function dosyalariKopyala(y) {
  fs.mkdirSync(y.hedef, { recursive: true, mode: 0o700 });
  fs.chmodSync(y.hedef, 0o700);
  for (const d of DOSYALAR) {
    const hedef = path.join(y.hedef, d.ad);
    if (d.ad === 'hafiz-ayar.json' && fs.existsSync(hedef)) continue;
    atomik(hedef, fs.readFileSync(path.join(d.kaynak, d.ad)));
  }
  const dil = ayarOku(ayarYolu(y)).dil;
  atomik(y.talimat, fs.readFileSync(path.join(KAYNAK_TALIMAT, `ozet-talimati.${dil}.md`)));
}
export function kayitYaz(y, plan, onceki) {
  const config = { prompt: plan.prompt.durum === 'kullanici' ? null : { anahtar: PROMPT_ANAHTARI, deger: y.talimat, yorum: ISARET } };
  const kayit = {
    surum: 1, kurulum: onceki.kurulum || new Date().toISOString(), hooksYolu: y.hooks, configYolu: y.config,
    kancalar: plan.istenen.map(r => ({ olay: r.olay, ...(r.matcher ? { matcher: r.matcher } : {}), kanca: r.kanca })),
    guven: plan.guven.durum === 'uyusmazlik' ? (onceki.guven || []) : plan.guven.kayitlar.map(k => ({ anahtar: k.anahtar, hash: k.hash })),
    config
  };
  atomik(y.kayit, JSON.stringify(kayit, null, 2) + '\n');
}
