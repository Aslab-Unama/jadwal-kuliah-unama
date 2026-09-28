import { client } from '../packages/db/src/index';

// Alias manual untuk mata kuliah non-kurikulum 2025 atau variasi penamaan
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

async function run() {
  console.log('🚀 Memulai migrasi dan sinkronisasi SKS & Jam Kuliah...');

  // 1. Tambah kolom jika belum ada
  console.log('📦 Menambahkan kolom sks dan waktu_selesai ke jadwal_lab_2026_ganjil...');
  await client`
    ALTER TABLE jadwal_lab_2026_ganjil 
    ADD COLUMN IF NOT EXISTS sks INTEGER,
    ADD COLUMN IF NOT EXISTS waktu_selesai VARCHAR(10);
  `;

  await client`
    ALTER TABLE jadwal_lab_2025_genap 
    ADD COLUMN IF NOT EXISTS sks INTEGER,
    ADD COLUMN IF NOT EXISTS waktu_selesai VARCHAR(10);
  `;
  console.log('✅ Kolom berhasil ditambahkan/diverifikasi.');

  // 2. Buat tabel temporary untuk alias manual
  console.log('📋 Mengunggah tabel alias khusus...');
  await client`CREATE TEMP TABLE temp_aliases (mata_kuliah_alias TEXT PRIMARY KEY, sks INTEGER);`;
  for (const [mk, sks] of Object.entries(courseAliases)) {
    await client`INSERT INTO temp_aliases (mata_kuliah_alias, sks) VALUES (${mk}, ${sks});`;
  }

  // 3. Update tabel jadwal_lab_2026_ganjil
  console.log('🔄 Melakukan sinkronisasi data jadwal_lab_2026_ganjil...');
  const result = await client`
    WITH sks_lookup AS (
      SELECT 
        j.id,
        COALESCE(
          -- Prioritas 1: Cocok Nama MK + Jurusan dari kode_kelas
          m_exact.sks,
          -- Prioritas 2: Cocok Alias Khusus
          a.sks,
          -- Prioritas 3: Cocok Nama MK dari jurusan manapun di mata_kuliah
          m_any.sks,
          -- Fallback Default: 2 SKS
          2
        ) AS resolved_sks
      FROM jadwal_lab_2026_ganjil j
      LEFT JOIN LATERAL (
        SELECT m.sks
        FROM mata_kuliah m
        WHERE LOWER(TRIM(m.mata_kuliah)) = LOWER(TRIM(j.mata_kuliah))
          AND m.jurusan = CASE 
            WHEN SUBSTRING(j.kode_kelas FROM 4 FOR 1) = 'T' THEN 'Teknik Informatika'
            WHEN SUBSTRING(j.kode_kelas FROM 4 FOR 1) = 'S' THEN 'Sistem Informasi'
            WHEN SUBSTRING(j.kode_kelas FROM 4 FOR 1) = 'K' THEN 'Sistem Komputer'
            WHEN SUBSTRING(j.kode_kelas FROM 4 FOR 1) = 'W' THEN 'Kewirausahaan'
            WHEN SUBSTRING(j.kode_kelas FROM 4 FOR 1) = 'B' THEN 'Bisnis Digital'
            WHEN SUBSTRING(j.kode_kelas FROM 4 FOR 1) = 'M' THEN 'Manajemen'
          END
        LIMIT 1
      ) m_exact ON true
      LEFT JOIN temp_aliases a ON LOWER(TRIM(j.mata_kuliah)) = a.mata_kuliah_alias
      LEFT JOIN LATERAL (
        SELECT m.sks
        FROM mata_kuliah m
        WHERE LOWER(TRIM(m.mata_kuliah)) = LOWER(TRIM(j.mata_kuliah))
        LIMIT 1
      ) m_any ON true
    )
    UPDATE jadwal_lab_2026_ganjil j
    SET 
      sks = sl.resolved_sks,
      waktu_selesai = CASE 
        WHEN j.waktu_mulai = '00:00' THEN '00:00'
        ELSE to_char(j.waktu_mulai::time + (sl.resolved_sks * 50 * INTERVAL '1 minute'), 'HH24:MI')
      END,
      updated_at = NOW()
    FROM sks_lookup sl
    WHERE j.id = sl.id;
  `;

  console.log(`✅ Update selesai! Baris terupdate: ${result.count}`);

  // 4. Update tabel arsip jadwal_lab_2025_genap juga
  console.log('🔄 Melakukan sinkronisasi data jadwal_lab_2025_genap...');
  await client`
    WITH sks_lookup AS (
      SELECT 
        j.id,
        COALESCE(
          m_exact.sks,
          a.sks,
          m_any.sks,
          2
        ) AS resolved_sks
      FROM jadwal_lab_2025_genap j
      LEFT JOIN LATERAL (
        SELECT m.sks
        FROM mata_kuliah m
        WHERE LOWER(TRIM(m.mata_kuliah)) = LOWER(TRIM(j.mata_kuliah))
          AND m.jurusan = CASE 
            WHEN SUBSTRING(j.kode_kelas FROM 4 FOR 1) = 'T' THEN 'Teknik Informatika'
            WHEN SUBSTRING(j.kode_kelas FROM 4 FOR 1) = 'S' THEN 'Sistem Informasi'
            WHEN SUBSTRING(j.kode_kelas FROM 4 FOR 1) = 'K' THEN 'Sistem Komputer'
            WHEN SUBSTRING(j.kode_kelas FROM 4 FOR 1) = 'W' THEN 'Kewirausahaan'
            WHEN SUBSTRING(j.kode_kelas FROM 4 FOR 1) = 'B' THEN 'Bisnis Digital'
            WHEN SUBSTRING(j.kode_kelas FROM 4 FOR 1) = 'M' THEN 'Manajemen'
          END
        LIMIT 1
      ) m_exact ON true
      LEFT JOIN temp_aliases a ON LOWER(TRIM(j.mata_kuliah)) = a.mata_kuliah_alias
      LEFT JOIN LATERAL (
        SELECT m.sks
        FROM mata_kuliah m
        WHERE LOWER(TRIM(m.mata_kuliah)) = LOWER(TRIM(j.mata_kuliah))
        LIMIT 1
      ) m_any ON true
    )
    UPDATE jadwal_lab_2025_genap j
    SET 
      sks = sl.resolved_sks,
      waktu_selesai = CASE 
        WHEN j.waktu_mulai = '00:00' THEN '00:00'
        ELSE to_char(j.waktu_mulai::time + (sl.resolved_sks * 50 * INTERVAL '1 minute'), 'HH24:MI')
      END,
      updated_at = NOW()
    FROM sks_lookup sl
    WHERE j.id = sl.id;
  `;
  console.log('✅ Arsip 2025 Genap berhasil disinkronkan.');

  // 5. Statistik ringkasan
  const stats = await client`
    SELECT sks, COUNT(*) as jumlah
    FROM jadwal_lab_2026_ganjil
    GROUP BY sks
    ORDER BY sks;
  `;
  console.log('\n📊 Distribusi SKS pada jadwal_lab_2026_ganjil:');
  console.table(stats);

  const sample = await client`
    SELECT id, kode_kelas, mata_kuliah, sks, waktu_mulai, waktu_selesai
    FROM jadwal_lab_2026_ganjil
    LIMIT 10;
  `;
  console.log('\n🔍 Contoh data terupdate:');
  console.table(sample);

  await client.end();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Error saat sinkronisasi:', err);
  process.exit(1);
});
