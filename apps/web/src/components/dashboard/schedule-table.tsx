"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { id as localeId } from "date-fns/locale";
import { JadwalItem, formatDosenTableLines } from "@/lib/types";
import { useGlobalTime, getRealtimeScheduleStatus, getTodayWib } from "@/lib/time-sync";
import { RealtimeStatusBadge } from "./status-badge";
import { Calendar as CalendarIcon, SearchX } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ScheduleTableProps {
  items: JadwalItem[];
  isLoading: boolean;
  onSelectItem: (item: JadwalItem) => void;
  onResetFilters?: () => void;
  selectedDate?: Date | null;
  onDateChange?: (date: Date | null) => void;
}

function parseStatusAndMethod(rawStatus: string) {
  if (rawStatus.includes("(TM)")) {
    return { status: "Tatap Muka", method: "TM" };
  }
  if (rawStatus.includes("(OL)")) {
    return { status: "Online", method: "OL" };
  }
  if (rawStatus.includes("Cancel")) {
    return { status: "Cancel", method: "-" };
  }
  return { status: rawStatus, method: "-" };
}

export function ScheduleTable({
  items,
  isLoading,
  onSelectItem,
  onResetFilters,
  selectedDate,
  onDateChange,
}: ScheduleTableProps) {
  const { currentMins } = useGlobalTime(5000);

  if (isLoading) {
    return (
      <div className="overflow-hidden border border-border bg-card shadow-xs">
        <div className="p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3.5 border-b border-border/40 last:border-0">
              <Skeleton className="h-8 w-[16%]" />
              <Skeleton className="h-10 w-[32%]" />
              <Skeleton className="h-6 w-[23%]" />
              <Skeleton className="h-6 w-[16%]" />
              <Skeleton className="h-6 w-[8%]" />
              <Skeleton className="h-6 w-[5%]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="border border-dashed border-border p-8 bg-card text-center shadow-xs">
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
    );
  }

  return (
    <div className="overflow-hidden border border-border bg-card shadow-xs">
      <div className="relative w-full">
        <Table className="table-fixed w-full">
          <TableHeader className="bg-muted/40 border-b border-border">
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6 w-[15%] font-semibold text-xs text-foreground uppercase tracking-wider">
                Waktu
              </TableHead>
              <TableHead className="w-[28%] font-semibold text-xs text-foreground uppercase tracking-wider">
                Mata Kuliah
              </TableHead>
              <TableHead className="w-[22%] font-semibold text-xs text-foreground uppercase tracking-wider">
                Dosen
              </TableHead>
              <TableHead className="w-[15%] font-semibold text-xs text-foreground uppercase tracking-wider">
                Ruangan
              </TableHead>
              <TableHead className="w-[12%] font-semibold text-xs text-foreground uppercase tracking-wider">
                Status
              </TableHead>
              <TableHead className="pr-6 w-[8%] font-semibold text-xs text-foreground uppercase tracking-wider">
                Metode
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const realtime = getRealtimeScheduleStatus(item, currentMins);
              const kampusShort = item.kampus.replace("Kampus ", "");

              return (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/30 transition-colors border-b border-border/60 last:border-0"
                  onClick={() => onSelectItem(item)}
                >
                  {/* Kolom 1: WAKTU */}
                  <TableCell className="pl-6 py-3.5 align-top whitespace-normal">
                    <div className="font-mono text-sm font-bold text-foreground">
                      {item.waktuMulai}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                      {item.hari}, {item.tanggal}
                    </div>
                  </TableCell>

                  {/* Kolom 2: MATA KULIAH (Turun ke bawah / wrap) */}
                  <TableCell className="py-3.5 align-top whitespace-normal">
                    <div className="font-semibold text-sm text-foreground leading-snug break-words whitespace-normal">
                      {item.mataKuliah}
                    </div>
                    <div className="mt-1">
                      <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        (Kelas: {item.kodeKelas})
                      </span>
                    </div>
                  </TableCell>

                  {/* Kolom 3: DOSEN (Nama >= 4 kata turun ke bawah agar tabel tidak scroll) */}
                  <TableCell className="py-3.5 text-xs text-foreground/90 font-medium align-top whitespace-normal">
                    <div className="leading-snug break-words">
                      {formatDosenTableLines(item.dosen).map((lines, lIdx) => (
                        <div
                          key={lIdx}
                          className={lIdx > 0 ? "mt-1.5 pt-1 border-t border-border/40" : ""}
                        >
                          {lines.map((line, lineIdx) => (
                            <span
                              key={lineIdx}
                              className={lineIdx > 0 ? "block text-foreground/80 mt-0.5" : "block"}
                            >
                              {line}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </TableCell>

                  {/* Kolom 4: RUANGAN (Turun ke bawah / wrap) */}
                  <TableCell className="py-3.5 text-xs font-medium text-foreground align-top whitespace-normal">
                    <div className="leading-snug break-words whitespace-normal">
                      {item.ruangan} ({kampusShort})
                    </div>
                  </TableCell>

                  {/* Kolom 5: STATUS REALTIME */}
                  <TableCell className="py-3.5 text-xs font-medium text-foreground whitespace-nowrap align-top">
                    <RealtimeStatusBadge
                      status={item.status}
                      waktuMulai={item.waktuMulai}
                      tanggal={item.tanggal}
                      currentMins={currentMins}
                      className="text-[11px] px-2 py-0.5"
                    />
                  </TableCell>

                  {/* Kolom 6: METODE */}
                  <TableCell className="pr-6 py-3.5 whitespace-nowrap align-top">
                    {realtime.method === "TM" && (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-500/20 border-emerald-500/20 font-bold px-2 py-0.5 text-[11px]"
                      >
                        TM
                      </Badge>
                    )}
                    {realtime.method === "OL" && (
                      <Badge
                        variant="secondary"
                        className="bg-sky-500/10 text-sky-700 dark:text-sky-300 dark:bg-sky-500/20 border-sky-500/20 font-bold px-2 py-0.5 text-[11px]"
                      >
                        OL
                      </Badge>
                    )}
                    {realtime.method === "-" && (
                      <span className="text-muted-foreground font-mono text-xs">-</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
