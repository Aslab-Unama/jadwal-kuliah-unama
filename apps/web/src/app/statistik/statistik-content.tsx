"use client";

import * as React from "react";
import { Header } from "@/components/dashboard/header";
import { AcademicAnalyticsView } from "@/components/analytics/academic-analytics-view";
import { useJadwalStore } from "@/stores/use-jadwal-store";

export function StatistikPageContent() {
  const isRefreshing = useJadwalStore((s) => s.isRefreshing);
  const refresh = useJadwalStore((s) => s.refresh);

  return (
    <div className="flex min-h-screen flex-col bg-muted/30 dark:bg-background text-foreground print:bg-white print:text-black print:min-h-0">
      <Header onRefresh={refresh} isRefreshing={isRefreshing} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 space-y-6 print:max-w-none print:w-full print:p-0 print:m-0 print:space-y-4">
        <AcademicAnalyticsView />
      </main>

      <footer className="mt-auto border-t border-border/80 bg-muted/20 py-6 text-xs text-muted-foreground print:hidden">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="text-center sm:text-left">
            <p className="font-medium text-foreground">
              Pusat Statistik &amp; Analitik Akademik UNAMA
            </p>
            <p className="text-[11px] mt-0.5 text-muted-foreground">
              Universitas Dinamika Bangsa &bull; Data Terpadu Semester Ganjil 2026/2027
            </p>
          </div>
          <div className="text-[11px] text-center sm:text-right text-muted-foreground">
            <p>Data analitik disinkronkan langsung dari SIAKAD UNAMA.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
