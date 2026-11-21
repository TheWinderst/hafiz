// Dış bağımlılık, dosya erişimi ve model çağrısı yoktur.
const YOKLAMA_MS = 5000;
const SORU_MS = 8000;
const TALIMAT =
  "Süren işin durumunu, kullanıcının kararlarını ve düzeltmelerini birebir koru; dosya yolları tam kalsın.";

export function olcum(context, ayar) {
  const pozitif = n => typeof n === "number" && Number.isFinite(n) && n > 0;
  const pencere = pozitif(ayar) ? ayar : context?.window;
  const tokens = context?.tokens;
  if (!pozitif(pencere) || typeof tokens !== "number" || !Number.isFinite(tokens) || tokens < 0) return null;
  const oran = tokens / pencere;
  return {
    metin: `${Math.round(tokens / 1000)}k / ${Math.round(pencere / 1000)}k`,
    yuzde: Math.min(100, oran * 100),
    renk: oran >= 0.95 ? "error" : oran >= 0.8 ? "warning" : "subtle",
    temiz: oran >= 0.8,
  };
}

function yenile($) { $.ui.invalidate("ui.render"); }

// Çizilen değerin imzası: yoklama yalnız bu değişince bandı yeniden çizdirir.
function imza(sayac) { return sayac ? `${sayac.metin}|${sayac.renk}|${sayac.temiz}` : "yok"; }
async function oku($) {
  try {
    const { context } = await $.session.usage();
    const ayar = await $.settings.read({ key: "autoCompactWindow" });
    return olcum(context, ayar);
  } catch { return null; }
}

// Her yoklamada invalidate çağrılsaydı, o anda yapılan tıklama düşerdi.
async function yokla($, d) {
  const yeni = imza(await oku($));
  if (d.saat !== null && yeni !== d.sonImza) yenile($);
}
function saatiBaslat($, d) {
  if (d.saat === null) d.saat = $.clock.every(YOKLAMA_MS, () => yokla($, d));
}

// Sayaca basınca soru açılır; 8 sn cevap gelmezse kapanır. Eski zamanlayıcı
// sonradan açılan yeni soruyu kapatmasın diye soru kimliği karşılaştırılır.
function soruAc($, d) {
  if (d.sirada || d.kisaltiyor) return;
  const kimlik = ++d.soruKimlik;
  d.soruyor = true;
  yenile($);
  $.clock.after(SORU_MS, () => {
    if (d.soruyor && d.soruKimlik === kimlik) { d.soruyor = false; yenile($); }
  });
}

async function dogrudan($, d) {
  d.sirada = false;
  d.kisaltiyor = true;
  yenile($);
  try {
    const sonuc = await $.session.compact({ instructions: TALIMAT });
    if (sonuc?.skip) $.ui.toast("Compact yapılmadı: bir kısaltma kancası işlemi durdurdu.");
  } catch {
    // Tıklama ile çağrı arasına gelen bir mesaj yeni bir tur başlatabilir.
    $.ui.toast("Compact başlatılamadı. Başka oturumdan gelen bir mesaj da tur başlatabilir; tur bitince yeniden deneyin.");
  } finally {
    d.kisaltiyor = false;
    yenile($);
  }
}

async function evet($, d) {
  if (d.sirada || d.kisaltiyor) return;
  d.soruyor = false;
  // Tur sürerken de sorulabilir: /compact motor tarafından oturum boşalınca çalıştırılır.
  if (d.anaTur || d.calisiyor) d.sirada = true; else d.kisaltiyor = true;
  yenile($);
  try {
    await $.command.run({ command: "compact", args: TALIMAT });
    d.sirada = d.kisaltiyor = false;
    yenile($);
    return;
  } catch {}
  if (d.anaTur || d.calisiyor) {
    // Komut reddedildi: ana turun turn.complete'inde doğrudan denenir.
    d.bekleyen = true;
    d.sirada = true;
    d.kisaltiyor = false;
    yenile($);
    return;
  }
  await dogrudan($, d);
}

export function register(on) {
  const d = {
    saat: null, anaTur: false, calisiyor: false, soruyor: false, kisaltiyor: false,
    sirada: false, bekleyen: false, soruKimlik: 0, sonImza: null,
  };

  on("session.start", async ($, e, next) => {
    const sonuc = await next(e);
    saatiBaslat($, d);
    yenile($);
    return sonuc;
  });

  on("session.end", ($, e, next) => {
    if (d.saat !== null) d.saat.cancel();
    d.saat = null;
    d.anaTur = d.calisiyor = d.soruyor = d.kisaltiyor = d.sirada = d.bekleyen = false;
    return next(e);
  });

  on("turn.start", ($, e, next) => {
    if (e.agentId === undefined) {
      d.anaTur = d.calisiyor = true;
      saatiBaslat($, d);
      yenile($);
    }
    return next(e);
  });

  on("turn.complete", async ($, e, next) => {
    const sonuc = await next(e);
    if (e.agentId === undefined) {
      d.anaTur = d.calisiyor = false;
      yenile($);
      if (d.bekleyen) {
        d.bekleyen = false;
        // Turun kendisi bu kancayı bekler; compact tur kapandıktan sonra denenir.
        $.clock.after(400, () => { void dogrudan($, d); });
      }
    }
    return sonuc;
  });

  on("session.compact", async ($, e, next) => {
    d.kisaltiyor = true;
    d.sirada = false;
    yenile($);
    try { return await next(e); }
    finally { d.kisaltiyor = d.soruyor = false; yenile($); }
  });

  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    const alt = await next(e);
    d.calisiyor = d.anaTur || e.props.isWorking;
    const sayac = await oku($);
    d.sonImza = imza(sayac);
    if (e.props.hasSurvey || !sayac) return alt;

    const { Box, Text, Button } = $.ui.resolve(e);
    const metin = Text({ color: "text", tabular: true, children: sayac.metin });
    const icerik = [];
    if (d.sirada) {
      icerik.push(Text({ color: "suggestion", children: "Compact sırada · tur bitince" }), metin);
    } else if (d.kisaltiyor) {
      icerik.push(Text({ dimColor: true, children: "Kısaltılıyor…" }), metin);
    } else if (d.soruyor) {
      icerik.push(
        Text({ children: "Compact edilsin mi?" }),
        Button({ key: "evet", label: "Evet", plain: true, variant: "secondary", children: "  Evet  ", onPress: () => { void evet($, d); } }),
        Button({ key: "vazgec", label: "Vazgeç", plain: true, dimColor: true, children: "  Vazgeç  ", onPress: () => { d.soruyor = false; yenile($); } }),
        metin,
      );
    } else {
      // Sayı her dolulukta tıklanabilir; %80+ iken "Temiz compact" yazısı da düğmenin içindedir.
      icerik.push(Button({ key: "sayac", label: "Compact", plain: true, variant: "secondary", onPress: () => soruAc($, d),
        children: [...(sayac.temiz ? [Text({ key: "temiz-yazi", children: "Temiz compact" }), "\u00a0\u00a0"] : []), metin] }));
    }
    if (e.surface === "terminal") {
      const dolu = Math.round(sayac.yuzde / 100 * 8);
      icerik.push(Text({ color: sayac.renk, children: "▰".repeat(dolu) + "▱".repeat(8 - dolu) }));
    } else {
      // Yerel Box renkleri temayı izler; SVG içine sabit renk kopyalanmaz.
      icerik.push(Box({ key: "cubuk", width: 8, height: 0.35, backgroundColor: "subtle", overflow: "hidden", children: [
        Box({ width: `${Math.round(sayac.yuzde)}%`, height: "100%", backgroundColor: sayac.renk === "subtle" ? "text" : sayac.renk }),
      ] }));
    }
    const hap = Box({ key: "sayac-hap", flexDirection: "row", alignItems: "center", flexShrink: 1,
      borderStyle: "round", borderColor: sayac.renk, paddingX: 1.5, paddingY: 0.25, gap: 1, children: icerik });
    const satir = Box({ key: "sayac-satir", width: "100%", flexDirection: "row", justifyContent: "flex-end", children: [hap] });
    // Yalnız kendi satırını çizer; başka modların satırlarına/anahtarlarına dokunmaz.
    return Box({ flexDirection: "column", children: [satir, alt] });
  });
}
