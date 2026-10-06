"use client";

// Helper cookie
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

import * as React from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/dashboard/header";
import { ScheduleGrid } from "@/components/dashboard/schedule-grid";
import { PaginationControls } from "@/components/dashboard/pagination-controls";

const ScheduleDetailDialog = dynamic(
  () => import("@/components/dashboard/schedule-detail-dialog").then((m) => m.ScheduleDetailDialog),
  { ssr: false }
);

const AslabAttendanceDialog = dynamic(
  () => import("@/components/dashboard/aslab-attendance-dialog").then((m) => m.AslabAttendanceDialog),
  { ssr: false }
);
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGlobalModalHistory } from "@/hooks/use-dialog-history";
import {
  useJadwalStore,
  useJadwalSummary,
  usePaginatedJadwal,
} from "@/stores/use-jadwal-store";
import { onDayChange } from "@/lib/time-sync";

export default function HomePage() {
  // Zustand Store Selectors
  const selectedDate = useJadwalStore((s) => s.selectedDate);
  const setSelectedDate = useJadwalStore((s) => s.setSelectedDate);
  const filters = useJadwalStore((s) => s.filters);
  const setFilters = useJadwalStore((s) => s.setFilters);
  const resetFilters = useJadwalStore((s) => s.resetFilters);
  const viewMode = useJadwalStore((s) => s.viewMode);
  const setViewMode = useJadwalStore((s) => s.setViewMode);
  const selectedItem = useJadwalStore((s) => s.selectedItem);
  const setSelectedItem = useJadwalStore((s) => s.setSelectedItem);
  const isLoading = useJadwalStore((s) => s.isLoading);
  const isRefreshing = useJadwalStore((s) => s.isRefreshing);
  const error = useJadwalStore((s) => s.error);
  const isAslab = useJadwalStore((s) => s.isAslab);
  const setIsAslab = useJadwalStore((s) => s.setIsAslab);
  const fetchAllSchedules = useJadwalStore((s) => s.fetchAllSchedules);
  const syncDateToTodayIfStale = useJadwalStore((s) => s.syncDateToTodayIfStale);
  const refresh = useJadwalStore((s) => s.refresh);

  // Derived in-memory state hooks (no backend roundtrips on date/filter/search/pagination)
  const summary = useJadwalSummary();
  const { items, totalFiltered, totalPages } = usePaginatedJadwal();

  // Global Mobile History Manager (Android back button & swipe back support)
  useGlobalModalHistory();

  // Inisialisasi status Aslab, cek kesegaran tanggal hari ini, dan fetch seluruh database ke state
  React.useEffect(() => {
    setIsAslab(getCookie("aslab_logged_in") === "true");
    syncDateToTodayIfStale();
    fetchAllSchedules();
  }, [fetchAllSchedules, setIsAslab, syncDateToTodayIfStale]);

  // Otomatis sinkronkan tanggal jika terjadi pergantian hari (misal lewat jam 00:00:00 WIB atau tab dibuka kembali)
  React.useEffect(() => {
    const unsubscribe = onDayChange(() => {
      syncDateToTodayIfStale();
    });
    return () => unsubscribe();
  }, [syncDateToTodayIfStale]);

  const handleRefresh = async () => {
    await refresh();
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/30 dark:bg-background text-foreground print:bg-white print:text-black print:min-h-0">
      {/* Header Bar */}
      <Header onRefresh={handleRefresh} isRefreshing={isRefreshing} />

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 space-y-6 print:max-w-none print:w-full print:p-0 print:m-0 print:space-y-4">
        {/* KOP RESMI CETAK (HANYA MUNCUL DI PRINT / PDF) */}
        <div className="hidden print:block pb-2 print-avoid-break">
          <div className="flex items-center justify-between gap-4 border-b-2 border-black pb-3">
            <div className="flex items-center gap-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/unama.png"
                alt="Logo UNAMA"
                className="h-14 w-auto object-contain shrink-0"
              />
              <div>
                <h2 className="text-sm font-black uppercase tracking-wide text-black leading-tight">
                  UNIVERSITAS DINAMIKA BANGSA (UNAMA) JAMBI
                </h2>
                <h3 className="text-xs font-bold uppercase tracking-wider text-black leading-tight">
                  PORTAL INFORMASI JADWAL PERKULIAHAN MAHASISWA
                </h3>
                <p className="text-[10px] text-neutral-800 leading-tight mt-0.5 font-medium">
                  Semester Ganjil 2026/2027 &bull; unama.ac.id
                </p>
              </div>
            </div>
            <div className="text-right text-[9px] border-l border-neutral-400 pl-3 shrink-0">
              <div className="font-mono font-bold text-black uppercase">SALINAN SISTEM</div>
              <div className="font-mono text-neutral-900 mt-0.5">
                {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
              </div>
            </div>
          </div>
          <div className="border-t border-black mt-0.5" />
        </div>

        {/* Intro Banner */}
        <section className="space-y-1 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Portal Informasi Jadwal 
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Informasi jadwal penggunaan kelas mahasiswa Universitas Dinamika Bangsa (UNAMA).
              </p>
            </div>
          </div>
        </section>

        {/* Error Alert State (Antislop R-27 Compliant) */}
        {error && (
          <section aria-label="Pemberitahuan Kesalahan" className="rounded-none border border-destructive/30 bg-destructive/10 p-4 text-destructive print:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-5 shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="h-8 gap-1 text-xs border-destructive/40 hover:bg-destructive/20"
              >
                <RefreshCw className="size-3.5" />
                <span>Coba Lagi</span>
              </Button>
            </div>
          </section>
        )}

        {/* Schedule Display (Terintegrasi dengan FilterBar, Statistik di Header, dan Pagination) */}
        <ScheduleGrid
          items={items}
          isLoading={isLoading}
          onSelectItem={(item) => setSelectedItem(item, false)}
          onResetFilters={resetFilters}
          selectedDate={selectedDate}
          filters={filters}
          onFilterChange={setFilters}
          kampusList={summary.kampusList}
          ruanganList={summary.ruanganList}
          summary={summary}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          totalFiltered={totalFiltered}
          onDateChange={setSelectedDate}
          pagination={
            !isLoading && totalFiltered > 0 ? (
              <PaginationControls
                currentPage={filters.page || 1}
                totalPages={totalPages}
                totalItems={totalFiltered}
                limit={filters.limit || 24}
                onPageChange={(page) => setFilters({ page })}
                onLimitChange={(limit) => setFilters({ limit, page: 1 })}
              />
            ) : null
          }
        />
      </main>

      {/* Modal Detail & Absensi Dialogs */}
      <ScheduleDetailDialog />
      <AslabAttendanceDialog />

      {/* Public Footer */}
      <footer className="mt-auto border-t border-border/80 bg-muted/20 py-6 text-xs text-muted-foreground print:hidden">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="text-center sm:text-left">
            <p className="font-medium text-foreground">
              Dikembangkan oleh Asisten Laboratorium Komputer UNAMA
            </p>
            <p className="text-[11px] mt-0.5 text-muted-foreground">
              Universitas Dinamika Bangsa &bull; Portal Jadwal Perkuliahan &amp; Praktikum Laboratorium
            </p>
          </div>
          <div className="text-[11px] text-center sm:text-right text-muted-foreground">
            <p>Data diperbarui secara berkala dari Sistem Informasi Akademik.</p>
            <p className="text-muted-foreground/80 mt-0.5">Semua data waktu ditampilkan dalam Waktu Indonesia Barat (WIB).</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
