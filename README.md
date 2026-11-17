# WhatsApp Çıkartma Dönüştürücü

Görselleri, GIF'leri ve videoları WhatsApp çıkartmasına (WEBP, animasyonlu dahil) veya yeniden boyutlandırılmış PNG'ye dönüştüren tek sayfalık web uygulaması. Dosya yükleyebilir ya da doğrudan bir medya bağlantısı yapıştırabilirsiniz. Arayüz Türkçedir.

Teknoloji: Next.js 15 (App Router), TypeScript (strict), Tailwind CSS, Sharp, FFmpeg (ffmpeg-static).

## Gereksinimler

- Node.js 20 veya üzeri
- npm 10 veya üzeri

## Kurulum ve çalıştırma

```bash
npm install
npm run dev        # http://localhost:3000
```

Üretim derlemesi:

```bash
npm run build
npm start
```

Tür denetimi: `npm run typecheck`

Ortam değişkeni gerekmez. İsteğe bağlı: `FFMPEG_PATH` ile kendi FFmpeg ikili dosyanızı gösterebilirsiniz; boşsa `ffmpeg-static` ile gelen ikili dosya kullanılır. `npm install` sırasında FFmpeg ikili dosyası GitHub'dan indirilir. Proje dosyalarını güncelledikten sonra mutlaka yeniden `npm install` çalıştırın. Paket kurulu değilse uygulama yine derlenir, ancak videolar "FFmpeg bulunmalı" hatası verir ve GIF'ler ilk kare olarak dönüştürülür.

## Özellikler

- Dosya yükleme (JPG, PNG, WEBP, GIF, MP4, WEBM; sürükle-bırak, tıklayıp seç, mobil) ve önizleme
- Bağlantıdan içe aktarma: doğrudan görsel (JPG, PNG, WEBP), GIF ve video (MP4, WEBM) bağlantıları ve X (Twitter) gönderi bağlantıları
- Boyut seçimi: Küçük 256, Orta 384, Büyük 512
- Çıktı türü: WhatsApp Çıkartması (WEBP) veya WhatsApp Görseli (PNG)
- Sonuç paneli: önizleme, dosya türü, çözünürlük, dosya boyutu, indirme

### Medya türlerine göre davranış

| Girdi | Çıktı: WhatsApp Çıkartması | Çıktı: WhatsApp Görseli |
| --- | --- | --- |
| JPG, PNG, WEBP | Şeffaf, sabit WEBP (en fazla 100 KB hedefi) | PNG |
| GIF | Animasyonlu WEBP (FFmpeg) | İlk kare, PNG |
| MP4, WEBM (X videoları dahil) | Animasyonlu WEBP (FFmpeg) | İlk kare, PNG |

Animasyonlu çıkartma ayrıntıları:

- En fazla 10 saniye alınır; daha uzunsa kısaltılır ve uyarı gösterilir.
- Seçilen kareye sığdırılır, oran korunur, ortalanır, boşluklar şeffaf kalır.
- Dosya 500 KB'ı aşarsa kare hızı ve kalite kademeli düşürülerek yeniden denenir (15 fps / kalite 65 ile başlar, 8 fps / kalite 15'e kadar iner). Yine de büyükse uyarı gösterilir.
- Ses atılır.
- Aynı anda en fazla 2 FFmpeg işi çalışır; fazlası "sunucu yoğun" hatası alır. Her deneme 25 saniye, toplam 50 saniye ile sınırlıdır.
- FFmpeg bulunamazsa videolar için anlaşılır bir hata gösterilir; GIF'ler ise ilk kare olarak dönüştürülmeye devam eder.

WhatsApp kendi çıkartma paketlerinde 512 x 512 boyutu ister. Küçük ve Orta seçenekleri istendiği gibi sunulur.

## X (Twitter) gönderi bağlantıları

`x.com`, `twitter.com`, `mobile.twitter.com`, `fxtwitter.com`, `vxtwitter.com` ve `fixupx.com` gönderi bağlantıları (`…/status/<id>`, `/i/status/<id>`, `…/photo/2`) desteklenir.

- Sunucu, gönderinin herkese açık verisini X'in syndication uç noktasından (`cdn.syndication.twimg.com/tweet-result`) okur ve gönderideki medyayı bulur.
- Fotoğraf: `pbs.twimg.com` üzerinden büyük boyutlu sürüm indirilir.
- Video ve GIF: en yüksek bit hızlı MP4 seçilir; dosya 20 MB'tan büyükse bir alt kaliteye geçilir. (X "GIF"leri aslında MP4'tür.) Sonrasında yüklenen video gibi FFmpeg ile dönüştürülür.
- Gönderide birden fazla medya varsa varsayılan olarak ilki alınır; `…/photo/2` gibi bağlantılarda belirtilen medya alınır.
- Bu uç nokta resmi bir API değildir; X bunu değiştirebilir. Silinmiş, gizli veya hassas içerik işaretli gönderiler çalışmayabilir.
- Yeni bir platform eklemek için `lib/services/url-import/resolvers/` altına bir `MediaUrlResolver` yazıp `resolvers/index.ts` listesine ekleyin.

## Bağlantıdan içe aktarma nasıl çalışır?

1. Tarayıcı bağlantıyı doğrular (protokol, biçim) ve `POST /api/import-url` isteği gönderir.
2. Sunucu bağlantıyı yeniden doğrular. X gibi tanınan bir platformsa çözümleyici gerçek medya adresini bulur; değilse bağlantı doğrudan medya sayılır. Ardından medya güvenli şekilde indirilir ve dosya imzasından (ilk baytlar) gerçek türü belirlenir. Çözümleme ve indirme toplamda 15 saniyelik tek bir süre sınırını paylaşır.
3. Medya, bilgi başlığıyla (`X-Import-Meta`) birlikte tarayıcıya döner. Tarayıcı bunu bir `File` nesnesine çevirir.
4. Bundan sonrası yüklenen dosyayla aynıdır: önizleme, boyut ve çıktı seçimi, ardından `POST /api/convert`. Yinelenen mantık yoktur.

Sunucuda dosya saklanmaz; indirilen medya yalnızca istek süresince bellekte tutulur.

### Güvenlik (SSRF koruması)

- Yalnızca `http://` ve `https://` kabul edilir. `file://`, `ftp://`, `data:` ve diğerleri reddedilir.
- Kullanıcı adı/şifre içeren bağlantılar reddedilir.
- `localhost`, `.local`, `.internal` gibi adlar ve noktasız (tek etiketli) ana bilgisayar adları engellenir.
- IP adresleri (IPv4 ve IPv6, IPv4-eşlemeli adresler dahil) loopback, özel ağ (10/8, 172.16/12, 192.168/16), link-local (169.254/16, bulut metadata dahil), CGNAT, çoklu yayın ve ayrılmış aralıklar için engellenir.
- DNS çözümlemesi bağlantı anında yapılır ve çözülen her adres kontrol edilir; bu, DNS rebinding saldırılarını da engeller.
- Yönlendirmeler elle izlenir (en fazla 3) ve her adım baştan doğrulanır.
- İndirme en fazla 20 MB ve 15 saniye ile sınırlıdır. `Content-Length` ve `Content-Type` başlıkları indirmeden önce kontrol edilir.
- İzin verilen türler: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `video/mp4`, `video/webm`. Gerçek tür dosya imzasından doğrulanır.

## Proje yapısı

```
app/
  api/convert/route.ts          Dönüştürme uç noktası
  api/import-url/route.ts       Bağlantıdan içe aktarma uç noktası
  globals.css  layout.tsx  page.tsx
components/
  ui/                           Card, DetailItem, OptionCard, Spinner
  ConvertButton  ErrorAlert  Header  ImagePreview  OutputSelector
  ResultPanel  SizeSelector  UploadArea  URLImportSection
hooks/
  useConverter.ts  useImageUpload.ts  useUrlImport.ts
lib/
  constants.ts
  services/
    api-client-utils.ts         Ortak istemci hata yardımcıları
    conversion-client.ts        /api/convert istemcisi
    import-client.ts            /api/import-url istemcisi
    media/                      MediaProcessingService, ffmpeg.ts, işlemciler (image-processor: Sharp, ffmpeg-processor: FFmpeg)
    url-import/                 safe-fetch.ts (SSRF-güvenli indirme), url-import-service.ts
      resolvers/                x-resolver.ts, types.ts, index.ts (platform çözümleyicileri)
  utils/
    errors  format  http  ip-guard  media  sniff  url-validation  validation
types/
  api.ts  media.ts
```

## Genişletme

Tüm dönüştürmeler `types/media.ts` içindeki `MediaProcessor` arayüzünden geçer:

```ts
interface MediaProcessor {
  readonly id: string;
  supports(input: MediaInput, options: ConversionOptions): boolean;
  process(input: MediaInput, options: ConversionOptions): Promise<ConversionResult>;
}
```

`MediaProcessingService`, listedeki ilk `supports()` değeri doğru olan işlemciyi kullanır. Sıra önemlidir: `FfmpegProcessor` başta, `ImageProcessor` yedek olarak sonda yer alır (`media-service.ts`).

Yeni bir çıktı biçimi veya medya türü eklemek için `lib/services/media/processors/` altına yeni bir işlemci yazıp bu listeye ekleyin.
