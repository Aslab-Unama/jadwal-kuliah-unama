# Jadwal Kuliah UNAMA

Platform informasi jadwal perkuliahan dan sistem monitoring ketersediaan ruang laboratorium untuk Universitas Dinamika Bangsa (UNAMA). Sistem ini mengotomasi penarikan data jadwal dari portal akademik BAAK UNAMA, menyimpannya ke PostgreSQL terkelola, dan menyajikannya melalui antarmuka web interaktif untuk mahasiswa, dosen, serta Asisten Laboratorium (Aslab).

## Daftar Isi

- [Arsitektur Sistem](#arsitektur-sistem)
- [Struktur Monorepo](#struktur-monorepo)
- [Teknologi dan Dependensi](#teknologi-dan-dependensi)
- [Fitur Utama](#fitur-utama)
- [Skema Database](#skema-database)
- [Referensi Endpoint API](#referensi-endpoint-api)
- [Panduan Instalasi](#panduan-instalasi)
- [Daftar Perintah (Scripts)](#daftar-perintah-scripts)
- [Variabel Lingkungan](#variabel-lingkungan)
- [Deployment](#deployment)

## Arsitektur Sistem

Proyek ini dibangun menggunakan pola monorepo dengan arsitektur 3-tier:

1. Ingestion Layer (`apps/scrapper`): Menjalankan web scraping terhadap halaman jadwal HTML publik portal BAAK UNAMA menggunakan Cheerio, membersihkan duplikasi dosen (team teaching), lalu melakukan batch upsert ke database PostgreSQL.
2. Backend API (`apps/api`): REST API menggunakan ElysiaJS di atas Bun runtime. Dilengkapi proteksi in-memory rate limiting, multi-layer caching (L1 RAM lokal dan L2 Upstash Redis), serta single-flight request coalescing untuk mencegah cache stampede.
3. Frontend Dashboard (`apps/web`): Antarmuka pengguna Next.js (App Router) dengan React 19, Tailwind CSS v4, dan shadcn/ui. Seluruh dataset jadwal dimuat ke store Zustand pada initial load untuk memproses pencarian, multi-filter, dan pagination secara instan di sisi klien tanpa request jaringan berulang.

## Struktur Monorepo

Repository ini dikelola menggunakan Bun Workspaces:

```text
jadwal-kuliah-unama/
├── apps/
│   ├── api/            # Backend REST API (ElysiaJS)
│   ├── web/            # Frontend dashboard (Next.js 16, React 19, Tailwind CSS v4)
│   └── scrapper/       # CLI tool scraping data BAAK (Cheerio, Bun)
├── packages/
│   └── db/             # Shared database package (Drizzle ORM, postgres.js, schema)
├── Dockerfile          # Container build untuk deployment backend API
├── render.yaml         # Blueprint deployment Render.com
└── package.json        # Root workspace configuration dan skrip orkestrasi
```

## Teknologi dan Dependensi

### Runtime dan Bahasa

| Teknologi | Versi | Peran dan Alasan Penggunaan |
| :--- | :--- | :--- |
| Bun | 1.4+ | Runtime JavaScript/TypeScript utama dan package manager monorepo. Memberikan waktu startup dan eksekusi cepat untuk scraping dan HTTP server. |
| TypeScript | 5.8+ | Menjaga konsistensi tipe data di seluruh package monorepo (skema database, tipe response API, dan state frontend). |

### Frontend (`apps/web`)

| Teknologi | Versi | Peran dan Alasan Penggunaan |
| :--- | :--- | :--- |
| Next.js | 16.3.5 | Framework React dengan App Router untuk rendering aplikasi web. |
| React | 19.2.8 | Library antarmuka komponen UI. |
| Tailwind CSS | 4.x | Styling utilitas CSS untuk antarmuka dashboard. |
| shadcn/ui & Base UI | 4.21 / 1.8 | Komponen UI modular berbasis accessible primitives. |
| Zustand | 5.0.15 | State management sisi klien untuk menyimpan dataset jadwal dan memproses filter instan di memori browser. |
| date-fns | 4.4.0 | Utilitas manipulasi tanggal dan kalkulasi waktu dengan format lokal Indonesia. |
| Recharts | 3.8.0 | Visualisasi grafik data statistik perkuliahan. |
| Lucide React | 1.45.0 | Koleksi ikon antarmuka. |
| next-themes | 0.4.6 | Manajemen tema tampilan (Light, Dark, System). |

### Backend API (`apps/api`)

| Teknologi | Versi | Peran dan Alasan Penggunaan |
| :--- | :--- | :--- |
| ElysiaJS | 1.2.25 | Framework web HTTP performa tinggi yang dirancang khusus untuk Bun runtime. |
| @elysiajs/cors | 1.2.0 | Middleware pengelolaan Cross-Origin Resource Sharing. |
| @upstash/redis | 1.38.4 | Klien serverless Redis berbasis REST API untuk cache L2 tanpa koneksi TCP persisten. |

### Data Ingestion dan Database (`apps/scrapper` & `packages/db`)

| Teknologi | Versi | Peran dan Alasan Penggunaan |
| :--- | :--- | :--- |
| Cheerio | 1.0.0 | Parser HTML cepat berbasis selektor jQuery untuk mengekstrak data dari tabel jadwal BAAK. |
| Drizzle ORM | 0.40.0 | TypeScript ORM ringan dengan sintaks SQL-like untuk query dan migrasi skema. |
| postgres.js | 3.4.5 | Driver PostgreSQL berkecepatan tinggi dengan dukungan pooling transaksi Supabase. |
| Supabase | PostgreSQL 15 | Database relasional terkelola (region Singapore / ap-southeast-1). |

## Fitur Utama

### 1. Dashboard Jadwal Publik (Mahasiswa dan Dosen)
- Ringkasan statistik jumlah jadwal (total perkuliahan, tatap muka, daring, dan kelas dibatalkan).
- Multi-filter instan berdasarkan tanggal, hari, kampus (Thehok atau Kobar), ruangan laboratorium, status perkuliahan, serta pencarian teks bebas.
- Mode tampilan ganda: Grid Card dan Tabel interaktif.
- Dialog detail jadwal dengan informasi dosen, ruangan, jam, serta pintasan ekspor jadwal ke Google Calendar.
- Pilihan tanggal perkuliahan dengan kalender terintegrasi.
- Dukungan mode gelap (dark mode) dan mode terang (light mode).
- Mekanisme fallback data statis apabila server backend sedang dalam status cold start atau offline.

### 2. Panel Asisten Laboratorium (Aslab)
- Autentikasi sesi berbasis kode rahasia (`ASLAB_SECRET_CODE`).
- Monitor status real-time 12 laboratorium UNAMA (terpakai, kosong, atau kelas daring).
- Indikator persentase durasi sesi perkuliahan yang sedang berjalan.
- Analisis jeda waktu kosong (gap analysis) antar sesi kelas per laboratorium.
- Sinkronisasi waktu jam server untuk menjaga ketepatan kalkulasi status ruangan.

### 3. Data Scraper Terotomasi
- Scraping multi-halaman dengan deteksi otomatis total halaman jadwal di portal BAAK UNAMA.
- Mekanisme retry bertingkat (exponential backoff) saat request ke portal BAAK mengalami gangguan jaringan.
- Penggabungan otomatis data baris dosen ganda (team teaching).
- Skema upsert database menggunakan unique composite index untuk mencegah duplikasi data jadwal.
- Invalidation otomatis terhadap cache Redis setelah proses sinkronisasi data selesai.

### 4. Mekanisme Multi-Layer Caching dan Rate Limiting
- Cache L1 (In-Memory RAM): Akses di memori server lokal dengan TTL 1 jam.
- Cache L2 (Upstash Redis): Cache terdistribusi dengan TTL 24 jam.
- Single-Flight Promise Coalescing: Menggabungkan request bersamaan saat cache kosong agar hanya satu request yang menyentuh Redis atau database (mencegah cache stampede).
- In-Memory Rate Limiting: 30 request per menit untuk endpoint publik, dan 10 request per menit untuk endpoint autentikasi.

## Skema Database

Tabel utama yang aktif dikelola pada package `packages/db` (`src/schema.ts`):

### Tabel Aktif: `jadwal_lab_2026_ganjil`
- `id` (serial, Primary Key): ID unik auto-increment.
- `hari` (varchar 20): Hari perkuliahan (Senin sampai Sabtu).
- `tanggal` (varchar 50): Tanggal pelaksanaan kuliah (contoh: "13 April 2026").
- `waktu_mulai` (varchar 10): Jam mulai perkuliahan (format HH:mm).
- `dosen` (varchar 255): Nama dosen pengampu (nama digabungkan dengan pemisah " / " untuk team teaching).
- `kode_kelas` (varchar 50): Kode kelas perkuliahan (contoh: "01PS2").
- `mata_kuliah` (varchar 255): Nama mata kuliah.
- `kampus` (varchar 100): Lokasi kampus ("Kampus Thehok" atau "Kampus Kobar").
- `ruangan` (varchar 100): Nama ruangan atau kode laboratorium.
- `status` (varchar 50): Status perkuliahan (contoh: "OnSchedule (TM)", "OnSchedule (OL)", "Cancel").
- `created_at` (timestamp): Waktu pencatatan data.
- `updated_at` (timestamp): Waktu pembaruan data terakhir.

Index unik komposit diterapkan pada kolom: `(tanggal, waktu_mulai, kode_kelas, mata_kuliah, ruangan)` untuk memastikan integritas data saat upsert.

Catatan: Tersedia pula tabel arsip `jadwal_lab_2025_genap` untuk menyimpan data historis semester sebelumnya.

## Referensi Endpoint API

Backend API berjalan pada port 3001 (default) atau port yang ditentukan melalui variabel lingkungan `PORT`.

| Method | Endpoint | Deskripsi | Autentikasi |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Health check server dan status koneksi API | Publik |
| `GET` | `/api/jadwal` | Mengambil data jadwal dengan dukungan filter dan pagination | Publik |
| `GET` | `/api/jadwal/summary` | Mengambil agregasi statistik total jadwal, status, kampus, dan ruangan | Publik |
| `GET` | `/api/jadwal/:id` | Mengambil data detail satu jadwal berdasarkan ID | Publik |
| `POST` | `/api/auth/login` | Login asisten laboratorium menggunakan kode rahasia | Publik |
| `GET` | `/api/auth/verify` | Memverifikasi validitas token sesi asisten laboratorium | Bearer Token |
| `POST` | `/api/cache/clear` | Mengosongkan cache L1 (RAM) dan L2 (Redis) | Publik |

### Parameter Query `GET /api/jadwal`
- `all`: Set `true` untuk mengambil seluruh dataset jadwal tanpa batas limit/offset (digunakan oleh store frontend).
- `search`: Pencarian teks pada mata kuliah, nama dosen, kode kelas, dan ruangan.
- `hari`: Filter berdasarkan hari tertentu.
- `tanggal`: Filter berdasarkan tanggal perkuliahan.
- `kampus`: Filter berdasarkan lokasi kampus.
- `ruangan`: Filter berdasarkan nama ruangan atau laboratorium.
- `status`: Filter berdasarkan status jadwal.
- `limit`: Jumlah data per halaman (1 sampai 500, default: 50).
- `offset`: Offset baris data untuk pagination (default: 0).

## Panduan Instalasi

### 1. Prasyarat Sistem
- [Bun](https://bun.sh/) versi 1.2 atau lebih baru.
- Instance PostgreSQL (misalnya Supabase).
- Instance Upstash Redis (opsional, untuk caching L2).

### 2. Kloning Repository dan Instalasi Dependensi
```bash
git clone https://github.com/fyydsz/jadwal-kuliah-unama.git
cd jadwal-kuliah-unama
bun install
```

### 3. Konfigurasi Variabel Lingkungan
Salin file template lingkungan:
```bash
cp .env.example .env
```
Sesuaikan nilai konfigurasi di dalam file `.env` sesuai kredensial database dan sistem Anda.

### 4. Sinkronisasi Skema Database
Dorong skema Drizzle ke instance database PostgreSQL:
```bash
bun run db:push
```

### 5. Pengambilan Data Awal (Scraping)
Uji coba parsing data dari BAAK:
```bash
bun run scrape:test
```
Lakukan sinkronisasi penuh data jadwal ke database:
```bash
bun run scrape:sync
```

## Daftar Perintah (Scripts)

Perintah-perintah berikut dapat dijalankan dari root direktori proyek:

| Perintah | Fungsi |
| :--- | :--- |
| `bun run dev` | Menjalankan seluruh aplikasi (`apps/*` dan `packages/*`) dalam mode development |
| `bun run dev:api` | Menjalankan backend API ElysiaJS (`apps/api`) dengan auto-reload |
| `bun run dev:web` | Menjalankan frontend Next.js (`apps/web`) pada port 3000 |
| `bun run start:api` | Menjalankan backend API ElysiaJS untuk lingkungan produksi |
| `bun run scrape:test` | Menguji scraping halaman 1 BAAK tanpa menyimpan ke database |
| `bun run scrape:sync` | Mengambil seluruh data jadwal dari BAAK dan menyimpannya ke database |
| `bun run scrape:fresh` | Mengosongkan data lama di tabel database lalu melakukan sinkronisasi ulang |
| `bun run db:push` | Menerapkan perubahan skema Drizzle langsung ke database PostgreSQL |
| `bun run db:studio` | Membuka antarmuka Drizzle Studio di browser untuk inspeksi data tabel |
| `bun run tsc` | Memeriksa validasi tipe TypeScript pada frontend (`apps/web`) |
| `bun run tsc:all` | Memeriksa validasi tipe TypeScript pada seluruh package di monorepo |

## Variabel Lingkungan

Konfigurasi lingkungan yang digunakan oleh backend, scrapper, dan database:

| Variabel | Kebutuhan | Deskripsi |
| :--- | :--- | :--- |
| `DATABASE_URL` | Wajib | URL koneksi PostgreSQL (pooler port 6543 atau direct connection) |
| `DIRECT_URL` | Opsional | URL koneksi langsung PostgreSQL (port 5432) untuk migrasi Drizzle |
| `ADMIN_PASSWORD` | Wajib | Kata sandi administratif |
| `ASLAB_SECRET_CODE` | Wajib | Kode rahasia autentikasi untuk login ke panel Aslab |
| `UPSTASH_REDIS_REST_URL` | Opsional | URL endpoint REST Upstash Redis untuk L2 caching |
| `UPSTASH_REDIS_REST_TOKEN` | Opsional | Token otentikasi REST Upstash Redis |
| `PORT` | Opsional | Port server API backend (default: 3001) |
| `HOST` | Opsional | Host server API backend (default: 0.0.0.0) |
| `NEXT_PUBLIC_API_URL` | Opsional | URL basis backend API yang diakses oleh frontend Next.js (default: http://localhost:8000) |

## Deployment

### Backend API (Render.com / Docker)
Repository menyediakan `Dockerfile` berbasis `oven/bun:1-alpine` dan blueprint `render.yaml`.
- Container menyalin seluruh dependensi monorepo dan mengekspos port 3001.
- Service dijalankan dengan perintah `bun run start:api`.

### Frontend Web (Vercel / Node.js Host)
Frontend Next.js di direktori `apps/web` dapat di-deploy secara terpisah ke platform hosting seperti Vercel:
- Root directory konfigurasi deployment diatur ke `apps/web`.
- Tambahkan variabel lingkungan `NEXT_PUBLIC_API_URL` yang mengarah ke domain backend API yang telah aktif.
