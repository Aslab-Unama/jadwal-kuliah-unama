"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, RealtimeStatusBadge, MethodBadge } from "./status-badge";
import { JadwalItem, formatDosenName } from "@/lib/types";
import {
  Building2,
  Calendar,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  DoorOpen,
  User,
} from "lucide-react";
import { cn } from "cn";
import { LiveRunningClock } from "./aslab-room-monitor";
import { useJadwalStore } from "@/stores/use-jadwal-store";
import { isLabRoom } from "@/lib/lab-utils";
import { isDateToday, isDateFuture } from "@/lib/time-sync";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}

interface ScheduleDetailDialogProps {
  item?: JadwalItem | null;
  onClose?: () => void;
}

function getGoogleCalendarUrl(item: JadwalItem): string {
  const title = encodeURIComponent(`${item.mataKuliah} (${item.kodeKelas})`);
  const timeRange = item.waktuSelesai && item.waktuSelesai !== "00:00" ? `${item.waktuMulai} - ${item.waktuSelesai}` : item.waktuMulai;
  const details = encodeURIComponent(
    `Jadwal Kuliah UNAMA\nMata Kuliah: ${item.mataKuliah}\nKelas: ${item.kodeKelas}\nDosen: ${item.dosen}\nWaktu: ${item.hari}, ${item.tanggal} jam ${timeRange} WIB\nRuangan: ${item.ruangan} (${item.kampus})`
  );
  const location = encodeURIComponent(`${item.ruangan}, ${item.kampus}, UNAMA`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}`;
}

export function ScheduleDetailDialog({ item, onClose }: ScheduleDetailDialogProps) {
  const [copied, setCopied] = React.useState(false);

  const activeModal = useJadwalStore((s) => s.activeModal);
  const closeModal = useJadwalStore((s) => s.closeModal);
  const openAttendanceModal = useJadwalStore((s) => s.openAttendanceModal);
  const isAslabStore = useJadwalStore((s) => s.isAslab);
  const isFromAslabMonitorStore = useJadwalStore((s) => s.isFromAslabMonitor);

  const [isAslabCookie, setIsAslabCookie] = React.useState(false);

  React.useEffect(() => {
    setIsAslabCookie(getCookie("aslab_logged_in") === "true");
  }, []);

  const isAslab = isAslabStore || isAslabCookie;

  const isDetailOpen = activeModal?.type === "detail" || (item !== undefined && Boolean(item));
  const modalItem = activeModal?.type === "detail" ? activeModal.item : item || null;
  const parentRoom = activeModal?.type === "detail" ? activeModal.parentRoom : undefined;
  const isFromAslabMonitor = activeModal?.type === "detail" ? Boolean(activeModal.fromAslabMonitor) : isFromAslabMonitorStore;

  const [cachedItem, setCachedItem] = React.useState<JadwalItem | null>(modalItem);

  React.useEffect(() => {
    if (modalItem) {
      setCachedItem(modalItem);
    }
  }, [modalItem]);

  const activeItem = modalItem || cachedItem;

  const handleCopy = async () => {
    if (!activeItem) return;
    const timeRange = activeItem.waktuSelesai && activeItem.waktuSelesai !== "00:00" ? `${activeItem.waktuMulai} - ${activeItem.waktuSelesai}` : activeItem.waktuMulai;
    const text = [
      `Jadwal Kuliah UNAMA`,
      `Mata Kuliah: ${activeItem.mataKuliah}`,
      `Kelas: ${activeItem.kodeKelas}`,
      `Dosen: ${activeItem.dosen}`,
      `Waktu: ${activeItem.hari}, ${activeItem.tanggal} (${timeRange} WIB)`,
      `Lokasi: ${activeItem.ruangan}, ${activeItem.kampus}`,
      `Status: ${activeItem.status}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <Dialog
      open={isDetailOpen}
      onOpenChange={(open) => {
        if (!open) {
          if (onClose) onClose();
          closeModal();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg p-6 rounded-none border border-border bg-card">
        {activeItem && (
          <div className="space-y-5">
            <DialogHeader className="space-y-2 text-left pb-3 border-b border-border pr-9">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs font-semibold px-2 py-0.5 rounded-none">
                    {activeItem.kodeKelas}
                  </Badge>
                  <RealtimeStatusBadge
                    status={activeItem.status}
                    waktuMulai={activeItem.waktuMulai}
                    waktuSelesai={activeItem.waktuSelesai}
                    sks={activeItem.sks}
                    tanggal={activeItem.tanggal}
                    className="rounded-none text-xs"
                  />
                  <MethodBadge status={activeItem.status} className="rounded-none text-xs" />
                </div>
                {/* Jam Berjalan Real-Time (WIB) */}
                <div className="shrink-0">
                  <LiveRunningClock />
                </div>
              </div>
              <DialogTitle className="text-lg font-bold leading-snug text-foreground">
                {activeItem.mataKuliah}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Informasi detail jadwal sesi perkuliahan atau laboratorium komputer UNAMA
              </DialogDescription>
            </DialogHeader>

            {/* Detailed Grid Information */}
            <div className="border border-border bg-muted/20 p-4 space-y-3 text-xs rounded-none">
              <div className="flex items-start gap-3">
                <User className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-muted-foreground text-[11px]">Dosen Pengampu</p>
                  <p className="text-sm font-semibold text-foreground">{formatDosenName(activeItem.dosen)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-border/40">
                <div className="flex items-start gap-2.5">
                  <Calendar className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-muted-foreground text-[11px]">Hari & Tanggal</p>
                    <p className="font-medium text-foreground">{activeItem.hari}</p>
                    <p className="text-[11px] text-muted-foreground">{activeItem.tanggal}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-muted-foreground text-[11px]">Waktu Perkuliahan</p>
                    <p className="font-semibold text-foreground font-mono">
                      {activeItem.waktuMulai}{activeItem.waktuSelesai && activeItem.waktuSelesai !== "00:00" ? ` - ${activeItem.waktuSelesai}` : ""} WIB
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-border/40">
                <div className="flex items-start gap-2.5">
                  <DoorOpen className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-muted-foreground text-[11px]">Ruangan</p>
                    <p className="font-semibold text-foreground">{activeItem.ruangan}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Building2 className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-muted-foreground text-[11px]">Kampus</p>
                    <p className="font-medium text-foreground">{activeItem.kampus}</p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={getGoogleCalendarUrl(activeItem)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "rounded-none bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 h-9 text-xs font-medium cursor-pointer shadow-2xs"
                  )}
                >
                  <CalendarPlus className="size-3.5" />
                  <span>+ Google Calendar</span>
                </a>

                {/* Tombol Absen Lab khusus ketika dibuka dari Panel Monitoring Aslab dan merupakan ruangan Laboratorium */}
                {isAslab && isFromAslabMonitor && isLabRoom(activeItem.ruangan) && (
                  !isDateFuture(activeItem.tanggal) ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openAttendanceModal(activeItem, parentRoom)}
                      className="rounded-none bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-9 text-xs font-medium cursor-pointer shadow-2xs font-semibold"
                    >
                      <CheckCircle2 className="size-3.5" />
                      <span>Absen Lab</span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled
                      title="Absensi tidak dapat dilakukan untuk jadwal di masa mendatang"
                      className="rounded-none bg-muted/70 text-muted-foreground border border-border gap-1.5 h-9 text-xs font-medium cursor-not-allowed opacity-75 select-none"
                    >
                      <Clock className="size-3.5 text-muted-foreground/80" />
                      <span>Belum bisa absen</span>
                    </Button>
                  )
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="rounded-none gap-1.5 h-9 text-xs cursor-pointer border-border"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5 text-emerald-500" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5 text-muted-foreground" />
                    <span>Salin Info Jadwal</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
