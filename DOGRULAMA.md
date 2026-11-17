# Doğrulama

Tarih: 2026-11-17T16:32:42+01:00
Ortam: macOS, Node.js 26.4.0. Gerçek kurulum yapılmadı; kurma/kaldırma işlemleri yalnız bu projenin içindeki geçici deneme evlerinde sınandı.

## Kabul kontrolleri

- `node --test`: 52 geçti, 0 başarısız; tam çıktı aşağıda.
- Gerçek kullanıcı ayarında `node install.mjs --kuru`: çıkış 0, "KURU ÇALIŞMA: hiçbir dosya yazılmadı." Çıktı beş kanca kaydını ve altı dosyanın kopyalanacağı yeri gösterdi.
- Gerçek `settings.json` için `shasum -a 256`, öncesi: `2a9f99685d149b77fbce7ebf7a68db4e6aeaf1babce086e81859da55b592907b`
- Aynı dosya, sonrası: `2a9f99685d149b77fbce7ebf7a68db4e6aeaf1babce086e81859da55b592907b`
- Altı özgün kaynak dosyasının SHA-256 değerleri de ilk okumayla aynı kaldı. Kaynaklar yalnız okundu.
- Kaynaktaki sekiz kritik işlev karşılaştırıldı: geriye okuma, içerik ayıklama, kullanıcı ve kuyruk mesajı seçimi, toplama ve temizliğin davranışları korundu. Ad ve açıklamalar genelleştirildi.
- Yeni özel durum konumlarında temizliğin çalışması için sahiplik işareti eklendi; önceden var olan rastgele konumlar sahiplenilmiyor.
- Gerçek kullanıcı klasörüne yazılmadı. Geçici deneme klasörleri ve süreçleri bırakılmadı.
- Kişisel bilgi taraması, görev belgesi ile yerel depo bilgisi hariç: çıkış 1, çıktı boş; eşleşme yok.
- Görev belgesi paylaşılacak kayda alınmaz. Uzak depo ve yayın işlemi yapılmaz.

## Sınama çıktısı

```text
✔ suzme: meta, tool_result, system-reminder, compactSummary, sidechain, bildirim elenir (3.214208ms)
✔ sira: en yeni en ustte, zaman damgasi korunur (0.400333ms)
✔ toplam tavan 80.000 karakter (1.158625ms)
✔ tek mesaj tavani 4.000: ilk 2600 + isaret + son 1200 (0.428791ms)
✔ skill adlari: ayri, yeni -> eski (0.263ms)
✔ yapistirilmis icerik yer tutucuya donusur, icerik kalmaz (0.654542ms)
✔ geri yukleme basliginda veri uyarisi var (parca 1 ve devam) (73.25975ms)
✔ B2: yapistirilan icerige gomulu </pasted_content> blogu erken kapatamaz (acgozlu eslesme) (73.404917ms)
✔ B2: kapanissiz pasted_content mesaj sonuna kadar yer tutucu; kalan etiket izleri etkisiz (<) (0.382709ms)
✔ B2: mesaj metni bizim ayirici satiri ya da basligi taklit edemez ("› " on eki) (68.316041ms)
✔ B4: 60 MB tek satirlik transkript 1 saniyenin altinda biter, cokmez; oncesi/sonrasi mesajlar kalir (103.709834ms)
✔ B4: satirlarGeriye tavani asan satiri atar, oncesini ve sonrasini dogru verir (kucuk tavan, cok blok boyu) (2.758667ms)
✔ B4: sure butcesi blok dongusunde de denetlenir (sureMs doluysa hic blok okunmaz) (0.31925ms)
✔ kuyruk: asistan calisirken gonderilen mesaj (attachment/queued_command) dahil, queue-operation sayilmaz (0.265375ms)
✔ kuyruk: ayni kayit iki kez ya da ayni soz user + kuyruk olarak gorunurse tek sayilir (0.194208ms)
✔ turnOrigin task_notification olan user satiri ve <task-notification> metni elenir (0.169916ms)
✔ yanit isareti atilir, alinti "> ..." korunur ama 600 karakterle sinirlanir; Kullanıcı sozu tam kalir (0.216917ms)
✔ durum klasoru 0700, dosyalar 0600 (68.285334ms)
✔ projects disindaki transkript: yalniz talimat basilir, durum yazilmaz (127.51475ms)
✔ alt ajan (subagents yolu ya da isSidechain ilk satir) transkripti: durum yazilmaz (193.359792ms)
✔ PreCompact: talimati basar, 2000 karakterin altinda, durum yazar (32.469625ms)
✔ PreCompact: transkript okunamasa da talimat basilir, cikis 0 (63.475708ms)
✔ PostCompact: ozeti kaydeder, son 5 kalir, hicbir sey basmaz (260.830167ms)
✔ SessionStart: compact olmayan kaynakta sessiz (121.592583ms)
✔ SessionStart: transkript yok, durum yok => sessiz, cikis 0 (94.866125ms)
✔ parca 1/2/3: her cikti <= 9500, ortusme yok, birlesim listenin on eki (126.621ms)
✔ az mesaj: parca 2 ve 3 sessiz (126.581375ms)
✔ durum yok ya da 30 dakikadan eski: transkriptten canli hesaplanir (93.051291ms)
✔ sinirla: hicbir cikti 9500 karakteri asmaz (0.133208ms)
✔ temizlik: yalniz durum klasorunun icinde siler; baglara ve disarisina dokunmaz (1.126708ms)
✔ temizlik: boyut tavani asilirsa en eskiden baslayarak siler (0.671125ms)
✔ PreCompact temizligi: 7 gunden eski oturum klasoru silinir, yenisi kalir (32.986625ms)
✔ B8: temizlik korumasi: yalniz ".claude/hafiz-durum" ya da (HAFIZ_DURUM_DIZIN + HAFIZ_TEST=1) silebilir (1.11675ms)
✔ B8: gercek yolu durum klasorunun dogrudan cocugu olmayan girdi silinmez (baglanti, yer degistirmis giris) (0.496291ms)
✔ hata.log 200 KB sinirini asmaz (0.952667ms)
✔ 300 MB sentetik transkript 5 saniyenin altinda (tam tarama, en kotu durum) (391.058583ms)
✔ kurulum: var olan kancalar korunur, yedek birebir ve özel izinli, tekrar aynı sonucu verir (78.686416ms)
✔ kuru kurulum/kaldırma: var olan veya eksik evde hiçbir dosya oluşturmaz/değiştirmez (140.869584ms)
✔ kaldırma: karma gruptaki diğer kancayı korur; pencere ve arşive dokunmaz (116.187875ms)
✔ bozuk ayar ya da geçersiz seçenek: ayara ve kurulum yerine dokunmaz (189.973583ms)
✔ özelleştirilmiş ayarlar yeniden kurulumda korunur; parça sayısı güncellenir (96.082959ms)
✔ eski yürütücü yolu kurulum kaydından tanınır; benzer komutlar korunur (66.130208ms)
✔ ayarlardaki geçersiz sayılar ve bozuk belge güvenli varsayılana döner (0.323167ms)
✔ İngilizce: talimat, arşiv başlığı, devam parçaları ve veri ayıklama (98.248542ms)
✔ küçük parça ve mesaj tavanı gerçekten uygulanır; 4. parça ayarla açılır (217.303833ms)
✔ özet saklama sayısı ayardan okunur (130.217333ms)
✔ yazılamayan durum ve bozuk girdi compact işlemini bozmaz; hata çıktısı sessizdir (186.566833ms)
✔ özel durum konumu: yeni kökün işaretiyle temizlik çalışır, rastgele eski kök sahiplenilmez (99.600542ms)
✔ gerçek kurulum olmadan, kopyalanan kancaların tamamı kayıtlı komutlarıyla çalışır (233.852125ms)
✔ dosyadan durum konumu, saklama günü ve boyut eşiği gerçek temizlikte uygulanır (70.858125ms)
✔ İngilizce başlık taklidi talimata dönüşmez; İngilizce hata açıklaması yazılır (114.652333ms)
✔ kurulum kopyalama hatasında: önce yedek alınmış olur; kayıtlar değişmez (34.449667ms)
ℹ tests 52
ℹ suites 0
ℹ pass 52
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2126.068208
```
