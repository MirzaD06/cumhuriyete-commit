# Cumhuriyet'e Commit

> O bize harfleri öğretti. Sıradaki satır bizden. **#CumhuriyeteCommit**

29 Ekim 2026'da Cumhuriyet'in 103. yılı için katılımcı bir piksel bayrak mozaiği. Her onaylı commit 54 × 36'lık Türk bayrağında bir piksel yakar; Millet Mektebi 2.0 kapsamında verilen her ilk kod dersi bir **altın piksel** ekler. Ay-yıldızı oluşturan son 103 piksel 29 Ekim saat 19.23'te canlı yayında birlikte yakılır.

| Hücre | Sayı | Anlamı |
|---|---|---|
| Tarihî commit | 21 | Açılışta yanık gelir (`init: Cumhuriyet ilan edildi` …) |
| Katılımcı pikseli | 1.820 | 1.670 commit + 150 ders hedefi |
| Final (ay-yıldız) | 103 | 29 Ekim 19.23'te yakılır |
| **Toplam** | **1.944** | 54 × 36, 2994 sayılı Kanun'daki ölçülere göre |

## Katılım

1. **Commit formu (GitHub hesabıyla, kod gerekmez):** Issues → *Cumhuriyet'e commit'imi at*.
2. **Pull request:** `commits/` klasörüne GitHub kullanıcı adınla tek bir dosya ekle:
   ```json
   {
     "rumuz": "genc_gelistirici",
     "il": "Ankara",
     "mesaj": "feat: köyümdeki okula kodlama kulübü",
     "tur": "commit"
   }
   ```
   Ders bildirimi için `"tur": "ders"`, `"mesaj"` öğrencinin ilk satırı ve `"ogrenciGrubu": "cocuk" | "yetiskin" | "65+"`.
3. **Google Form (hesapsız):** Kampanya sayfasındaki bağlantı. Yanıtlar moderatörlerce içe aktarılır.

Kurallar: mesaj tek satır ve en fazla 72 karakter; bağlantı, @etiket, e-posta, telefon ve kişisel veri yok; kampanya partiler üstüdür.

## Moderatör rehberi

**Issue ile gelen katkılar**
- Issue açılınca otomatik kontrol çalışır ve sonucu yorum olarak yazar; `incelemede`, `duzeltme-gerekli` veya `hassas-icerik` etiketi eklenir.
- İçeriği okuyup uygunsa **`onaylandi`** etiketini ekle. Bot dosyayı `commits/issue-<no>.json` olarak yazar, issue'yu kapatır ve siteyi yeniden yayınlar.
- `hassas-icerik` etiketli katkıları yalnızca siyasi çağrı içermediğinden eminsen onayla.

**Pull request ile gelen katkılar**
- *PR katkı kontrolü* geçmeden birleştirme. Özet sekmesindeki raporu oku.
- PR yalnızca `commits/` altında tek bir dosya eklemeli. Başka dosyaya dokunan katkı PR'larını birleştirme.

**Google Form yanıtları**
```bash
node scripts/import-form.mjs yanitlar.csv   # commits/form-*.json üretir, filtreye takılanları listeler
```
Oluşan dosyaları okuyup bir PR ile ekle.

**Kaldırma talebi:** İlgili dosyayı `commits/` klasöründen silip main'e gönder; site birkaç dakika içinde güncellenir.

## Geliştirme

Bağımlılık yok; Node 22+ yeterli.

```bash
npm test             # filtre ve form ayrıştırma testleri
npm run build        # commits/ → site/data/commits.json
npm run serve        # http://localhost:8023
```

Önizleme parametreleri:
- `?demo=1200` — 1.200 sahte katkıyla mozaiği gösterir.
- `?final=prova` — finali 10 saniye sonra başlatır (canlı yayın provası için).

Ayarlar `site/assets/config.js` içinde: repo adı, final saati, Google Form, ders kiti ve canlı yayın bağlantıları. İl listesi değişirse `npm run templates` ile issue formlarını yeniden üret.

## Kurulum (bir kez)

1. Settings → Pages → Source: **GitHub Actions**.
2. Etiketleri oluştur: `commit`, `ders`, `incelemede`, `duzeltme-gerekli`, `hassas-icerik`, `onaylandi`, `eklendi`.
3. Settings → Actions → General → Workflow permissions: **Read and write**.
4. Moderatörleri repoya en az *Triage* yetkisiyle ekle (etiket ekleyebilmeleri için).

## Lisans

Kod MIT lisanslıdır. Katkı metinleri sahiplerine aittir ve kampanya sitesinde gösterilmek üzere paylaşılmıştır.
