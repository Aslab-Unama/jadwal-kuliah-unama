import { db, jadwalLab, logNotifikasiPerubahan, sql, and, eq } from '@jadwal/db';
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

export interface StatusChangeSyncSummary {
  totalProcessed: number;
  totalChangesDetected: number;
  updatedKelas: string[];
}

/**
 * Memproses daftar kelas berstatus CANCEL atau ONLINE dari BAAK:
 * 1. Mencocokkan dengan data eksisting di tabel jadwal_lab_2026_ganjil
 * 2. Jika sebelumnya statusnya Tatap Muka (TM) dan kini berubah:
 *    - Update status di database Supabase (Early Update)
 *    - Catat antrean notifikasi ke tabel log_notifikasi_perubahan (PENDING)
 */
export async function syncStatusChangesToDatabase(items: ScrapedScheduleItem[]): Promise<StatusChangeSyncSummary> {
  let totalChanges = 0;
  const updatedKelas: string[] = [];

  for (const item of items) {
    try {
      const [existing] = await db
        .select()
        .from(jadwalLab)
        .where(
          and(
            eq(jadwalLab.tanggal, item.tanggal),
            eq(jadwalLab.waktuMulai, item.waktuMulai),
            eq(jadwalLab.kodeKelas, item.kodeKelas),
            eq(jadwalLab.mataKuliah, item.mataKuliah),
            eq(jadwalLab.ruangan, item.ruangan)
          )
        )
        .limit(1);

      if (!existing) {
        // Jika data jadwal belum pernah ada di database, simpan langsung
        await syncScheduleToDatabase([item]);
        continue;
      }

      const oldStatusLower = existing.status.toLowerCase();
      const newStatusLower = item.status.toLowerCase();

      // Cek apakah status lama adalah Tatap Muka (TM)
      const isOldTatapMuka = oldStatusLower.includes('tm') || oldStatusLower.includes('tatap muka');

      // Cek apakah status baru adalah Cancel atau Online
      const isNewCancel = newStatusLower.includes('cancel') || newStatusLower.includes('batal');
      const isNewOnline = newStatusLower.includes('ol') || newStatusLower.includes('online');

      // Deteksi perubahan hanya jika status berubah dari Tatap Muka ke Cancel/Online
      if (isOldTatapMuka && (isNewCancel || isNewOnline)) {
        const tipePerubahan = isNewCancel ? 'CANCEL' : 'ONLINE';
        const fingerprint = `${item.tanggal}__${item.waktuMulai}__${item.kodeKelas}__${item.ruangan}__TO__${tipePerubahan}`;

        // 1. Early Update: langsung ubah status di tabel jadwal utama
        await db
          .update(jadwalLab)
          .set({
            status: item.status,
            updatedAt: new Date(),
          })
          .where(eq(jadwalLab.id, existing.id));

        // 2. Insert ke antrean notifikasi (idempotent dengan onConflictDoNothing)
        const jamFormatted = existing.waktuSelesai
          ? `${item.waktuMulai} - ${existing.waktuSelesai}`
          : item.waktuMulai;

        await db
          .insert(logNotifikasiPerubahan)
          .values({
            tanggalKuliah: item.tanggal,
            hariKuliah: item.hari,
            jam: jamFormatted,
            ruangan: item.ruangan,
            kampus: item.kampus,
            namaMk: item.mataKuliah,
            kelas: item.kodeKelas,
            dosen: item.dosen || existing.dosen,
            statusLama: existing.status,
            statusBaru: item.status,
            tipePerubahan,
            statusKirim: 'PENDING',
            fingerprintEvent: fingerprint,
          })
          .onConflictDoNothing();

        totalChanges++;
        updatedKelas.push(`${item.kodeKelas} (${item.mataKuliah} - ${tipePerubahan})`);
      } else if (existing.status !== item.status) {
        // Jika status lain berubah, tetap update jadwal utama
        await db
          .update(jadwalLab)
          .set({
            status: item.status,
            updatedAt: new Date(),
          })
          .where(eq(jadwalLab.id, existing.id));
      }
    } catch (err: any) {
      console.error(
        `❌ Gagal memproses perubahan status [${item.tanggal} ${item.waktuMulai} ${item.kodeKelas}]:`,
        err?.message || err
      );
    }
  }

  return {
    totalProcessed: items.length,
    totalChangesDetected: totalChanges,
    updatedKelas,
  };
}

