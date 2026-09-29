import { scrapeLabSchedulePage, getTodayDateWIB } from './scraper';
import { syncScheduleToDatabase, syncStatusChangesToDatabase } from './sync';
import {
  runScrapeSync,
  runStatusChangeSync,
  clearRedisCache,
  type ScrapeSyncOptions,
  type ScrapeSyncResult,
  type StatusChangeSyncResult,
} from './sync-service';

export {
  runScrapeSync,
  runStatusChangeSync,
  clearRedisCache,
  scrapeLabSchedulePage,
  syncScheduleToDatabase,
  syncStatusChangesToDatabase,
  getTodayDateWIB,
  type ScrapeSyncOptions,
  type ScrapeSyncResult,
  type StatusChangeSyncResult,
};

async function main() {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test') || args.length === 0;
  const isSync = args.includes('--sync');
  const isClean = args.includes('--clean') || args.includes('--fresh');
  const isToday = args.includes('--today');

  const dateArgIndex = args.indexOf('--date');
  const customDate = dateArgIndex !== -1 ? args[dateArgIndex + 1] : undefined;

  const ruangFilter = args.includes('--labor') ? 'labor' : args.includes('--teori') ? 'teori' : '';
  const tanggalFilter = isToday ? getTodayDateWIB() : (customDate || '');

  const dateDescription = tanggalFilter
    ? `${tanggalFilter}${isToday ? ' (Hari Ini - WIB)' : ''}`
    : 'Semua Tanggal';

  const ruangDescription = ruangFilter === 'labor' ? 'Khusus Lab' : ruangFilter === 'teori' ? 'Khusus Teori' : 'Semua Kelas (Teori & Lab)';

  // Cek parameter limit jika ingin membatasi jumlah halaman yang di-sync (contoh: --limit 2)
  const limitArgIndex = args.indexOf('--limit');
  const pageLimit = limitArgIndex !== -1 ? parseInt(args[limitArgIndex + 1], 10) : undefined;

  console.log('🚀 Memulai BAAK UNAMA Schedule Scraper dengan Bun...\n');
  console.log(`📌 Konfigurasi Scraping:`);
  console.log(`   - Ruang   : ${ruangDescription}`);
  console.log(`   - Tanggal : ${dateDescription}\n`);

  if (isTest && !isSync) {
    console.log(`🔍 [TEST MODE] Mengambil sampel data jadwal (Halaman 1)...\n`);
    const start = performance.now();
    const result = await scrapeLabSchedulePage(1, ruangFilter, tanggalFilter);
    const duration = ((performance.now() - start) / 1000).toFixed(2);

    console.log(`✅ Berhasil mengambil data dalam ${duration}s!`);
    console.log(`📊 Statistik:`);
    console.log(`   - Total Kelas Terdeteksi: ${result.totalClasses}`);
    console.log(`   - Perkiraan Total Halaman: ${result.totalPages}`);
    console.log(`   - Jumlah Baris di Halaman 1: ${result.items.length}\n`);

    if (result.items.length > 0) {
      console.log('📋 Sampel 5 Data Pertama Ter-parse:');
      console.table(
        result.items.slice(0, 5).map((item) => ({
          Hari: item.hari,
          Tanggal: item.tanggal,
          Jam: item.waktuMulai,
          Dosen: item.dosen,
          Kelas: item.kodeKelas,
          MataKuliah: item.mataKuliah,
          Kampus: item.kampus,
          Ruang: item.ruangan,
          Status: item.status,
        }))
      );
    } else {
      console.log('ℹ️ Tidak ada jadwal perkuliahan ditemukan untuk kriteria ini.');
    }

    console.log('\n💡 Untuk menyinkronkan data ke database Supabase, jalankan:');
    if (isToday) {
      console.log('   bun run sync:today\n');
    } else {
      console.log('   bun run sync\n');
    }
    return;
  }

  if (args.includes('--status')) {
    const result = await runStatusChangeSync();
    if (!result.success) {
      process.exit(1);
    }
    process.exit(0);
  }

  if (isSync) {
    const result = await runScrapeSync({
      isToday,
      customDate,
      ruang: (ruangFilter as any) || 'all',
      cleanDb: isClean,
      pageLimit,
    });

    if (!result.success) {
      process.exit(1);
    }
    process.exit(0);
  }
}

// Hanya jalankan main jika dipanggil langsung dari command line (CLI)
if (import.meta.main) {
  main().catch((err) => {
    console.error('❌ Terjadi kesalahan fatal:', err);
    process.exit(1);
  });
}
