import test from 'node:test';
import assert from 'node:assert/strict';
import { olcum, register } from '../hooks/register.js';

function ortam() {
  const hooks = new Map();
  register((ad, ...args) => hooks.set(ad, args.at(-1)));
  const timers = [];
  const sureler = [];
  const bildirimler = [];
  let tokens = 436000, ayar = 500000, compact = 0, iptal = 0, yenileme = 0;
  const eleman = type => ({ children = [], ...props } = {}) => ({ type, props, children: Array.isArray(children) ? children : [children] });
  const $ = {
    ui: {
      resolve: () => ({ Box: eleman('Box'), Text: eleman('Text'), Button: eleman('Button') }),
      invalidate: () => yenileme++, toast: text => bildirimler.push(text),
    },
    clock: {
      every: (ms, fn) => { const timer = { ms, fn, cancel: () => iptal++ }; timers.push(timer); return timer; },
      after: (ms, fn) => { const timer = { ms, fn }; sureler.push(timer); return timer; },
    },
    session: { usage: async () => ({ context: { tokens, window: 1000000 } }), compact: async () => { compact++; return { messages: [] }; } },
    settings: { read: async () => ayar },
  };
  const alt = { type: 'Text', props: {}, children: ['diğer mod'] };
  const cagir = (ad, e = {}, next = async () => ({})) => hooks.get(ad)($, e, next);
  const ciz = (isWorking = false, hasSurvey = false) => cagir('ui.render', { surface: 'desktop', props: { isWorking, hasSurvey } }, async () => alt);
  return { $, timers, sureler, bildirimler, cagir, ciz, alt,
    ayarla: v => { ayar = v; }, tokens: v => { tokens = v; },
    sayilar: () => ({ compact, iptal, yenileme }),
  };
}
function bul(agac, key) {
  if (agac?.props?.key === key) return agac;
  for (const alt of agac?.children ?? []) { const sonuc = bul(alt, key); if (sonuc) return sonuc; }
}

test('sayaç: ayar, model penceresi, sıfır ve ölçülemeyen durumlar', () => {
  assert.equal(olcum({ tokens: 436000, window: 1000000 }, 500000).metin, '436k / 500k');
  for (const ayar of [undefined, null, 0, -1, NaN, Infinity, '500000']) {
    assert.equal(olcum({ tokens: 436000, window: 1000000 }, ayar).metin, '436k / 1000k');
  }
  assert.equal(olcum({ tokens: 0, window: 200000 }).yuzde, 0);
  for (const tokens of [undefined, null, -1, NaN, Infinity, '1']) assert.equal(olcum({ tokens, window: 200000 }), null);
  assert.equal(olcum({ tokens: 1, window: 0 }), null);
});

test('sayaç: %80 ve %95 sınırları, aşımda dolu çubuk ve gerçek sayı', () => {
  for (const [tokens, renk, temiz] of [[399999, 'subtle', false], [400000, 'warning', true], [474999, 'warning', true], [475000, 'error', true]]) {
    assert.deepEqual([olcum({ tokens }, 500000).renk, olcum({ tokens }, 500000).temiz], [renk, temiz]);
  }
  assert.deepEqual(olcum({ tokens: 600000 }, 500000), { metin: '600k / 500k', yuzde: 100, renk: 'error', temiz: true });
});

test('sayaç: tek sağ hap, tema rengi, alttaki mod ve anket korunur', async () => {
  const o = ortam();
  const agac = await o.ciz();
  assert.equal(bul(agac, 'sayac-satir').props.justifyContent, 'flex-end');
  assert.equal(bul(agac, 'sayac-hap').props.borderColor, 'warning');
  assert.equal(bul(agac, 'cubuk').children[0].props.backgroundColor, 'warning');
  assert.equal(agac.children[1], o.alt);
  assert.equal(await o.ciz(false, true), o.alt);
  o.tokens(undefined);
  assert.equal(await o.ciz(), o.alt);
});

const bosalt = () => new Promise(resolve => setImmediate(resolve));
const metinde = (agac, parca) => JSON.stringify(agac).includes(parca);

test('sayaç: tur sürerken de düğme vardır; %80 altında da tıklanır', async () => {
  const o = ortam();
  let agac = await o.ciz(true);
  assert.ok(bul(agac, 'sayac'));
  assert.ok(bul(agac, 'temiz-yazi'));
  assert.equal(bul(agac, 'sayac').props.label, 'Compact');
  assert.equal(bul(agac, 'bekle'), undefined);
  o.tokens(100000);
  agac = await o.ciz(false);
  assert.ok(bul(agac, 'sayac'));
  assert.equal(bul(agac, 'temiz-yazi'), undefined);
  assert.match(JSON.stringify(bul(agac, 'sayac')), /100k \/ 500k|100k \/ 1000k/);
  bul(agac, 'sayac').props.onPress();
  agac = await o.ciz(false);
  assert.ok(metinde(agac, 'Compact edilsin mi?'));
  assert.deepEqual(bul(agac, 'evet').children, ['  Evet  ']);
  assert.ok(metinde(agac, '100k'));
});

test('sayaç: tur sürerken Evet: command.run bir kez, "Compact sırada", çözülünce düğme geri gelir', async () => {
  const o = ortam();
  let bitir, cagrilar = 0;
  o.$.command = { run: () => { cagrilar++; return new Promise(resolve => { bitir = resolve; }); } };
  await o.cagir('turn.start', { turnId: 'ana' });
  bul(await o.ciz(true), 'sayac').props.onPress();
  const evet = bul(await o.ciz(true), 'evet').props.onPress;
  evet(); evet(); await bosalt();
  assert.equal(cagrilar, 1);
  const agac = await o.ciz(true);
  assert.ok(metinde(agac, 'Compact sırada · tur bitince'));
  assert.equal(bul(agac, 'sayac'), undefined);
  assert.equal(o.sayilar().compact, 0);
  await o.cagir('turn.complete', { turnId: 'alt', agentId: 'alt' });
  assert.ok(metinde(await o.ciz(true), 'Compact sırada'));
  bitir({}); await bosalt();
  assert.ok(bul(await o.ciz(false), 'sayac'));
});

test('sayaç: tur yokken Evet: Kısaltılıyor görünür, bitene kadar basış etkisizdir', async () => {
  const o = ortam();
  let bitir, cagrilar = 0;
  o.$.command = { run: () => { cagrilar++; return new Promise(resolve => { bitir = resolve; }); } };
  bul(await o.ciz(), 'sayac').props.onPress();
  bul(await o.ciz(), 'evet').props.onPress(); await bosalt();
  const agac = await o.ciz();
  assert.ok(metinde(agac, 'Kısaltılıyor…'));
  assert.equal(bul(agac, 'sayac'), undefined);
  assert.equal(cagrilar, 1);
  bitir({}); await bosalt();
  assert.ok(bul(await o.ciz(), 'sayac'));
});

test('sayaç: soru 8 sn sonra kapanır; eski zamanlayıcı yeni soruyu kapatmaz', async () => {
  const o = ortam();
  bul(await o.ciz(), 'sayac').props.onPress();
  assert.equal(o.sureler[0].ms, 8000);
  assert.ok(bul(await o.ciz(), 'evet'));
  o.sureler[0].fn();
  assert.ok(bul(await o.ciz(), 'sayac'));
  assert.equal(bul(await o.ciz(), 'evet'), undefined);
  // vazgeç + yeniden aç: ilk zamanlayıcı ikinci soruyu kapatamaz
  bul(await o.ciz(), 'sayac').props.onPress();
  bul(await o.ciz(), 'vazgec').props.onPress();
  bul(await o.ciz(), 'sayac').props.onPress();
  const once = o.sayilar().yenileme;
  o.sureler[1].fn();
  assert.ok(bul(await o.ciz(), 'evet'));
  assert.equal(o.sayilar().yenileme, once);
  o.sureler[2].fn();
  assert.equal(bul(await o.ciz(), 'evet'), undefined);
});

test('sayaç: command.run reddeder + tur sürüyor: ana tur bitince doğrudan compact bir kez', async () => {
  const o = ortam();
  o.$.command = { run: async () => { throw new Error('red'); } };
  await o.cagir('turn.start', { turnId: 'ana' });
  bul(await o.ciz(true), 'sayac').props.onPress();
  bul(await o.ciz(true), 'evet').props.onPress(); await bosalt();
  assert.equal(o.sayilar().compact, 0);
  assert.ok(metinde(await o.ciz(true), 'Compact sırada'));
  await o.cagir('turn.complete', { turnId: 'alt', agentId: 'alt' });
  assert.equal(o.sureler.filter(t => t.ms === 400).length, 0);
  await o.cagir('turn.complete', { turnId: 'ana' });
  const t400 = o.sureler.filter(t => t.ms === 400);
  assert.equal(t400.length, 1);
  await t400[0].fn();
  assert.equal(o.sayilar().compact, 1);
  assert.ok(bul(await o.ciz(false), 'sayac'));
  await o.cagir('turn.complete', { turnId: 'ana2' });
  assert.equal(o.sureler.filter(t => t.ms === 400).length, 1);
});

test('sayaç: command.run yoksa doğrudan compact; reddederse ve skip dönerse bildirim', async () => {
  let o = ortam();
  bul(await o.ciz(), 'sayac').props.onPress();
  bul(await o.ciz(), 'evet').props.onPress(); await bosalt();
  assert.equal(o.sayilar().compact, 1);
  assert.deepEqual(o.bildirimler, []);
  o = ortam();
  o.$.session.compact = async () => { throw new Error('busy'); };
  bul(await o.ciz(), 'sayac').props.onPress();
  bul(await o.ciz(), 'evet').props.onPress(); await bosalt();
  assert.match(o.bildirimler[0], /Başka oturumdan gelen bir mesaj/);
  assert.ok(bul(await o.ciz(), 'sayac'));
  o = ortam();
  o.$.session.compact = async () => ({ skip: 'x' });
  bul(await o.ciz(), 'sayac').props.onPress();
  bul(await o.ciz(), 'evet').props.onPress(); await bosalt();
  assert.match(o.bildirimler[0], /bir kısaltma kancası/);
});

test('sayaç: session.compact kancası durumu izler; session.end hepsini sıfırlar', async () => {
  const o = ortam();
  let icerde;
  const bitir = o.cagir('session.compact', {}, async () => { icerde = await o.ciz(); return {}; });
  await bitir;
  assert.ok(metinde(icerde, 'Kısaltılıyor…'));
  assert.ok(bul(await o.ciz(), 'sayac'));
  o.$.command = { run: async () => { throw new Error('red'); } };
  await o.cagir('turn.start', { turnId: 'ana' });
  bul(await o.ciz(true), 'sayac').props.onPress();
  bul(await o.ciz(true), 'evet').props.onPress(); await bosalt();
  await o.cagir('session.end');
  await o.cagir('turn.complete', { turnId: 'ana' });
  assert.equal(o.sureler.filter(t => t.ms === 400).length, 0);
  assert.ok(bul(await o.ciz(false), 'sayac'));
});

test('sayaç: tek saat, temizleme, sonraki turda yeniden başlatma', async () => {
  const o = ortam();
  await o.cagir('session.start'); await o.cagir('session.start');
  assert.equal(o.timers.length, 1);
  assert.equal(o.timers[0].ms, 5000);
  await o.cagir('session.end', { reason: 'clear' });
  assert.equal(o.sayilar().iptal, 1);
  await o.cagir('turn.start', { turnId: 'yeni' });
  assert.equal(o.timers.length, 2);
  await o.cagir('session.end');
  assert.equal(o.sayilar().iptal, 2);
});

test('sayaç: yoklama aynı ölçümde yeniden çizdirmez, ölçüm değişince çizdirir', async () => {
  const o = ortam();
  await o.cagir('session.start');
  await o.ciz();
  const once = o.sayilar().yenileme;
  await o.timers[0].fn();
  await o.timers[0].fn();
  assert.equal(o.sayilar().yenileme, once);
  o.tokens(475000);
  await o.timers[0].fn();
  assert.equal(o.sayilar().yenileme, once + 1);
  await o.ciz();
  await o.timers[0].fn();
  assert.equal(o.sayilar().yenileme, once + 1);
  o.ayarla(1000000);
  await o.timers[0].fn();
  assert.equal(o.sayilar().yenileme, once + 2);
  await o.ciz();
  o.tokens(undefined);
  await o.timers[0].fn();
  assert.equal(o.sayilar().yenileme, once + 3);
  await o.ciz();
  await o.timers[0].fn();
  assert.equal(o.sayilar().yenileme, once + 3);
});
