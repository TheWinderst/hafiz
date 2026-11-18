import { expect, mock, test } from 'claude-code/testing'

const PROPS = {
  hasSurvey: false, isCollapsed: false, isWorking: false,
  maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {},
} as const
const BAND = { plugin: 'hafiz-sayac', component: 'AbovePrompt', props: PROPS } as const

function hazirla(on: any, tokens: number | undefined = 436_000, ayar: unknown = 500_000, window = 1_000_000) {
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens, window }, rateLimits: [] } }))
  on('settings.read', () => ({ value: ayar === null ? {} : { autoCompactWindow: ayar } }))
}

test('sayılar, tema renkleri ve sağ hizalama; alttaki çizim korunur', async ($, on) => {
  hazirla(on)
  on('ui.render', ($, e) => $.ui.resolve(e).Text({ children: 'Diğer çizim' }))
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: '436k / 500k' }))?.props.color).toBe('text')
    expect((await ui.find({ key: 'sayac-hap' }))?.props.borderColor).toBe('warning')
    expect((await ui.find({ key: 'sayac-satir' }))?.props.justifyContent).toBe('flex-end')
    expect(await ui.keepsBeneath()).toBe(true)
    expect(await ui.find({ type: 'Text', text: 'Diğer çizim' })).toBeTruthy()
    await ui.unmount()
  }
})

test('ayar yoksa model penceresi kullanılır; ölçüm yoksa sayı uydurulmaz', async ($, on) => {
  hazirla(on, 436_000, null)
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /436k/ }))?.text).toBe('436k / 1000k')
  expect(await ui.find({ key: 'temiz' })).toBeFalsy()
  await ui.unmount()
})

test('yeni pencerede ölçüm henüz yoksa hap çizilmez', async ($, on) => {
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200_000 }, rateLimits: [] } }))
  on('settings.read', () => ({ value: {} }))
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ key: 'sayac-hap' })).toBeFalsy()
  expect(await ui.keepsBeneath()).toBe(true)
  await ui.unmount()
})

test('tur durumu başka bir oturumun mesajında ve yeniden yüklemede de okunur', async ($, on) => {
  hazirla(on)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface, props: { ...PROPS, isWorking: true } })
    expect(await ui.find({ type: 'Button' })).toBeFalsy()
    expect((await ui.find({ type: 'Text', text: 'Temiz compact' }))?.props.dimColor).toBe(true)
    const bekle = await ui.find({ key: 'bekle' })
    expect(bekle).toBeTruthy()
    expect(JSON.stringify(await ui.drawn())).toContain('Tur bitince compact yapılabilir')
    await ui.redraw({ ...PROPS, isWorking: false })
    expect(await ui.find({ key: 'temiz' })).toBeTruthy()
    await ui.unmount()
  }
})

test('onay ve vazgeçme; compact çağrısı kullanıcı onayından sonra bir kez yapılır', async ($, on) => {
  hazirla(on)
  let cagrilar = 0
  on('session.compact', (_, e) => { cagrilar++; expect(e.instructions).toContain('kullanıcının'); return { messages: [{ role: 'user', text: 'Özet', toolUses: [] }] } })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'temiz' })
  expect(await ui.find({ key: 'evet' })).toBeTruthy()
  expect(cagrilar).toBe(0)
  await ui.press({ key: 'vazgec' })
  expect(cagrilar).toBe(0)
  await ui.press({ key: 'temiz' })
  await ui.press({ key: 'evet' })
  expect(cagrilar).toBe(1)
  await ui.unmount()
})

test('tıklama sırasında yeni tur başlarsa açık bildirim, otomatik tekrar yok', async ($, on) => {
  hazirla(on)
  let bildirim = ''
  let cagrilar = 0
  on('ui.toast', (_, e) => { bildirim = e.text; return { value: undefined } })
  on('session.compact', () => { cagrilar++; throw new Error('busy') })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'temiz' })
  await ui.press({ key: 'evet' })
  expect(bildirim).toContain('Başka oturumdan gelen bir mesaj')
  expect(cagrilar).toBe(1)
  expect(await ui.find({ key: 'temiz' })).toBeTruthy()
  await ui.unmount()
})

test('kısaltma kancası durdurduğunda ayrı bildirim gösterilir', async ($, on) => {
  hazirla(on)
  let bildirim = ''
  on('ui.toast', (_, e) => { bildirim = e.text; return { value: undefined } })
  on('session.compact', () => ({ skip: 'test' }))
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'temiz' })
  await ui.press({ key: 'evet' })
  expect(bildirim).toContain('bir kısaltma kancası')
  await ui.unmount()
})

test('anket çizimine yer bırakılır', async ($, on) => {
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop', props: { ...PROPS, hasSurvey: true } })
  expect(await ui.find({ key: 'sayac-hap' })).toBeFalsy()
  expect(await ui.keepsBeneath()).toBe(true)
  await ui.unmount()
})

test('yoklama tek saat kurar ve oturum bitiminde iptal edilir', async ($, on) => {
  const clock = mock.clock(on)
  let tokens = 436_000
  let okumalar = 0
  on('session.usage', () => { okumalar++; return { value: { startedAt: 0, context: { tokens, window: 500_000 }, rateLimits: [] } } })
  on('settings.read', () => ({ value: {} }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.end', (_, e) => ({ sessionId: e.sessionId }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  tokens = 475_000
  await clock.advance(5000)
  expect(await ui.find({ type: 'Text', text: '475k / 500k' })).toBeTruthy()
  await $.session.end({ reason: 'clear', sessionId: 'test', resume: { id: 'test' } })
  const son = okumalar
  tokens = 100_000
  await clock.advance(5000)
  expect(okumalar).toBe(son)
  await ui.unmount()
})

test('eşik renkleri ve ayar değişikliği çizimde uygulanır', async ($, on) => {
  let tokens = 399_999
  let ayar = 500_000
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens, window: 1_000_000 }, rateLimits: [] } }))
  on('settings.read', () => ({ value: { autoCompactWindow: ayar } }))
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    for (const [n, renk, temiz] of [[0, 'subtle', false], [399_999, 'subtle', false], [400_000, 'warning', true], [474_999, 'warning', true], [475_000, 'error', true], [600_000, 'error', true]] as const) {
      tokens = n
      await ui.redraw()
      expect((await ui.find({ key: 'sayac-hap' }))?.props.borderColor).toBe(renk)
      expect(Boolean(await ui.find({ key: 'temiz' }))).toBe(temiz)
      if (surface === 'desktop') {
        expect((await ui.find({ key: 'cubuk' }))?.props.height).toBe(0.35)
      }
    }
    ayar = 1_000_000
    await ui.redraw()
    expect(await ui.find({ type: 'Text', text: '600k / 1000k' })).toBeTruthy()
    expect(await ui.find({ key: 'temiz' })).toBeFalsy()
    ayar = 500_000
    await ui.unmount()
  }
})

test('evet: compact önce /compact komutu olarak çalışır, doğrudan çağrıya düşmez', async ($, on) => {
  hazirla(on)
  const komutlar: any[] = []
  let dogrudan = 0
  on('command.run', { command: 'compact' }, (_, e) => { komutlar.push(e); return { text: '' } })
  on('session.compact', () => { dogrudan++; return { messages: [] } })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'temiz' })
  await ui.press({ key: 'evet' })
  expect(komutlar).toHaveLength(1)
  expect(komutlar[0].args).toContain('kullanıcının')
  expect(dogrudan).toBe(0)
  await ui.unmount()
})
