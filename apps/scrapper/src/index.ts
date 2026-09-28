import { scrapeLabSchedulePage, getTodayDateWIB } from './scraper';
import { syncScheduleToDatabase } from './sync';
import { db, jadwalLab } from '@jadwal/db';

async function clearRedisCache() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      const endpoint = `${url.replace(/\/$/, '')}/del/jadwal:all_2026_ganjil`;
      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        console.log('⚡ Upstash Redis cache (jadwal:all_2026_ganjil) berhasil dibersihkan via REST API!');
        return;
      }
    } catch (e: any) {
      console.warn('⚠️ Gagal membersihkan Upstash Redis via REST API:', e?.message);
    }
  }

  try {
    const apiPort = process.env.PORT || 8000;
    await fetch(`http://localhost:${apiPort}/api/cache/clear`, { method: 'POST' });
    console.log('⚡ Cache Redis jadwal berhasil dibersihkan via local API endpoint!');
  } catch {
    // Abaikan jika server API belum menyala
  }
}

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

  if (isSync) {
    console.log(`📥 [SYNC MODE] Mengambil jadwal dan menyinkronkan ke Supabase...\n`);

    if (isClean) {
      console.log('🗑️  Menghapus seluruh data jadwal lama dari database Supabase...');
      await db.delete(jadwalLab);
      console.log('✅ Data lama berhasil dikosongkan!\n');
    }

    // Ambil halaman pertama untuk mengetahui total halaman
    console.log('⏳ Memeriksa total halaman...');
    const firstPage = await scrapeLabSchedulePage(1, ruangFilter, tanggalFilter);
    const maxPages = pageLimit ? Math.min(pageLimit, firstPage.totalPages) : firstPage.totalPages;

    console.log(`📌 Terdeteksi total ${firstPage.totalPages} halaman (~${firstPage.totalClasses} kelas).`);

    if (firstPage.totalClasses === 0) {
      console.log('ℹ️ Tidak ada data jadwal yang perlu disinkronkan untuk kriteria ini.');
      await clearRedisCache();
      process.exit(0);
    }

    if (pageLimit) {
      console.log(`⚠️ Limit dibatasi hingga ${maxPages} halaman pertama.\n`);
    } else {
      console.log(`🚀 Memproses semua ${maxPages} halaman...\n`);
    }

    let totalSynced = 0;

    const BATCH_SIZE = 3;
    for (let i = 1; i <= maxPages; i += BATCH_SIZE) {
      const pageBatch = [];
      for (let p = i; p < i + BATCH_SIZE && p <= maxPages; p++) {
        pageBatch.push(p);
      }

      const results = await Promise.all(
        pageBatch.map(async (page) => {
          try {
            const pageData = page === 1 ? firstPage : await scrapeLabSchedulePage(page, ruangFilter, tanggalFilter);
            return { page, items: pageData.items, error: null };
          } catch (err: any) {
            return { page, items: [], error: err };
          }
        })
      );

      for (const res of results) {
        if (res.error) {
          console.error(`❌ Error di halaman ${res.page}:`, res.error);
        } else {
          const count = await syncScheduleToDatabase(res.items);
          totalSynced += count;
          console.log(`✅ Halaman ${res.page}/${maxPages}: sync ${count} baris.`);
        }
      }

      if (i + BATCH_SIZE <= maxPages) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    console.log(`\n🎉 Selesai! Total ${totalSynced} data jadwal berhasil disinkronkan ke Supabase.`);

    await clearRedisCache();

    process.exit(0);
  }
}

main().catch((err) => {
  console.error('❌ Terjadi kesalahan fatal:', err);
  process.exit(1);
});
