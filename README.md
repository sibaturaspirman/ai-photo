# AI Photo Studio

Frontend Next.js 16 (App Router, TypeScript, Tailwind v4) dengan integrasi
[fal.ai](https://fal.ai) untuk generate gambar dari prompt teks.

## Stack

- **Next.js 16** - App Router + Turbopack
- **TypeScript**, **Tailwind CSS v4**
- **[@fal-ai/client](https://www.npmjs.com/package/@fal-ai/client)** - SDK resmi fal.ai
- API route Next.js sebagai proxy server-side, sehingga `FAL_KEY` tidak pernah
  ter-expose ke browser

## Persiapan

1. Install dependency:

   ```bash
   npm install
   ```

2. Buat file `.env.local` dari template:

   ```bash
   cp .env.example .env.local
   ```

3. Isi `FAL_KEY` dengan API key Anda dari
   [fal.ai dashboard](https://fal.ai/dashboard/keys):

   ```env
   FAL_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:yyyy...
   FAL_MODEL=fal-ai/flux/schnell
   ```

## Menjalankan

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000), isi prompt, lalu klik
**Generate**.

## Struktur Penting

```
src/
├── app/
│   ├── api/generate/route.ts   # API proxy ke fal.ai (server-side)
│   ├── layout.tsx
│   └── page.tsx                 # Halaman utama
├── components/
│   └── image-generator.tsx      # UI form + grid hasil
└── lib/
    └── fal.ts                   # Helper konfigurasi fal client
```

## API: `POST /api/generate`

Body JSON:

| Field       | Type    | Default                | Keterangan                                    |
| ----------- | ------- | ---------------------- | --------------------------------------------- |
| `prompt`    | string  | **required**           | Deskripsi gambar                              |
| `model`     | string  | `fal-ai/flux/schnell`  | ID model fal.ai                               |
| `imageSize` | string  | `landscape_4_3`        | `square_hd`, `portrait_16_9`, dll.            |
| `numImages` | number  | `1`                    | 1-4                                           |
| `seed`      | number  | _(random)_             | Seed deterministik                            |

Contoh:

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"a cinematic photo of a fox in autumn forest","numImages":2}'
```

Response:

```json
{
  "requestId": "...",
  "model": "fal-ai/flux/schnell",
  "prompt": "...",
  "seed": 1234567890,
  "images": [
    { "url": "https://fal.media/...", "width": 1024, "height": 768 }
  ]
}
```

## Mengganti Model

Model bisa diganti per-request lewat field `model`, atau global lewat env
`FAL_MODEL`. Lihat daftar lengkap di [fal.ai/models](https://fal.ai/models).

Beberapa model populer:

- `fal-ai/flux/schnell` - cepat, biaya rendah
- `fal-ai/flux/dev` - kualitas lebih tinggi
- `fal-ai/fast-sdxl` - SDXL turbo

## Catatan Keamanan

- `FAL_KEY` hanya dibaca oleh API route server-side (`src/app/api/generate/route.ts`).
- File `src/lib/fal.ts` di-mark `import "server-only"` untuk mencegah ter-bundle
  ke client.
- Untuk production, simpan `FAL_KEY` di environment variable platform deploy
  (Vercel, dll), bukan di repo.

## Build Production

```bash
npm run build
npm run start
```
