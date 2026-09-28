import { db, jadwalLab, sql } from '@jadwal/db';
import type { ScrapedScheduleItem } from './types';

const courseAliases: Record<string, number> = {
  'toefl': 2,
  'pemrograman database': 3,
  'pengantar audit sistem informasi': 3,
  'jaringan dan komunikasi data': 3,
  'komputer dan masyarakat': 2,
  'sistem terdistribusi': 3,
  'inovasi sistem informasi di organisasi dan masyarakat': 2,
  'pemasaran internasional': 3,
  'pemasaran jasa': 3,
  'akuntansi keuangan': 3,
  'perencanaan bisnis dan simulasi': 3,
  'laboratorium kewirausahaan 2 (k5)': 2,
  'manajemen bisnis dan simulasi manajemen bisnis': 3,
  'manajemen pengembangan produk': 3,
  'manajemen tim kreatif': 3,
  'mekatronika': 3,
  'perbankan': 3,
  'proses bisnis': 3,
  'seni pentas dan penampilan': 2,
  'tata letak dan pengelolaan produk': 3,
};

function calculateWaktuSelesai(waktuMulai: string, sks: number): string {
  if (waktuMulai === '00:00') return '00:00';
  const [hStr, mStr] = waktuMulai.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return waktuMulai;
  const totalMins = h * 60 + m + sks * 50;
  const endH = Math.floor(totalMins / 60) % 24;
  const endM = totalMins % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

let mataKuliahCache: Map<string, number> | null = null;
async function getSksForCourse(kodeKelas: string, mataKuliah: string): Promise<number> {
  const normMk = mataKuliah.trim().toLowerCase();
  if (courseAliases[normMk]) return courseAliases[normMk];

  if (!mataKuliahCache) {
    mataKuliahCache = new Map();
    try {
      const allMk = await db.select({
        mataKuliah: sql<string>`lower(trim(mata_kuliah))`,
        jurusan: sql<string>`jurusan`,
        sks: sql<number>`sks`,
      }).from(sql`mata_kuliah`);
      for (const m of allMk) {
        mataKuliahCache.set(`${m.mataKuliah}__${m.jurusan}`, m.sks);
        if (!mataKuliahCache.has(m.mataKuliah)) {
          mataKuliahCache.set(m.mataKuliah, m.sks);
        }
      }
    } catch {
      // fallback
    }
  }

  const prodiChar = kodeKelas.length >= 4 ? kodeKelas[3].toUpperCase() : '';
  const prodiMap: Record<string, string> = {
    'T': 'Teknik Informatika',
    'S': 'Sistem Informasi',
    'K': 'Sistem Komputer',
    'W': 'Kewirausahaan',
    'B': 'Bisnis Digital',
    'M': 'Manajemen',
  };
  const jurusan = prodiMap[prodiChar];
  if (jurusan && mataKuliahCache.has(`${normMk}__${jurusan}`)) {
    return mataKuliahCache.get(`${normMk}__${jurusan}`)!;
  }
  if (mataKuliahCache.has(normMk)) {
    return mataKuliahCache.get(normMk)!;
  }
  return 2;
}

/**
 * Menyimpan atau memperbarui data jadwal ke database Supabase dengan:
 * 1. In-memory deduplication & merger (misal: team-teaching 2 dosen di kelas & jam yang sama)
 * 2. Fallback retry baris-per-baris jika batch insert mengalami kendala
 */
export async function syncScheduleToDatabase(items: ScrapedScheduleItem[]): Promise<number> {
  if (items.length === 0) return 0;

  // 1. In-memory Deduplication & Merger
  // Mencegah PostgreSQL error 21000: "ON CONFLICT DO UPDATE command cannot affect row a second time"
  const deduplicatedMap = new Map<string, typeof jadwalLab.$inferInsert>();

  for (const item of items) {
    const key = `${item.tanggal}__${item.waktuMulai}__${item.kodeKelas}__${item.mataKuliah}__${item.ruangan}`;

    if (deduplicatedMap.has(key)) {
      const existing = deduplicatedMap.get(key)!;
      // Jika dosen berbeda (team teaching), gabungkan nama dosennya
      if (item.dosen && !existing.dosen.includes(item.dosen)) {
        existing.dosen = `${existing.dosen} / ${item.dosen}`;
      }
      // Jika salah satu status OnSchedule sedangkan yang lain cancel, prioritaskan yang aktif
      if (!existing.status.includes('OnSchedule') && item.status.includes('OnSchedule')) {
        existing.status = item.status;
      }
    } else {
      const sks = await getSksForCourse(item.kodeKelas, item.mataKuliah);
      const waktuSelesai = calculateWaktuSelesai(item.waktuMulai, sks);

      deduplicatedMap.set(key, {
        hari: item.hari,
        tanggal: item.tanggal,
        waktuMulai: item.waktuMulai,
        waktuSelesai,
        sks,
        dosen: item.dosen,
        kodeKelas: item.kodeKelas,
        mataKuliah: item.mataKuliah,
        kampus: item.kampus,
        ruangan: item.ruangan,
        status: item.status,
        updatedAt: new Date(),
      });
    }
  }

  const records = Array.from(deduplicatedMap.values());

  // 2. Coba simpan sekaligus dalam 1 batch
  try {
    await db
      .insert(jadwalLab)
      .values(records)
      .onConflictDoUpdate({
        target: [
          jadwalLab.tanggal,
          jadwalLab.waktuMulai,
          jadwalLab.kodeKelas,
          jadwalLab.mataKuliah,
          jadwalLab.ruangan
        ],
        set: {
          status: sql`EXCLUDED.status`,
          dosen: sql`EXCLUDED.dosen`,
          mataKuliah: sql`EXCLUDED.mata_kuliah`,
          kampus: sql`EXCLUDED.kampus`,
          sks: sql`EXCLUDED.sks`,
          waktuSelesai: sql`EXCLUDED.waktu_selesai`,
          updatedAt: new Date(),
        },
      });

    return records.length;
  } catch (batchError: any) {
    // 3. Fallback Retry: Jika batch gagal, simpan satu per satu agar data lain tidak hilang
    console.warn(`\n⚠️  Batch insert gagal (${batchError.message}). Menjalankan fallback baris-per-baris...`);
    let successCount = 0;

    for (const record of records) {
      try {
        await db
          .insert(jadwalLab)
          .values(record)
          .onConflictDoUpdate({
            target: [
              jadwalLab.tanggal,
              jadwalLab.waktuMulai,
              jadwalLab.kodeKelas,
              jadwalLab.mataKuliah,
              jadwalLab.ruangan,
            ],
            set: {
              status: sql`EXCLUDED.status`,
              dosen: sql`EXCLUDED.dosen`,
              mataKuliah: sql`EXCLUDED.mata_kuliah`,
              kampus: sql`EXCLUDED.kampus`,
              sks: sql`EXCLUDED.sks`,
              waktuSelesai: sql`EXCLUDED.waktu_selesai`,
              updatedAt: new Date(),
            },
          });
        successCount++;
      } catch (rowError: any) {
        console.error(
          `   ❌ Gagal simpan [${record.tanggal} ${record.waktuMulai} ${record.kodeKelas}]:`,
          rowError.message
        );
      }
    }

    return successCount;
  }
}
