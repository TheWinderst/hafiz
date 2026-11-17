import test from 'node:test';
import assert from 'node:assert/strict';
import { olcum, register } from '../hooks/register.js';

function ortam() {
  const hooks = new Map();
  register((ad, ...args) => hooks.set(ad, args.at(-1)));
  const timers = [];
  const bildirimler = [];
  let tokens = 436000, ayar = 500000, compact = 0, iptal = 0, yenileme = 0;
  const eleman = type => ({ children = [], ...props } = {}) => ({ type, props, children: Array.isArray(children) ? children : [children] });
  const $ = {
    ui: {
      resolve: () => ({ Box: eleman('Box'), Text: eleman('Text'), Button: eleman('Button') }),
      invalidate: () => yenileme++, toast: text => bildirimler.push(text),
    },
    clock: { every: (ms, fn) => { const timer = { ms, fn, cancel: () => iptal++ }; timers.push(timer); return timer; } },
    session: { usage: async () => ({ context: { tokens, window: 1000000 } }), compact: async () => { compact++; return { messages: [] }; } },
    settings: { read: async () => ayar },
  };
  const alt = { type: 'Text', props: {}, children: ['diğer mod'] };
  const cagir = (ad, e = {}, next = async () => ({})) => hooks.get(ad)($, e, next);
  const ciz = (isWorking = false, hasSurvey = false) => cagir('ui.render', { surface: 'desktop', props: { isWorking, hasSurvey } }, async () => alt);
  return { $, timers, bildirimler, cagir, ciz, alt,
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

test('sayaç: başka oturumun başlattığı turda pasif, bitince etkin', async () => {
  const o = ortam();
  let agac = await o.ciz(true);
  assert.equal(bul(agac, 'temiz'), undefined);
  assert.equal(bul(agac, 'bekle').children[0].props.dimColor, true);
  assert.equal(bul(agac, 'bekle').children[1].props.display, 'none');
  assert.equal(bul(agac, 'bekle').children[1].props.hover.display, 'flex');
  assert.match(JSON.stringify(agac), /Tur bitince compact yapılabilir/);
  agac = await o.ciz(false);
  assert.ok(bul(agac, 'temiz'));
});

test('sayaç: eski onay basışı yeni turda compact yapamaz, alt ajanın bitişi kilidi açmaz', async () => {
  const o = ortam();
  bul(await o.ciz(), 'temiz').props.onPress();
  const evet = bul(await o.ciz(), 'evet').props.onPress;
  await o.cagir('turn.start', { turnId: 'ana' });
  await o.cagir('turn.complete', { turnId: 'alt', agentId: 'alt' });
  await evet();
  assert.equal(o.sayilar().compact, 0);
  assert.deepEqual(o.bildirimler, ['Tur bitince compact yapılabilir']);
  await o.cagir('turn.complete', { turnId: 'ana', reason: 'aborted' });
  assert.ok(bul(await o.ciz(), 'temiz'));
});

test('sayaç: çift basış tek kısaltma başlatır; bitene kadar pasif kalır', async () => {
  const o = ortam();
  let bitir, cagrilar = 0;
  o.$.session.compact = () => { cagrilar++; return new Promise(resolve => { bitir = resolve; }); };
  bul(await o.ciz(), 'temiz').props.onPress();
  const evet = bul(await o.ciz(), 'evet').props.onPress;
  const ilk = evet();
  await evet();
  assert.equal(cagrilar, 1);
  assert.equal(bul(await o.ciz(), 'temiz'), undefined);
  bitir({ messages: [] }); await ilk;
  assert.ok(bul(await o.ciz(), 'temiz'));
});

test('sayaç: tek saat, temizleme, sonraki turda yeniden başlatma', async () => {
  const o = ortam();
  await o.cagir('session.start'); await o.cagir('session.start');
  assert.equal(o.timers.length, 1);
  assert.equal(o.timers[0].ms, 5000);
  const once = o.sayilar().yenileme;
  o.timers[0].fn();
  assert.equal(o.sayilar().yenileme, once + 1);
  await o.cagir('session.end', { reason: 'clear' });
  assert.equal(o.sayilar().iptal, 1);
  await o.cagir('turn.start', { turnId: 'yeni' });
  assert.equal(o.timers.length, 2);
  await o.cagir('session.end');
  assert.equal(o.sayilar().iptal, 2);
});
