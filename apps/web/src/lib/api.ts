import { JadwalApiResponse, JadwalFilters, JadwalItem, JadwalSummaryData, JadwalSummaryResponse } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const FALLBACK_SUMMARY: JadwalSummaryData = {
  totalJadwal: 11063,
  totalTatapMuka: 8992,
  totalOnline: 1578,
  totalCancel: 493,
  kampusList: ["Kampus Thehok", "Kampus Kobar"],
  ruanganList: [
    "Labor 1.1",
    "Labor 1.2",
    "Labor 1.3",
    "Labor 1.4",
    "Labor 1.5",
    "Labor 2.1",
    "Labor 2.2",
    "Labor 2.3",
    "Labor 3.1",
    "Labor 3.2",
    "Labor Multimedia",
  ],
};

const FALLBACK_ITEMS: JadwalItem[] = [
  {
    id: 1,
    hari: "Senin",
    tanggal: "13 April 2026",
    waktuMulai: "08:00",
    dosen: "Abdul Rahim, M.Kom",
    kodeKelas: "01PS2",
    mataKuliah: "Pemrograman Berorientasi Objek",
    kampus: "Kampus Thehok",
    ruangan: "Labor 1.5",
    status: "OnSchedule (TM)",
  },
  {
    id: 2,
    hari: "Senin",
    tanggal: "13 April 2026",
    waktuMulai: "10:00",
    dosen: "Dr. Hendrawan, S.Kom., M.S.I",
    kodeKelas: "02SI3",
    mataKuliah: "Basis Data Lanjut",
    kampus: "Kampus Thehok",
    ruangan: "Labor 2.1",
    status: "OnSchedule (TM)",
  },
  {
    id: 3,
    hari: "Senin",
    tanggal: "13 April 2026",
    waktuMulai: "13:30",
    dosen: "Novrianti, M.Kom",
    kodeKelas: "03TI1",
    mataKuliah: "Desain Antarmuka Pengguna (UI/UX)",
    kampus: "Kampus Kobar",
    ruangan: "Labor Multimedia",
    status: "OnSchedule (OL)",
  },
  {
    id: 4,
    hari: "Selasa",
    tanggal: "14 April 2026",
    waktuMulai: "08:00",
    dosen: "Rian Fadhillah, M.Kom",
    kodeKelas: "02TI4",
    mataKuliah: "Jaringan Komputer & Komunikasi Data",
    kampus: "Kampus Thehok",
    ruangan: "Labor 1.2",
    status: "OnSchedule (TM)",
  },
  {
    id: 5,
    hari: "Selasa",
    tanggal: "14 April 2026",
    waktuMulai: "10:30",
    dosen: "Fitriani, M.Kom",
    kodeKelas: "04SK1",
    mataKuliah: "Sistem Tertanam & IoT",
    kampus: "Kampus Kobar",
    ruangan: "Labor 3.1",
    status: "OnSchedule (TM)",
  },
  {
    id: 6,
    hari: "Rabu",
    tanggal: "15 April 2026",
    waktuMulai: "08:00",
    dosen: "M. Subhan, S.Kom., M.Kom",
    kodeKelas: "01TI2",
    mataKuliah: "Struktur Data & Algoritma",
    kampus: "Kampus Thehok",
    ruangan: "Labor 1.1",
    status: "OnSchedule (TM)",
  },
  {
    id: 7,
    hari: "Rabu",
    tanggal: "15 April 2026",
    waktuMulai: "13:00",
    dosen: "Wulandari, M.Kom",
    kodeKelas: "05SI2",
    mataKuliah: "Kecerdasan Buatan (Artificial Intelligence)",
    kampus: "Kampus Thehok",
    ruangan: "Labor 2.2",
    status: "Cancel",
  },
  {
    id: 8,
    hari: "Kamis",
    tanggal: "16 April 2026",
    waktuMulai: "08:00",
    dosen: "Bambang Kurniawan, M.Kom",
    kodeKelas: "03SI1",
    mataKuliah: "Pemrograman Web Modern",
    kampus: "Kampus Kobar",
    ruangan: "Labor 1.3",
    status: "OnSchedule (TM)",
  },
  {
    id: 9,
    hari: "Kamis",
    tanggal: "16 April 2026",
    waktuMulai: "10:00",
    dosen: "Siti Rahmah, M.Kom",
    kodeKelas: "02TI5",
    mataKuliah: "Analisis & Perancangan Sistem",
    kampus: "Kampus Thehok",
    ruangan: "Labor 1.4",
    status: "OnSchedule (OL)",
  },
  {
    id: 10,
    hari: "Jumat",
    tanggal: "17 April 2026",
    waktuMulai: "08:30",
    dosen: "Ir. Dedi Prasetyo, M.T",
    kodeKelas: "06SK2",
    mataKuliah: "Keamanan Sistem Jaringan Komputer",
    kampus: "Kampus Thehok",
    ruangan: "Labor 3.2",
    status: "OnSchedule (TM)",
  },
  {
    id: 11,
    hari: "Sabtu",
    tanggal: "18 April 2026",
    waktuMulai: "09:00",
    dosen: "Herlina, M.S.I",
    kodeKelas: "07TI8",
    mataKuliah: "Praktikum Rekayasa Perangkat Lunak",
    kampus: "Kampus Kobar",
    ruangan: "Labor 2.3",
    status: "OnSchedule (TM)",
  },
  {
    id: 12,
    hari: "Sabtu",
    tanggal: "18 April 2026",
    waktuMulai: "13:30",
    dosen: "Agus Pratama, M.Kom",
    kodeKelas: "04TI3",
    mataKuliah: "Cloud Computing & DevOps",
    kampus: "Kampus Thehok",
    ruangan: "Labor 1.5",
    status: "OnSchedule (OL)",
  },
];

export async function fetchJadwalSummary(tanggal?: string): Promise<JadwalSummaryResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = new URL(`${API_BASE_URL}/api/jadwal/summary`);
    if (tanggal && tanggal.trim() !== "") {
      url.searchParams.set("tanggal", tanggal.trim());
    }

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Gagal memuat ringkasan data (HTTP ${response.status})`);
    }

    const json = await response.json();
    return json;
  } catch {
    // Graceful fallback jika server API lokal belum berjalan
    return {
      success: true,
      data: FALLBACK_SUMMARY,
    };
  }
}

export async function fetchJadwalList(filters: JadwalFilters): Promise<JadwalApiResponse> {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
  const offset = (page - 1) * limit;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const params = new URLSearchParams();
    params.set("limit", limit.toString());
    params.set("offset", offset.toString());

    if (filters.hari && filters.hari !== "Semua") {
      params.set("hari", filters.hari);
    }
    if (filters.kampus && filters.kampus !== "Semua") {
      params.set("kampus", filters.kampus);
    }
    if (filters.ruangan && filters.ruangan !== "Semua") {
      params.set("ruangan", filters.ruangan);
    }
    if (filters.status && filters.status !== "Semua") {
      params.set("status", filters.status);
    }
    if (filters.search) {
      params.set("search", filters.search.trim());
    }
    if (filters.tanggal && filters.tanggal !== "Semua") {
      params.set("tanggal", filters.tanggal.trim());
    }

    const response = await fetch(`${API_BASE_URL}/api/jadwal?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Gagal memuat daftar jadwal (HTTP ${response.status})`);
    }

    const json: JadwalApiResponse = await response.json();
    return json;
  } catch (err) {
    console.warn("Menggunakan data fallback jadwal karena API tidak merespons:", err);
    // Saring data fallback sesuai filter aktif saat server API offline
    let filtered = [...FALLBACK_ITEMS];

    if (filters.tanggal && filters.tanggal !== "Semua") {
      filtered = filtered.filter((i) => i.tanggal === filters.tanggal);
    }
    if (filters.hari && filters.hari !== "Semua") {
      filtered = filtered.filter((i) => i.hari?.toLowerCase() === filters.hari?.toLowerCase());
    }
    if (filters.kampus && filters.kampus !== "Semua") {
      filtered = filtered.filter((i) => i.kampus === filters.kampus);
    }
    if (filters.ruangan && filters.ruangan !== "Semua") {
      filtered = filtered.filter((i) => i.ruangan === filters.ruangan);
    }
    if (filters.status && filters.status !== "Semua") {
      filtered = filtered.filter((i) => i.status === filters.status);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          (i.mataKuliah?.toLowerCase().includes(q) ?? false) ||
          (i.dosen?.toLowerCase().includes(q) ?? false) ||
          (i.kodeKelas?.toLowerCase().includes(q) ?? false) ||
          (i.ruangan?.toLowerCase().includes(q) ?? false)
      );
    }

    filtered.sort((a, b) => a.waktuMulai.localeCompare(b.waktuMulai));

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      success: true,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + paginated.length < total,
      },
      data: paginated,
    };
  }
}
