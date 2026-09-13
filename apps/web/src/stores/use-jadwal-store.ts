import * as React from "react";
import { create } from "zustand";
import {
  JadwalFilters,
  JadwalItem,
  JadwalSummaryData,
  formatDateDb,
} from "@/lib/types";
import { fetchJadwalList } from "@/lib/api";

const DEFAULT_LIMIT = 24;

export interface JadwalStoreState {
  // Raw Data & Caching
  dateCache: Record<string, JadwalItem[]>;
  currentRawItems: JadwalItem[];

  // User Selections
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
  fetchScheduleForDate: (date: Date | null, force?: boolean) => Promise<void>;
  setSelectedDate: (date: Date | null) => void;
  setFilters: (newFilters: Partial<JadwalFilters>) => void;
  resetFilters: () => void;
  setViewMode: (mode: "grid" | "table") => void;
  setSelectedItem: (item: JadwalItem | null) => void;
  setIsAslab: (isAslab: boolean) => void;
  refresh: () => Promise<void>;

  // Getters / Selectors
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

function getDateKey(date: Date | null): string {
  return date ? formatDateDb(date) : "all";
}

export const useJadwalStore = create<JadwalStoreState>((set, get) => ({
  dateCache: {},
  currentRawItems: [],
  selectedDate: new Date(),
  filters: {
    ...DEFAULT_FILTERS,
    tanggal: formatDateDb(new Date()),
  },
  viewMode: "grid",
  selectedItem: null,
  isLoading: true,
  isRefreshing: false,
  error: null,
  isAslab: false,

  fetchScheduleForDate: async (date: Date | null, force = false) => {
    const dateKey = getDateKey(date);
    const { dateCache } = get();

    // Gunakan cache jika sudah ada dan tidak sedang dipaksa refresh
    if (!force && dateCache[dateKey]) {
      set({
        currentRawItems: dateCache[dateKey],
        isLoading: false,
        error: null,
      });
      return;
    }

    if (force) {
      set({ isRefreshing: true });
    } else {
      set({ isLoading: true });
    }
    set({ error: null });

    try {
      const queryTanggal = date ? formatDateDb(date) : undefined;
      const res = await fetchJadwalList({
        tanggal: queryTanggal,
        limit: 500, // Ambil seluruh jadwal hari tersebut dalam 1 request
      });

      if (res.success && res.data) {
        const fetchedItems = res.data;
        set((state) => ({
          dateCache: {
            ...state.dateCache,
            [dateKey]: fetchedItems,
          },
          currentRawItems: fetchedItems,
          isLoading: false,
          isRefreshing: false,
          error: null,
        }));
      } else {
        set({
          isLoading: false,
          isRefreshing: false,
          error: "Gagal memuat jadwal kuliah. Silakan coba kembali.",
        });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Terjadi kendala saat memuat data";
      set({
        isLoading: false,
        isRefreshing: false,
        error: message,
      });
    }
  },

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

    // Trigger fetch otomatis (akan membaca dari cache bila tanggal sudah pernah dibuka)
    get().fetchScheduleForDate(date);
  },

  setFilters: (newFilters: Partial<JadwalFilters>) => {
    set((state) => {
      // Jika filter kriteria berubah (bukan pergantian halaman pagination), reset ke halaman 1
      const isFilterCriteriaChanged =
        newFilters.search !== undefined ||
        newFilters.kampus !== undefined ||
        newFilters.ruangan !== undefined ||
        newFilters.status !== undefined ||
        newFilters.hari !== undefined;

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
    get().fetchScheduleForDate(null);
  },

  setViewMode: (viewMode: "grid" | "table") => set({ viewMode }),
  setSelectedItem: (selectedItem: JadwalItem | null) => set({ selectedItem }),
  setIsAslab: (isAslab: boolean) => set({ isAslab }),

  refresh: async () => {
    const { selectedDate } = get();
    await get().fetchScheduleForDate(selectedDate, true);
  },

  // --- Derived State & Selectors (In-Memory Processing) ---

  getFilteredItems: () => {
    const { currentRawItems, filters } = get();
    let filtered = [...currentRawItems];

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

    // Filter Hari (jika mode semua tanggal)
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

    // Sorting berdasarkan waktu mulai & ID
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
    const { currentRawItems, filters } = get();

    // Ekstrak list unik kampus dan ruangan dari raw items hari aktif
    const campusSet = new Set<string>();
    const roomSet = new Set<string>();

    for (const item of currentRawItems) {
      if (item.kampus) campusSet.add(item.kampus);
      if (item.ruangan) roomSet.add(item.ruangan);
    }

    // Terapkan filter tanggal, kampus, ruangan, & search untuk menghitung statistik status
    // Catatan: filter status sengaja dikecualikan agar breakdown TM/OL/Cancel tetap lengkap
    let summaryItems = [...currentRawItems];

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
}));

/**
 * Hook reaktif untuk mendapatkan ringkasan statistik yang otomatis terhitung
 * saat filters atau raw data hari aktif berubah di Zustand.
 */
export function useJadwalSummary() {
  const currentRawItems = useJadwalStore((s) => s.currentRawItems);
  const filters = useJadwalStore((s) => s.filters);
  const getSummary = useJadwalStore((s) => s.getSummary);
  return React.useMemo(() => getSummary(), [currentRawItems, filters, getSummary]);
}

/**
 * Hook reaktif untuk mendapatkan daftar jadwal ter-filter dan ter-paginasi
 * secara instan dari memory tanpa request backend.
 */
export function usePaginatedJadwal() {
  const currentRawItems = useJadwalStore((s) => s.currentRawItems);
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
    [currentRawItems, filters, getPaginatedItems, getTotalFiltered, getTotalPages]
  );
}

