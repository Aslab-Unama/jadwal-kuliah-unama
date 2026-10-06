"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Header } from "@/components/dashboard/header";
import { AslabRoomMonitor } from "@/components/dashboard/aslab-room-monitor";

const ScheduleDetailDialog = dynamic(
  () => import("@/components/dashboard/schedule-detail-dialog").then((m) => m.ScheduleDetailDialog),
  { ssr: false }
);

const AslabAttendanceDialog = dynamic(
  () => import("@/components/dashboard/aslab-attendance-dialog").then((m) => m.AslabAttendanceDialog),
  { ssr: false }
);
import { useGlobalModalHistory } from "@/hooks/use-dialog-history";
import {
  useAslabItems,
  useJadwalStore,
} from "@/stores/use-jadwal-store";
import { onDayChange } from "@/lib/time-sync";
import { ArrowLeft, Lock, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

export default function DashboardPage() {
  const [mounted, setMounted] = React.useState(false);

  const selectedDate = useJadwalStore((s) => s.selectedDate);
  const setSelectedDate = useJadwalStore((s) => s.setSelectedDate);
  const filters = useJadwalStore((s) => s.filters);
  const setSelectedItem = useJadwalStore((s) => s.setSelectedItem);
  const isLoading = useJadwalStore((s) => s.isLoading);
  const isRefreshing = useJadwalStore((s) => s.isRefreshing);
  const error = useJadwalStore((s) => s.error);
  const isAslab = useJadwalStore((s) => s.isAslab);
  const setIsAslab = useJadwalStore((s) => s.setIsAslab);
  const fetchAllSchedules = useJadwalStore((s) => s.fetchAllSchedules);
  const syncDateToTodayIfStale = useJadwalStore((s) => s.syncDateToTodayIfStale);
  const refresh = useJadwalStore((s) => s.refresh);

  const aslabItems = useAslabItems();

  useGlobalModalHistory();

  React.useEffect(() => {
    setMounted(true);
    const loggedIn = getCookie("aslab_logged_in") === "true";
    setIsAslab(loggedIn);
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
    <div className="flex min-h-screen flex-col bg-muted/30 dark:bg-background text-foreground">
      <Header onRefresh={handleRefresh} isRefreshing={isRefreshing} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                <span>Kembali ke Portal Jadwal</span>
              </Link>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Dashboard Monitoring Aslab
            </h2>
            <p className="text-sm text-muted-foreground">
              Pemantauan status ketersediaan laboratorium dan ruangan kelas UNAMA secara terpusat.
            </p>
          </div>
        </div>

        {error && (
          <section aria-label="Pemberitahuan Kesalahan" className="border border-destructive/30 bg-destructive/10 p-4 text-destructive">
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

        {mounted && !isAslab ? (
          <section className="border border-border bg-card p-8 text-center space-y-4">
            <div className="size-12 mx-auto rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Lock className="size-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-bold text-foreground">Akses Khusus Asisten Laboratorium</h3>
              <p className="text-xs text-muted-foreground">
                Halaman ini diperuntukkan bagi Asisten Laboratorium UNAMA untuk memantau status ruangan dan melakukan absensi praktikum.
              </p>
            </div>
            <div>
              <Link href="/login">
                <Button size="sm" className="gap-1.5 text-xs">
                  <Lock className="size-3.5" />
                  <span>Login Aslab Sekarang</span>
                </Button>
              </Link>
            </div>
          </section>
        ) : (
          <AslabRoomMonitor
            items={aslabItems}
            isLoading={isLoading}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            globalKampus={filters.kampus}
            onSelectItem={(item) => setSelectedItem(item, true)}
          />
        )}
      </main>

      <ScheduleDetailDialog />
      <AslabAttendanceDialog />

      <footer className="mt-auto border-t border-border/80 bg-muted/20 py-6 text-xs text-muted-foreground">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="text-center sm:text-left">
            <p className="font-medium text-foreground">
              Dashboard Asisten Laboratorium Komputer UNAMA
            </p>
            <p className="text-[11px] mt-0.5 text-muted-foreground">
              Universitas Dinamika Bangsa &bull; Panel Monitoring &amp; Presensi Praktikum
            </p>
          </div>
          <div className="text-[11px] text-center sm:text-right text-muted-foreground">
            <p>Data tersinkronisasi otomatis dengan SIAKAD UNAMA.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
