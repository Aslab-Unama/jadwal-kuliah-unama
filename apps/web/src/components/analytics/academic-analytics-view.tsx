"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  Monitor,
  Moon,
  PieChart as PieChartIcon,
  Printer,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sun,
  Table as TableIcon,
  Trophy,
  User,
  UserCheck,
  Users,
  BarChart3,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AcademicAnalyticsSummary,
  AnalyticsPeriodScope,
  RoomUtilizationStat,
  computeAcademicAnalytics,
} from "@/lib/analytics-utils";
import { useJadwalStore } from "@/stores/use-jadwal-store";

export function AcademicAnalyticsView() {
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Global store
  const allSchedules = useJadwalStore((s) => s.allSchedules);
  const isLoading = useJadwalStore((s) => s.isLoading);
  const isRefreshing = useJadwalStore((s) => s.isRefreshing);
  const error = useJadwalStore((s) => s.error);
  const fetchAllSchedules = useJadwalStore((s) => s.fetchAllSchedules);
  const refresh = useJadwalStore((s) => s.refresh);

  // Tab, Scope & View Controls
  const [periodScope, setPeriodScope] = React.useState<AnalyticsPeriodScope>("realisasi");
  const [activeTab, setActiveTab] = React.useState<"ruangan" | "waktu" | "dosen">("ruangan");
  const [viewMode, setViewMode] = React.useState<"tabel" | "balok" | "donut" | "kartu">("tabel");
  const [roomTypeFilter, setRoomTypeFilter] = React.useState<"all" | "labor" | "teori">("all");
  const [campusFilter, setCampusFilter] = React.useState<"all" | "Kampus Thehok" | "Kampus Kobar">("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Pagination for table
  const [tablePage, setTablePage] = React.useState(1);
  const PAGE_SIZE = 15;

  React.useEffect(() => {
    setMounted(true);
    if (allSchedules.length === 0) {
      fetchAllSchedules();
    }
  }, [allSchedules.length, fetchAllSchedules]);

  // Compute analytics data (Default: Realisasi tanggal lampau s/d hari ini)
  const analytics: AcademicAnalyticsSummary = React.useMemo(() => {
    return computeAcademicAnalytics(allSchedules, periodScope);
  }, [allSchedules, periodScope]);

  // Filtered room statistics
  const filteredRooms = React.useMemo(() => {
    return analytics.roomStats.filter((r) => {
      // Type filter
      if (roomTypeFilter === "labor" && !r.isLabor) return false;
      if (roomTypeFilter === "teori" && r.isLabor) return false;

      // Campus filter
      if (campusFilter !== "all" && r.kampus !== campusFilter) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.displayName.toLowerCase().includes(q) ||
          r.ruangan.toLowerCase().includes(q) ||
          r.kampus.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [analytics.roomStats, roomTypeFilter, campusFilter, searchQuery]);

  const paginatedRooms = React.useMemo(() => {
    const start = (tablePage - 1) * PAGE_SIZE;
    return filteredRooms.slice(start, start + PAGE_SIZE);
  }, [filteredRooms, tablePage]);

  const totalPages = Math.ceil(filteredRooms.length / PAGE_SIZE) || 1;

  const isDark = mounted ? (resolvedTheme || theme) === "dark" : false;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      const html = document.documentElement;
      const wasDark = html.classList.contains("dark");
      if (wasDark) {
        html.dataset.wasDark = "true";
        html.classList.remove("dark");
        html.classList.add("light");
        html.style.colorScheme = "light";
        document.body.style.backgroundColor = "#ffffff";
        document.body.style.color = "#000000";
      }

      setTimeout(() => {
        window.print();
        if (wasDark) {
          delete html.dataset.wasDark;
          html.classList.remove("light");
          html.classList.add("dark");
          html.style.colorScheme = "";
          document.body.style.backgroundColor = "";
          document.body.style.color = "";
        }
      }, 50);
    }
  };

  // Chart data for top rooms
  const topRoomsChartData = React.useMemo(() => {
    return filteredRooms.slice(0, 10).map((r) => ({
      name: r.displayName,
      jam: Math.round(r.totalJam),
      sesi: r.totalSesi,
      isLabor: r.isLabor,
    }));
  }, [filteredRooms]);

  // Campus comparison donut data
  const campusPieData = React.useMemo(() => {
    return analytics.kampusComparison.map((k) => ({
      name: k.kampus,
      value: k.totalSesi,
      pct: k.pct,
    }));
  }, [analytics.kampusComparison]);

  const PIE_COLORS = ["#2563eb", "#059669"];

  // Metadata Cetak Resmi
  const currentPrintTimestamp = React.useMemo(() => {
    const d = new Date();
    const dateStr = d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const timeStr = d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dateStr}, ${timeStr} WIB`;
  }, []);

  const currentPrintDate = React.useMemo(() => {
    return new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, []);

  return (
    <div className="space-y-6 print:space-y-4">
      {/* KOP RESMI LAPORAN AKADEMIK UNAMA (HANYA MUNCUL DI PRINT / PDF) */}
      <div className="hidden print:block pb-2 print-avoid-break">
        <div className="flex items-center justify-between gap-4 border-b-2 border-black pb-3">
          {/* Logo UNAMA & Identitas Lembaga */}
          <div className="flex items-center gap-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/unama.png"
              alt="Logo Universitas Dinamika Bangsa"
              className="h-14 w-auto object-contain shrink-0"
            />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide text-black leading-tight">
                UNIVERSITAS DINAMIKA BANGSA (UNAMA) JAMBI
              </h2>
              <h3 className="text-xs font-bold uppercase tracking-wider text-black leading-tight">
                LABORATORIUM KOMPUTER &amp; SISTEM INFORMASI AKADEMIK
              </h3>
              <p className="text-[10px] text-neutral-800 leading-tight mt-0.5 font-medium">
                Pusat Rekapitulasi &amp; Analitik Utilisasi Laboratorium
              </p>
              <p className="text-[9px] text-neutral-600 leading-tight">
                Kampus Thehok: Jl. Jend. Sudirman &bull; Kampus Kobar: Jl. Kol. Abunjani &bull; unama.ac.id
              </p>
            </div>
          </div>

          {/* Validasi Dokumen Sistem */}
          <div className="text-right text-[9px] border-l border-neutral-400 pl-3 shrink-0">
            <div className="font-mono font-bold text-black uppercase">SALINAN SISTEM</div>
            <div className="text-neutral-700 font-mono">DOKUMEN: LAP-UTILISASI-LAB</div>
            <div className="font-mono text-neutral-900 mt-0.5">
              WIB: {currentPrintTimestamp}
            </div>
            <div className="text-emerald-800 font-semibold text-[8px] uppercase mt-0.5">
              Status: Terverifikasi Sistem
            </div>
          </div>
        </div>

        {/* Garis Ganda Standar Tata Naskah */}
        <div className="border-t border-black mt-0.5" />

        {/* Judul Dokumen Laporan Rekapitulasi */}
        <div className="mt-3.5 mb-2 text-center space-y-1">
          <h1 className="text-sm font-black uppercase tracking-tight text-black">
            LAPORAN REKAPITULASI JADWAL &amp; UTILISASI LABORATORIUM
          </h1>
          <div className="flex items-center justify-center gap-2 text-[10px] text-neutral-800 font-medium">
            <span>Semester: <strong>Ganjil 2026/2027</strong></span>
            <span>&bull;</span>
            <span>
              Cakupan: <strong>{periodScope === "realisasi" ? `Realisasi s/d Hari Ini (${analytics.periodLabel})` : "Rencana 1 Semester Penuh"}</strong>
            </span>
            <span>&bull;</span>
            <span>Total Jadwal: <strong>{analytics.totalSchedules.toLocaleString("id-ID")} Kelas</strong></span>
          </div>
        </div>
      </div>

      {/* 1. Header Pusat Statistik (Desain Sinkron Web Project UNAMA) */}
      <header className="border border-border bg-card p-4 sm:p-6 shadow-xs transition-all print:hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="p-1.5 border border-primary/30 bg-primary/10 text-primary rounded-none">
                <BarChart3 className="size-4 sm:size-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Pusat Statistik &amp; Analitik Akademik
              </h1>
              <Badge variant="outline" className="text-xs font-mono font-medium rounded-none border-border bg-muted/40">
                {isLoading ? (
                  <span className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                    <span>Memuat data...</span>
                  </span>
                ) : (
                  `Ganjil 2026/2027 (${analytics.totalSchedules.toLocaleString("id-ID")} Jadwal ${periodScope === "realisasi" ? "Terlaksana" : "Total"})`
                )}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Pusat Analitik Terpadu &bull; Utilisasi Laboratorium, Sebaran Kelas &amp; Beban Dosen Pengajar
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8.5 px-3 gap-1.5 text-xs rounded-none border-border hover:bg-muted font-medium cursor-pointer"
              title="Cetak Laporan atau Ekspor PDF"
            >
              <Printer className="size-3.5" />
              <span>Cetak / PDF</span>
            </Button>

            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="h-8.5 px-3 gap-1.5 text-xs rounded-none border-border hover:bg-muted font-medium cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                <span>Portal Jadwal</span>
              </Button>
            </Link>

            <Link href="/dashboard">
              <Button
                variant="default"
                size="sm"
                className="h-8.5 px-3 gap-1.5 text-xs rounded-none bg-primary text-primary-foreground hover:bg-primary/90 font-semibold cursor-pointer"
              >
                <LayoutDashboard className="size-3.5" />
                <span>Dashboard Aslab</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Cakupan Periode Data Akademik (Default: Tanggal Lampau s/d Hari Ini) */}
      <section aria-label="Cakupan Periode Analitik" className="border border-border bg-card p-3 sm:p-4 shadow-xs rounded-none transition-all print:hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="p-1.5 border border-primary/30 bg-primary/10 text-primary shrink-0 rounded-none mt-0.5 sm:mt-0">
              <Calendar className="size-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground text-xs sm:text-sm">
                  {periodScope === "realisasi" ? "Cakupan: Realisasi s/d Hari Ini" : "Cakupan: Rencana 1 Semester Penuh"}
                </span>
                <span className="inline-flex items-center font-mono text-[10px] px-2 py-0.5 border rounded-none bg-primary/10 text-primary border-primary/30 font-semibold">
                  {periodScope === "realisasi" ? "Data Berjalan" : "Proyeksi Rencana"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {periodScope === "realisasi"
                  ? `Periode ${analytics.periodLabel} • Data perkuliahan otomatis bertambah seiring hari baru masuk.`
                  : `Menghitung seluruh ${analytics.totalSchedules.toLocaleString("id-ID")} jadwal perkuliahan hingga akhir semester.`}
              </p>
            </div>
          </div>

          {/* Toggle Scope: Realisasi s/d Hari Ini (Default) vs 1 Semester Penuh */}
          <div className="flex items-center gap-1 border border-border bg-muted/40 p-1 shrink-0 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setPeriodScope("realisasi")}
              aria-pressed={periodScope === "realisasi"}
              className={cn(
                "px-2.5 py-1 text-xs transition-colors cursor-pointer rounded-none font-medium",
                periodScope === "realisasi"
                  ? "bg-background text-foreground shadow-xs font-semibold border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              s/d Hari Ini ({analytics.totalPastAndTodaySchedules.toLocaleString("id-ID")})
            </button>
            <button
              type="button"
              onClick={() => setPeriodScope("proyeksi_semester")}
              aria-pressed={periodScope === "proyeksi_semester"}
              className={cn(
                "px-2.5 py-1 text-xs transition-colors cursor-pointer rounded-none font-medium",
                periodScope === "proyeksi_semester"
                  ? "bg-background text-foreground shadow-xs font-semibold border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              1 Semester ({ (analytics.totalPastAndTodaySchedules + analytics.totalFutureSchedules).toLocaleString("id-ID") })
            </button>
          </div>
        </div>
      </section>

      {/* Error Alert State */}
      {error && !isLoading && allSchedules.length === 0 && (
        <section aria-label="Pemberitahuan Kesalahan" className="border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refresh()}
              disabled={isRefreshing}
              className="h-8 gap-1 text-xs border-destructive/40 hover:bg-destructive/20 cursor-pointer"
            >
              <RefreshCw className={cn("size-3.5", isRefreshing ? "animate-spin" : "")} />
              <span>Coba Lagi</span>
            </Button>
          </div>
        </section>
      )}

      {/* 2. Top KPI Cards (4 Metrik Utama Sesuai Desain Project) */}
      <section aria-label="Ringkasan Metrik Akademik" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:grid-cols-4 print:gap-2.5 print-avoid-break">
        {/* KPI 1: Total Jam Operasional */}
        <div className="border border-border bg-card p-4 sm:p-5 shadow-xs rounded-none space-y-2 print:border-neutral-300 print:bg-white print:p-2.5 print:shadow-none">
          <div className="flex items-center justify-between text-muted-foreground print:text-black">
            <div className="p-1 border border-border bg-muted/30 print:hidden">
              <Clock className="size-4 text-primary" />
            </div>
            <Badge variant="outline" className="text-[10px] font-mono rounded-none print:border-neutral-400 print:text-black print:bg-white">
              {periodScope === "realisasi" ? "s/d Hari Ini" : "Satu Semester"}
            </Badge>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground print:text-base print:text-black">
              {isLoading ? <Skeleton className="h-8 w-32" /> : `${analytics.totalJamOperasional.toLocaleString("id-ID")} Jam`}
            </div>
            <div className="text-xs font-semibold text-foreground mt-0.5 print:text-[10px] print:text-neutral-800">Total Jam Operasional</div>
            {isLoading ? (
              <Skeleton className="h-3 w-44 mt-1.5" />
            ) : (
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 print:text-[8px] print:text-neutral-600">
                {periodScope === "realisasi"
                  ? "Akumulasi jam penggunaan ruangan yang terlaksana s/d hari ini"
                  : "Akumulasi jam penggunaan seluruh ruangan selama 1 semester"}
              </p>
            )}
          </div>
        </div>

        {/* KPI 2: Total Ruangan Aktif */}
        <div className="border border-border bg-card p-4 sm:p-5 shadow-xs rounded-none space-y-2 print:border-neutral-300 print:bg-white print:p-2.5 print:shadow-none">
          <div className="flex items-center justify-between text-muted-foreground print:text-black">
            <div className="p-1 border border-border bg-muted/30 print:hidden">
              <Monitor className="size-4 text-blue-600 dark:text-blue-400" />
            </div>
            <Badge variant="outline" className="text-[10px] font-mono rounded-none print:border-neutral-400 print:text-black print:bg-white">
              Kobar &amp; Thehok
            </Badge>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground print:text-base print:text-black">
              {isLoading ? <Skeleton className="h-8 w-24" /> : `${analytics.totalRuangAktif} Ruang`}
            </div>
            <div className="text-xs font-semibold text-foreground mt-0.5 print:text-[10px] print:text-neutral-800">Total Ruangan Aktif</div>
            {isLoading ? (
              <Skeleton className="h-3 w-40 mt-1.5" />
            ) : (
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 print:text-[8px] print:text-neutral-600">
                {analytics.totalLaborAktif} Labor &bull; {analytics.totalTeoriAktif} Ruang Teori
              </p>
            )}
          </div>
        </div>

        {/* KPI 3: Total Rombel / Kelas */}
        <div className="border border-border bg-card p-4 sm:p-5 shadow-xs rounded-none space-y-2 print:border-neutral-300 print:bg-white print:p-2.5 print:shadow-none">
          <div className="flex items-center justify-between text-muted-foreground print:text-black">
            <div className="p-1 border border-border bg-muted/30 print:hidden">
              <Users className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <Badge variant="outline" className="text-[10px] font-mono rounded-none print:border-neutral-400 print:text-black print:bg-white">
              Rombel Mahasiswa
            </Badge>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground print:text-base print:text-black">
              {isLoading ? <Skeleton className="h-8 w-28" /> : `${analytics.totalRombel} Rombel`}
            </div>
            <div className="text-xs font-semibold text-foreground mt-0.5 print:text-[10px] print:text-neutral-800">Total Rombel / Kelas Terjadwal</div>
            {isLoading ? (
              <Skeleton className="h-3 w-44 mt-1.5" />
            ) : (
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 print:text-[8px] print:text-neutral-600">
                Seluruh kelas mahasiswa paralel aktif
              </p>
            )}
          </div>
        </div>

        {/* KPI 4: Dosen Pengajar Aktif */}
        <div className="border border-border bg-card p-4 sm:p-5 shadow-xs rounded-none space-y-2 print:border-neutral-300 print:bg-white print:p-2.5 print:shadow-none">
          <div className="flex items-center justify-between text-muted-foreground print:text-black">
            <div className="p-1 border border-border bg-muted/30 print:hidden">
              <UserCheck className="size-4 text-purple-600 dark:text-purple-400" />
            </div>
            <Badge variant="outline" className="text-[10px] font-mono rounded-none print:border-neutral-400 print:text-black print:bg-white">
              Aktif Mengajar
            </Badge>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground print:text-base print:text-black">
              {isLoading ? <Skeleton className="h-8 w-24" /> : `${analytics.totalDosen} Dosen`}
            </div>
            <div className="text-xs font-semibold text-foreground mt-0.5 print:text-[10px] print:text-neutral-800">Dosen Pengajar Aktif</div>
            {isLoading ? (
              <Skeleton className="h-3 w-40 mt-1.5" />
            ) : (
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 print:text-[8px] print:text-neutral-600">
                Tenaga pengajar yang mengampu sesi
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 3. Tab Navigasi Utama */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-2.5 print:hidden">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Button
            variant={activeTab === "ruangan" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("ruangan")}
            className="h-8 px-3 text-xs rounded-none font-semibold cursor-pointer gap-1.5"
          >
            <Monitor className="size-3.5" />
            <span>Statistik Ruangan (Labor &amp; Kelas)</span>
          </Button>
          <Button
            variant={activeTab === "waktu" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("waktu")}
            className="h-8 px-3 text-xs rounded-none font-semibold cursor-pointer gap-1.5"
          >
            <Clock className="size-3.5" />
            <span>Statistik Kelas &amp; Waktu</span>
          </Button>
          <Button
            variant={activeTab === "dosen" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("dosen")}
            className="h-8 px-3 text-xs rounded-none font-semibold cursor-pointer gap-1.5"
          >
            <User className="size-3.5" />
            <span>Statistik Dosen Pengajar</span>
          </Button>
        </div>

        {/* View Mode Toolbar (Hanya di Tab Ruangan) */}
        {activeTab === "ruangan" && (
          <div className="flex items-center gap-1 border border-border bg-muted/40 p-0.5">
            <span className="text-[11px] font-medium text-muted-foreground px-2 hidden md:inline">Mode Tampilan:</span>
            <button
              type="button"
              onClick={() => setViewMode("tabel")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer rounded-none flex items-center gap-1",
                viewMode === "tabel" ? "bg-background text-foreground shadow-2xs font-semibold border border-border" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <TableIcon className="size-3" />
              <span>Tabel</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("balok")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer rounded-none flex items-center gap-1",
                viewMode === "balok" ? "bg-background text-foreground shadow-2xs font-semibold border border-border" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <BarChart3 className="size-3" />
              <span>Grafik Balok</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("donut")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer rounded-none flex items-center gap-1",
                viewMode === "donut" ? "bg-background text-foreground shadow-2xs font-semibold border border-border" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <PieChartIcon className="size-3" />
              <span>Diagram Donut</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("kartu")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer rounded-none flex items-center gap-1",
                viewMode === "kartu" ? "bg-background text-foreground shadow-2xs font-semibold border border-border" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="size-3" />
              <span>Kartu Metrik</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. ISI TAB 1: STATISTIK RUANGAN */}
      {activeTab === "ruangan" && (
        <div className="space-y-6">
          {/* Quick Highlights: 3 Card Elegan / Skeleton saat Loading */}
          {isLoading ? (
            <section aria-label="Memuat Sorotan Utilisasi" className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border border-border bg-card p-4 sm:p-5 shadow-xs rounded-none space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-6 w-36" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </section>
          ) : (
            <section aria-label="Sorotan Utilisasi Ruangan" className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 print:grid-cols-3 print:gap-2.5 print-avoid-break">
              {/* Lab Paling Sibuk */}
              <div className="border border-border bg-card p-4 sm:p-5 shadow-xs rounded-none space-y-2 print:border-neutral-300 print:bg-white print:p-2.5 print:shadow-none">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground print:text-[9px] print:text-neutral-700">Lab Paling Sibuk</span>
                  {analytics.labPalingSibuk && (
                    <Badge variant="outline" className="text-xs font-mono font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 rounded-none print:border-neutral-400 print:text-black print:bg-white print:text-[9px]">
                      {analytics.labPalingSibuk.utilisasiPct}% Utilisasi
                    </Badge>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-foreground print:text-sm print:text-black">
                    {analytics.labPalingSibuk?.displayName || "-"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 print:text-[9px] print:text-neutral-600">
                    {analytics.labPalingSibuk?.totalJam} Jam ({analytics.labPalingSibuk?.totalSesi} Sesi Perkuliahan)
                  </p>
                </div>
              </div>

              {/* Lab Paling Lengang */}
              <div className="border border-border bg-card p-4 sm:p-5 shadow-xs rounded-none space-y-2 print:border-neutral-300 print:bg-white print:p-2.5 print:shadow-none">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground print:text-[9px] print:text-neutral-700">Lab Paling Lengang</span>
                  {analytics.labPalingLengang && (
                    <Badge variant="outline" className="text-xs font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 rounded-none print:border-neutral-400 print:text-black print:bg-white print:text-[9px]">
                      {analytics.labPalingLengang.utilisasiPct}% Utilisasi
                    </Badge>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-foreground print:text-sm print:text-black">
                    {analytics.labPalingLengang?.displayName || "-"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 print:text-[9px] print:text-neutral-600">
                    {analytics.labPalingLengang?.totalJam} Jam ({analytics.labPalingLengang?.totalSesi} Sesi Perkuliahan)
                  </p>
                </div>
              </div>

              {/* Perbandingan Kampus */}
              <div className="border border-border bg-card p-4 sm:p-5 shadow-xs rounded-none space-y-2 print:border-neutral-300 print:bg-white print:p-2.5 print:shadow-none">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground print:text-[9px] print:text-neutral-700">Perbandingan Kampus</span>
                  <span className="text-[11px] text-muted-foreground print:text-[9px] print:text-neutral-600">Sesi Perkuliahan</span>
                </div>
                <div className="space-y-2 pt-0.5 print:space-y-1">
                  {analytics.kampusComparison.map((k) => (
                    <div key={k.kampus} className="space-y-1">
                      <div className="flex items-center justify-between text-xs print:text-[9px]">
                        <span className="font-medium text-foreground print:text-black">{k.kampus}</span>
                        <span className="font-mono font-semibold text-foreground print:text-black">
                          {k.totalSesi.toLocaleString("id-ID")} Sesi ({k.pct}%)
                        </span>
                      </div>
                      <Progress value={k.pct} className="h-1.5 rounded-none print:h-1" />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Rasio Metode Perkuliahan di Labor (Horizontal Breakdown Bar) / Skeleton saat Loading */}
          {isLoading ? (
            <section aria-label="Memuat Rasio Metode" className="border border-border bg-card p-4 sm:p-5 shadow-xs rounded-none space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-3 w-full" />
              <div className="flex gap-4 pt-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
              </div>
            </section>
          ) : (
            <section aria-label="Rasio Metode Perkuliahan di Laboratorium" className="border border-border bg-card p-4 sm:p-5 shadow-xs rounded-none space-y-3 print:border-neutral-300 print:bg-white print:p-2.5 print:shadow-none print-avoid-break">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-foreground">
                    Rasio Metode Perkuliahan di Laboratorium
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Sebaran metode Tatap Muka (TM), Online (OL), dan Dibatalkan (CC)
                  </p>
                </div>
                <Badge variant="outline" className="w-fit text-xs font-mono rounded-none border-border">
                  Total {analytics.methodRatioLabor.total.toLocaleString("id-ID")} Sesi Terjadwal
                </Badge>
              </div>

              {/* Stacked Percentage Bar */}
              <div className="w-full h-3 bg-muted rounded-none overflow-hidden flex">
                <div
                  style={{ width: `${analytics.methodRatioLabor.tatapMukaPct}%` }}
                  className="bg-emerald-600 h-full transition-all"
                  title={`Tatap Muka: ${analytics.methodRatioLabor.tatapMuka} (${analytics.methodRatioLabor.tatapMukaPct}%)`}
                />
                <div
                  style={{ width: `${analytics.methodRatioLabor.onlinePct}%` }}
                  className="bg-blue-600 h-full transition-all"
                  title={`Online: ${analytics.methodRatioLabor.online} (${analytics.methodRatioLabor.onlinePct}%)`}
                />
                <div
                  style={{ width: `${analytics.methodRatioLabor.dibatalkanPct}%` }}
                  className="bg-rose-600 h-full transition-all"
                  title={`Dibatalkan: ${analytics.methodRatioLabor.dibatalkan} (${analytics.methodRatioLabor.dibatalkanPct}%)`}
                />
              </div>

              {/* Legend & Details */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs text-muted-foreground pt-1">
                <div className="flex items-center gap-1.5 text-foreground">
                  <span className="size-2.5 rounded-full bg-emerald-600 shrink-0" />
                  <span>
                    Tatap Muka (TM): <strong>{analytics.methodRatioLabor.tatapMuka.toLocaleString("id-ID")}</strong> ({analytics.methodRatioLabor.tatapMukaPct}%)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-foreground">
                  <span className="size-2.5 rounded-full bg-blue-600 shrink-0" />
                  <span>
                    Online (OL): <strong>{analytics.methodRatioLabor.online.toLocaleString("id-ID")}</strong> ({analytics.methodRatioLabor.onlinePct}%)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-foreground">
                  <span className="size-2.5 rounded-full bg-rose-600 shrink-0" />
                  <span>
                    Dibatalkan (CC): <strong>{analytics.methodRatioLabor.dibatalkan.toLocaleString("id-ID")}</strong> ({analytics.methodRatioLabor.dibatalkanPct}%)
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* VIEW MODE ATAU SKELETON SAAT LOADING */}
          {isLoading ? (
            <section aria-label="Memuat Data Ruangan" className="border border-border bg-card shadow-xs rounded-none p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-border">
                <div className="space-y-1">
                  <Skeleton className="h-5 w-56" />
                  <Skeleton className="h-3.5 w-72" />
                </div>
                <Skeleton className="h-8 w-44" />
              </div>
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 py-2.5 border-b border-border/40 last:border-0">
                    <Skeleton className="h-5 w-14" />
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <>
              {/* VIEW: TABEL LENGKAP */}
              {viewMode === "tabel" && (
                <section aria-label="Tabel Peringkat Utilisasi Ruangan" className="border border-border bg-card shadow-xs rounded-none print:hidden">
                  {/* Header Tabel & Filter Bar */}
                  <div className="p-4 sm:p-5 border-b border-border space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                          Peringkat Utilisasi Seluruh Ruangan (Labor &amp; Ruang Kelas)
                        </h3>
                    <p className="text-xs text-muted-foreground">
                      Diurutkan berdasarkan total jam terbang penggunaan ruangan
                    </p>
                  </div>

                  {/* Filter Kategori Tipe Ruangan */}
                  <div className="inline-flex items-center border border-border bg-muted/40 p-0.5 w-fit">
                    <button
                      type="button"
                      onClick={() => {
                        setRoomTypeFilter("all");
                        setTablePage(1);
                      }}
                      className={cn(
                        "px-2.5 py-1 text-xs transition-colors cursor-pointer rounded-none",
                        roomTypeFilter === "all" ? "bg-background text-foreground font-semibold shadow-2xs border border-border" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Semua Ruangan ({analytics.roomStats.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRoomTypeFilter("labor");
                        setTablePage(1);
                      }}
                      className={cn(
                        "px-2.5 py-1 text-xs transition-colors cursor-pointer rounded-none",
                        roomTypeFilter === "labor" ? "bg-background text-foreground font-semibold shadow-2xs border border-border" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Labor ({analytics.totalLaborAktif})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRoomTypeFilter("teori");
                        setTablePage(1);
                      }}
                      className={cn(
                        "px-2.5 py-1 text-xs transition-colors cursor-pointer rounded-none",
                        roomTypeFilter === "teori" ? "bg-background text-foreground font-semibold shadow-2xs border border-border" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Ruang Kelas ({analytics.totalTeoriAktif})
                    </button>
                  </div>
                </div>

                {/* Sub Filter: Search & Kampus Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Filter Kampus:</span>
                    {["all", "Kampus Thehok", "Kampus Kobar"].map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          setCampusFilter(k as any);
                          setTablePage(1);
                        }}
                        className={cn(
                          "px-2 py-0.5 border rounded-none cursor-pointer transition-colors",
                          campusFilter === k ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {k === "all" ? "Semua" : k === "Kampus Thehok" ? "Thehok" : "Kobar"}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setTablePage(1);
                      }}
                      placeholder="Cari ruangan..."
                      className="pl-7 pr-7 h-7.5 text-xs rounded-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Hapus pencarian"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabel Konten: Responsive Overflow Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-3 sm:px-4 w-12 text-center">NO</th>
                      <th className="py-3 px-3 sm:px-4">NAMA RUANGAN</th>
                      <th className="py-3 px-3 sm:px-4">TIPE</th>
                      <th className="py-3 px-3 sm:px-4">KAMPUS</th>
                      <th className="py-3 px-3 sm:px-4 text-right">TOTAL SESI</th>
                      <th className="py-3 px-3 sm:px-4 text-right">TOTAL JAM</th>
                      <th className="py-3 px-3 sm:px-4 w-48">TINGKAT UTILISASI</th>
                      <th className="py-3 px-3 sm:px-4">RINCIAN (TM / OL / CC)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {paginatedRooms.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-muted-foreground text-xs">
                          Tidak ada ruangan yang cocok dengan kriteria pencarian.
                        </td>
                      </tr>
                    ) : (
                      paginatedRooms.map((room, idx) => {
                        const rankNumber = (tablePage - 1) * PAGE_SIZE + idx + 1;
                        return (
                          <tr
                            key={`${room.kampus}-${room.ruangan}`}
                            className="hover:bg-muted/30 transition-colors group"
                          >
                            <td className="py-3 px-3 sm:px-4 text-center font-mono font-bold text-muted-foreground">
                              {rankNumber === 1 ? (
                                <span className="inline-flex items-center justify-center gap-1 text-amber-500 font-bold">
                                  <Trophy className="size-3.5 fill-amber-500" /> 1
                                </span>
                              ) : (
                                rankNumber
                              )}
                            </td>
                            <td className="py-3 px-3 sm:px-4 font-bold text-foreground">
                              {room.displayName}
                            </td>
                            <td className="py-3 px-3 sm:px-4">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-semibold rounded-none uppercase",
                                  room.isLabor
                                    ? "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                    : "border-border bg-muted/40 text-muted-foreground"
                                )}
                              >
                                {room.isLabor ? "Labor" : "Ruang Kelas"}
                              </Badge>
                            </td>
                            <td className="py-3 px-3 sm:px-4">
                              <span className="text-muted-foreground">
                                {room.kampus === "Kampus Thehok" ? "Thehok" : "Kobar"}
                              </span>
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-right font-mono font-semibold text-foreground">
                              {room.totalSesi} Sesi
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                              {room.totalJam.toLocaleString("id-ID")} Jam
                            </td>
                            <td className="py-3 px-3 sm:px-4">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-mono">
                                  <span className="font-semibold text-foreground">{room.utilisasiPct}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-muted rounded-none overflow-hidden">
                                  <div
                                    className="h-full bg-blue-600 transition-all"
                                    style={{ width: `${room.utilisasiPct}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 sm:px-4">
                              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                                <span className="px-1.5 py-0.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold" title="Tatap Muka">
                                  {room.tatapMuka} TM
                                </span>
                                <span className="px-1.5 py-0.5 border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold" title="Online / Daring">
                                  {room.online} OL
                                </span>
                                <span className="px-1.5 py-0.5 border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold" title="Dibatalkan / Cancel">
                                  {room.dibatalkan} CC
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-3 sm:p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground print:hidden">
                  <div>
                    Menampilkan {(tablePage - 1) * PAGE_SIZE + 1} -{" "}
                    {Math.min(tablePage * PAGE_SIZE, filteredRooms.length)} dari {filteredRooms.length} ruangan
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                      disabled={tablePage === 1}
                      className="h-7 px-2.5 text-xs rounded-none cursor-pointer"
                    >
                      Sebelumnya
                    </Button>
                    <span className="px-2 font-mono font-semibold text-foreground">
                      {tablePage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                      disabled={tablePage === totalPages}
                      className="h-7 px-2.5 text-xs rounded-none cursor-pointer"
                    >
                      Selanjutnya
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* TABEL VERSI CETAK / PDF RESMI (HEMAT TINTA: LATAR PUTIH & TAMPIL LENGKAP) */}
          <section aria-label="Daftar Rekapitulasi Utilisasi Ruangan Cetak" className="hidden print:block space-y-2 mt-2">
            <div className="flex items-center justify-between border-b border-black pb-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                Daftar Peringkat Utilisasi Seluruh Ruangan (Laboratorium &amp; Ruang Teori)
              </h3>
              <span className="text-[9px] font-mono font-medium text-neutral-800">
                Total {filteredRooms.length} Ruangan Terdaftar
              </span>
            </div>

            <table className="w-full text-left text-[9px] border-collapse border border-neutral-400 bg-white">
              <thead>
                <tr className="bg-neutral-100 text-black border-b border-neutral-400 font-bold uppercase tracking-tight">
                  <th className="py-1 px-1.5 w-7 text-center border-r border-neutral-400 bg-neutral-100 text-black">NO</th>
                  <th className="py-1 px-2 border-r border-neutral-400 bg-neutral-100 text-black">NAMA RUANGAN</th>
                  <th className="py-1 px-1.5 w-16 text-center border-r border-neutral-400 bg-neutral-100 text-black">TIPE</th>
                  <th className="py-1 px-2 w-20 border-r border-neutral-400 bg-neutral-100 text-black">KAMPUS</th>
                  <th className="py-1 px-2 w-16 text-right border-r border-neutral-400 bg-neutral-100 text-black">SESI</th>
                  <th className="py-1 px-2 w-20 text-right border-r border-neutral-400 bg-neutral-100 text-black">TOTAL JAM</th>
                  <th className="py-1 px-2 w-16 text-center border-r border-neutral-400 bg-neutral-100 text-black">UTILISASI</th>
                  <th className="py-1 px-2 text-center bg-neutral-100 text-black">RINCIAN (TM / OL / CC)</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((room, idx) => (
                  <tr
                    key={`print-${room.kampus}-${room.ruangan}`}
                    className="border-b border-neutral-300 print-avoid-break bg-white"
                  >
                    <td className="py-1 px-1.5 text-center font-mono font-bold text-neutral-700 border-r border-neutral-300 bg-white">
                      {idx + 1}
                    </td>
                    <td className="py-1 px-2 font-bold text-black border-r border-neutral-300 bg-white">
                      {room.displayName}
                    </td>
                    <td className="py-1 px-1.5 text-center border-r border-neutral-300 bg-white">
                      <span
                        className={cn(
                          "px-1 py-0.2 font-mono text-[8px] font-bold uppercase border",
                          room.isLabor
                            ? "border-blue-700 text-blue-900 bg-white"
                            : "border-neutral-500 text-neutral-800 bg-white"
                        )}
                      >
                        {room.isLabor ? "LABOR" : "TEORI"}
                      </span>
                    </td>
                    <td className="py-1 px-2 text-neutral-800 border-r border-neutral-300 bg-white">
                      {room.kampus === "Kampus Thehok" ? "Thehok" : "Kobar"}
                    </td>
                    <td className="py-1 px-2 text-right font-mono text-neutral-900 border-r border-neutral-300 bg-white">
                      {room.totalSesi} Sesi
                    </td>
                    <td className="py-1 px-2 text-right font-mono font-bold text-black border-r border-neutral-300 bg-white">
                      {room.totalJam.toLocaleString("id-ID")} Jam
                    </td>
                    <td className="py-1 px-2 text-center font-mono font-bold text-black border-r border-neutral-300 bg-white">
                      {room.utilisasiPct}%
                    </td>
                    <td className="py-1 px-2 text-center font-mono text-[8px] bg-white">
                      <span className="text-emerald-800 font-bold">{room.tatapMuka} TM</span> &bull;{" "}
                      <span className="text-sky-800">{room.online} OL</span> &bull;{" "}
                      <span className="text-rose-800">{room.dibatalkan} CC</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* VIEW: GRAFIK BALOK */}
          {viewMode === "balok" && (
            <section aria-label="Visualisasi Grafik Balok Utilisasi" className="border border-border bg-card p-4 sm:p-5 shadow-xs rounded-none space-y-4 print:hidden">
              <div>
                <h3 className="text-base font-bold tracking-tight text-foreground">
                  Top 10 Ruangan dengan Jam Terbang Tertinggi
                </h3>
                <p className="text-xs text-muted-foreground">
                  Perbandingan total jam operasional semester antar-ruangan
                </p>
              </div>

              <div className="h-80 w-full">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topRoomsChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/60" />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        stroke="currentColor"
                        className="text-[11px] text-muted-foreground font-mono"
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        stroke="currentColor"
                        className="text-[11px] text-muted-foreground font-mono"
                        unit=" Jam"
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="border border-border bg-card p-2.5 shadow-md text-xs font-sans rounded-none space-y-1">
                                <p className="font-bold text-foreground">{data.name}</p>
                                <p className="text-muted-foreground">
                                  Total Jam: <strong className="text-blue-600 font-mono">{data.jam} Jam</strong>
                                </p>
                                <p className="text-muted-foreground">
                                  Total Sesi: <strong className="text-foreground font-mono">{data.sesi} Sesi</strong>
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="jam" fill="#2563eb" radius={[0, 0, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Skeleton className="h-full w-full rounded-none" />
                )}
              </div>
            </section>
          )}

          {/* VIEW: DIAGRAM DONUT */}
          {viewMode === "donut" && (
            <section aria-label="Visualisasi Diagram Donut Distribusi Kampus" className="border border-border bg-card p-4 sm:p-5 shadow-xs rounded-none space-y-4 print:hidden">
              <div>
                <h3 className="text-base font-bold tracking-tight text-foreground">
                  Sebaran Total Sesi Perkuliahan Berdasarkan Kampus
                </h3>
                <p className="text-xs text-muted-foreground">
                  Proporsi beban perkuliahan Kampus Thehok vs Kampus Kobar
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="h-64 w-full">
                  {mounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={campusPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {campusPieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="border border-border bg-card p-2.5 shadow-md text-xs font-sans rounded-none space-y-1">
                                  <p className="font-bold text-foreground">{data.name}</p>
                                  <p className="text-muted-foreground">
                                    Total: <strong className="font-mono text-foreground">{data.value.toLocaleString("id-ID")} Sesi</strong> ({data.pct}%)
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Skeleton className="h-full w-full rounded-none" />
                  )}
                </div>

                <div className="space-y-4">
                  {analytics.kampusComparison.map((k, i) => (
                    <div key={k.kampus} className="border border-border p-3.5 bg-muted/20 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-3 rounded-none shrink-0"
                            style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                          <span className="font-bold text-sm text-foreground">{k.kampus}</span>
                        </div>
                        <span className="font-mono font-bold text-sm text-foreground">{k.pct}%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Total Sesi: {k.totalSesi.toLocaleString("id-ID")}</span>
                        <span>Total Jam: {k.totalJam.toLocaleString("id-ID")} Jam</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* VIEW: KARTU METRIK */}
          {viewMode === "kartu" && (
            <section aria-label="Koleksi Kartu Metrik Ruangan" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 print:hidden">
              {filteredRooms.map((room) => (
                <div
                  key={`${room.kampus}-${room.ruangan}`}
                  className="border border-border bg-card p-3.5 shadow-xs rounded-none space-y-2 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground truncate">{room.displayName}</span>
                    <Badge variant="outline" className="text-[10px] font-mono rounded-none">
                      {room.utilisasiPct}%
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Total Jam:</span>
                      <strong className="text-foreground font-mono">{room.totalJam} Jam</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Sesi:</span>
                      <span className="font-mono">{room.totalSesi} Sesi</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kampus:</span>
                      <span>{room.kampus === "Kampus Thehok" ? "Thehok" : "Kobar"}</span>
                    </div>
                  </div>
                  <Progress value={room.utilisasiPct} className="h-1 rounded-none mt-2" />
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  )}

      {/* 5. ISI TAB 2: STATISTIK KELAS & WAKTU */}
      {activeTab === "waktu" && (
        <section aria-label="Statistik Waktu & Hari Perkuliahan" className="space-y-6">
          <div className="border border-border bg-card p-4 sm:p-5 shadow-xs rounded-none space-y-4">
            <div>
              <h3 className="text-base font-bold tracking-tight text-foreground">
                Distribusi Perkuliahan Berdasarkan Hari (Senin - Sabtu)
              </h3>
              <p className="text-xs text-muted-foreground">
                Total beban sesi perkuliahan aktif per hari dalam satu semester
              </p>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="border border-border bg-muted/20 p-3.5 rounded-none text-center space-y-2">
                    <Skeleton className="h-3.5 w-16 mx-auto" />
                    <Skeleton className="h-6 w-12 mx-auto" />
                    <Skeleton className="h-3 w-14 mx-auto" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {analytics.dayStats.map((d) => (
                  <div key={d.hari} className="border border-border bg-muted/20 p-3.5 rounded-none text-center space-y-1">
                    <div className="text-xs font-bold text-muted-foreground uppercase">{d.hari}</div>
                    <div className="text-xl font-bold font-mono text-foreground">{d.totalSesi}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">{d.totalJam} Jam</div>
                    <Badge variant="outline" className="text-[10px] font-mono mt-1 rounded-none">
                      {d.pct}% Beban
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 6. ISI TAB 3: STATISTIK DOSEN PENGAJAR */}
      {activeTab === "dosen" && (
        <section aria-label="Statistik Beban Dosen Pengajar" className="border border-border bg-card shadow-xs rounded-none">
          <div className="p-4 sm:p-5 border-b border-border space-y-1">
            <h3 className="text-base font-bold tracking-tight text-foreground">
              Peringkat Beban Mengajar Dosen Pengajar
            </h3>
            <p className="text-xs text-muted-foreground">
              Diurutkan berdasarkan total jam dan sesi kelas yang diampu
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3 sm:px-4 w-12 text-center">NO</th>
                  <th className="py-3 px-3 sm:px-4">NAMA DOSEN</th>
                  <th className="py-3 px-3 sm:px-4">MATA KULIAH DIAMPU</th>
                  <th className="py-3 px-3 sm:px-4 text-right">TOTAL SESI</th>
                  <th className="py-3 px-3 sm:px-4 text-right">TOTAL JAM MENGAJAR</th>
                  <th className="py-3 px-3 sm:px-4 text-center">METODE (TM / OL)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td className="py-3 px-3 sm:px-4 text-center">
                        <Skeleton className="h-4 w-6 mx-auto" />
                      </td>
                      <td className="py-3 px-3 sm:px-4">
                        <Skeleton className="h-4 w-44" />
                      </td>
                      <td className="py-3 px-3 sm:px-4">
                        <Skeleton className="h-4 w-52" />
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right">
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right">
                        <Skeleton className="h-4 w-20 ml-auto" />
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center">
                        <Skeleton className="h-4 w-24 mx-auto" />
                      </td>
                    </tr>
                  ))
                ) : (
                  analytics.topDosenStats.slice(0, 20).map((dosen, i) => (
                    <tr key={dosen.dosen} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3 sm:px-4 text-center font-mono font-bold text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="py-3 px-3 sm:px-4 font-bold text-foreground">
                        {dosen.dosen}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-muted-foreground">
                        <span className="line-clamp-1" title={dosen.mataKuliahList.join(", ")}>
                          {dosen.mataKuliahList.slice(0, 2).join(", ")}
                          {dosen.mataKuliahList.length > 2 && ` (+${dosen.mataKuliahList.length - 2} matkul)`}
                        </span>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right font-mono font-semibold text-foreground">
                        {dosen.totalSesi} Sesi
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                        {dosen.totalJam.toLocaleString("id-ID")} Jam
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center font-mono text-[10px]">
                        <span className="px-1.5 py-0.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold mr-1">
                          {dosen.tatapMuka} TM
                        </span>
                        <span className="px-1.5 py-0.5 border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold">
                          {dosen.online} OL
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* PENGESAHAN DOKUMEN SISTEM (HANYA MUNCUL DI PRINT / PDF, HEMAT TINTA) */}
      <div className="hidden print:block mt-8 pt-4 border-t border-neutral-400 print-avoid-break text-xs bg-white">
        <div className="grid grid-cols-2 gap-8 items-start">
          <div className="space-y-1 text-left">
            <div className="font-bold text-black text-[10px]">Catatan Rekapitulasi Sistem:</div>
            <ul className="list-disc list-inside text-[9px] text-neutral-700 space-y-0.5">
              <li>Data dihimpun otomatis dari sistem sinkronisasi jadwal perkuliahan UNAMA.</li>
              <li>Tingkat utilisasi dihitung dari akumulasi jam perkuliahan terhadap kapasitas waktu ruangan.</li>
              <li>Dokumen ini diterbitkan sebagai rekapitulasi penggunaan ruang dan laboratorium komputer.</li>
            </ul>
            <div className="pt-2 text-[8px] font-mono text-neutral-600">
              Kode Dokumen: UNAMA/LAB-KOMP/STAT-{new Date().getFullYear()}-{analytics.totalSchedules}
            </div>
          </div>

          <div className="text-right space-y-12">
            <div>
              <div className="text-[10px] text-neutral-800">
                Kota Jambi, {currentPrintDate}
              </div>
              <div className="text-[10px] font-bold text-black mt-0.5">
                Unit Laboratorium Komputer UNAMA
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="font-bold text-black text-[10px] underline">
                ( Tim Asisten Laboratorium Komputer UNAMA )
              </div>
              <div className="text-[8px] text-neutral-600 font-mono">
                Sistem Informasi Jadwal &amp; Monitoring Laboratorium
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
