import { pgTable, serial, varchar, timestamp, uniqueIndex, integer, text } from 'drizzle-orm/pg-core';

// Tabel Arsip: Semester Genap 2025/2026
export const jadwalLab2025Genap = pgTable(
  'jadwal_lab_2025_genap',
  {
    id: serial('id').primaryKey(),
    hari: varchar('hari', { length: 20 }).notNull(),
    tanggal: varchar('tanggal', { length: 50 }).notNull(),
    waktuMulai: varchar('waktu_mulai', { length: 10 }).notNull(),
    dosen: varchar('dosen', { length: 150 }).notNull(),
    kodeKelas: varchar('kode_kelas', { length: 50 }).notNull(),
    mataKuliah: varchar('mata_kuliah', { length: 200 }).notNull(),
    kampus: varchar('kampus', { length: 100 }).notNull(),
    ruangan: varchar('ruangan', { length: 100 }).notNull(),
    status: varchar('status', { length: 50 }).notNull(),
    sks: integer('sks'),
    waktuSelesai: varchar('waktu_selesai', { length: 10 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('jadwal_lab_2025_genap_unique_idx').on(
      table.tanggal,
      table.waktuMulai,
      table.kodeKelas,
      table.mataKuliah,
      table.ruangan
    ),
  ]
);

// Tabel Aktif: Semester Ganjil 2026/2027
export const jadwalLab2026Ganjil = pgTable(
  'jadwal_lab_2026_ganjil',
  {
    id: serial('id').primaryKey(),
    hari: varchar('hari', { length: 20 }).notNull(),
    tanggal: varchar('tanggal', { length: 50 }).notNull(),
    waktuMulai: varchar('waktu_mulai', { length: 10 }).notNull(),
    dosen: varchar('dosen', { length: 255 }).notNull(),
    kodeKelas: varchar('kode_kelas', { length: 50 }).notNull(),
    mataKuliah: varchar('mata_kuliah', { length: 255 }).notNull(),
    kampus: varchar('kampus', { length: 100 }).notNull(),
    ruangan: varchar('ruangan', { length: 100 }).notNull(),
    status: varchar('status', { length: 50 }).notNull(),
    sks: integer('sks'),
    waktuSelesai: varchar('waktu_selesai', { length: 10 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('jadwal_lab_2026_ganjil_unique_idx').on(
      table.tanggal,
      table.waktuMulai,
      table.kodeKelas,
      table.mataKuliah,
      table.ruangan
    ),
  ]
);

// Default active table used across API and Scrapper
export const jadwalLab = jadwalLab2026Ganjil;

export const mataKuliah = pgTable(
  'mata_kuliah',
  {
    id: serial('id').primaryKey(),
    kodeMk: varchar('kode_mk', { length: 50 }).notNull(),
    mataKuliah: varchar('mata_kuliah', { length: 255 }).notNull(),
    jurusan: varchar('jurusan', { length: 100 }).notNull(),
    sks: integer('sks').notNull(),
    status: varchar('status', { length: 50 }).notNull(),
    semester: varchar('semester', { length: 50 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('mata_kuliah_kode_mk_jurusan_idx').on(table.kodeMk, table.mataKuliah, table.jurusan),
  ]
);

export const kurikulumMataKuliah = pgTable('kurikulum_mata_kuliah', {
  idKurikulum: serial('id_kurikulum').primaryKey(),
  prodi: varchar('prodi', { length: 20 }).notNull(),
  namaProdi: varchar('nama_prodi', { length: 100 }).notNull(),
  tahunKurikulum: varchar('tahun_kurikulum', { length: 10 }).notNull(),
  semesterLabel: varchar('semester_label', { length: 50 }).notNull(),
  semesterAngka: integer('semester_angka'),
  statusMk: varchar('status_mk', { length: 50 }).notNull(),
  kategoriMk: varchar('kategori_mk', { length: 100 }).notNull(),
  kodeMk: varchar('kode_mk', { length: 50 }).notNull(),
  namaMk: varchar('nama_mk', { length: 255 }).notNull(),
  sks: integer('sks').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const kurikulumPerubahan = pgTable('kurikulum_perubahan', {
  idPerubahan: serial('id_perubahan').primaryKey(),
  prodi: varchar('prodi', { length: 20 }).notNull(),
  aspekPerubahan: varchar('aspek_perubahan', { length: 150 }).notNull(),
  kurikulum2024: text('kurikulum_2024'),
  kurikulum2025: text('kurikulum_2025'),
  catatanDampak: text('catatan_dampak'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const logNotifikasiPerubahan = pgTable(
  'log_notifikasi_perubahan',
  {
    idLog: serial('id_log').primaryKey(),
    tanggalKuliah: varchar('tanggal_kuliah', { length: 50 }).notNull(),
    hariKuliah: varchar('hari_kuliah', { length: 30 }),
    jam: varchar('jam', { length: 30 }).notNull(),
    ruangan: varchar('ruangan', { length: 100 }),
    kampus: varchar('kampus', { length: 100 }),
    namaMk: varchar('nama_mk', { length: 255 }).notNull(),
    kelas: varchar('kelas', { length: 50 }).notNull(),
    dosen: varchar('dosen', { length: 255 }),
    statusLama: varchar('status_lama', { length: 50 }).notNull(),
    statusBaru: varchar('status_baru', { length: 50 }).notNull(),
    tipePerubahan: varchar('tipe_perubahan', { length: 50 }).notNull(), // 'ONLINE' | 'CANCEL'
    statusKirim: varchar('status_kirim', { length: 50 }).default('PENDING').notNull(),
    fingerprintEvent: varchar('fingerprint_event', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    sentAt: timestamp('sent_at'),
  },
  (table) => [
    uniqueIndex('log_notifikasi_perubahan_fingerprint_idx').on(table.fingerprintEvent),
  ]
);

export type JadwalLab = typeof jadwalLab.$inferSelect;
export type NewJadwalLab = typeof jadwalLab.$inferInsert;
export type JadwalLab2025Genap = typeof jadwalLab2025Genap.$inferSelect;
export type JadwalLab2026Ganjil = typeof jadwalLab2026Ganjil.$inferSelect;

export type MataKuliah = typeof mataKuliah.$inferSelect;
export type NewMataKuliah = typeof mataKuliah.$inferInsert;

export type KurikulumMataKuliah = typeof kurikulumMataKuliah.$inferSelect;
export type NewKurikulumMataKuliah = typeof kurikulumMataKuliah.$inferInsert;
export type KurikulumPerubahan = typeof kurikulumPerubahan.$inferSelect;
export type NewKurikulumPerubahan = typeof kurikulumPerubahan.$inferInsert;
export type LogNotifikasiPerubahan = typeof logNotifikasiPerubahan.$inferSelect;
export type NewLogNotifikasiPerubahan = typeof logNotifikasiPerubahan.$inferInsert;
