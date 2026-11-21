import { expect, mock, test } from 'claude-code/testing'

const PROPS = {
  hasSurvey: false, isCollapsed: false, isWorking: false,
  maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {},
} as const
const BAND = { plugin: 'hafiz-sayac', component: 'AbovePrompt', props: PROPS } as const

function hazirla(on: any, tokens: number | undefined = 436_000, ayar: unknown = 500_000, window = 1_000_000) {
  const clock = mock.clock(on)
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens, window }, rateLimits: [] } }))
  on('settings.read', () => ({ value: ayar === null ? {} : { autoCompactWindow: ayar } }))
  return clock
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
  expect(await ui.find({ type: 'Text', text: 'Temiz compact' })).toBeFalsy()
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

test('tur sürerken de sayaç düğmesi vardır; Evet sonrası "Compact sırada" çıkar', async ($, on) => {
  hazirla(on)
  let bitir!: () => void
  on('command.run', { command: 'compact' }, () => new Promise(r => { bitir = () => r({ text: '' }) }))
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface, props: { ...PROPS, isWorking: true } })
    expect(await ui.find({ key: 'sayac' })).toBeTruthy()
    expect(await ui.find({ key: 'bekle' })).toBeFalsy()
    await ui.press({ key: 'sayac' })
    await ui.press({ key: 'evet' })
    await new Promise(r => setTimeout(r, 20))
    expect(await ui.find({ type: 'Text', text: /Compact sırada/ })).toBeTruthy()
    expect(await ui.find({ key: 'sayac' })).toBeFalsy()
    bitir()
    await new Promise(r => setTimeout(r, 20))
    await ui.unmount()
  }
})

test('onay ve vazgeçme; compact çağrısı kullanıcı onayından sonra bir kez yapılır', async ($, on) => {
  hazirla(on)
  let cagrilar = 0
  on('session.compact', (_, e) => { cagrilar++; expect(e.instructions).toContain('kullanıcının'); return { messages: [{ role: 'user', text: 'Özet', toolUses: [] }] } })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'sayac' })
  expect(await ui.find({ key: 'evet' })).toBeTruthy()
  expect(cagrilar).toBe(0)
  await ui.press({ key: 'vazgec' })
  expect(cagrilar).toBe(0)
  await ui.press({ key: 'sayac' })
  await ui.press({ key: 'evet' })
  expect(cagrilar).toBe(1)
  await ui.unmount()
})

test('komut çalışmaz ve doğrudan compact da reddedilirse açık bildirim, otomatik tekrar yok', async ($, on) => {
  hazirla(on)
  let bildirim = ''
  let cagrilar = 0
  on('ui.toast', (_, e) => { bildirim = e.text; return { value: undefined } })
  on('session.compact', () => { cagrilar++; throw new Error('busy') })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'sayac' })
  await ui.press({ key: 'evet' })
  expect(bildirim).toContain('Başka oturumdan gelen bir mesaj')
  expect(cagrilar).toBe(1)
  expect(await ui.find({ key: 'sayac' })).toBeTruthy()
  await ui.unmount()
})

test('kısaltma kancası durdurduğunda ayrı bildirim gösterilir', async ($, on) => {
  hazirla(on)
  let bildirim = ''
  on('ui.toast', (_, e) => { bildirim = e.text; return { value: undefined } })
  on('session.compact', () => ({ skip: 'test' }))
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'sayac' })
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
      expect(Boolean(await ui.find({ type: 'Text', text: 'Temiz compact' }))).toBe(temiz)
      expect(await ui.find({ key: 'sayac' })).toBeTruthy()
      if (surface === 'desktop') {
        expect((await ui.find({ key: 'cubuk' }))?.props.height).toBe(0.35)
      }
    }
    ayar = 1_000_000
    await ui.redraw()
    expect(await ui.find({ type: 'Text', text: '600k / 1000k' })).toBeTruthy()
    expect(await ui.find({ type: 'Text', text: 'Temiz compact' })).toBeFalsy()
    ayar = 500_000
    await ui.unmount()
  }
})

test('evet: compact önce /compact komutu olarak çalışır, doğrudan çağrıya düşmez', async ($, on) => {
  hazirla(on)
  const komutlar: any[] = []
  let dogrudan = 0
  on('command.run', { command: 'compact' }, (_, e) => { komutlar.push(e); return { text: '' } })
  on('session.compact', () => { dogrudan++; return { messages: [{ role: 'user', text: 'Özet', toolUses: [] }] } })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'sayac' })
  await ui.press({ key: 'evet' })
  expect(komutlar).toHaveLength(1)
  expect(komutlar[0].args).toContain('kullanıcının')
  expect(dogrudan).toBe(0)
  await ui.unmount()
})

test('%80 altında da sayaç düğmesi var; basınca soru açılır', async ($, on) => {
  hazirla(on, 145_000)
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const dugme = await ui.find({ key: 'sayac' })
  expect(dugme?.type).toBe('Button')
  expect(JSON.stringify(dugme)).toContain('145k / 500k')
  expect(JSON.stringify(dugme)).not.toContain('Temiz compact')
  await ui.press({ key: 'sayac' })
  expect(await ui.find({ type: 'Text', text: 'Compact edilsin mi?' })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: '145k / 500k' })).toBeTruthy()
  await ui.press({ key: 'vazgec' })
  expect(await ui.find({ key: 'sayac' })).toBeTruthy()
  await ui.unmount()
})

test('tur sürerken Evet: command.run bir kez, "Compact sırada", çözülünce düğme geri gelir', async ($, on) => {
  hazirla(on)
  let bitir!: () => void
  const calisan: any[] = []
  on('command.run', { command: 'compact' }, (_, e) => { calisan.push(e); return new Promise(r => { bitir = () => r({ text: '' }) }) })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop', props: { ...PROPS, isWorking: true } })
  await ui.press({ key: 'sayac' })
  await ui.press({ key: 'evet' })
  await new Promise(r => setTimeout(r, 20))
  expect(calisan).toHaveLength(1)
  expect(await ui.find({ type: 'Text', text: /Compact sırada · tur bitince/ })).toBeTruthy()
  expect(await ui.find({ key: 'sayac' })).toBeFalsy()
  bitir()
  await new Promise(r => setTimeout(r, 20))
  expect(await ui.find({ type: 'Text', text: /Compact sırada/ })).toBeFalsy()
  expect(await ui.find({ key: 'sayac' })).toBeTruthy()
  await ui.unmount()
})

test('soru 8 sn içinde cevaplanmazsa kendiliğinden kapanır', async ($, on) => {
  const clock = hazirla(on)
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'sayac' })
  expect(await ui.find({ key: 'evet' })).toBeTruthy()
  await clock.advance(7000)
  expect(await ui.find({ key: 'evet' })).toBeTruthy()
  await clock.advance(1500)
  expect(await ui.find({ key: 'evet' })).toBeFalsy()
  expect(await ui.find({ key: 'sayac' })).toBeTruthy()
  await ui.unmount()
})

test('command.run reddeder + tur sürüyor: ana tur bitince session.compact bir kez çağrılır', async ($, on) => {
  const clock = hazirla(on)
  let dogrudan = 0
  on('command.run', { command: 'compact' }, () => { throw new Error('red') })
  on('session.compact', () => { dogrudan++; return { messages: [{ role: 'user', text: 'Özet', toolUses: [] }] } })
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  await $.turn.start({ text: 'merhaba', turnId: 'ana' })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop', props: { ...PROPS, isWorking: true } })
  await ui.press({ key: 'sayac' })
  await ui.press({ key: 'evet' })
  await new Promise(r => setTimeout(r, 20))
  expect(dogrudan).toBe(0)
  expect(await ui.find({ type: 'Text', text: /Compact sırada/ })).toBeTruthy()
  await $.turn.complete({ turnId: 'ana', answer: 'tamam', durationMs: 1, isAborted: false, reason: 'answer' } as any)
  await clock.advance(500)
  expect(dogrudan).toBe(1)
  await ui.redraw({ ...PROPS, isWorking: false })
  expect(await ui.find({ key: 'sayac' })).toBeTruthy()
  await ui.unmount()
})

test('yoklama aynı ölçümde bandı yeniden çizdirmez, ölçüm değişince çizdirir', async ($, on) => {
  const clock = mock.clock(on)
  let tokens = 436_000
  let cizim = 0
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens, window: 500_000 }, rateLimits: [] } }))
  on('settings.read', () => ({ value: {} }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.render', ($, e) => { cizim++; return $.ui.resolve(e).Text({ children: 'x' }) })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await clock.advance(5000)
  const once = cizim
  await clock.advance(30_000)
  expect(cizim).toBe(once)
  tokens = 475_000
  await clock.advance(5000)
  expect(cizim).toBeGreaterThan(once)
  expect(await ui.find({ type: 'Text', text: '475k / 500k' })).toBeTruthy()
  await ui.unmount()
})
