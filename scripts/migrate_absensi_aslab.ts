import { client } from '../packages/db/src/index';

async function main() {
  console.log('🚀 Memulai migrasi tabel absensi_aslab...');

  try {
    await client`
      CREATE TABLE IF NOT EXISTS public.absensi_aslab (
        id SERIAL PRIMARY KEY,
        jadwal_id INTEGER,
        tanggal VARCHAR(50) NOT NULL,
        tanggal_iso VARCHAR(20),
        jam_masuk VARCHAR(30) NOT NULL,
        waktu_mulai VARCHAR(10) NOT NULL,
        waktu_selesai VARCHAR(10),
        ruangan VARCHAR(100) NOT NULL,
        kampus VARCHAR(100) NOT NULL,
        nomor_lab VARCHAR(50),
        kode_kelas VARCHAR(50) NOT NULL,
        mata_kuliah VARCHAR(255) NOT NULL,
        dosen VARCHAR(255) NOT NULL,
        status_perkuliahan VARCHAR(50) NOT NULL,
        nama_asisten VARCHAR(150) NOT NULL,
        status_gform VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
        fingerprint VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
      );
    `;
    console.log('✅ Tabel public.absensi_aslab berhasil dibuat / diverifikasi.');

    await client`
      CREATE UNIQUE INDEX IF NOT EXISTS absensi_aslab_fingerprint_idx 
      ON public.absensi_aslab (fingerprint);
    `;
    console.log('✅ Unique index absensi_aslab_fingerprint_idx berhasil diverifikasi.');

    console.log('🎉 Migrasi tabel absensi_aslab selesai sempurna!');
  } catch (err) {
    console.error('❌ Gagal migrasi absensi_aslab:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
