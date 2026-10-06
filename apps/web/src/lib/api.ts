import { JadwalApiResponse, JadwalFilters, JadwalItem, JadwalSummaryFilters, JadwalSummaryResponse } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchJadwalSummary(
  filterOrTanggal?: string | JadwalSummaryFilters
): Promise<JadwalSummaryResponse> {
  const filters: JadwalSummaryFilters =
    typeof filterOrTanggal === "string" ? { tanggal: filterOrTanggal } : filterOrTanggal || {};

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const url = new URL(`${API_BASE_URL}/api/jadwal/summary`);
    if (filters.tanggal && filters.tanggal.trim() !== "" && filters.tanggal !== "Semua") {
      url.searchParams.set("tanggal", filters.tanggal.trim());
    }
    if (filters.kampus && filters.kampus !== "Semua") {
      url.searchParams.set("kampus", filters.kampus);
    }
    if (filters.ruangan && filters.ruangan !== "Semua") {
      url.searchParams.set("ruangan", filters.ruangan);
    }
    if (filters.search && filters.search.trim() !== "") {
      url.searchParams.set("search", filters.search.trim());
    }
    if (filters.hari && filters.hari !== "Semua") {
      url.searchParams.set("hari", filters.hari);
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
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Gagal memuat ringkasan jadwal dari server.";
    console.error("fetchJadwalSummary error:", errorMsg);
    return {
      success: false,
      data: {
        totalJadwal: 0,
        totalTatapMuka: 0,
        totalOnline: 0,
        totalCancel: 0,
        kampusList: [],
        ruanganList: [],
      },
    };
  }
}

export async function fetchJadwalList(filters: JadwalFilters): Promise<JadwalApiResponse> {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
  const offset = (page - 1) * limit;

  try {
    const controller = new AbortController();
    const timeoutMs = filters.all ? 45000 : 15000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const params = new URLSearchParams();
    if (filters.all) {
      params.set("all", "true");
    } else {
      params.set("limit", limit.toString());
      params.set("offset", offset.toString());
    }

    if (filters.fresh) {
      params.set("fresh", "true");
    }

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
      throw new Error(`Gagal memuat daftar jadwal dari server (HTTP ${response.status})`);
    }

    const json: JadwalApiResponse = await response.json();
    if (json && Array.isArray(json.data)) {
      json.data = json.data.filter((i) => i.waktuMulai && i.waktuMulai >= "08:00");
    }
    return json;
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Gagal terhubung ke server database jadwal.";
    console.error("fetchJadwalList error:", errorMsg);
    return {
      success: false,
      data: [],
      error: errorMsg,
    };
  }
}

export async function clearRedisCache(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/cache/clear`, {
      method: "POST",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    return res.ok;
  } catch (err) {
    console.warn("Gagal membersihkan cache redis:", err);
    return false;
  }
}
