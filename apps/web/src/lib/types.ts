import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export interface JadwalItem {
  id: number;
  hari: string;
  tanggal: string;
  waktuMulai: string;
  dosen: string;
  kodeKelas: string;
  mataKuliah: string;
  kampus: string;
  ruangan: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface JadwalApiResponse {
  success: boolean;
  pagination: PaginationMeta;
  data: JadwalItem[];
}

export interface JadwalSummaryData {
  totalJadwal: number;
  totalTatapMuka?: number;
  totalOnline?: number;
  totalCancel?: number;
  kampusList: string[];
  ruanganList: string[];
  ruangLaborList?: string[];
}

export interface JadwalSummaryResponse {
  success: boolean;
  data: JadwalSummaryData;
}

export interface JadwalSummaryFilters {
  search?: string;
  hari?: string;
  tanggal?: string;
  kampus?: string;
  ruangan?: string;
}

export interface JadwalFilters {
  all?: boolean;
  search?: string;
  hari?: string;
  tanggal?: string;
  kampus?: string;
  ruangan?: string;
  status?: string;
  page?: number;
  limit?: number;
}

import { getGlobalNow } from "./time-sync";

export function getTodayWib(): Date {
  const now = getGlobalNow();
  const wibDateStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const [year, month, day] = wibDateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateDb(date: Date): string {
  return format(date, "dd MMMM yyyy", { locale: localeId });
}

export function formatDisplayDate(date: Date): string {
  return format(date, "EEEE, dd MMMM yyyy", { locale: localeId });
}

export function formatDosenName(raw: string): string {
  if (!raw) return "-";
  return raw
    .replace(/([a-z])([A-Z])/g, "$1 / $2")
    .replace(/(\.)([A-Z])/g, "$1 / $2")
    .trim();
}

/**
 * Memformat nama dosen khusus tampilan tabel:
 * Jika nama dosen memiliki 4 kata atau lebih, kata ke-4 dan seterusnya
 * diletakkan di baris bawah agar kolom tabel tidak melebar dan tabel tidak scroll horizontal.
 */
export function formatDosenTableLines(raw: string): string[][] {
  const formatted = formatDosenName(raw);
  if (!formatted || formatted === "-") return [["-"]];

  const lecturers = formatted.split(" / ");
  return lecturers.map((lecturer) => {
    const words = lecturer.trim().split(/\s+/);
    if (words.length >= 4) {
      return [words.slice(0, 3).join(" "), words.slice(3).join(" ")];
    }
    return [lecturer];
  });
}

const INDO_MONTHS: Record<string, number> = {
  januari: 0,
  februari: 1,
  maret: 2,
  april: 3,
  mei: 4,
  juni: 5,
  juli: 6,
  agustus: 7,
  september: 8,
  oktober: 9,
  november: 10,
  desember: 11,
};

export function parseDateFromDb(str: string): Date | null {
  if (!str) return null;
  const parts = str.trim().split(" ");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const monthName = parts[1].toLowerCase();
  const year = parseInt(parts[2], 10);
  const month = INDO_MONTHS[monthName];
  if (isNaN(day) || month === undefined || isNaN(year)) return null;
  return new Date(year, month, day);
}
