<p align="center"><img src="assets/logo.webp" alt="Hafız" width="420"></p>

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

Yapıştırılmış sayfa ve dosya içerikleri geri verilen mesajlarda yer tutucuya dönüşür; sistem hatırlatmaları ayıklanır. Araç sonuçları, otomatik görev bildirimleri ve alt ajan kayıtları son kullanıcı mesajı sayılmaz. Bir alt ajan kendi konuşmasını kısaltınca Hafız ana konuşmanın arşivine dokunmaz: mesaj veya özet kaydı oluşturmaz, eski özetleri silmez, özet talimatı vermez; yalnız alt ajanın kendi görev tanımını geri verir. Özet arşivi, uygulamanın ürettiği özeti olduğu gibi saklar; yapıştırılmış içeriğin özette hiç geçmeyeceği garanti edilmez.

## Sınırlar

- Kancanın çıktısı için 10.000 karakter sınırı esas alınır. Hafız her çıktıyı en fazla 9.500 karakterde tutar; başlıklar da bu hesaba dahildir. Ölçü JavaScript metin uzunluğudur; bazı simgeler iki birim sayılır.
- Üç parça, saklanan 80.000 karakterin tümünü konuşmaya geri vermez. En yeni mesajlardan sığanlar gösterilir; kalanların okunabilir tam kaydı arşivde bulunur. Çok uzun mesajlar ve alıntılar belirtilen sınırlarda kırpılır; sıradan kısa mesajların metni korunur.
- Yalnız güvenilir kullanıcı mesajları seçilir. Kuyrukta gönderilen gerçek mesajlar dahil edilir; aynı iletinin kuyruk ve konuşma kaydındaki kopyaları bir kez sayılır.
- Kaynak kayıt taraması yaklaşık dört saniye ile sınırlıdır. Sekiz MB'ı aşan çok uzun tek satırlar atlanabilir; bozuk veya yarım satırlar atlanır.
- Önbellek yoksa veya 30 dakikadan eskiyse, geri verme sırasında kaynak konuşma yeniden okunur.
- Okuma/yazma sorunu kısaltmayı durdurmaz. Kancalar hata durumunda da başarılı çıkış koduyla döner; özet öncesinde genel talimat verilir, diğer kancalar sessiz kalır.
- Hafız ayrı bir kalıcı hafıza hizmeti değildir; modelin bütün ayrıntıları hatırlayacağını veya verilen talimata her zaman uyacağını garanti etmez. Kısaltma olaylarını destekleyen bir Claude Code sürümü gerekir.

## Bağlam sayacı modu (isteğe bağlı)

Claude Code masaüstü uygulamasında, yazı kutusunun üstündeki satırın sağ ucunda tek bir hap gösterir: örneğin **436k / 500k** ve ince bir doluluk çubuğu. `k`, bin demektir. Sayı normal yazı rengindedir; çubuk ve çerçeve %80'den itibaren amber, %95'ten itibaren kırmızıdır. Renkler uygulamanın tema anahtarlarından gelir; açık ve koyu görünümü izler. Sol taraf boş kalır. Başka modların haplarını taşımaz veya yeniden çizmez; mod API'sinin her moda ayırdığı satırda durur.

Pencere, geçerli bir `autoCompactWindow` ayarı varsa ondan, yoksa modelin bildirdiği bağlam penceresinden okunur; sabit 500 bin kabul edilmez. Sayılar son model yanıtının giriş kullanımını gösterir, yazılmakta olan yanıtın canlı sözcük sayısını göstermez. Görünüm beş saniyede bir yoklanır ve tur bittiğinde yenilenir, ama bant yalnız değer değişince yeniden çizilir; böylece o sırada yapılan tıklamalar düşmez. Henüz ölçüm yoksa veya ölçüm okunamıyorsa hap gösterilmez. Sayaç herhangi bir model isteği göndermez.

Sayı her dolulukta tıklanabilir. %80'den itibaren sayının yanında **Temiz compact** yazısı da görünür ve o da aynı düğmenin parçasıdır. Basınca **Compact edilsin mi? Evet / Vazgeç** sorusu açılır; sayı soru sırasında da görünür kalır. Cevap verilmezse soru sekiz saniye sonra kendiliğinden kapanır. Evet, `/compact` ile aynı kısaltma işlemini başlatır. Özette işin durumunu, kullanıcının kararlarını ve düzeltmelerini korumasını ister. Hafız'ın mesaj saklama kancaları kuruluysa bu kısaltmada da çalışır. Sayaç tek başına kullanılabilir; Hafız kancalarına veya başka bir moda bağımlı değildir.

**Konuşma sürerken de onay verilebilir.** Başka oturumdan gelen bir mesajla başlayan turlar da buna dahildir. Evet'e basınca compact sıraya girer, hapta “Compact sırada · tur bitince” yazar ve işlem tur bitince çalışır; başlayınca “Kısaltılıyor…” görünür. Sıradayken veya kısaltma sürerken sayaca basmak bir şey yapmaz. Komut sıraya alınamazsa tur bitince doğrudan kısaltma denenir. O da olmazsa bildirim bunu açıklar ve tur bitince yeniden denemenizi ister; başka kendiliğinden tekrar denenmez.

### Sayacı kurma

İşlev kancaları mod API'sini destekleyen Claude Code sürümü gerekir. Bu mod **2.1.325** sürümünün API belgesine göre hazırlanmış, **2.1.326** sürümünün sınama aracıyla doğrulanmıştır. Ana paketin `node install.mjs` kurucusu sayacı kurmaz.

İndirdiğiniz Hafız klasöründe terminal açın. Mod belgesinin yerel eklenti kataloğu yöntemiyle:

```sh
claude plugin marketplace add .
claude plugin install hafiz-sayac@hafiz --scope user
```

Masaüstü uygulamasındaki yerel Claude Code konuşmasında `/reload-plugins` çalıştırın; gerekirse konuşmayı yeniden açın. `claude plugin list` çıktısında sayacın kaynağı indirdiğiniz klasör olarak görünür. Yerel katalog yöntemi bu klasörü okuduğu için klasörü koruyun; düzenleme yaptıysanız `/reload-plugins` ile tekrar okutabilirsiniz. Buradaki kurulumun adı `hafiz`, eklentinin adı `hafiz-sayac`tır.

Yalnız geliştirme sırasında, kalıcı kurulum yerine mod belgesinin `claude --plugin-dir ./mod/hafiz-sayac` yolu da kullanılabilir. Masaüstünün başlattığı yerel süreçler için eşdeğeri, kullanıcı ayarlarındaki `env` nesnesine `CLAUDE_CODE_PLUGIN_DIRS` eklemektir; değeri sayacın klasörünün mutlak konumu olmalıdır. Bu yolu seçerseniz var olan `env` alanlarını koruyun; aynı mod için iki yükleme yöntemini birlikte kullanmayın.

### Sayacı kaldırma

```sh
claude plugin uninstall hafiz-sayac@hafiz --scope user
```

Ardından masaüstündeki konuşmada `/reload-plugins` çalıştırın veya konuşmayı yeniden açın. Bu katalogdan başka eklenti kullanmıyorsanız `claude plugin marketplace remove hafiz` ile katalog kaydını da kaldırabilirsiniz. Geliştirme yolunu kullandıysanız ilgili `--plugin-dir` seçeneğini veya `CLAUDE_CODE_PLUGIN_DIRS` listesinden yalnız bu modun konumunu kaldırıp konuşmayı yeniden açın. Hafız'ın mesaj kancaları ve arşivi etkilenmez; sayaç dosya veya günlük oluşturmaz, kendi yenileme saati oturum bitince kapanır.

### Sayacı doğrulama

Gerçek uygulamaya kurmadan, Hafız klasöründe:

```sh
claude plugin validate mod/hafiz-sayac --strict
claude plugin validate . --strict
claude plugin test mod/hafiz-sayac
```

Son komut API'nin kendi sınama ortamında masaüstü ve terminal çizimlerini, onay akışını, tur durumunu ve bildirimleri dener. Uygulamanın gerçek boyaması bu ortamın kapsamı dışındadır. `node --test` ayrıca hesap sınırlarını, eski onay basışlarını, çift basışı ve yenileme saatinin kapanmasını sınar; mevcut kanca sınamalarını da çalıştırır.

## Codex (CLI ve masaüstü)

Hafız, Codex CLI ve Codex masaüstü için de kurulabilir (codex-cli 0.171.0 kayıt biçimine göre hazırlandı). Claude sürümünden bağımsızdır: ayrı kurulum ve kaldırma komutları, ayrı kurulu klasör ve ayrı arşiv kullanır. `hooks/` içindeki iki ortak yardımcıyı (`compact-ortak.mjs`, `hafiz-ayar.mjs`) kendi klasörüne kopyalayıp kullanır; `install.mjs` ve `uninstall.mjs` dosyalarını kullanmaz; paketin hiçbir Claude dosyasını değiştirmez.

Codex'te üç kanca çalışır:

1. **PreCompact:** kısaltma başlamadan önce, Codex'in oturum kaydından (`sessions` altındaki `rollout-*.jsonl`) kullanıcının son mesajlarını sondan okuyup saklar. Codex'in kullanıcı adına eklediği metinler (`AGENTS.md`, `environment_context` vb.) atılır; görsel ve ek dosyalar kısa bir notla gösterilir; yanıt notlarında seçilen metin ile istek düz yazıya çevrilir. Açık beceri adlarını da toplar.
2. **PostCompact:** kayıtta düz metin bir özet varsa son beş özeti arşivler.
3. **SessionStart (yalnız `compact`):** saklanan mesajları ek bağlam olarak, en yenisi üstte olacak biçimde geri verir. Toplam en çok `parcaSayisi × parcaKarakter` (ilk değerle 28.500) karakterdir; sığmayan mesaj yarım basılmaz, tam listesi arşivdeki `son-mesajlar.md` dosyasında kalır.

### Kurulum

Node.js 22 veya üstü yeterlidir. Codex ayar klasörü `CODEX_HOME` ortam değişkeniyle, yoksa `~/.codex` olarak alınır. İndirdiğiniz Hafız klasöründe:

```sh
node install-codex.mjs --kuru   # yapılacakları gösterir, hiçbir dosyayı değiştirmez
node install-codex.mjs
```

Kurucu şunları yapar:

- Kanca dosyalarını `$CODEX_HOME/hafiz/` içine kopyalar. Var olan `hafiz-ayar.json` korunur; özet talimatı ayardaki dile göre `ozet-talimati.md` olarak yazılır.
- `hooks.json` içindeki mevcut her şeyi olduğu gibi bırakır; PreCompact, PostCompact ve SessionStart (`^compact$` eşleşmesi) listelerinin sonuna birer Hafız grubu ekler. Tekrar kurulumda kopya oluşmaz.
- `config.toml` içinde `compact_prompt` ya da `experimental_compact_prompt_file` yoksa, ilk tablo başlığından önce `experimental_compact_prompt_file` satırını (`# hafiz-codex: özet talimatı` işaretiyle) ekler. Böyle bir ayarınız varsa ona dokunmaz ve bunu bildirir; bu durumda Hafız'ın özet kuralları özete eklenmez, mesaj saklama yine çalışır.
- Codex bir kancayı yalnız güvenildiyse çalıştırır. Kurucu güven kaydını (`[hooks.state."..."]` tabloları) yazar. Güven özeti formülü, `config.toml` içindeki sizin mevcut kayıtlarınızla önce sınanır; uyuşmazsa güven yazılmaz ve Codex'te `/hooks` ya da Ayarlar > Kancalar'dan Hafız kancalarına güvenmeniz istenir. Sınanacak mevcut kayıt yoksa güven yine yazılır ve kurucu bunu uyarıyla belirtir. Açık Codex oturumları ayarları yeniden okumayabilir; kurulumdan sonra yeni bir oturum açın.
- `hooks.json` ve `config.toml` değişecekse önce `*.hafiz-yedek-...` adıyla yalnız sizin okuyabileceğiniz bir yedek alınır. Değişiklik yoksa yedek alınmaz. Yaptıklarının kaydı `$CODEX_HOME/hafiz/kurulum-kaydi.json` dosyasındadır.

### Ayarlar

`$CODEX_HOME/hafiz/hafiz-ayar.json` (paketteki ilk hali `codex/hooks/hafiz-ayar.json`). Sayısal ayarlar ve `dil` yukarıdaki Ayarlar bölümündeki tabloyla aynıdır. Farklar:

| Ayar | İlk değer | Anlamı |
| --- | --- | --- |
| `durumDizini` | `../hafiz-durum` | Ayar dosyasının bulunduğu klasöre göre çözülür; yani `$CODEX_HOME/hafiz-durum`. Claude arşivi ile karışmaz. |
| `kullaniciEtiketi` | `null` | Geri basılan başlıkta "KULLANICININ" yerine görünecek ad (en çok 60 karakter). |
| `execOturumlari` | `false` | `codex exec` ile başlatılan oturumlar varsayılan olarak dışarıda tutulur. `true` yaparsanız onlar da saklanır ve geri basılır. |

`SessionStart` kaydına `additionalContextLimit: 15000` yazılır. Bu sayının Codex tarafında hangi birimle (karakter ya da başka) sayıldığı doğrulanamadı. Codex kendi sınırında keserse `parcaSayisi` değerini düşürün; tam liste her durumda arşivdeki `son-mesajlar.md` dosyasında bulunur.

### Kaldırma

```sh
node uninstall-codex.mjs --kuru   # önizleme
node uninstall-codex.mjs
```

Yalnız Hafız'a ait olanı kaldırır: `hooks.json` içindeki, komutu kayıtla birebir eşleşen işleyiciler; `config.toml` içinde anahtarı ve özet değeri kayıttakiyle aynı olan güven tabloları; ve değeri hâlâ Hafız'ın kurduğu dosya olan özet talimatı satırı. Siz değiştirdiyseniz o satıra ya da tabloya dokunulmaz. Değiştirmeden önce yedek alınır. Program dosyaları, ayar, özet arşivi ve yedekler silinmez; komut, tam silme için hangi klasörleri silebileceğinizi yazar (`$CODEX_HOME/hafiz` ve `$CODEX_HOME/hafiz-durum`).

Codex güven kaydını grup sırasıyla tuttuğu için, Hafız grubundan sonra sizin eklediğiniz bir kanca grubu varsa kaldırma o grubun sırasını değiştirir ve onu `/hooks` üzerinden yeniden onaylamanız gerekebilir; komut bu durumu uyarıyla bildirir. Hafız kendi gruplarını her zaman listenin sonuna ekler ve var olan grubu yerinde günceller.

### Sınırlar

- **Şifreli özet arşivlenemez.** OpenAI modellerinde Codex özeti şifreli bir kayıt olarak tutar; PostCompact yalnız kayıtta düz metin özet varsa (`compacted` kaydının `message` alanı doluysa) arşivler. Şifreli ya da boş özet sessizce atlanır. Kullanıcı mesajlarının saklanması özetten bağımsızdır ve her durumda çalışır.
- **Özet talimatının uygulanıp uygulanmadığı doğrulanamadı.** `experimental_compact_prompt_file`, Codex'in özetleme isteğinde kullandığı talimatın yerine geçer; OpenAI'nin uzak kısaltma yolunda (özet şifreli üretildiğinde) uygulanıp uygulanmadığı doğrulanamadı. Bu yüzden asıl güvence, özete bağlı olmayan geri basımdır.
- **Alt ajan ve `codex exec` oturumları dışarıdadır.** Bir alt ajanın kancası şu işaretlerin her biri tek başına yeterli olacak biçimde reddedilir: girdide `agent_id` ya da `agent_type`; oturum kaydının ilk satırının kök kullanıcı oturumu olmaması; oturum kimliğinin kancaya gelen `session_id` ile eşleşmemesi. Reddedilen alt ajan mesaj ya da özet kaydı oluşturmaz, çıktı vermez ve ana oturumun arşivine dokunmaz. `codex exec` oturumları `execOturumlari` ile açılabilir.
- Kayıt dosyası yalnız Codex'in `sessions` ve `archived_sessions` klasörlerinden (gerçek yol olarak) kabul edilir; göreli yol, bağlantı ile dışarı çıkan ya da başka klasördeki dosya reddedilir.
- Kayıt biçimi Codex'in iç ayrıntısıdır ve sürümler arasında değişebilir. Tanınmayan kayıtlar atlanır; geri basım gerekli bilgiyi bulamazsa çıktı vermez, kısaltmayı durdurmaz. Her kanca hata durumunda da başarılı çıkış koduyla döner.
- Okuma sınırları Claude sürümüyle aynıdır: yaklaşık dört saniye, bozuk ve sekiz MB'ı aşan satırlar atlanır.

Codex sınamaları `node --test codex/codex.test.mjs` ile ayrı çalışır; paket kökündeki `node --test` ise hepsini birlikte çalıştırır. Sınamalar sahte `CODEX_HOME` ve sahte ev klasörü kullanır, gerçek `~/.codex` ve `~/.claude` klasörlerine dokunmaz ve `codex` komutunu çalıştırmaz.

## Doğrulama

Paket klasöründe `node --test` ya da `npm test` çalışır. Bağımlılık kurulmaz. Sınamalar kendi geçici ev, konuşma ve kurulum klasörlerini paket klasöründe oluşturup sonunda temizler; gerçek kullanıcı ayarına dokunmaz. İçerik ayıklama, izinler, kuyruk mesajları, büyük kayıtlar, iki dil, saklama sınırları ve kurma/kaldırma birlikte sınanır.

## Lisans

MIT. Hak sahibi: Hafız katkıcıları. Tam metin `LICENSE` dosyasındadır.
