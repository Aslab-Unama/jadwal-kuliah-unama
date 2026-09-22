import * as React from "react";
import { create } from "zustand";
import {
  JadwalFilters,
  JadwalItem,
  JadwalSummaryData,
  formatDateDb,
  getTodayWib,
} from "@/lib/types";
import { fetchJadwalList } from "@/lib/api";

const DEFAULT_LIMIT = 24;

export interface JadwalStoreState {
  // Seluruh database jadwal disimpan langsung di state memori
  allSchedules: JadwalItem[];

  // Pilihan & Filter Aktif
  selectedDate: Date | null;
  filters: JadwalFilters;
  viewMode: "grid" | "table";
  selectedItem: JadwalItem | null;

  // Status
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  isAslab: boolean;

  // Actions
  fetchAllSchedules: (force?: boolean) => Promise<void>;
  setSelectedDate: (date: Date | null) => void;
  setFilters: (newFilters: Partial<JadwalFilters>) => void;
  resetFilters: () => void;
  setViewMode: (mode: "grid" | "table") => void;
  setSelectedItem: (item: JadwalItem | null) => void;
  setIsAslab: (isAslab: boolean) => void;
  refresh: () => Promise<void>;

  // Getters / Selectors
  getCurrentDateRawItems: () => JadwalItem[];
  getAslabItems: () => JadwalItem[];
  getFilteredItems: () => JadwalItem[];
  getPaginatedItems: () => JadwalItem[];
  getSummary: () => JadwalSummaryData;
  getTotalFiltered: () => number;
  getTotalPages: () => number;
}

const DEFAULT_FILTERS: JadwalFilters = {
  search: "",
  hari: "Semua",
  kampus: "Semua",
  ruangan: "Semua",
  status: "Semua",
  page: 1,
  limit: DEFAULT_LIMIT,
};

export const useJadwalStore = create<JadwalStoreState>((set, get) => {
  const initialDate = getTodayWib();
  return {
    allSchedules: [],
    selectedDate: initialDate,
    filters: {
      ...DEFAULT_FILTERS,
      tanggal: formatDateDb(initialDate),
    },
  viewMode: "grid",
  selectedItem: null,
  isLoading: true,
  isRefreshing: false,
  error: null,
  isAslab: false,

  /**
   * Mengambil SELURUH data database jadwal sekaligus (1x request di awal).
   * Seluruh filter tanggal, kampus, ruangan, search, dll. diproses 100% di memori browser.
   */
  fetchAllSchedules: async (force = false) => {
    const { allSchedules } = get();

    // Jika sudah ada data dan bukan force refresh, gunakan state yang ada (0 network request)
    if (!force && allSchedules.length > 0) {
      set({ isLoading: false, error: null });
      return;
    }

    if (force) {
      set({ isRefreshing: true });
    } else {
      set({ isLoading: true });
    }
    set({ error: null });

    try {
      // Panggil backend dengan all: true (tanpa batasan limit pagination)
      const res = await fetchJadwalList({ all: true });

      if (res.success && res.data) {
        set({
          allSchedules: res.data,
          isLoading: false,
          isRefreshing: false,
          error: null,
        });
      } else {
        set({
          isLoading: false,
          isRefreshing: false,
          error: "Gagal memuat jadwal kuliah. Silakan coba kembali.",
        });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Terjadi kendala saat memuat data database";
      set({
        isLoading: false,
        isRefreshing: false,
        error: message,
      });
    }
  },

  /**
   * Memilih tanggal tertentu di kalender.
   * Langsung memfilter dari allSchedules tanpa request jaringan sama sekali!
   */
  setSelectedDate: (date: Date | null) => {
    const formattedTanggal = date ? formatDateDb(date) : undefined;
    set((state) => ({
      selectedDate: date,
      filters: {
        ...state.filters,
        tanggal: formattedTanggal,
        page: 1, // Reset ke halaman pertama saat ganti tanggal
      },
    }));
  },

  setFilters: (newFilters: Partial<JadwalFilters>) => {
    set((state) => {
      // Jika kriteria pencarian berubah (bukan pergantian halaman), reset ke page 1
      const isFilterCriteriaChanged =
        newFilters.search !== undefined ||
        newFilters.kampus !== undefined ||
        newFilters.ruangan !== undefined ||
        newFilters.status !== undefined ||
        newFilters.hari !== undefined ||
        newFilters.tanggal !== undefined;

      const nextPage =
        newFilters.page !== undefined
          ? newFilters.page
          : isFilterCriteriaChanged
          ? 1
          : state.filters.page;

      return {
        filters: {
          ...state.filters,
          ...newFilters,
          page: nextPage,
        },
      };
    });
  },

  resetFilters: () => {
    set({
      selectedDate: null,
      filters: {
        ...DEFAULT_FILTERS,
        tanggal: undefined,
      },
    });
  },

  setViewMode: (viewMode: "grid" | "table") => set({ viewMode }),
  setSelectedItem: (selectedItem: JadwalItem | null) => set({ selectedItem }),
  setIsAslab: (isAslab: boolean) => set({ isAslab }),

  /**
   * Tombol "Perbarui" / Muat Ulang:
   * Menarik ulang (re-pull) seluruh isi database dari server backend ke state.
   */
  refresh: async () => {
    await get().fetchAllSchedules(true);
  },

  // --- In-Memory Selectors ---

  /**
   * Mengambil item jadwal mentah untuk tanggal yang sedang dipilih (atau semua jadwal jika tanggal null)
   */
  getCurrentDateRawItems: () => {
    const { allSchedules, filters } = get();
    if (!filters.tanggal || filters.tanggal === "Semua") {
      return allSchedules;
    }
    return allSchedules.filter((i) => i.tanggal === filters.tanggal);
  },

  /**
   * Mengambil item jadwal khusus untuk Panel Aslab yang DIJAMIN selalu terisolasi pada 1 tanggal spesifik.
   * Mencegah pemrosesan jeda kosong melintasi ribuan jadwal berbeda hari yang menyebabkan lagging.
   */
  getAslabItems: () => {
    const { allSchedules, selectedDate, filters } = get();
    const targetTanggal = filters.tanggal || (selectedDate ? formatDateDb(selectedDate) : undefined);

    if (targetTanggal && targetTanggal !== "Semua") {
      return allSchedules.filter((i) => i.tanggal === targetTanggal);
    }

    // Jika user memilih "Semua" tanggal, kembalikan seluruh jadwal (didukung pagination agar tetap lancar)
    return allSchedules;
  },

  /**
   * Menerapkan filter (kampus, ruangan, status, hari, search query) pada item tanggal aktif
   */
  getFilteredItems: () => {
    const { getCurrentDateRawItems, filters } = get();
    let filtered = getCurrentDateRawItems();

    // Filter Kampus
    if (filters.kampus && filters.kampus !== "Semua") {
      filtered = filtered.filter((i) => i.kampus === filters.kampus);
    }

    // Filter Ruangan
    if (filters.ruangan && filters.ruangan !== "Semua") {
      filtered = filtered.filter((i) => i.ruangan === filters.ruangan);
    }

    // Filter Status
    if (filters.status && filters.status !== "Semua") {
      filtered = filtered.filter((i) => i.status === filters.status);
    }

    // Filter Hari (jika mode tanggal kosong / filter hari aktif)
    if (filters.hari && filters.hari !== "Semua") {
      filtered = filtered.filter(
        (i) => i.hari?.toLowerCase() === filters.hari?.toLowerCase()
      );
    }

    // Search Query (Mata kuliah, Dosen, Kode Kelas, Ruangan)
    if (filters.search && filters.search.trim() !== "") {
      const q = filters.search.trim().toLowerCase();
      filtered = filtered.filter(
        (i) =>
          (i.mataKuliah?.toLowerCase().includes(q) ?? false) ||
          (i.dosen?.toLowerCase().includes(q) ?? false) ||
          (i.kodeKelas?.toLowerCase().includes(q) ?? false) ||
          (i.ruangan?.toLowerCase().includes(q) ?? false)
      );
    }

    // Urutkan berdasarkan waktu mulai, lalu ID
    return filtered.sort((a, b) => {
      const timeCompare = (a.waktuMulai || "").localeCompare(b.waktuMulai || "");
      if (timeCompare !== 0) return timeCompare;
      return a.id - b.id;
    });
  },

  getPaginatedItems: () => {
    const { filters, getFilteredItems } = get();
    const filtered = getFilteredItems();
    const limit = filters.limit || DEFAULT_LIMIT;
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const offset = (page - 1) * limit;
    return filtered.slice(offset, offset + limit);
  },

  getTotalFiltered: () => {
    return get().getFilteredItems().length;
  },

  getTotalPages: () => {
    const { filters, getTotalFiltered } = get();
    const limit = filters.limit || DEFAULT_LIMIT;
    return Math.max(1, Math.ceil(getTotalFiltered() / limit));
  },

  getSummary: () => {
    const { allSchedules, getCurrentDateRawItems, filters } = get();
    const dateItems = getCurrentDateRawItems();

    // Daftar kampus & ruangan diambil dari seluruh database agar dropdown filter selalu lengkap
    const campusSet = new Set<string>();
    const roomSet = new Set<string>();

    for (const item of allSchedules) {
      if (item.kampus) campusSet.add(item.kampus);
      if (item.ruangan) roomSet.add(item.ruangan);
    }

    // Hitung ringkasan statistik (Tatap Muka, Online, Cancel) untuk data tanggal aktif
    // (dengan filter kampus, ruangan, & search query diterapkan, kecuali filter status)
    let summaryItems = dateItems;

    if (filters.kampus && filters.kampus !== "Semua") {
      summaryItems = summaryItems.filter((i) => i.kampus === filters.kampus);
    }
    if (filters.ruangan && filters.ruangan !== "Semua") {
      summaryItems = summaryItems.filter((i) => i.ruangan === filters.ruangan);
    }
    if (filters.search && filters.search.trim() !== "") {
      const q = filters.search.trim().toLowerCase();
      summaryItems = summaryItems.filter(
        (i) =>
          (i.mataKuliah?.toLowerCase().includes(q) ?? false) ||
          (i.dosen?.toLowerCase().includes(q) ?? false) ||
          (i.kodeKelas?.toLowerCase().includes(q) ?? false) ||
          (i.ruangan?.toLowerCase().includes(q) ?? false)
      );
    }

    let totalTatapMuka = 0;
    let totalOnline = 0;
    let totalCancel = 0;

    for (const item of summaryItems) {
      const s = item.status?.toLowerCase() || "";
      if (s.includes("tm") || s.includes("tatap muka")) {
        totalTatapMuka++;
      } else if (s.includes("ol") || s.includes("online")) {
        totalOnline++;
      } else if (s.includes("cancel") || s.includes("batal")) {
        totalCancel++;
      }
    }

    const kampusList =
      campusSet.size > 0
        ? Array.from(campusSet).sort()
        : ["Kampus Thehok", "Kampus Kobar"];

    const ruanganList =
      roomSet.size > 0
        ? Array.from(roomSet).sort()
        : [];

    return {
      totalJadwal: summaryItems.length,
      totalTatapMuka,
      totalOnline,
      totalCancel,
      kampusList,
      ruanganList,
    };
  },
};
});

/**
 * Hook reaktif untuk mendapatkan item jadwal mentah tanggal aktif (untuk Aslab monitor)
 */
export function useCurrentDateRawItems() {
  const allSchedules = useJadwalStore((s) => s.allSchedules);
  const filters = useJadwalStore((s) => s.filters);
  const getCurrentDateRawItems = useJadwalStore((s) => s.getCurrentDateRawItems);
  return React.useMemo(() => getCurrentDateRawItems(), [allSchedules, filters, getCurrentDateRawItems]);
}

/**
 * Hook khusus untuk Aslab Room Monitor: Menjamin jadwal yang diproses HANYA untuk 1 hari kerja aktif
 */
export function useAslabItems() {
  const allSchedules = useJadwalStore((s) => s.allSchedules);
  const selectedDate = useJadwalStore((s) => s.selectedDate);
  const filtersTanggal = useJadwalStore((s) => s.filters.tanggal);
  const getAslabItems = useJadwalStore((s) => s.getAslabItems);
  return React.useMemo(() => getAslabItems(), [allSchedules, selectedDate, filtersTanggal, getAslabItems]);
}

/**
 * Hook reaktif untuk mendapatkan ringkasan statistik dari seluruh / tanggal aktif
 */
export function useJadwalSummary() {
  const allSchedules = useJadwalStore((s) => s.allSchedules);
  const filters = useJadwalStore((s) => s.filters);
  const getSummary = useJadwalStore((s) => s.getSummary);
  return React.useMemo(() => getSummary(), [allSchedules, filters, getSummary]);
}

/**
 * Hook reaktif untuk mendapatkan daftar jadwal ter-filter dan ter-paginasi
 */
export function usePaginatedJadwal() {
  const allSchedules = useJadwalStore((s) => s.allSchedules);
  const filters = useJadwalStore((s) => s.filters);
  const getPaginatedItems = useJadwalStore((s) => s.getPaginatedItems);
  const getTotalFiltered = useJadwalStore((s) => s.getTotalFiltered);
  const getTotalPages = useJadwalStore((s) => s.getTotalPages);

  return React.useMemo(
    () => ({
      items: getPaginatedItems(),
      totalFiltered: getTotalFiltered(),
      totalPages: getTotalPages(),
    }),
    [allSchedules, filters, getPaginatedItems, getTotalFiltered, getTotalPages]
  );
}
