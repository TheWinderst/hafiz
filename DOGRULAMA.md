# Doğrulama

Tarih: 2026-11-17. Ortam: macOS, Node.js 26.4.0, Claude Code 2.1.326.
Mod için 2.1.325 sürümünün API belgesi ve çalışan sayaç kalıbı salt okunarak incelendi.
Gerçek uygulamaya kurulum veya bağlama yapılmadı; bütün deneme yazımları depo içinde tutuldu.

## Kabul kontrolleri

- Başlangıçta `node --test`: 52 geçti, 0 başarısız.
- Son durumda `node --test`: 59 geçti, 0 başarısız. Mevcut 52 sınama ve 7 yeni sayaç sınaması birlikte geçti.
- `claude plugin test mod/hafiz-sayac`: 10 geçti, 0 başarısız.
- `claude plugin validate mod/hafiz-sayac --strict`: çıkış 0, `Validation passed`.
- `claude plugin validate . --strict`: çıkış 0, `Validation passed`.
- Mod kataloğunun eksik açıklaması doğrulama sırasında tamamlandı.
- Mod dizini için mağaza simgesi önerisi var; isteğe bağlı bu öneri katı doğrulamayı başarısız yapmıyor. Mağazaya gönderim yapılmadı.
- Arayüzün mekanik denetimi: bulgu listesi boş (`[]`).
- Kişisel bilgi taraması: görev belgesi ve yerel depo bilgisi hariç çıkış 1, çıktı boş; eşleşme yok.
- `git diff --check`: çıkış 0, çıktı boş.
- `install.mjs` ve mevcut kancalar değişmedi. Gerçek kullanıcı ayarı da önceki doğrulamadaki SHA-256 değerini koruyor.
- Geçici sınama klasörleri ve yalıtılmış ayar dosyaları temizlendi; arka plan süreci bırakılmadı. Uzak depoya gönderim yapılmadı.

## Sayaçta sınanan davranışlar

- Masaüstü ve terminal çiziminde sağa hizalanmış tek hap; alttaki çizim ve anket korunuyor.
- Ayar önceliği, model penceresine dönüş, eksik ölçüm, sıfır ve pencere aşımı.
- %80 ve %95 eşikleri, normal yazı rengi, temayı izleyen çubuk ve çerçeve.
- Başka bir oturumun mesajıyla da değişen `isWorking` durumunda soluk ve tıklanamaz yazı; tur bitince kendiliğinden etkinleşme.
- Üzerine gelince açılan bekleme açıklamasının geçerli çizim ağacı.
- Kullanıcı onayı, vazgeçme, eski onay basışının yeni turda engellenmesi ve çift basışta tek kısaltma.
- Alt ajanın bitişinin ana tur kilidini açmaması; kesilen ana turun kilidi açması.
- Kısaltma reddi ve tıklama arasına giren tur için açık bildirim; otomatik yeniden deneme yok.
- Beş saniyelik yoklamanın ölçümü yenilemesi, tek saatin kurulması, oturum sonunda iptali ve sonraki turda yeniden başlaması.

API sınamaları motorun çizim açıklamasını ve düğme akışını doğrular; masaüstü uygulamasının gerçek boyamasını sınamaz.
Açık ve koyu görünüm için sabit renk yerine uygulamanın tema anahtarları kullanılır.
Yerel uygulamaya bağlama, gerçek konuşmayı kısaltma ve temiz bir makinede kurulum bu çalışmanın kapsamı dışında tutuldu.
