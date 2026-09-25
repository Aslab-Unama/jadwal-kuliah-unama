"use client";

// Helper cookie
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

import * as React from "react";
import { Header } from "@/components/dashboard/header";
import { ScheduleGrid } from "@/components/dashboard/schedule-grid";
import { ScheduleDetailDialog } from "@/components/dashboard/schedule-detail-dialog";
import { PaginationControls } from "@/components/dashboard/pagination-controls";
import { AslabRoomMonitor } from "@/components/dashboard/aslab-room-monitor";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useAslabItems,
  useJadwalStore,
  useJadwalSummary,
  usePaginatedJadwal,
} from "@/stores/use-jadwal-store";

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
  const refresh = useJadwalStore((s) => s.refresh);

  // Derived in-memory state hooks (no backend roundtrips on date/filter/search/pagination)
  const aslabItems = useAslabItems();
  const summary = useJadwalSummary();
  const { items, totalFiltered, totalPages } = usePaginatedJadwal();

  // Inisialisasi status Aslab dan fetch seluruh database ke state sekali di awal
  React.useEffect(() => {
    setIsAslab(getCookie("aslab_logged_in") === "true");
    fetchAllSchedules();
  }, [fetchAllSchedules, setIsAslab]);

  const handleRefresh = async () => {
    await refresh();
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/30 dark:bg-background text-foreground">
      {/* Header Bar */}
      <Header onRefresh={handleRefresh} isRefreshing={isRefreshing} />

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Intro Banner */}
        <section className="space-y-1">
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

        {/* Panel Monitoring Khusus Aslab (Di atas Jadwal Mahasiswa) */}
        {isAslab && (
          <AslabRoomMonitor
            items={aslabItems}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            globalKampus={filters.kampus}
            onSelectItem={setSelectedItem}
          />
        )}

        {/* Error Alert State (Antislop R-27 Compliant) */}
        {error && (
          <section aria-label="Pemberitahuan Kesalahan" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
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
          onSelectItem={setSelectedItem}
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

      {/* Modal Detail Dialog */}
      <ScheduleDetailDialog item={selectedItem} onClose={() => setSelectedItem(null)} />

      {/* Public Footer */}
      <footer className="mt-auto border-t border-border/80 bg-muted/20 py-6 text-xs text-muted-foreground">
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
