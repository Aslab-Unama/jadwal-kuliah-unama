"use client";

import * as React from "react";
import { cn } from "cn";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, RealtimeStatusBadge, MethodBadge } from "./status-badge";
import { FilterBar } from "./filter-bar";
import { ScheduleTable } from "./schedule-table";
import { StatsOverview } from "./stats-overview";
import { JadwalFilters, JadwalItem, JadwalSummaryData, formatDosenName } from "@/lib/types";
import { useGlobalTime, getRealtimeScheduleStatus, getTodayWib } from "@/lib/time-sync";
import {
  Building2,
  Calendar as CalendarIcon,
  Clock,
  DoorOpen,
  GraduationCap,
  SearchX,
  User,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface ScheduleGridProps {
  items: JadwalItem[];
  isLoading: boolean;
  onSelectItem: (item: JadwalItem) => void;
  onResetFilters?: () => void;
  selectedDate?: Date | null;
  className?: string;

  // FilterBar integrated props
  filters?: JadwalFilters;
  onFilterChange?: (newFilters: Partial<JadwalFilters>) => void;
  kampusList?: string[];
  ruanganList?: string[];
  viewMode?: "grid" | "table";
  onViewModeChange?: (mode: "grid" | "table") => void;
  totalFiltered?: number;
  onDateChange?: (date: Date | null) => void;

  // Ringkasan Statistik Jadwal
  summary?: JadwalSummaryData;

  // Custom slots
  filterBar?: React.ReactNode;
  pagination?: React.ReactNode;
}

export function ScheduleGrid({
  items,
  isLoading,
  onSelectItem,
  onResetFilters,
  selectedDate,
  className,
  filters,
  onFilterChange,
  kampusList,
  ruanganList,
  viewMode = "grid",
  onViewModeChange,
  totalFiltered,
  onDateChange,
  summary,
  filterBar,
  pagination,
}: ScheduleGridProps) {
  const { currentMins } = useGlobalTime(5000);

  const renderedFilterBar = filterBar ? (
    filterBar
  ) : filters &&
    onFilterChange &&
    onResetFilters &&
    kampusList &&
    ruanganList &&
    onViewModeChange &&
    totalFiltered !== undefined &&
    onDateChange ? (
    <FilterBar
      filters={filters}
      onFilterChange={onFilterChange}
      onResetFilters={onResetFilters}
      kampusList={kampusList}
      ruanganList={ruanganList}
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}
      totalFiltered={totalFiltered}
      selectedDate={selectedDate || null}
      onDateChange={onDateChange}
      className="border-border/60 bg-muted/15"
    />
  ) : null;

  return (
    <section
      aria-label="Daftar Jadwal Kuliah"
      className={cn(
        "relative border border-border bg-card p-4 sm:p-6 shadow-xs space-y-4",
        className
      )}
    >
      {/* Header Panel Jadwal Kuliah */}
      <div className="flex flex-col gap-4 pb-4 border-b border-border/70 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1 shrink-0">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] font-semibold tracking-wide uppercase border-border bg-muted/60 text-foreground"
            >
              <GraduationCap className="size-3 mr-1 text-primary" />
              Sesi Perkuliahan
            </Badge>
          </div>
          <h3 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Jadwal Perkuliahan Mahasiswa
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            Daftar perkuliahan tatap muka dan online sesuai jadwal akademik aktif UNAMA.
          </p>
        </div>

        {/* Ringkasan Statistik Jadwal (Screenshot 1 dipindahkan ke sisi kanan header) */}
        {summary && (
          <div className="w-full lg:w-auto lg:min-w-[560px] xl:min-w-[620px] shrink-0">
            <StatsOverview
              totalJadwal={summary.totalJadwal}
              totalCancel={summary.totalCancel}
              totalOnline={summary.totalOnline}
              totalTatapMuka={summary.totalTatapMuka}
              totalKampus={summary.kampusList.length || 2}
              totalRuangan={summary.ruanganList.length || 11}
              selectedDate={selectedDate}
              selectedKampus={filters?.kampus}
              selectedRuangan={filters?.ruangan}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>

      {/* FilterBar Terintegrasi Di Dalam Jadwal Perkuliahan */}
      {renderedFilterBar}

      {/* Konten Utama Jadwal: Loading, Empty, Table, atau Card Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col justify-between gap-3 border border-border bg-card p-4 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <div className="space-y-2 pt-1">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-border p-8 bg-muted/10 text-center">
          <Empty className="p-4">
            <EmptyMedia variant="icon">
              <SearchX className="size-6 text-muted-foreground" />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle className="text-base font-semibold">
                {selectedDate
                  ? "Tidak Ada Jadwal pada Tanggal Ini"
                  : "Jadwal Tidak Ditemukan"}
              </EmptyTitle>
              <EmptyDescription className="text-xs max-w-md mx-auto mt-1">
                {selectedDate
                  ? "Tidak ditemukan sesi perkuliahan aktif untuk tanggal yang dipilih atau berada di luar kalender akademik semester aktif."
                  : "Tidak ada kelas yang cocok dengan kombinasi filter atau pencarian Anda."}
              </EmptyDescription>
            </EmptyHeader>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              {selectedDate && onDateChange ? (
                <Popover>
                  <PopoverTrigger className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium border border-border bg-background hover:bg-muted/60 transition-colors cursor-pointer select-none rounded-none shadow-2xs">
                    <CalendarIcon className="size-3.5 text-primary shrink-0" />
                    <span>Pilih Tanggal</span>
                  </PopoverTrigger>
                  <PopoverContent
                    align="center"
                    sideOffset={4}
                    className="w-auto p-2 rounded-none bg-card border-border shadow-xl space-y-1.5 z-50"
                  >
                    <Calendar
                      mode="single"
                      selected={selectedDate || undefined}
                      defaultMonth={selectedDate || getTodayWib()}
                      onSelect={(date) => {
                        if (date) onDateChange(date);
                      }}
                      locale={localeId}
                      className="rounded-none border border-border bg-background p-1"
                    />
                    <div className="flex items-center justify-center border-t border-border pt-1.5 px-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-full px-2 text-[11px] font-medium rounded-none cursor-pointer hover:bg-muted"
                        onClick={() => onDateChange(getTodayWib())}
                      >
                        Hari Ini
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : onResetFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onResetFilters}
                  className="h-8 rounded-none text-xs cursor-pointer"
                >
                  Atur Ulang Filter
                </Button>
              ) : null}
            </div>
          </Empty>
        </div>
      ) : viewMode === "table" ? (
        <ScheduleTable
          items={items}
          isLoading={false}
          onSelectItem={onSelectItem}
          onResetFilters={onResetFilters}
          selectedDate={selectedDate}
          onDateChange={onDateChange}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const realtime = getRealtimeScheduleStatus(item, currentMins);

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectItem(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectItem(item);
                  }
                }}
                className={cn(
                  "group relative flex flex-col justify-between gap-3 border bg-card p-4 text-left shadow-xs transition-all hover:border-primary/50 hover:shadow-sm hover:bg-muted/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
                  realtime.isLive
                    ? "border-emerald-500/70 ring-1 ring-emerald-500/30"
                    : "border-border"
                )}
              >
                {/* Header Row: Jam Mulai, Kode Kelas, Status Realtime & Metode */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium text-foreground bg-muted/60 px-2.5 py-0.5 border border-border">
                      <Clock className="size-3.5 text-muted-foreground shrink-0" />
                      <span>{item.waktuMulai} WIB</span>
                    </div>
                    <div className="flex items-center font-mono text-[11px] font-bold px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/30 dark:bg-primary/20 dark:border-primary/40">
                      <span className="tracking-wider">{item.kodeKelas}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <RealtimeStatusBadge
                      status={item.status}
                      waktuMulai={item.waktuMulai}
                      tanggal={item.tanggal}
                      currentMins={currentMins}
                      className="text-[11px] px-2.5 py-0.5 h-auto"
                    />
                    <MethodBadge status={item.status} className="text-[11px] px-2 py-0.5 h-auto hidden sm:inline-flex" />
                  </div>
                </div>

            {/* Course Name & Lecturer */}
            <div className="space-y-1.5">
              <h3
                className="font-heading text-sm sm:text-base font-semibold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2"
                title={item.mataKuliah}
              >
                {item.mataKuliah}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title={item.dosen}>
                <User className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="font-medium text-foreground/90 truncate">{formatDosenName(item.dosen)}</span>
              </div>
            </div>

            {/* Clear & Legible Info Row: Hari, Tanggal, Ruangan, Kampus */}
            <div className="space-y-2 pt-2 border-t border-border text-xs">
              {/* Hari & Tanggal */}
              <div className="flex items-center gap-1.5 text-foreground font-medium">
                <CalendarIcon className="size-3.5 text-muted-foreground shrink-0" />
                <span>{item.hari}, {item.tanggal}</span>
              </div>

              {/* Ruangan & Lokasi Kampus */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <DoorOpen className="size-4 text-primary shrink-0" />
                  <span className="truncate">{item.ruangan}</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                  <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{item.kampus}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      </div>
      )}

      {/* Slot Kontrol Paginasi */}
      {pagination}
    </section>
  );
}
