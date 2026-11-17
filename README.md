# Hafız

Claude Code uzun bir konuşmayı kısalttığında bazı ayrıntılar özette kaybolabilir. Hafız, kısaltmadan önce son mesajlarınızı saklar; konuşma devam ettiğinde bu mesajları yeniden gösterir. İnternet bağlantısı veya ücretli bir hizmet kullanmaz.

## Ne yapar?

1. Kısaltmadan önce, düzeltmelerinizin, yasaklarınızın, kararlarınızın ve onaylarınızın kelimesi kelimesine korunmasını isteyen bir özet talimatı verir.
2. Konuşma kaydını sondan okuyarak son kullanıcı mesajlarını, tarihleriyle ve en yenisi üstte olacak şekilde saklar. Asistan çalışırken gönderilen kuyruktaki mesajlar da buna dahildir.
3. Kısaltma bittiğinde oluşan özeti arşivler. Aynı konuşmanın en son beş özeti tutulur.
4. Konuşma yeniden açıldığında saklanan mesajları üç ayrı parça halinde geri verir. Açılmış becerilerin adlarını da hatırlatır.

Bu paket, kişiye ait notlar, hesaplar veya ayrı bir hafıza sistemi içermez. Mevcut konuşma geçmişinizi değiştirmez.

## Kurulum

Bilgisayarınızda **Node.js 22 veya üstü** ve Claude Code bulunmalı. Ek paket indirmeniz gerekmez. macOS ve Linux içindir; Windows'ta Linux ortamı kullanılabilir.

İndirdiğiniz Hafız klasöründe bir terminal açıp tek komutu çalıştırın:

```sh
node install.mjs
```

Kurucu önce mevcut ayarın zaman damgalı yedeğini alır, kanca dosyalarını `~/.claude/hafiz/` içine kopyalar ve `~/.claude/settings.json` dosyasına kayıtlarını ekler. Diğer ayarları ve kancaları korur. Tekrar çalıştırıldığında aynı kayıtlar çoğalmaz; düzenlediğiniz Hafız ayarları korunur. Claude Code'un sonraki konuşma kısaltmasında devreye girer.

Hiçbir şeyi değiştirmeden önce yapılacakları görmek için:

```sh
node install.mjs --kuru
```

İsterseniz aynı kurulumda `autoCompactWindow` değerini de yazdırabilirsiniz:

```sh
node install.mjs --pencere 500000
```

Bu seçenek verilmezse mevcut pencere ayarı korunur. Hafız, kullanılan modelin veya uygulamanın desteklediği konuşma uzunluğunu artırmaz.

## Kaldırma

İndirdiğiniz Hafız klasöründe:

```sh
node uninstall.mjs
```

Yalnız Hafız'a ait kanca kayıtlarını kaldırır; değiştirmeden önce ayarın yedeğini alır. Diğer kancalar ve pencere ayarı korunur. Önizleme için `node uninstall.mjs --kuru` kullanılabilir.

Program dosyaları, ayar yedekleri ve konuşma arşivi silinmez. Tamamen kaldırmak isterseniz, kaldırma tamamlandıktan sonra `~/.claude/hafiz/` ile `~/.claude/hafiz-durum/` klasörlerini kendiniz silebilirsiniz. Özel bir arşiv konumu seçtiyseniz arşiv oradadır. Ayar yedekleri `~/.claude/settings.json.hafiz-yedek-...` adlarıyla durur; gerekmeyenleri kendiniz silebilirsiniz. Değişiklik yapmayan tekrar kurma/kaldırma işlemleri yeni ayar yedeği oluşturmaz.

## Ayarlar

Kurulumdan sonra **`~/.claude/hafiz/hafiz-ayar.json`** dosyasını bir metin düzenleyicide açın. Paket içindeki ilk ayar dosyası `hooks/hafiz-ayar.json` konumundadır. Sonraki kısaltmada yeni ayarlar okunur.

| Ayar | İlk değer | Anlamı |
| --- | --- | --- |
| `durumDizini` | `~/.claude/hafiz-durum` | Son mesajların ve özetlerin saklandığı klasör. |
| `saklamaGunu` | `7` | Bu kadar gündür güncellenmeyen konuşma klasörleri temizlenir. |
| `boyutMB` | `50` | Arşiv bu eşiği aşınca en eski konuşmalar önce temizlenir. |
| `toplamKarakter` | `80000` | Saklanacak mesaj metinlerinin toplam üst sınırı. |
| `mesajKarakter` | `4000` | Tek mesajın üst sınırı; uzunsa başı ve sonu korunarak arası kırpılır. |
| `parcaSayisi` | `3` | Konuşmaya geri verilen parça sayısı. |
| `parcaKarakter` | `9500` | Her parçanın, başlık ve satır sonu dahil üst sınırı. |
| `ozetSayisi` | `5` | Her konuşmada tutulacak son özet sayısı. |
| `dil` | `tr` | Hazır metinlerin dili: Türkçe için `tr`, İngilizce için `en`. Mesajlarınız çevrilmez. |

**Parça sayısını değiştirirseniz kurulum komutunu yeniden çalıştırın.** Her parça için ayrı kanca kaydı gerekir; kurucu eski sayıyı günceller. Diğer ayarlar için yeniden kurulum gerekmez.

Sayısal değerler tam sayı olmalı. Parça sayısı 1–20, parça uzunluğu 2.000–9.500, saklama süresi 1–365 gün, boyut 1–1.024 MB, özet sayısı 1–100, toplam metin 1–1.000.000 karakter aralığına çekilir. Tek mesaj sınırı normalde en az 100 karakterdir; ilk parçanın başlığına yer bırakacak kadar küçültülür ve toplam metin sınırını aşmaz. Bozuk ya da okunamayan ayar belgesinde ilk değerler kullanılır; geçersiz türdeki alanlar da ilk değerlerine döner.

Özel durum konumu için Hafız'a ayrılmış **yeni, boş bir klasör adı** seçin. Hafız oluşturduğu klasöre `.hafiz-durum` sahiplik işaretini koyar. Önceden var olan rastgele bir özel klasörü sahiplenmez ve o klasörde otomatik silme yapmaz. Standart `.claude/hafiz-durum` düzeninde temizlik normal çalışır. Ev klasörü, disk kökü ve sembolik bağlantıyla dışarıdaki klasörler temizlik dışında kalır. Göreli konumlar ayar dosyasının bulunduğu klasöre göre yorumlanır; `~/` ev klasörüdür.

İleri kullanımda `HAFIZ_AYAR_DOSYASI` ile başka ayar dosyası, `HAFIZ_DURUM_DIZIN` ile başka durum konumu, `HAFIZ_PROJELER_DIZIN` ile başka konuşma kaydı kökü seçilebilir. Varsayılan konuşma kayıtları `~/.claude/projects/` altındadır. `HAFIZ_TEST=1` yalnız sınamaların kendi klasörlerinde temizlik yapabilmesi içindir; normal kullanımda ayarlamayın.

## Gizlilik ve saklama

Her şey bilgisayarınızda kalır; Hafız hiçbir yere veri göndermez. Kaynak konuşma kaydını yalnız okur. Saklanan mesajlar ve özetler sizin konuşmanızın içeriğini taşıdığı için paketin paylaşılacak kısmı program dosyalarıdır; kişisel arşiviniz değildir.

Varsayılan olarak her konuşmanın `~/.claude/hafiz-durum/<konuşma>/` klasöründe:

- `son-mesajlar.json`: tarihleriyle son mesajların ve açık beceri adlarının kaydı.
- `son-mesajlar.md`: aynı kaydın okunabilir hali; her kısaltmada yenilenir.
- `ozet-<tarih>.md`: kısaltmanın oluşturduğu özet; en son beşi tutulur.

Durum kökünde sahiplik işareti ve sorun olduğunda `hata.log` bulunur. Günlük, tüm konuşmayı kopyalamaz; kısa hata açıklamalarını tutar ve yaklaşık 200 KB eşiğini aşınca son yaklaşık 50 KB'a küçültülür. Bir hata açıklaması dosya adı içerebilir.

Klasör izinleri `0700`, dosya izinleri `0600` yapılır: normal dosya izinleri bakımından yalnız hesabınız erişebilir. Oturum adları dosya yolundan dışarı çıkamayacak biçime getirilir; geçici yazım dosyaları aynı klasörde oluşturulur ve yazım bitince taşınır veya hata halinde temizlenir.

Temizlik kısaltma öncesinde çalışır. Yedi günden eski konuşmalar silinir; 50 MB eşiği aşılırsa en eskilerden devam edilir. **O sıradaki konuşma silinmez**; bu nedenle boyut eşiği mutlak disk kotası değildir. Özet sayısı sınırı ise her yeni özet kaydında uygulanır. Kancalar devreden çıkarıldıktan sonra otomatik temizlik çalışmaz. Ayar yedekleri bu arşiv temizliğine dahil değildir.

Yapıştırılmış sayfa ve dosya içerikleri geri verilen mesajlarda yer tutucuya dönüşür; sistem hatırlatmaları ayıklanır. Araç sonuçları, otomatik görev bildirimleri ve alt ajan kayıtları son kullanıcı mesajı sayılmaz. Alt ajan konuşmalarında mesaj veya özet kaydı oluşturulmaz; kısaltma öncesindeki genel özet talimatı yine verilebilir. Özet arşivi, uygulamanın ürettiği özeti olduğu gibi saklar; yapıştırılmış içeriğin özette hiç geçmeyeceği garanti edilmez.

## Sınırlar

- Kancanın çıktısı için 10.000 karakter sınırı esas alınır. Hafız her çıktıyı en fazla 9.500 karakterde tutar; başlıklar da bu hesaba dahildir. Ölçü JavaScript metin uzunluğudur; bazı simgeler iki birim sayılır.
- Üç parça, saklanan 80.000 karakterin tümünü konuşmaya geri vermez. En yeni mesajlardan sığanlar gösterilir; kalanların okunabilir tam kaydı arşivde bulunur. Çok uzun mesajlar ve alıntılar belirtilen sınırlarda kırpılır; sıradan kısa mesajların metni korunur.
- Yalnız güvenilir kullanıcı mesajları seçilir. Kuyrukta gönderilen gerçek mesajlar dahil edilir; aynı iletinin kuyruk ve konuşma kaydındaki kopyaları bir kez sayılır.
- Kaynak kayıt taraması yaklaşık dört saniye ile sınırlıdır. Sekiz MB'ı aşan çok uzun tek satırlar atlanabilir; bozuk veya yarım satırlar atlanır.
- Önbellek yoksa veya 30 dakikadan eskiyse, geri verme sırasında kaynak konuşma yeniden okunur.
- Okuma/yazma sorunu kısaltmayı durdurmaz. Kancalar hata durumunda da başarılı çıkış koduyla döner; özet öncesinde genel talimat verilir, diğer kancalar sessiz kalır.
- Hafız ayrı bir kalıcı hafıza hizmeti değildir; modelin bütün ayrıntıları hatırlayacağını veya verilen talimata her zaman uyacağını garanti etmez. Kısaltma olaylarını destekleyen bir Claude Code sürümü gerekir.

## Doğrulama

Paket klasöründe `node --test` ya da `npm test` çalışır. Bağımlılık kurulmaz. Sınamalar kendi geçici ev, konuşma ve kurulum klasörlerini paket klasöründe oluşturup sonunda temizler; gerçek kullanıcı ayarına dokunmaz. İçerik ayıklama, izinler, kuyruk mesajları, büyük kayıtlar, iki dil, saklama sınırları ve kurma/kaldırma birlikte sınanır.

## Lisans

MIT. Hak sahibi: Hafız katkıcıları. Tam metin `LICENSE` dosyasındadır.
