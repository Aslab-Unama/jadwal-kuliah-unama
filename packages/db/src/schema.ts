import { pgTable, serial, varchar, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

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

export type JadwalLab = typeof jadwalLab.$inferSelect;
export type NewJadwalLab = typeof jadwalLab.$inferInsert;
export type JadwalLab2025Genap = typeof jadwalLab2025Genap.$inferSelect;
export type JadwalLab2026Ganjil = typeof jadwalLab2026Ganjil.$inferSelect;
