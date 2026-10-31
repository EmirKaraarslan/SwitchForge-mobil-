# SwitchForge Mobile & Web (PWA Edition)

SwitchForge masaüstü uygulamasının iPhone, Android ve tüm web tarayıcılarıyla %100 uyumlu, mobil öncelikli (Mobile-First PWA) ve Docker tabanlı sürümüdür.

---

## ✨ Özellikler

- **📱 iPhone Tam Ekran Uygulama Desteği (PWA):** Safari'den *"Ana Ekrana Ekle"* yapıldığında, hiçbir tarayıcı çubuğu olmadan tam ekran yerel uygulama gibi çalışır.
- **📄 Eksiksiz Belge Dönüştürme:**
  - **PDF Yap:** Resimler (JPG, PNG, WebP) ve Office dökümanları (Word, Excel, PowerPoint) -> PDF
  - **Word / Excel / PowerPoint / PDF/A Yap:** PDF -> DOCX, XLSX, PPTX, PDF/A
  - **Resim Yap (JPG):** PDF sayfalarını zip dosyası olarak yüksek kalitede görsellere dökme
  - **PDF Birleştir & Parçala:** Çoklu PDF birleştirme ve tekli sayfalara bölme
- **🎥 Eksiksiz Medya Araçları:**
  - **Müzik İndir (MP3):** YouTube linklerinden en yüksek ses kalitesiyle doğrudan MP3 indirme
  - **Video İndir (MP4):** YouTube üzerinden çözünürlük seçimi (En İyi, 1080p, 720p, 480p)
  - **Sosyal Medya İndirici:** TikTok, Instagram Reels ve Twitter videolarını indirme
  - **Videodan Ses Çıkar:** Telefondaki videodan MP3 ses ayıklama
- **🎨 Glassmorphism & Dark Mode:** SwitchForge'un özel koyu neon cam teması.
- **⚡ Otomatik Temizlik:** Sunucuda geçici oluşturulan dosyalar 30 dakika sonra otomatik silinir.

---

## 🚀 Render.com Üzerinde Ücretsiz Canlıya Alma (5 Dakika)

Projeyi Render'a bağlayıp ücretsiz `https://switchforge.onrender.com` linkinizi almak için:

### 1. Adım: GitHub Deposu Açın ve Kodu Yükleyin
Bu klasörde PowerShell'i açıp şu komutları çalıştırın:
```bash
git init
git add .
git commit -m "SwitchForge Mobile İlk Sürüm"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/SwitchForge-Mobile.git
git push -u origin main
```

### 2. Adım: Render.com'a Bağlayın
1. [Render.com](https://render.com) adresine gidip ücretsiz üye olun / giriş yapın.
2. Dashboard'da **"New +"** butonuna basıp **"Web Service"** seçeneğini seçin.
3. GitHub reponuzu (**SwitchForge-Mobile**) bağlayın.
4. Ayarlar:
   - **Language / Runtime:** `Docker` (Otomatik algılar)
   - **Instance Type:** `Free`
5. **"Create Web Service"** butonuna basın!
6. Render birkaç dakika içinde Docker imajını derleyip size yeşil ışık yakacak ve ücretsiz HTTPS linkinizi verecektir.

---

## 📱 iPhone'da Uygulama Olarak Kullanma

1. Eşinizin iPhone'unda Safari'yi açın.
2. Render'ın verdiği linke gidin (örn: `https://switchforge-mobil.onrender.com`).
3. Safari'nin altındaki **Paylaş (Share)** butonuna basın.
4. **"Ana Ekrana Ekle" (Add to Home Screen)** seçeneğini seçin.
5. Artık ana ekranda SwitchForge logosu belirecek ve tıkladığında tam ekran bir iOS uygulaması gibi açılacaktır!

---

## 💻 Bilgisayarda Yerel Test Etme (Opsiyonel)

Kendi bilgisayarınızda denemek isterseniz:
```bash
npm install
npm start
```
Tarayıcınızdan `http://localhost:3000` adresine girerek mobil görünümü test edebilirsiniz (F12 -> Mobil Cihaz moduna alarak).
