// Codex sürümü sınamaları: node --test codex/
// Hepsi paket içindeki geçici klasörde, sahte CODEX_HOME ve sahte HOME ile çalışır; sonunda silinir.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DIZIN = path.dirname(fileURLToPath(import.meta.url));
const PAKET = path.join(DIZIN, '..');
const HOOKS = path.join(DIZIN, 'hooks');
const KOK = fs.mkdtempSync(path.join(PAKET, '.test-codex-'));
const CODEX = path.join(KOK, 'codex-home');
const DURUM = path.join(KOK, 'durum');
const EV = path.join(KOK, 'ev');
for (const d of [CODEX, DURUM, EV]) fs.mkdirSync(d, { recursive: true });
process.env.CODEX_HOME = CODEX;
process.env.HAFIZ_DURUM_DIZIN = DURUM;
process.env.HAFIZ_TEST = '1';
test.after(() => fs.rmSync(KOK, { recursive: true, force: true }));

const C = await import('./hooks/codex-ortak.mjs');
const K = await import('./kurulum-codex.mjs');
const VARSAYILAN_AYAR = JSON.parse(fs.readFileSync(path.join(HOOKS, 'hafiz-ayar.json'), 'utf8'));

// ---------------------------------------------------------------- yardımcılar
const ORTAM = { PATH: process.env.PATH, HOME: EV, CODEX_HOME: CODEX, HAFIZ_DURUM_DIZIN: DURUM, HAFIZ_TEST: '1', HAFIZ_CODEX_YENIDEN_MS: '1' };
function kos(betik, girdi, ek = {}) {
  const r = spawnSync(process.execPath, [path.join(HOOKS, betik)], { input: typeof girdi === 'string' ? girdi : JSON.stringify(girdi), env: { ...ORTAM, ...ek }, encoding: 'utf8', timeout: 30000 });
  assert.equal(r.error, undefined);
  return { cikti: r.stdout, hata: r.stderr, kod: r.status };
}
let sayac = 0;
const zaman = () => new Date(Date.UTC(2026, 10, 22, 9, 0, 0) + 1000 * sayac++).toISOString();
const meta = (id, ek = {}) => JSON.stringify({ timestamp: zaman(), type: 'session_meta', payload: { id, thread_source: 'user', source: 'cli', originator: 'codex-tui', cwd: '/proje', ...ek } });
const kul = (metin, ek = []) => JSON.stringify({ timestamp: zaman(), type: 'event_msg', payload: { type: 'item_completed', item: { type: 'UserMessage', id: `m${sayac}`, content: [{ type: 'text', text: metin }, ...ek] } } });
const yedekKul = metin => JSON.stringify({ timestamp: zaman(), type: 'response_item', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: metin }] } });
const asistan = metin => JSON.stringify({ timestamp: zaman(), type: 'response_item', payload: { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: metin }] } });
const compacted = (message, gecmis = [], ts = zaman()) => JSON.stringify({ timestamp: ts, type: 'compacted', payload: { ...(message === undefined ? {} : { message }), replacement_history: gecmis } });
function rollout(ad, satirlar, kok = CODEX, alt = 'sessions') {
  const yol = path.join(kok, alt, '2026', '11', '22', `rollout-2026-11-22T09-00-00-${ad}.jsonl`);
  fs.mkdirSync(path.dirname(yol), { recursive: true });
  fs.writeFileSync(yol, satirlar.join('\n') + '\n');
  return yol;
}
const girdi = (sid, yol, ek = {}) => ({ session_id: sid, transcript_path: yol, cwd: '/proje', hook_event_name: 'PreCompact', model: 'm', trigger: 'manual', turn_id: 't1', ...ek });
const durumDosya = sid => path.join(DURUM, sid, 'son-mesajlar.json');
const ozetler = sid => { try { return fs.readdirSync(path.join(DURUM, sid)).filter(a => /^ozet-.*\.md$/.test(a)).sort(); } catch { return []; } };
const izin = p => (fs.statSync(p).mode & 0o777).toString(8);
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const oku = p => JSON.parse(fs.readFileSync(p, 'utf8'));
function kokOturum(sid, metaEk = {}, metinler = ['ilk söz', 'son söz']) {
  return rollout(sid, [meta(sid, metaEk), ...metinler.map(m => kul(m))]);
}
function basilan(r) { return r.cikti ? JSON.parse(r.cikti).hookSpecificOutput.additionalContext : ''; }

// =========================================================== çıkarım
test('çıkarım: UserMessage yeni -> eski, asistan ve bozuk satırlar atlanır', () => {
  const yol = rollout('cikarim', [meta('s-cikarim'), kul('BİRİNCİ'), asistan('cevap'), kul('İKİNCİ'), '{bozuk json', kul('ÜÇÜNCÜ')]);
  assert.deepEqual(C.topla(yol).mesajlar.map(m => m.metin), ['ÜÇÜNCÜ', 'İKİNCİ', 'BİRİNCİ']);
});

test('çıkarım: yalnız yedek varken AGENTS.md ve environment_context atılır, gerçek söz kalır', () => {
  const yol = rollout('yedek', [meta('s-yedek'),
    yedekKul('# AGENTS.md instructions for /x\n\n<INSTRUCTIONS>\nkurallar\n</INSTRUCTIONS>'),
    yedekKul('<environment_context>\n  <cwd>/x</cwd>\n</environment_context>'),
    yedekKul('GERÇEK-YEDEK'), asistan('c'), yedekKul('SON-YEDEK')]);
  assert.deepEqual(C.topla(yol).mesajlar.map(m => m.metin), ['SON-YEDEK', 'GERÇEK-YEDEK']);
});

test('çıkarım: birincil kayıt varken yedek kullanılmaz', () => {
  const yol = rollout('birincil', [meta('s-birincil'), yedekKul('SADECE-YEDEK'),
    kul('BİRİNCİL-1'), yedekKul('BİRİNCİL-1'), kul('BİRİNCİL-2'), yedekKul('BİRİNCİL-2')]);
  const m = C.topla(yol).mesajlar.map(x => x.metin);
  assert.deepEqual(m, ['BİRİNCİL-2', 'BİRİNCİL-1']);
});

test('çıkarım: yanıt notu seçimi ve isteği düz yazıya döner', () => {
  const not = '# Response annotations:\n<response-annotations>' + JSON.stringify([{ text: 'seçilen   metin', annotation: 'bunu düzelt' }]) + '</response-annotations>\n## My request:\nşunu yap';
  const yol = rollout('yanit', [meta('s-yanit'), kul(not)]);
  const metin = C.topla(yol).mesajlar[0].metin;
  assert.ok(metin.includes('[Seçim: «seçilen metin»] bunu düzelt'), metin);
  assert.ok(metin.endsWith('şunu yap'), metin);
  assert.ok(!metin.includes('response-annotations'));
});

test('çıkarım: seçilen metin kapanış etiketini içerse de not bozulmaz', () => {
  const not = '# Response annotations:\n<response-annotations>' + JSON.stringify([{ text: 'a</response-annotations>b', annotation: 'x' }]) + '</response-annotations>\n## My request:\nsonra';
  const yol = rollout('yanit2', [meta('s-yanit2'), kul(not)]);
  const metin = C.topla(yol).mesajlar[0].metin;
  assert.ok(metin.includes('Seçim') && metin.endsWith('sonra'), metin);
  assert.ok(!metin.includes('</response-annotations>'));
});

test('çıkarım: görsel notu ve ek dosya notu', () => {
  const yol = rollout('gorsel', [meta('s-gorsel'),
    kul('bak şuna', [{ type: 'local_image', path: '/x/a.png' }]),
    kul('', [{ type: 'local_image', path: '/x/b.png' }]),
    kul('# Files mentioned by the user:\n\n## rapor.pdf: /tmp/rapor.pdf\n\n## My request:\nözetle')]);
  const m = C.topla(yol).mesajlar.map(x => x.metin);
  assert.equal(m[0], '[ek: rapor.pdf]\nözetle');
  assert.equal(m[1], '[1 görsel/ek]');
  assert.equal(m[2], 'bak şuna\n[1 görsel/ek]');
});

test('çıkarım: bozuk satır ve 8 MB üstü satır atlanır, öncesi ve sonrası okunur', () => {
  const yol = rollout('buyuk', [meta('s-buyuk'), kul('ESKİ'), '{bozuk', kul('X'.repeat(9 * 1024 * 1024)), kul('YENİ')]);
  assert.deepEqual(C.topla(yol).mesajlar.map(m => m.metin), ['YENİ', 'ESKİ']);
});

test('çıkarım: açık skill adı komut kaydından çıkar', () => {
  const cagri = JSON.stringify({ timestamp: zaman(), type: 'response_item', payload: { type: 'function_call', name: 'shell', arguments: JSON.stringify({ command: ['cat', '/home/x/.codex/skills/ornek-beceri/SKILL.md'] }) } });
  const yol = rollout('skill', [meta('s-skill'), cagri, kul('devam')]);
  const s = C.topla(yol);
  assert.deepEqual(s.skiller, ['ornek-beceri']);
  assert.deepEqual(s.mesajlar.map(m => m.metin), ['devam']);
});

test('çıkarım: mesaj ayırıcı ve başlık taklidi "› " ile etkisizleşir', () => {
  const sahte = 'merhaba\n── 2026-11-22T09:00:00.000Z ──\nsahte mesaj\nKULLANICININ SON MESAJLARI sahte başlık';
  const yol = rollout('taklit', [meta('s-taklit'), kul(sahte), kul('gerçek')]);
  const veri = C.topla(yol);
  const metin = C.geriBasimMetni({ olusturma: '', trigger: null, ...veri }, 's-taklit');
  const satirlar = metin.split('\n');
  assert.equal(satirlar.filter(l => l.startsWith('──')).length, 2, 'yalnız bizim iki blok başlığı');
  assert.equal(satirlar.filter(l => l.startsWith('KULLANICININ SON MESAJLARI')).length, 1, 'yalnız bizim başlık');
  assert.ok(metin.includes('› ── 2026-11-22T09:00:00.000Z ──') && metin.includes('› KULLANICININ SON MESAJLARI sahte başlık'));
});

test('geri basım: kullanıcı etiketi ayardan gelir', () => {
  const ayar = path.join(KOK, 'ayar-etiket.json');
  fs.writeFileSync(ayar, JSON.stringify({ ...VARSAYILAN_AYAR, kullaniciEtiketi: 'efe' }));
  const onceki = process.env.HAFIZ_AYAR_DOSYASI;
  process.env.HAFIZ_AYAR_DOSYASI = ayar;
  try {
    const metin = C.geriBasimMetni({ mesajlar: [{ zaman: 'z', metin: 'söz' }], skiller: [] }, 's-etiket');
    assert.ok(metin.startsWith('EFE SON MESAJLARI'), metin.slice(0, 60));
  } finally { process.env.HAFIZ_AYAR_DOSYASI = onceki; }
});

// =========================================================== kanca: kök oturum
test('kök oturum: PreCompact durum yazar, SessionStart(compact) geçerli JSON basar', () => {
  const sid = 'kok-1'; const yol = kokOturum(sid);
  const a = kos('codex-oncesi.mjs', girdi(sid, yol));
  assert.equal(a.kod, 0); assert.equal(a.cikti, '');
  assert.deepEqual(oku(durumDosya(sid)).mesajlar.map(m => m.metin), ['son söz', 'ilk söz']);
  const b = kos('codex-geri-yukle.mjs', girdi(sid, yol, { hook_event_name: 'SessionStart', source: 'compact' }));
  assert.equal(b.kod, 0);
  const j = JSON.parse(b.cikti);
  assert.deepEqual(Object.keys(j), ['hookSpecificOutput']);
  assert.equal(j.hookSpecificOutput.hookEventName, 'SessionStart');
  const ctx = j.hookSpecificOutput.additionalContext;
  assert.ok(ctx.includes('son söz') && ctx.includes('ilk söz'));
  assert.ok(ctx.indexOf('son söz') < ctx.indexOf('ilk söz'), 'en yeni üstte');
});

test('kök oturum: PreCompact çalışmamış olsa da SessionStart dökümden canlı okur', () => {
  const sid = 'kok-canli'; const yol = kokOturum(sid, {}, ['yalnız döküm']);
  const b = kos('codex-geri-yukle.mjs', girdi(sid, yol, { hook_event_name: 'SessionStart', source: 'compact' }));
  assert.ok(basilan(b).includes('yalnız döküm'));
});

test('kök oturum: arşivlenmiş oturum klasörü de kabul edilir', () => {
  const sid = 'kok-arsiv'; const yol = rollout(sid, [meta(sid), kul('arşivdeki söz')], CODEX, 'archived_sessions');
  assert.equal(kos('codex-oncesi.mjs', girdi(sid, yol)).kod, 0);
  assert.equal(oku(durumDosya(sid)).mesajlar[0].metin, 'arşivdeki söz');
});

test('geri basım: toplam en çok 28.500 harf, en yeni mesaj içinde', () => {
  const sid = 'kok-tavan';
  const metinler = Array.from({ length: 40 }, (_, i) => `M${String(i).padStart(2, '0')} ` + 'ş'.repeat(3800));
  const yol = kokOturum(sid, {}, metinler);
  kos('codex-oncesi.mjs', girdi(sid, yol));
  const ctx = basilan(kos('codex-geri-yukle.mjs', girdi(sid, yol, { hook_event_name: 'SessionStart', source: 'compact' })));
  assert.ok(ctx.length > 9500 && ctx.length <= 28500, `uzunluk ${ctx.length}`);
  assert.ok([...ctx].length <= 28500);
  assert.ok(ctx.includes('M39 '), 'en yeni mesaj var');
  assert.ok(!ctx.includes('M00 '), 'en eski mesaj sığmadı');
  assert.ok(!/[\uD800-\uDBFF]$/.test(ctx), 'yarım vekil yok');
});

test('SessionStart: compact dışı kaynakta çıktı yok', () => {
  const sid = 'kok-kaynak'; const yol = kokOturum(sid);
  kos('codex-oncesi.mjs', girdi(sid, yol));
  for (const source of ['startup', 'resume', 'clear', undefined]) {
    const r = kos('codex-geri-yukle.mjs', girdi(sid, yol, { hook_event_name: 'SessionStart', source }));
    assert.equal(r.kod, 0); assert.equal(r.cikti, '', `source=${source}`);
  }
});

test('bozuk ya da boş stdin: üç kanca da sessizce 0 ile çıkar', () => {
  for (const betik of ['codex-oncesi.mjs', 'codex-sonrasi-kaydet.mjs', 'codex-geri-yukle.mjs']) {
    for (const girdisi of ['', 'bu json degil', '{"source":"compact"}']) {
      const r = kos(betik, girdisi);
      assert.equal(r.kod, 0, `${betik} ${girdisi}`); assert.equal(r.cikti, '');
    }
  }
});

// =========================================================== alt ajan, exec, kök dışı
const ALT_AJAN = [
  ['yalnız agent_id', { agent_id: 'ajan-1' }, {}],
  ['yalnız agent_type', { agent_type: 'explorer' }, {}],
  ['session_meta alt ajan işareti', {}, { thread_source: 'subagent', source: { subagent: { thread_spawn: { parent_thread_id: 'x' } } } }],
  ['session_meta kimliği oturumla eşleşmiyor', {}, { id: 'baska-oturum' }]
];
ALT_AJAN.forEach(([ad, girdiEk, metaEk], i) => {
  test(`alt ajan: ${ad} tek başına reddeder (durum dosyası yok, SessionStart çıktısı yok)`, () => {
    const sid = `alt-${i}`;
    const altYol = rollout(`alt-${i}-ajan`, [meta(sid, metaEk), kul('ALT AJAN SÖZÜ')]);
    const a = kos('codex-oncesi.mjs', girdi(sid, altYol, girdiEk));
    assert.equal(a.kod, 0); assert.equal(a.cikti, '');
    assert.ok(!fs.existsSync(durumDosya(sid)), 'durum dosyası yazılmamalı');
    // Alt ajanın session_id'si ana oturumunkiyle aynıdır: ana oturumun durumu varken de basılmamalı.
    const kokYol = kokOturum(sid, {}, ['ana oturum sözü']);
    kos('codex-oncesi.mjs', girdi(sid, kokYol));
    assert.ok(fs.existsSync(durumDosya(sid)));
    const b = kos('codex-geri-yukle.mjs', girdi(sid, altYol, { hook_event_name: 'SessionStart', source: 'compact', ...girdiEk }));
    assert.equal(b.kod, 0); assert.equal(b.cikti, '');
    if (!Object.keys(metaEk).length) {
      const c = kos('codex-geri-yukle.mjs', girdi(sid, kokYol, { hook_event_name: 'SessionStart', source: 'compact', ...girdiEk }));
      assert.equal(c.cikti, '', 'kök dökümde bile işaret tek başına reddeder');
    }
  });
});

test('exec oturumu: varsayılan ret, ayarla kabul', () => {
  const sid = 'exec-1'; const yol = kokOturum(sid, { source: 'exec', originator: 'codex_exec' });
  kos('codex-oncesi.mjs', girdi(sid, yol));
  assert.ok(!fs.existsSync(durumDosya(sid)));
  assert.equal(kos('codex-geri-yukle.mjs', girdi(sid, yol, { source: 'compact' })).cikti, '');
  const ayar = path.join(KOK, 'ayar-exec.json');
  fs.writeFileSync(ayar, JSON.stringify({ ...VARSAYILAN_AYAR, execOturumlari: true }));
  kos('codex-oncesi.mjs', girdi(sid, yol), { HAFIZ_AYAR_DOSYASI: ayar });
  assert.ok(fs.existsSync(durumDosya(sid)));
  assert.ok(basilan(kos('codex-geri-yukle.mjs', girdi(sid, yol, { source: 'compact' }), { HAFIZ_AYAR_DOSYASI: ayar })).includes('son söz'));
});

test('transcript Codex klasörü dışında, göreli ya da bağlantı ile dışarı çıkıyorsa reddedilir', () => {
  const dis = path.join(KOK, 'disarida'); fs.mkdirSync(dis, { recursive: true });
  const disYol = path.join(dis, 'rollout.jsonl');
  const sid = 'dis-1';
  fs.writeFileSync(disYol, [meta(sid), kul('dışarıdaki söz')].join('\n') + '\n');
  kos('codex-oncesi.mjs', girdi(sid, disYol));
  assert.ok(!fs.existsSync(durumDosya(sid)), 'dış klasör');
  const bag = path.join(CODEX, 'sessions', 'bag.jsonl');
  fs.mkdirSync(path.dirname(bag), { recursive: true });
  fs.symlinkSync(disYol, bag);
  kos('codex-oncesi.mjs', girdi(sid, bag));
  assert.ok(!fs.existsSync(durumDosya(sid)), 'bağlantı dışarı çıkıyor');
  kos('codex-oncesi.mjs', girdi(sid, path.relative(process.cwd(), kokOturum(sid))));
  assert.ok(!fs.existsSync(durumDosya(sid)), 'göreli yol');
  assert.equal(C.codexOturumu(girdi(sid, kokOturum(sid))).ok, true, 'denetim: aynı oturum kök olarak kabul');
});

test('session_meta ilk satır değilse ya da bozuksa reddedilir', () => {
  for (const [ad, satirlar] of [['bozuk-meta', ['{bozuk', kul('x')]], ['meta-yok', [kul('x'), meta('meta-yok')]]]) {
    const yol = rollout(ad, satirlar);
    kos('codex-oncesi.mjs', girdi(ad, yol));
    assert.ok(!fs.existsSync(durumDosya(ad)), ad);
  }
});

// =========================================================== PostCompact
test('PostCompact: düz özet kaydedilir, şifreli ya da boş özet atlanır', () => {
  const sid = 'post-1';
  const yol = rollout(sid, [meta(sid), kul('iş'), compacted('', [{ type: 'compaction', encrypted_content: 'gAAAAABsifreli' }])]);
  assert.equal(kos('codex-sonrasi-kaydet.mjs', girdi(sid, yol, { hook_event_name: 'PostCompact' })).kod, 0);
  assert.deepEqual(ozetler(sid), [], 'şifreli/boş atlanır');
  fs.appendFileSync(yol, compacted(undefined) + '\n');
  kos('codex-sonrasi-kaydet.mjs', girdi(sid, yol));
  assert.deepEqual(ozetler(sid), [], 'message alanı yok');
  fs.appendFileSync(yol, compacted('DÜZ ÖZET METNİ') + '\n');
  const r = kos('codex-sonrasi-kaydet.mjs', girdi(sid, yol));
  assert.equal(r.cikti, '');
  const dosyalar = ozetler(sid);
  assert.equal(dosyalar.length, 1);
  assert.equal(fs.readFileSync(path.join(DURUM, sid, dosyalar[0]), 'utf8'), 'DÜZ ÖZET METNİ');
});

test('PostCompact: aynı özet ikinci kez yazılmaz, tavan 5 dosya', () => {
  const sid = 'post-2';
  const yol = rollout(sid, [meta(sid), kul('iş'), compacted('ÖZET-0')]);
  kos('codex-sonrasi-kaydet.mjs', girdi(sid, yol));
  kos('codex-sonrasi-kaydet.mjs', girdi(sid, yol));
  assert.equal(ozetler(sid).length, 1);
  for (let i = 1; i <= 6; i++) {
    fs.appendFileSync(yol, compacted(`ÖZET-${i}`) + '\n');
    kos('codex-sonrasi-kaydet.mjs', girdi(sid, yol));
  }
  const dosyalar = ozetler(sid);
  assert.equal(dosyalar.length, 5);
  const icerik = dosyalar.map(d => fs.readFileSync(path.join(DURUM, sid, d), 'utf8'));
  assert.deepEqual(icerik, ['ÖZET-2', 'ÖZET-3', 'ÖZET-4', 'ÖZET-5', 'ÖZET-6']);
});

test('PostCompact: PreCompact öncesine ait eski compacted kaydı bu compact sayılmaz', () => {
  const sid = 'post-3';
  const yol = rollout(sid, [meta(sid), kul('iş'), compacted('ESKİ ÖZET', [], '2020-01-01T00:00:00.000Z')]);
  kos('codex-oncesi.mjs', girdi(sid, yol));
  kos('codex-sonrasi-kaydet.mjs', girdi(sid, yol));
  assert.deepEqual(ozetler(sid), []);
  fs.appendFileSync(yol, compacted('YENİ ÖZET', [], new Date().toISOString()) + '\n');
  kos('codex-sonrasi-kaydet.mjs', girdi(sid, yol));
  assert.equal(ozetler(sid).length, 1);
});

test('PostCompact: alt ajan özeti kaydedilmez', () => {
  const sid = 'post-4';
  const yol = rollout(sid, [meta(sid), kul('iş'), compacted('ALT AJAN ÖZETİ')]);
  kos('codex-sonrasi-kaydet.mjs', girdi(sid, yol, { agent_id: 'a1' }));
  assert.deepEqual(ozetler(sid), []);
});

test('izinler: oturum klasörü 0700, durum ve özet dosyaları 0600', () => {
  const sid = 'izin-1';
  const yol = rollout(sid, [meta(sid), kul('söz'), compacted('ÖZET')]);
  kos('codex-oncesi.mjs', girdi(sid, yol));
  kos('codex-sonrasi-kaydet.mjs', girdi(sid, yol));
  assert.equal(izin(path.join(DURUM, sid)), '700');
  assert.equal(izin(durumDosya(sid)), '600');
  assert.equal(izin(path.join(DURUM, sid, 'son-mesajlar.md')), '600');
  assert.equal(izin(path.join(DURUM, sid, ozetler(sid)[0])), '600');
});

// =========================================================== güven özeti formülü
// Codex 0.171.0'ın gerçek oturumda güvenip çalıştırdığı kurulu Hafız kancalarının kayıtları (22.11.2026).
const GERCEK_KOK = "/Users/" + "thewinderst" + "/.codex/hafiz";
const KOMUT = ad => `'/opt/homebrew/bin/node' '${GERCEK_KOK}/${ad}'`;
test('güven formülü: Codex tarafından kabul edilen üç gerçek kayıt tutar', () => {
  assert.equal(K.guvenHash('PreCompact', undefined, { type: 'command', command: KOMUT('codex-oncesi.mjs'), timeout: 10 }),
    'sha256:441ad199f5347f711bf87c94ed24b08b3a7bb00b8a5d76c3315fb92e9d9c1403');
  assert.equal(K.guvenHash('PostCompact', undefined, { type: 'command', command: KOMUT('codex-sonrasi-kaydet.mjs'), timeout: 10 }),
    'sha256:78dded6216f9c523e5df9bb2914b905dbd355ecc6c1e8dc6121763c06787e374');
  assert.equal(K.guvenHash('SessionStart', '^compact$', { type: 'command', command: KOMUT('codex-geri-yukle.mjs'), timeout: 10, additionalContextLimit: 15000 }),
    'sha256:2bc8a3bda65769cdd09a28cf16c8906949d7f4f3e71d55e7caefb4f6a91af589');
});

test('güven anahtarı: olay adı snake_case, grup ve işleyici sırası', () => {
  assert.equal(K.guvenAnahtari('/a/hooks.json', 'PreCompact', 1, 0), '/a/hooks.json:pre_compact:1:0');
  assert.equal(K.guvenAnahtari('/a/hooks.json', 'SessionStart', 0, 2), '/a/hooks.json:session_start:0:2');
});

test('özet talimatı dosyaları: Codex varsayılan metni ve Hafız beş kuralı', () => {
  for (const dil of ['tr', 'en']) {
    const m = fs.readFileSync(path.join(DIZIN, `ozet-talimati.${dil}.md`), 'utf8');
    assert.ok(m.startsWith('You are performing a CONTEXT CHECKPOINT COMPACTION.'), dil);
    for (let i = 1; i <= 5; i++) assert.ok(m.includes(`\n${i}. `), `${dil} kural ${i}`);
  }
  assert.equal(VARSAYILAN_AYAR.durumDizini, '../hafiz-durum');
  assert.equal(VARSAYILAN_AYAR.execOturumlari, false);
  assert.equal(VARSAYILAN_AYAR.kullaniciEtiketi, null);
});

// =========================================================== kurulum
function codexHome(ad, { hooks, config } = {}) {
  const h = path.join(KOK, ad); fs.mkdirSync(h, { recursive: true });
  if (hooks !== undefined) fs.writeFileSync(path.join(h, 'hooks.json'), typeof hooks === 'string' ? hooks : JSON.stringify(hooks, null, 2) + '\n');
  if (config !== undefined) fs.writeFileSync(path.join(h, 'config.toml'), config);
  return h;
}
function betik(ad, h, args = []) {
  const r = spawnSync(process.execPath, [path.join(PAKET, ad), ...args], { env: { PATH: process.env.PATH, HOME: EV, CODEX_HOME: h }, encoding: 'utf8', timeout: 30000 });
  assert.equal(r.error, undefined);
  return { cikti: r.stdout, hata: r.stderr, kod: r.status };
}
const kur = (h, args) => betik('install-codex.mjs', h, args);
const kaldir = (h, args) => betik('uninstall-codex.mjs', h, args);
function agac(dizin) {
  const s = {};
  (function gez(d) {
    for (const a of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, a.name);
      if (a.isDirectory()) { s[path.relative(dizin, p) + '/'] = 'dizin'; gez(p); } else s[path.relative(dizin, p)] = sha(p);
    }
  })(dizin);
  return s;
}
const yedekler = (h, ad) => fs.readdirSync(h).filter(a => a.startsWith(`${ad}.hafiz-yedek-`));
const ESKI_GRUP = { matcher: 'manual', hooks: [{ type: 'command', command: 'printf kendi-pre', timeout: 7 }] };
const YEREL_HOOKS = {
  description: 'benim kancalarım',
  hooks: {
    PreCompact: [ESKI_GRUP],
    SessionStart: [{ matcher: 'startup', hooks: [{ type: 'command', command: 'printf kendi-start' }] }],
    Stop: [{ hooks: [{ type: 'command', command: 'printf kendi-stop' }] }]
  }
};
function yerelConfig(h) {
  const hash = K.guvenHash('PreCompact', 'manual', ESKI_GRUP.hooks[0]);
  return `model = "gpt-5"\nnotify = ["a", "[b]"]\nnot = """\n[tablo-degil]\n"""\n\n[projects."/x"]\ntrust_level = "trusted"\n\n[hooks.state."${path.join(h, 'hooks.json')}:pre_compact:0:0"]\ntrusted_hash = "${hash}"\n`;
}
const basliklar = metin => K.basliklar(metin.split('\n')).map(i => metin.split('\n')[i]);

test('kurulum: mevcut gruplar ve sıralar aynen, bizimkiler sonda, güven tabloları yazılır', () => {
  const h = codexHome('k1', { hooks: YEREL_HOOKS }); const cfg = yerelConfig(h);
  fs.writeFileSync(path.join(h, 'config.toml'), cfg);
  const eskiHooks = fs.readFileSync(path.join(h, 'hooks.json'), 'utf8');
  const r = kur(h);
  assert.equal(r.kod, 0, r.hata);
  const hk = oku(path.join(h, 'hooks.json'));
  assert.equal(hk.description, 'benim kancalarım');
  assert.deepEqual(hk.hooks.PreCompact[0], ESKI_GRUP);
  assert.equal(hk.hooks.PreCompact.length, 2);
  assert.deepEqual(hk.hooks.SessionStart[0], YEREL_HOOKS.hooks.SessionStart[0]);
  assert.deepEqual(hk.hooks.Stop, YEREL_HOOKS.hooks.Stop);
  assert.equal(hk.hooks.PostCompact.length, 1);
  const hedef = path.join(h, 'hafiz');
  const pre = hk.hooks.PreCompact[1]; const post = hk.hooks.PostCompact[0]; const bas = hk.hooks.SessionStart[1];
  assert.equal(pre.matcher, undefined); assert.equal(post.matcher, undefined);
  assert.equal(bas.matcher, '^compact$');
  assert.deepEqual(pre.hooks[0], { type: 'command', command: `'${K.nodeYolu()}' '${path.join(hedef, 'codex-oncesi.mjs')}'`, timeout: 10 });
  assert.equal(post.hooks[0].command, `'${K.nodeYolu()}' '${path.join(hedef, 'codex-sonrasi-kaydet.mjs')}'`);
  assert.deepEqual(bas.hooks[0], { type: 'command', command: `'${K.nodeYolu()}' '${path.join(hedef, 'codex-geri-yukle.mjs')}'`, timeout: 10, additionalContextLimit: 15000 });
  assert.equal(bas.hooks[0].statusMessage, undefined);
  // Güven tabloları: anahtar sırası ve hash'ler yazılan hooks.json'dan bağımsız yeniden hesaplanır.
  const config = fs.readFileSync(path.join(h, 'config.toml'), 'utf8');
  const satirlar = config.split('\n');
  const tablolar = K.guvenTablolari(satirlar);
  const hp = path.join(h, 'hooks.json');
  for (const k of [`${hp}:pre_compact:1:0`, `${hp}:post_compact:0:0`, `${hp}:session_start:1:0`]) {
    const t = tablolar.get(k); assert.ok(t, k);
    const olay = k.split(':')[1]; const g = Number(k.split(':')[2]);
    const ad = { pre_compact: 'PreCompact', post_compact: 'PostCompact', session_start: 'SessionStart' }[olay];
    assert.equal(t.hash, K.guvenHash(ad, hk.hooks[ad][g].matcher, hk.hooks[ad][g].hooks[0]));
  }
  assert.equal(tablolar.get(`${hp}:pre_compact:0:0`).hash, K.guvenHash('PreCompact', 'manual', ESKI_GRUP.hooks[0]), 'kullanıcının tablosu dokunulmadı');
  assert.equal(tablolar.size, 4);
  assert.deepEqual(K.ciftBaslik(satirlar), []);
  // Özet talimatı satırı çok satırlı metnin ve ilk tablonun arasında.
  const isaret = satirlar.indexOf('# hafiz-codex: özet talimatı');
  assert.ok(isaret > satirlar.indexOf('"""', satirlar.indexOf('"""') + 1) && isaret < satirlar.indexOf('[projects."/x"]'));
  assert.equal(satirlar[isaret + 1], `experimental_compact_prompt_file = "${path.join(hedef, 'ozet-talimati.md')}"`);
  // Yedekler: değişen iki dosya, birebir ve 0600.
  assert.equal(yedekler(h, 'hooks.json').length, 1); assert.equal(yedekler(h, 'config.toml').length, 1);
  assert.equal(fs.readFileSync(path.join(h, yedekler(h, 'hooks.json')[0]), 'utf8'), eskiHooks);
  assert.equal(fs.readFileSync(path.join(h, yedekler(h, 'config.toml')[0]), 'utf8'), cfg);
  assert.equal(izin(path.join(h, yedekler(h, 'config.toml')[0])), '600');
  // Kurulu düzen izinleri.
  assert.equal(izin(hedef), '700');
  for (const a of ['compact-ortak.mjs', 'hafiz-ayar.mjs', 'codex-ortak.mjs', 'codex-oncesi.mjs', 'codex-sonrasi-kaydet.mjs', 'codex-geri-yukle.mjs', 'hafiz-ayar.json', 'ozet-talimati.md', 'kurulum-kaydi.json']) assert.equal(izin(path.join(hedef, a)), '600', a);
});

test('kurulum: ikinci kurulum kopya üretmez, dosyalara ve yedeklere dokunmaz', () => {
  const h = codexHome('k2', { hooks: YEREL_HOOKS }); fs.writeFileSync(path.join(h, 'config.toml'), yerelConfig(h));
  assert.equal(kur(h).kod, 0);
  const once = { hooks: sha(path.join(h, 'hooks.json')), config: sha(path.join(h, 'config.toml')) };
  const r = kur(h);
  assert.equal(r.kod, 0, r.hata);
  assert.equal(sha(path.join(h, 'hooks.json')), once.hooks);
  assert.equal(sha(path.join(h, 'config.toml')), once.config);
  assert.equal(yedekler(h, 'hooks.json').length, 1); assert.equal(yedekler(h, 'config.toml').length, 1);
  const hk = oku(path.join(h, 'hooks.json'));
  assert.equal(hk.hooks.PreCompact.length, 2); assert.equal(hk.hooks.PostCompact.length, 1); assert.equal(hk.hooks.SessionStart.length, 2);
  assert.equal((fs.readFileSync(path.join(h, 'config.toml'), 'utf8').match(/^experimental_compact_prompt_file/gm) || []).length, 1);
});

test('kurulum: boş Codex klasörüne kurulur, sınanacak kayıt yoksa uyarır', () => {
  const h = codexHome('k3');
  const r = kur(h);
  assert.equal(r.kod, 0, r.hata);
  assert.ok(r.cikti.includes('sınayacak mevcut bir kayıt yoktu'), r.cikti);
  const config = fs.readFileSync(path.join(h, 'config.toml'), 'utf8');
  assert.ok(config.startsWith('# hafiz-codex: özet talimatı\nexperimental_compact_prompt_file = '));
  assert.equal(K.guvenTablolari(config.split('\n')).size, 3);
  assert.deepEqual(K.ciftBaslik(config.split('\n')), []);
  assert.equal(yedekler(h, 'hooks.json').length, 0, 'olmayan dosyanın yedeği olmaz');
  assert.equal(yedekler(h, 'config.toml').length, 0);
});

test('kurulum: mevcut compact_prompt ya da experimental_compact_prompt_file korunur', () => {
  for (const [ad, satir] of [['k4a', 'compact_prompt = "benimki"'], ['k4b', 'experimental_compact_prompt_file = "/baska/yol.md"']]) {
    const h = codexHome(ad, { config: `${satir}\nmodel = "x"\n\n[a]\nb = 1\n` });
    const r = kur(h);
    assert.equal(r.kod, 0, r.hata);
    const config = fs.readFileSync(path.join(h, 'config.toml'), 'utf8');
    assert.ok(config.startsWith(`${satir}\nmodel = "x"\n\n[a]\nb = 1\n`), ad);
    assert.ok(!config.includes('# hafiz-codex'), ad);
    assert.equal((config.match(/(?:experimental_)?compact_prompt(?:_file)? =/g) || []).length, 1, ad);
    assert.ok(r.cikti.includes('korundu'), r.cikti);
    assert.equal(K.guvenTablolari(config.split('\n')).size, 3);
  }
});

test('kurulum: aynı anahtarlı güven tablosu çiftlenmez, hash satırı güncellenir', () => {
  const h = codexHome('k5', { hooks: YEREL_HOOKS });
  const hp = path.join(h, 'hooks.json');
  fs.writeFileSync(path.join(h, 'config.toml'), yerelConfig(h) + `\n[hooks.state."${hp}:post_compact:0:0"]\ntrusted_hash = "sha256:eski"\nenabled = true\n`);
  const r = kur(h);
  assert.equal(r.kod, 0, r.hata);
  const config = fs.readFileSync(path.join(h, 'config.toml'), 'utf8');
  assert.equal(config.split('\n').filter(l => l === `[hooks.state."${hp}:post_compact:0:0"]`).length, 1);
  assert.deepEqual(K.ciftBaslik(config.split('\n')), []);
  const t = K.guvenTablolari(config.split('\n')).get(`${hp}:post_compact:0:0`);
  assert.notEqual(t.hash, 'sha256:eski');
  assert.ok(config.includes('enabled = true'), 'tablonun öteki satırı korunur');
});

test('kurulum: formül mevcut kayıtla uyuşmuyorsa güven YAZILMAZ ve /hooks yönlendirmesi çıkar', () => {
  const h = codexHome('k6', { hooks: YEREL_HOOKS });
  const hp = path.join(h, 'hooks.json');
  const bozuk = `model = "x"\n\n[hooks.state."${hp}:pre_compact:0:0"]\ntrusted_hash = "sha256:${'0'.repeat(64)}"\n`;
  fs.writeFileSync(path.join(h, 'config.toml'), bozuk);
  const r = kur(h);
  assert.equal(r.kod, 0, r.hata);
  assert.ok(r.cikti.includes("/hooks ya da Ayarlar > Kancalar'dan"), r.cikti);
  const config = fs.readFileSync(path.join(h, 'config.toml'), 'utf8');
  assert.ok(!config.includes('post_compact') && !config.includes('session_start') && !config.includes(':pre_compact:1:0'), 'bizim güven tablosu yok');
  assert.ok(config.includes(`trusted_hash = "sha256:${'0'.repeat(64)}"`), 'kullanıcının kaydı değişmedi');
  assert.equal(oku(hp).hooks.PostCompact.length, 1, 'kancalar yine de eklenir');
});

test('kurulum: çift tablo başlığı ya da bozuk hooks.json varsa hiçbir şey yazılmaz', () => {
  const cift = codexHome('k7a', { config: '[a]\nx = 1\n[a]\ny = 2\n' });
  const once = agac(cift);
  const r = kur(cift);
  assert.equal(r.kod, 1); assert.ok(r.hata.includes('Kurulum yapılmadı'), r.hata);
  assert.deepEqual(agac(cift), once);
  const bozuk = codexHome('k7b', { hooks: '{bozuk', config: 'model = "x"\n' });
  const once2 = agac(bozuk);
  assert.equal(kur(bozuk).kod, 1);
  assert.deepEqual(agac(bozuk), once2);
  assert.equal(kur(path.join(KOK, 'olmayan-klasor')).kod, 1);
  assert.equal(kur(codexHome('k7c'), ['--yanlis']).kod, 1);
});

test('kurulum: düğüm yolu değişmişse yerinde güncellenir, sıra ve tablo sayısı aynı kalır', () => {
  const h = codexHome('k8', { hooks: YEREL_HOOKS }); fs.writeFileSync(path.join(h, 'config.toml'), yerelConfig(h));
  assert.equal(kur(h).kod, 0);
  const hp = path.join(h, 'hooks.json'); const kp = path.join(h, 'hafiz', 'kurulum-kaydi.json');
  const eskiYol = '/eski/dugum';
  const sed = ham => ham.split(`'${K.nodeYolu()}'`).join(`'${eskiYol}'`);
  fs.writeFileSync(hp, sed(fs.readFileSync(hp, 'utf8')));
  fs.writeFileSync(kp, sed(fs.readFileSync(kp, 'utf8')));
  const hk0 = oku(hp);
  assert.ok(hk0.hooks.PreCompact[1].hooks[0].command.startsWith(`'${eskiYol}'`));
  const r = kur(h);
  assert.equal(r.kod, 0, r.hata);
  const hk = oku(hp);
  assert.equal(hk.hooks.PreCompact.length, 2);
  assert.ok(hk.hooks.PreCompact[1].hooks[0].command.startsWith(`'${K.nodeYolu()}'`));
  const config = fs.readFileSync(path.join(h, 'config.toml'), 'utf8');
  assert.deepEqual(K.ciftBaslik(config.split('\n')), []);
  const t = K.guvenTablolari(config.split('\n'));
  assert.equal(t.size, 4);
  assert.equal(t.get(`${hp}:pre_compact:1:0`).hash, K.guvenHash('PreCompact', undefined, hk.hooks.PreCompact[1].hooks[0]));
});

test('kurulum: --kuru hiçbir dosyayı değiştirmez ve yeni dosya oluşturmaz (sha256 önce/sonra)', () => {
  const h = codexHome('k9', { hooks: YEREL_HOOKS }); fs.writeFileSync(path.join(h, 'config.toml'), yerelConfig(h));
  const once = agac(h);
  const r = kur(h, ['--kuru']);
  assert.equal(r.kod, 0, r.hata);
  assert.ok(r.cikti.startsWith('KURU ÇALIŞMA: hiçbir dosya yazılmadı.'), r.cikti);
  assert.deepEqual(agac(h), once);
  assert.equal(kur(h).kod, 0);
  const kurulu = agac(h);
  const k = kaldir(h, ['--kuru']);
  assert.equal(k.kod, 0, k.hata);
  assert.ok(k.cikti.startsWith('KURU ÇALIŞMA: hiçbir dosya yazılmadı.'), k.cikti);
  assert.deepEqual(agac(h), kurulu);
  assert.equal(kur(h, ['--kuru']).kod, 0);
  assert.deepEqual(agac(h), kurulu, 'kurulu halde --kuru da dokunmaz');
});

test('kaldırma: yalnız Hafız kayıtlarını siler, dosyalar ve kullanıcı kayıtları durur', () => {
  const h = codexHome('k10', { hooks: YEREL_HOOKS }); const cfg = yerelConfig(h);
  fs.writeFileSync(path.join(h, 'config.toml'), cfg);
  const eskiHooks = oku(path.join(h, 'hooks.json'));
  assert.equal(kur(h).kod, 0);
  const r = kaldir(h);
  assert.equal(r.kod, 0, r.hata);
  assert.deepEqual(oku(path.join(h, 'hooks.json')), eskiHooks);
  assert.equal(fs.readFileSync(path.join(h, 'config.toml'), 'utf8'), cfg);
  assert.ok(fs.existsSync(path.join(h, 'hafiz', 'codex-oncesi.mjs')), 'program dosyaları silinmez');
  assert.ok(r.cikti.includes('rm -r'), r.cikti);
  assert.equal(kaldir(h).kod, 0, 'ikinci kaldırma zararsız');
  assert.deepEqual(oku(path.join(h, 'hooks.json')), eskiHooks);
});

test('kaldırma: kullanıcının değiştirdiği prompt satırı ve hash değişmiş güven tablosu silinmez', () => {
  const h = codexHome('k11', { hooks: YEREL_HOOKS }); fs.writeFileSync(path.join(h, 'config.toml'), yerelConfig(h));
  assert.equal(kur(h).kod, 0);
  const hp = path.join(h, 'hooks.json');
  let config = fs.readFileSync(path.join(h, 'config.toml'), 'utf8');
  config = config.replace(/^(experimental_compact_prompt_file = ).*$/m, '$1"/benim/talimatim.md"');
  const t = K.guvenTablolari(config.split('\n')).get(`${hp}:post_compact:0:0`);
  const satirlar = config.split('\n'); satirlar[t.hashIdx] = 'trusted_hash = "sha256:kullanici-degistirdi"';
  fs.writeFileSync(path.join(h, 'config.toml'), satirlar.join('\n'));
  const r = kaldir(h);
  assert.equal(r.kod, 0, r.hata);
  const son = fs.readFileSync(path.join(h, 'config.toml'), 'utf8');
  assert.ok(son.includes('experimental_compact_prompt_file = "/benim/talimatim.md"'));
  assert.ok(son.includes(`[hooks.state."${hp}:post_compact:0:0"]`) && son.includes('kullanici-degistirdi'));
  assert.ok(!son.includes(':pre_compact:1:0') && !son.includes(':session_start:1:0'));
  assert.ok(son.includes(`${hp}:pre_compact:0:0`), 'kullanıcının kendi tablosu durur');
  assert.equal(oku(hp).hooks.PostCompact, undefined);
});

test('kaldırma: Hafız grubundan sonra eklenen kullanıcı grubu kayarsa uyarı çıkar, grup korunur', () => {
  const h = codexHome('k12', { hooks: YEREL_HOOKS }); fs.writeFileSync(path.join(h, 'config.toml'), yerelConfig(h));
  assert.equal(kur(h).kod, 0);
  const hp = path.join(h, 'hooks.json');
  const hk = oku(hp);
  const sonra = { hooks: [{ type: 'command', command: 'printf sonradan-eklenen' }] };
  hk.hooks.PreCompact.push(sonra);
  fs.writeFileSync(hp, JSON.stringify(hk, null, 2) + '\n');
  const r = kaldir(h);
  assert.equal(r.kod, 0, r.hata);
  assert.deepEqual(oku(hp).hooks.PreCompact, [ESKI_GRUP, sonra]);
  assert.ok(r.cikti.includes('PreCompact') && r.cikti.includes('sırası değişti'), r.cikti);
});

// =========================================================== kurulu düzen uçtan uca
test('kurulu düzen: kancalar $CODEX_HOME/hafiz-durum içine yazar, ayar ve dil korunur', () => {
  const h = codexHome('uctan');
  assert.equal(kur(h).kod, 0);
  const hedef = path.join(h, 'hafiz');
  const ayarYolu = path.join(hedef, 'hafiz-ayar.json');
  fs.writeFileSync(ayarYolu, JSON.stringify({ ...VARSAYILAN_AYAR, parcaSayisi: 2, dil: 'en' }));
  assert.equal(kur(h).kod, 0);
  assert.equal(oku(ayarYolu).parcaSayisi, 2, 'ayar yeniden kurulumda korunur');
  assert.equal(fs.readFileSync(path.join(hedef, 'ozet-talimati.md'), 'utf8'), fs.readFileSync(path.join(DIZIN, 'ozet-talimati.en.md'), 'utf8'));
  const sid = 'uctan-1';
  const yol = rollout(sid, [meta(sid), ...Array.from({ length: 12 }, (_, i) => kul(`K${String(i).padStart(2, '0')} ` + 'ö'.repeat(3000))), compacted('KURULU ÖZET')], h);
  const env = { PATH: process.env.PATH, HOME: EV, CODEX_HOME: h };
  const calis = (ad, ek = {}) => spawnSync(process.execPath, [path.join(hedef, ad)], { input: JSON.stringify(girdi(sid, yol, ek)), env, encoding: 'utf8', timeout: 30000 });
  assert.equal(calis('codex-oncesi.mjs').status, 0);
  const durum = path.join(h, 'hafiz-durum', sid);
  assert.ok(fs.existsSync(path.join(durum, 'son-mesajlar.json')), 'durum $CODEX_HOME/hafiz-durum altında');
  assert.equal(calis('codex-sonrasi-kaydet.mjs').status, 0);
  assert.deepEqual(fs.readdirSync(durum).filter(a => a.startsWith('ozet-')).map(a => fs.readFileSync(path.join(durum, a), 'utf8')), ['KURULU ÖZET']);
  const r = calis('codex-geri-yukle.mjs', { hook_event_name: 'SessionStart', source: 'compact' });
  assert.equal(r.status, 0);
  const ctx = JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
  assert.ok(ctx.length <= 2 * 9500 && ctx.includes('K11 '), `uzunluk ${ctx.length}`);
  assert.ok(ctx.includes('LATEST MESSAGES'), 'dil en');
  assert.ok(!fs.existsSync(path.join(EV, '.claude')), 'Claude klasörüne dokunulmadı');
  assert.equal(izin(durum), '700');
});

test('kurulum: Homebrew sürümlü node yolu kararlı bin yoluna çevrilir', () => {
  const kok = fs.mkdtempSync(path.join(PAKET, '.test-node-'));
  try {
    const cellar = path.join(kok, 'Cellar', 'node', '99.0.0', 'bin'); fs.mkdirSync(cellar, { recursive: true });
    const ikili = path.join(cellar, 'node'); fs.writeFileSync(ikili, '');
    fs.mkdirSync(path.join(kok, 'bin')); fs.symlinkSync(ikili, path.join(kok, 'bin', 'node'));
    assert.equal(K.nodeYolu(ikili), path.join(kok, 'bin', 'node'));
    fs.unlinkSync(path.join(kok, 'bin', 'node'));
    assert.equal(K.nodeYolu(ikili), ikili);
    assert.equal(K.nodeYolu('/usr/local/bin/node'), '/usr/local/bin/node');
  } finally { fs.rmSync(kok, { recursive: true, force: true }); }
});
