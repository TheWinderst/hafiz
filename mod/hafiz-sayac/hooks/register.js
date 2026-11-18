// Dış bağımlılık, dosya erişimi ve model çağrısı yoktur.
const YOKLAMA_MS = 5000;
const BEKLE = "Tur bitince compact yapılabilir";
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
function saatiBaslat($, d) {
  if (d.saat === null) d.saat = $.clock.every(YOKLAMA_MS, () => yenile($));
}

async function kisalt($, d) {
  if (d.kisaltiyor) return;
  if (d.anaTur || d.calisiyor) {
    d.soruyor = false;
    $.ui.toast(BEKLE);
    yenile($);
    return;
  }
  d.kisaltiyor = true;
  d.soruyor = false;
  yenile($);
  try {
    // Masaüstü uygulaması düğmeden gelen doğrudan $.session.compact çağrısını
    // reddedebiliyor. Asıl yol /compact'i kullanıcı yazmış gibi çalıştırmaktır.
    try {
      await $.command.run({ command: "compact", args: TALIMAT });
      return;
    } catch {}
    const sonuc = await $.session.compact({ instructions: TALIMAT });
    if (sonuc?.skip) $.ui.toast("Compact yapılmadı: bir kısaltma kancası işlemi durdurdu.");
  } catch {
    // Tıklama ile çağrı arasına gelen bir mesaj yeni bir tur başlatabilir.
    // Otomatik yeniden deneme yoktur: sonraki basışı kullanıcı yapar.
    $.ui.toast("Compact başlatılamadı. Başka oturumdan gelen bir mesaj da tur başlatabilir; tur bitince yeniden deneyin.");
  } finally {
    d.kisaltiyor = false;
    yenile($);
  }
}

export function register(on) {
  const d = { saat: null, anaTur: false, calisiyor: false, soruyor: false, kisaltiyor: false };

  on("session.start", async ($, e, next) => {
    const sonuc = await next(e);
    saatiBaslat($, d);
    yenile($);
    return sonuc;
  });

  on("session.end", ($, e, next) => {
    if (d.saat !== null) d.saat.cancel();
    d.saat = null;
    d.anaTur = d.calisiyor = d.soruyor = false;
    return next(e);
  });

  on("turn.start", ($, e, next) => {
    if (e.agentId === undefined) {
      d.anaTur = d.calisiyor = true;
      d.soruyor = false;
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
    }
    return sonuc;
  });

  on("session.compact", async ($, e, next) => {
    try { return await next(e); }
    finally { d.soruyor = false; yenile($); }
  });

  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    const alt = await next(e);
    d.calisiyor = d.anaTur || e.props.isWorking;
    if (e.props.hasSurvey) return alt;
    let sayac;
    try {
      const { context } = await $.session.usage();
      const ayar = await $.settings.read({ key: "autoCompactWindow" });
      sayac = olcum(context, ayar);
    } catch { return alt; }
    if (!sayac) return alt;

    const { Box, Text, Button } = $.ui.resolve(e);
    const pasif = d.calisiyor || d.kisaltiyor;
    const icerik = [];
    if (sayac.temiz) {
      if (pasif) {
        // Button'ın disabled/title alanı yok: basılamayan metin ve kapsamlı hover.
        // Açıklama akış içinde açılır; bandın dışında kırpılmaz.
        icerik.push(Box({ key: "bekle", flexDirection: "row", alignItems: "center", gap: 1, children: [
          Text({ dimColor: true, children: d.kisaltiyor ? "Kısaltılıyor…" : "Temiz compact" }),
          Box({ display: "none", hover: { display: "flex" }, children: [
            Text({ children: d.kisaltiyor ? "Kısaltmanın bitmesi bekleniyor" : BEKLE }),
          ] }),
        ] }));
      } else if (d.soruyor) {
        icerik.push(
          Text({ children: "Emin misin?" }),
          Button({ key: "evet", label: "Evet", plain: true, variant: "secondary", onPress: () => kisalt($, d) }),
          Button({ key: "vazgec", label: "Vazgeç", plain: true, dimColor: true, onPress: () => { d.soruyor = false; yenile($); } }),
        );
      } else {
        icerik.push(Button({ key: "temiz", label: "Temiz compact", plain: true, variant: "secondary", onPress: () => {
          if (d.anaTur || d.calisiyor || d.kisaltiyor) return;
          d.soruyor = true;
          yenile($);
        } }));
      }
    }
    icerik.push(Text({ color: "text", tabular: true, children: sayac.metin }));
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
