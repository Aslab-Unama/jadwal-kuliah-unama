# Changelog

Semua perubahan pada proyek **Jadwal Kuliah UNAMA** dicatat dalam berkas ini. Format penulisan mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.1.0/) dan [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-09-26

Pembaruan dependensi monorepo ke versi rilis terbaru di seluruh package.

### Diubah
- TypeScript dinaikkan dari `^5.8.2` ke `^7.0.2` pada semua workspace (`apps/web`, `apps/api`, `apps/scrapper`, `packages/db`).
- Next.js dinaikkan dari `16.3.5` ke `16.3.6` pada `@jadwal/web`.
- React dan React DOM dinaikkan dari `19.2.8` ke `19.3.0` pada `@jadwal/web`.
- ESLint dinaikkan ke versi `^10` dan `eslint-config-next` ke `16.3.6`.
- ElysiaJS dinaikkan dari `^1.2.25` ke `^1.4.30` dan `@elysiajs/cors` ke `^1.4.2` pada `@jadwal/api`.
- Drizzle ORM dinaikkan dari `^0.40.0` ke `^0.45.3` dan `drizzle-kit` ke `^0.31.11` pada `packages/db`.
- Cheerio dinaikkan dari `^1.0.0` ke `^1.2.0` pada `@jadwal/scrapper`.
- Recharts dinaikkan dari `3.8.0` ke `3.10.1` dan Lucide React ke `^1.48.0` pada `@jadwal/web`.
- Dotenv dinaikkan dari `^16.4.7` ke `^18.0.4` dan `@types/node` ke `^26.6.2`.

---

## [1.0.0] - 2026-09-26

Rilis awal platform Jadwal Kuliah dan Laboratorium Universitas Dinamika Bangsa (UNAMA), mencakup antarmuka web, backend API, sinkronisasi data dari portal BAAK, dan sistem caching.

### Ditambahkan

#### Frontend Web (`@jadwal/web`)
- Dashboard jadwal dengan dua mode tampilan: kartu dan tabel.
- Pencarian data lokal (in-memory) berdasarkan mata kuliah, dosen, kode kelas, dan ruangan.
- Filter data berdasarkan kampus (Thehok dan Kobar), ruangan laboratorium, status perkuliahan, dan hari.
- Pemilih tanggal dengan kalender popover dan tombol pintas ke tanggal hari ini.
- Dialog detail jadwal dengan tombol ekspor ke Google Calendar.
- Pemisahan baris otomatis untuk nama dosen yang terdiri dari empat kata atau lebih pada tampilan tabel.
- Status pelaksanaan kelas: Berlangsung, Terjadwal, Selesai, dan Cancel.
- Panel asisten laboratorium dengan login berbasis cookie (masa aktif 7 hari).
- Pemantau ketersediaan 12 ruang laboratorium komputer UNAMA secara langsung.
- Perhitungan jeda waktu kosong antar-sesi kelas per laboratorium dengan batas jam operasional kampus.
- Indikator durasi sesi praktikum yang sedang berjalan.
- Mode layar penuh untuk monitor laboratorium.
- Penyimpanan status aplikasi menggunakan Zustand dengan pemuatan data penuh di awal.
- Sinkronisasi waktu menggunakan timestamp server untuk menyesuaikan jam perangkat pengguna.
- Penyesuaian zona waktu default ke Waktu Indonesia Barat (WIB).
- Pencegahan hydration mismatch dan perbaikan kedipan tema gelap atau terang saat halaman dimuat.

#### Backend API (`@jadwal/api`)
- Endpoint `GET /api/jadwal` dengan parameter `all=true` untuk mengambil seluruh data tanpa paginasi.
- Endpoint `GET /api/jadwal/summary` untuk ringkasan jumlah sesi tatap muka, online, dan batal.
- Endpoint `GET /api/time` untuk sinkronisasi waktu server.
- Endpoint `POST /api/auth/login` dan `GET /api/auth/verify` untuk sesi asisten laboratorium.
- Endpoint `POST /api/cache/clear` untuk mengosongkan cache Redis dan memori server.
- Caching dua tingkat: memori RAM lokal (L1) dan Upstash Redis (L2).
- Penanganan request bersamaan (promise coalescing) saat cache kosong untuk mencegah lonjakan beban ke database.
- Pembatas laju request (rate limiting) berbasis memori: 30 request per menit untuk rute publik dan 10 request per menit untuk rute login.
- Pencatatan log HTTP di terminal dengan format waktu WIB dan alamat IP klien.

#### Scraper dan Database (`@jadwal/scrapper` dan `@jadwal/db`)
- Pengambilan data multi-halaman secara paralel (3 halaman per kelompok) dengan percobaan ulang otomatis saat gagal.
- Penggabungan data nama dosen untuk kelas dengan tim pengajar (team teaching).
- Penyusunan parameter URL scraping menggunakan `URLSearchParams`.
- Pembersihan cache otomatis setelah sinkronisasi data jadwal selesai.
- Tabel database PostgreSQL aktif: `jadwal_lab_2026_ganjil` untuk Semester Ganjil 2026/2027.
- Tabel arsip: `jadwal_lab_2025_genap` untuk data semester sebelumnya.
- Indeks unik gabungan untuk mencegah duplikasi data saat proses upsert.
- Workflow GitHub Actions di `.github/workflows/scrape-sync.yml` untuk sinkronisasi otomatis harian pukul 00:00 WIB dan opsi pemicu manual.

---

[1.1.0]: https://github.com/fyydsz/jadwal-kuliah-unama/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/fyydsz/jadwal-kuliah-unama/releases/tag/v1.0.0
