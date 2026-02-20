
# YoutubeJam

Youtube Jam, arkadaşlarınızla aynı anda YouTube videoları izlemenizi sağlayan, senkronize bir Chrome eklentisidir. Bu proje, bir YouTube videosunun oynatma, durdurma ve saniye kaydırma işlemlerini gerçek zamanlı olarak tüm katılımcılar arasında eşitler.

## Özellikler

* **Oda Mantığı:** Özel oda isimleri ile izole gruplar oluşturma.
* **Gerçek Zamanlı Senkronizasyon:** Play/Pause/Seek eylemlerinin anlık iletimi.
* **Akıllı Işınlanma (Initial Sync):** Odaya sonradan katılan kullanıcının, mevcut lidere otomatik olarak eşitlenmesi.
* **Döngü Kilidi:** Komutların sonsuz döngüye girmesini engelleyen mimari.

## Teknoloji Yığını

* **Frontend:** JavaScript (Chrome Extension API)
* **Backend:** Node.js, Socket.io
* **Deployment:** Render (Server)

## Kurulum - Eklentiyi Tarayıcıya Yükleme

1. Bu depoyu indirin veya `.zip` olarak çıkarın.
2. Chrome tarayıcınızda `chrome://extensions/` adresine gidin.
3. Sağ üst köşedeki **Geliştirici Modu**'nu aktif hale getirin.
4. **Paketlenmemiş öğe yükle** butonuna tıklayın ve projenin içindeki `extension` klasörünü seçin.

## 🧑‍💻 Geliştiriciler

* **Adal Su Uygur**
* **Batuhan İnan**

## 📜 Lisans

Bu proje MIT lisansı ile lisanslanmıştır.

## Gelecek Planları (Backlog)

GitHub üzerinden takip edebileceğiniz öncelikli geliştirmeler:

- [ ] **Heartbeat System:** Milimetrik zaman kaymalarını önlemek ve stabiliteyi artırmak.
- [ ] **Video URL & Navigation:** YouTube içinde video değişimlerini daha kararlı hale getirmek (SPA Navigation).
- [ ] **Chat & UI:** Oda içi hızlı iletişim ve daha kullanıcı dostu bir arayüz.
- [ ] **Leader Election:** Dinamik lider seçimi ile oda yönetimini güçlendirmek.

> Tüm geliştirmeleri ve hata bildirimlerini [Issues](https://github.com/AdalSuUygur/YoutubeJam/issues) sayfamızdan takip edebilirsiniz.
