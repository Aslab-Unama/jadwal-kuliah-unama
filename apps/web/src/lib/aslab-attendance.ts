import { JadwalItem, formatDosenName } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface AsistenLabItem {
  id: number;
  nama: string;
  nim?: string | null;
  kampus: string;
  ruangan: string;
  nomorLab?: string | null;
  peran: string;
  kontak?: string | null;
  isActive: boolean;
}

export interface AbsensiRecord {
  id: number;
  jadwalId?: number | null;
  tanggal: string;
  tanggalIso?: string | null;
  jamMasuk: string;
  waktuMulai: string;
  waktuSelesai?: string | null;
  ruangan: string;
  kampus: string;
  nomorLab?: string | null;
  kodeKelas: string;
  mataKuliah: string;
  dosen: string;
  statusPerkuliahan: string;
  namaAsisten: string;
  statusGform: string;
  fingerprint: string;
  createdAt: string;
}

export interface AbsenPayload {
  jadwalId?: number;
  tanggal: string;
  tanggalIso?: string;
  jamMasuk: string;
  waktuMulai: string;
  waktuSelesai?: string;
  ruangan: string;
  kampus: string;
  nomorLab?: string;
  kodeKelas: string;
  mataKuliah: string;
  dosen: string;
  statusPerkuliahan: string;
  namaAsisten: string;
}

export function generateAttendanceFingerprint(
  tanggal: string,
  kodeKelas: string,
  ruangan: string,
  waktuMulai: string
): string {
  return `${tanggal.trim()}_${kodeKelas.trim()}_${ruangan.trim()}_${waktuMulai.trim()}`;
}

export function convertIndoDateToIso(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().slice(0, 10);
  const months: Record<string, string> = {
    januari: "01", februari: "02", maret: "03", april: "04",
    mei: "05", juni: "06", juli: "07", agustus: "08",
    september: "09", oktober: "10", november: "11", desember: "12"
  };
  const parts = dateStr.trim().split(" ");
  if (parts.length === 3) {
    const day = parts[0].padStart(2, "0");
    const month = months[parts[1].toLowerCase()] || "01";
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return dateStr;
}

export function formatNomorLab(ruangan: string, kampus: string): string {
  const labMatch = ruangan.match(/(\d+\.\d+)/);
  const num = labMatch ? labMatch[1] : "";
  const isKobar = kampus.toLowerCase().includes("kobar");
  const isThehok = kampus.toLowerCase().includes("thehok");
  if (num && isKobar) return `${num} Kobar`;
  if (num && isThehok) return `${num} Thehok`;
  if (ruangan.toLowerCase().includes("cisco")) return "4.3 Thehok";
  if (ruangan.toLowerCase().includes("pasca") || ruangan.toLowerCase().includes("s2")) return "Lab S2";
  return ruangan;
}

export function formatJamMasuk(waktuMulai: string): string {
  if (!waktuMulai) return "08.00 WIB";
  const clean = waktuMulai.trim().replace(":", ".");
  return clean.endsWith("WIB") ? clean : `${clean} WIB`;
}

export function formatStatusPerkuliahan(status?: string): "Tatap Muka" | "Online" | "Cancel" {
  if (!status) return "Tatap Muka";
  const s = status.toLowerCase();
  if (s.includes("cancel") || s.includes("batal") || s.includes("(cl)")) return "Cancel";
  if (s.includes("online") || s.includes("daring") || s.includes("(ol)")) return "Online";
  return "Tatap Muka";
}

/**
 * Buat link Google Form pre-filled dengan seluruh data kelas otomatis
 */
export function getGoogleFormPrefillUrl(payload: AbsenPayload): string {
  const tanggalIso = payload.tanggalIso || convertIndoDateToIso(payload.tanggal);
  const nomorLab = payload.nomorLab || formatNomorLab(payload.ruangan, payload.kampus);
  const jamMasuk = payload.jamMasuk || formatJamMasuk(payload.waktuMulai);

  const baseUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdSoyuDSrcccQN4brn_dAt3O_aoWeGVf5Qe9Z6miy6JhqBf6A/viewform?usp=pp_url";
  const params = new URLSearchParams({
    "entry.146029558": payload.dosen,
    "entry.404112387": payload.mataKuliah,
    "entry.380055525": payload.kodeKelas,
    "entry.1558064062": payload.statusPerkuliahan,
    "entry.1210016936": tanggalIso,
    "entry.1292956818": jamMasuk,
    "entry.1658465425": payload.namaAsisten,
    "entry.1487398951": nomorLab,
  });

  return `${baseUrl}&${params.toString()}`;
}

/**
 * Ambil daftar asisten lab dari database
 */
export async function fetchAsistenList(): Promise<AsistenLabItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/aslab/asisten`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.success && Array.isArray(json.data) ? json.data : [];
  } catch (err) {
    console.error("Gagal mengambil data asisten:", err);
    return [];
  }
}

/**
 * Ambil catatan absensi untuk tanggal tertentu (mencegah duplikasi absen)
 */
export async function fetchAbsensiList(tanggal?: string): Promise<AbsensiRecord[]> {
  try {
    const query = tanggal ? `?tanggal=${encodeURIComponent(tanggal)}` : "";
    const res = await fetch(`${API_BASE_URL}/api/aslab/absensi${query}`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.success && Array.isArray(json.data) ? json.data : [];
  } catch (err) {
    console.error("Gagal mengambil data absensi:", err);
    return [];
  }
}

/**
 * Kirim absensi otomatis ke API -> Google Form + Simpan ke PostgreSQL
 */
export async function submitAbsensi(payload: AbsenPayload): Promise<{
  success: boolean;
  alreadySubmitted?: boolean;
  message: string;
  data?: any;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/aslab/absen`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    return json;
  } catch (err) {
    console.error("Gagal mengirim absensi:", err);
    return {
      success: false,
      message: "Gagal terhubung ke server untuk mengirim absensi.",
    };
  }
}
