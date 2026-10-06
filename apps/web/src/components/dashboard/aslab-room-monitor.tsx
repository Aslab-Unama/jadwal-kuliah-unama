"use client";

import * as React from "react";
import { cn } from "cn";
import {
  Calendar,
  Clock,
  DoorOpen,
  DoorClosed,
  Building2,
  User,
  Info,
  Timer,
  Radio,
  Layers,
  Search,
  CheckCircle2,
  ShieldCheck,
  X,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Monitor,
  Lock,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateSelector } from "./date-selector";
import { useJadwalStore } from "@/stores/use-jadwal-store";
import { StatusBadge, RealtimeStatusBadge, MethodBadge } from "./status-badge";
import { PaginationControls } from "./pagination-controls";
import {
  calculateLabGaps,
  getInUseRooms,
  getLabCaretaker,
  isPhysicalClass,
  timeToMinutes,
  minutesToTime,
  formatDuration,
  getCampusForRoom,
  isLabRoom,
  normalizeCampus,
  UNAMA_LABS,
} from "@/lib/lab-utils";
import { JadwalItem, RoomGridItem, RoomGridStatus, formatDosenName, formatDateDb } from "@/lib/types";
import {
  useGlobalTime,
  getRealtimeScheduleStatus,
  isDateToday,
  isDatePast,
  isDateFuture,
  parseDateFromDbString,
} from "@/lib/time-sync";

/**
 * Penanda status perkuliahan di akhir link (teks warna simpel tanpa border/box):
 * - (TM) Hijau: Tatap Muka
 * - (OL) Biru: Online / Daring
 * - (CL) Merah: Cancel / Batal
 */
function ClassStatusTag({ status }: { status?: string }) {
  if (!status) return null;
  const s = status.toLowerCase();

  // (CL) Merah - Cancel / Batal
  if (s.includes("cancel") || s.includes("batal") || s.includes("(cl)")) {
    return (
      <span className="text-red-600 dark:text-red-400 font-semibold ml-1 shrink-0">
        (CL)
      </span>
    );
  }

  // (OL) Biru - Online / Daring
  if (s.includes("(ol)") || s.includes("online") || s.includes("daring")) {
    return (
      <span className="text-blue-600 dark:text-blue-400 font-semibold ml-1 shrink-0">
        (OL)
      </span>
    );
  }

  // (TM) Hijau - Tatap Muka
  return (
    <span className="text-emerald-600 dark:text-emerald-400 font-semibold ml-1 shrink-0">
      (TM)
    </span>
  );
}

/**
 * Komponen jam digital berjalan (real-time ticking per detik) WIB
 */
export function LiveRunningClock({ className }: { className?: string }) {
  const [mounted, setMounted] = React.useState(false);
  const { timeWibStr, isSynced } = useGlobalTime(1000);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const synced = mounted ? isSynced : false;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-xs sm:text-sm font-bold bg-muted/60 border border-border px-2.5 py-1 rounded-none text-foreground select-none",
        className
      )}
      title={synced ? "Waktu Global Terverifikasi (WIB)" : "Waktu Real-time Saat Ini (WIB)"}
      suppressHydrationWarning
    >
      <Clock className={cn("size-3.5 shrink-0", synced ? "text-emerald-500" : "text-muted-foreground")} />
      <span suppressHydrationWarning>{mounted && timeWibStr ? timeWibStr : "--:-- WIB"}</span>
    </div>
  );
}

export type { RoomGridStatus, RoomGridItem } from "@/lib/types";

export interface MasterRoomDefinition {
  ruangan: string;
  displayName: string;
  kampus: "Kampus Thehok" | "Kampus Kobar";
  isLabor: boolean;
}


/**
 * Format nama ruangan untuk tampilan grid (misal "Gedung Pasca, Lab. B2.3" -> "S2, Lab. B2.3")
 */
function formatRoomDisplayName(name: string): string {
  if (!name) return "";
  let display = name.trim();
  if (display.startsWith("Gedung Pasca, ")) {
    display = display.replace("Gedung Pasca, ", "S2, ");
  }
  if (display.startsWith("R. Praktek ")) {
    display = display.replace("R. Praktek ", "R. ");
  }
  if (display === "Labor Cisco 4.3" || display === "Labor Cisco") {
    display = "L. Cisco 4.3";
  }
  return display;
}

/**
 * Master data daftar ruangan UNAMA (Thehok & Kobar) untuk tampilan matriks status ruangan.
 * Menjamin semua ruangan tetap muncul dalam status 'Kosong' meski belum memiliki jadwal kelas pada hari tersebut.
 */
const MASTER_ROOMS: MasterRoomDefinition[] = [
  // --- Laboratorium Thehok (10 Lab) ---
  { ruangan: "Labor 1.3", displayName: "Labor 1.3", kampus: "Kampus Thehok", isLabor: true },
  { ruangan: "Labor 1.4", displayName: "Labor 1.4", kampus: "Kampus Thehok", isLabor: true },
  { ruangan: "Labor 1.5", displayName: "Labor 1.5", kampus: "Kampus Thehok", isLabor: true },
  { ruangan: "Labor 2.7", displayName: "Labor 2.7", kampus: "Kampus Thehok", isLabor: true },
  { ruangan: "Labor 3.1", displayName: "Labor 3.1", kampus: "Kampus Thehok", isLabor: true },
  { ruangan: "Labor 3.2", displayName: "Labor 3.2", kampus: "Kampus Thehok", isLabor: true },
  { ruangan: "Labor 3.4", displayName: "Labor 3.4", kampus: "Kampus Thehok", isLabor: true },
  { ruangan: "Labor 4.1", displayName: "Labor 4.1", kampus: "Kampus Thehok", isLabor: true },
  { ruangan: "Labor Cisco 4.3", displayName: "L. Cisco 4.3", kampus: "Kampus Thehok", isLabor: true },
  { ruangan: "Gedung Pasca, Lab. B2.3", displayName: "S2, Lab. B2.3", kampus: "Kampus Thehok", isLabor: true },

  // --- Laboratorium Kobar (5 Lab Resmi UNAMA) ---
  { ruangan: "Labor 1.5", displayName: "Labor 1.5", kampus: "Kampus Kobar", isLabor: true },
  { ruangan: "Labor 1.6", displayName: "Labor 1.6", kampus: "Kampus Kobar", isLabor: true },
  { ruangan: "Labor 1.7", displayName: "Labor 1.7", kampus: "Kampus Kobar", isLabor: true },
  { ruangan: "Labor 1.8", displayName: "Labor 1.8", kampus: "Kampus Kobar", isLabor: true },
  { ruangan: "Labor 1.9", displayName: "Labor 1.9", kampus: "Kampus Kobar", isLabor: true },

  // --- Ruangan Teori Thehok (20 Ruangan) ---
  { ruangan: "R. 1.6", displayName: "R. 1.6", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 1.7", displayName: "R. 1.7", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 2.10", displayName: "R. 2.10", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 3.5", displayName: "R. 3.5", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 3.6", displayName: "R. 3.6", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 3.7", displayName: "R. 3.7", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 3.8", displayName: "R. 3.8", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 3.9", displayName: "R. 3.9", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 3.10", displayName: "R. 3.10", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 4.2", displayName: "R. 4.2", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 4.4", displayName: "R. 4.4", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 4.5", displayName: "R. 4.5", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 4.6", displayName: "R. 4.6", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 4.7", displayName: "R. 4.7", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 4.8", displayName: "R. 4.8", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 4.9", displayName: "R. 4.9", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. Dosen", displayName: "R. Dosen", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "Gedung Pasca, R. B1.2", displayName: "S2, R. B1.2", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "Gedung Pasca, R. B1.3", displayName: "S2, R. B1.3", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "Gedung Pasca, R. B3.4", displayName: "S2, R. B3.4", kampus: "Kampus Thehok", isLabor: false },

  // --- Ruangan Teori Kobar (11 Ruangan) ---
  { ruangan: "R. 2.2", displayName: "R. 2.2", kampus: "Kampus Kobar", isLabor: false },
  { ruangan: "R. 2.3", displayName: "R. 2.3", kampus: "Kampus Kobar", isLabor: false },
  { ruangan: "R. 2.10", displayName: "R. 2.10", kampus: "Kampus Kobar", isLabor: false },
  { ruangan: "R. 2.11", displayName: "R. 2.11", kampus: "Kampus Kobar", isLabor: false },
  { ruangan: "R. 2.12", displayName: "R. 2.12", kampus: "Kampus Kobar", isLabor: false },
  { ruangan: "R. 2.13", displayName: "R. 2.13", kampus: "Kampus Kobar", isLabor: false },
  { ruangan: "R. 2.14", displayName: "R. 2.14", kampus: "Kampus Kobar", isLabor: false },
  { ruangan: "R. 2.15", displayName: "R. 2.15", kampus: "Kampus Kobar", isLabor: false },
  { ruangan: "R. 2.16", displayName: "R. 2.16", kampus: "Kampus Kobar", isLabor: false },
  { ruangan: "R. 2.17", displayName: "R. 2.17", kampus: "Kampus Kobar", isLabor: false },
  { ruangan: "R. 2.18", displayName: "R. 2.18", kampus: "Kampus Kobar", isLabor: false },
];

function matchesRoom(item: JadwalItem, room: MasterRoomDefinition): boolean {
  if (!item.ruangan) return false;
  if (item.kampus && normalizeCampus(item.kampus) !== room.kampus) return false;

  const itemNorm = formatRoomDisplayName(item.ruangan).trim().toLowerCase();
  const roomNorm = room.displayName.trim().toLowerCase();
  const origNorm = room.ruangan.trim().toLowerCase();
  const rawNorm = item.ruangan.trim().toLowerCase();

  if (itemNorm === roomNorm || rawNorm === origNorm || itemNorm === origNorm || rawNorm === roomNorm) {
    return true;
  }

  // Khusus penamaan variasi di BAAK:
  // "R. Praktek 3.1" atau "Labor 3.1"
  if (room.ruangan === "Labor 3.1" && (rawNorm === "r. praktek 3.1" || rawNorm === "labor 3.1" || rawNorm === "lab 3.1")) {
    return true;
  }
  // "R. Praktek 3.4" atau "Labor 3.4"
  if (room.ruangan === "Labor 3.4" && (rawNorm === "r. praktek 3.4" || rawNorm === "labor 3.4" || rawNorm === "lab 3.4")) {
    return true;
  }
  // "Labor Cisco 4.3" atau "Labor 4.3" atau "Lab Cisco 4.3"
  if (room.ruangan === "Labor Cisco 4.3" && (rawNorm.includes("4.3") && (rawNorm.includes("cisco") || rawNorm.includes("labor") || rawNorm.includes("lab")))) {
    return true;
  }
  // "Gedung Pasca, Lab. B2.3" atau "Lab. B2.3" atau "S2, Lab. B2.3"
  if (room.ruangan.includes("B2.3") && rawNorm.includes("b2.3")) {
    return true;
  }

  return false;
}

interface AslabRoomMonitorProps {
  items: JadwalItem[];
  isLoading?: boolean;
  selectedDate?: Date | null;
  onDateChange?: (date: Date | null) => void;
  globalKampus?: string;
  onSelectItem?: (item: JadwalItem) => void;
  className?: string;
  isChildDialogOpen?: boolean;
}

export function AslabRoomMonitor({
  items,
  isLoading,
  selectedDate,
  onDateChange,
  globalKampus,
  onSelectItem,
  className,
  isChildDialogOpen,
}: AslabRoomMonitorProps) {
  // Mode tampilan: "matriks" (Matrix Grid) vs "terpakai" (In-Use Cards) vs "jeda_kosong" (Empty Gaps)
  const [activeTab, setActiveTab] = React.useState<"terpakai" | "jeda_kosong" | "matriks">("matriks");
  const [selectedKampus, setSelectedKampus] = React.useState<string>(globalKampus || "Semua");
  const [filterType, setFilterType] = React.useState<"all" | "lab_only">("lab_only");
  const [searchRoom, setSearchRoom] = React.useState<string>("");
  const { currentMins, timeWibStr } = useGlobalTime(3000);
  const currentTimeWib = React.useMemo(() => {
    return timeWibStr ? timeWibStr.replace(" WIB", "") : "";
  }, [timeWibStr]);

  // Fullscreen & Modal states untuk tampilan Matriks
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = React.useState<boolean>(false);
  const activeModal = useJadwalStore((s) => s.activeModal);
  const openRoomModal = useJadwalStore((s) => s.openRoomModal);
  const openDetailModal = useJadwalStore((s) => s.openDetailModal);
  const openAttendanceModal = useJadwalStore((s) => s.openAttendanceModal);
  const closeModal = useJadwalStore((s) => s.closeModal);

  const isRoomModalOpen = activeModal?.type === "room";
  const currentRoom = activeModal?.type === "room" ? activeModal.room : null;
  const [cachedRoom, setCachedRoom] = React.useState<RoomGridItem | null>(currentRoom);

  React.useEffect(() => {
    if (currentRoom) {
      setCachedRoom(currentRoom);
    }
  }, [currentRoom]);

  const selectedRoomForModal = currentRoom || cachedRoom;
  const [modalPage, setModalPage] = React.useState<number>(1);
  const [modalLimit, setModalLimit] = React.useState<number>(12);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {
          setIsFullscreen((prev) => !prev);
        });
      } else {
        setIsFullscreen((prev) => !prev);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => { });
      }
      setIsFullscreen(false);
    }
  };

  React.useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Sinkronisasi filter kampus jika filter utama di FilterBar berubah
  React.useEffect(() => {
    if (globalKampus && (globalKampus === "Semua" || globalKampus === "Kampus Thehok" || globalKampus === "Kampus Kobar")) {
      setSelectedKampus(globalKampus);
    }
  }, [globalKampus]);


  // Hitung ruang yang sedang dipakai
  const { activeNow, allTodayUsed } = React.useMemo(() => {
    return getInUseRooms(items, currentTimeWib);
  }, [items, currentTimeWib]);

  // Ambil daftar ruangan yang ada di data
  const allKnownRooms = React.useMemo(() => {
    const fromItems = items.map((i) => i.ruangan).filter(Boolean);
    return Array.from(new Set([...UNAMA_LABS, ...fromItems]));
  }, [items]);

  // Hitung seluruh jeda kosong (hanya jika tanggal tertentu dipilih)
  const labGaps = React.useMemo(() => {
    if (!selectedDate) return [];
    return calculateLabGaps(items, allKnownRooms, selectedKampus);
  }, [items, allKnownRooms, selectedKampus, selectedDate]);

  // Filter daftar ruang terpakai
  const filteredUsedRooms = React.useMemo(() => {
    return allTodayUsed.filter((r) => {
      if (selectedKampus !== "Semua" && r.kampus !== selectedKampus) return false;
      if (filterType === "lab_only" && !r.isLabor) return false;
      if (
        searchRoom.trim() &&
        !r.ruangan.toLowerCase().includes(searchRoom.toLowerCase()) &&
        !r.mataKuliah.toLowerCase().includes(searchRoom.toLowerCase()) &&
        !r.dosen.toLowerCase().includes(searchRoom.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [allTodayUsed, selectedKampus, filterType, searchRoom]);

  // Pisahkan antara lab terpakai dan ruangan kelas biasa
  const usedLabs = React.useMemo(() => {
    return filteredUsedRooms.filter((r) => r.isLabor);
  }, [filteredUsedRooms]);

  const usedTheoryRooms = React.useMemo(() => {
    return filteredUsedRooms.filter((r) => !r.isLabor);
  }, [filteredUsedRooms]);

  // Filter daftar jeda kosong
  const filteredGaps = React.useMemo(() => {
    return labGaps.filter((gap) => {
      if (filterType === "lab_only" && !gap.isLabor) return false;
      if (
        searchRoom.trim() &&
        !gap.ruangan.toLowerCase().includes(searchRoom.toLowerCase()) &&
        !gap.formattedText.toLowerCase().includes(searchRoom.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [labGaps, filterType, searchRoom]);

  // Hitung jumlah lab yang sedang aktif saat ini
  const activeLabsNowCount = activeNow.filter((r) => r.isLabor).length;

  // Pagination states untuk menjaga performa rendering kartu agar tidak lagging
  const [labPage, setLabPage] = React.useState<number>(1);
  const [labLimit, setLabLimit] = React.useState<number>(12);

  const [theoryPage, setTheoryPage] = React.useState<number>(1);
  const [theoryLimit, setTheoryLimit] = React.useState<number>(12);

  const [gapsPage, setGapsPage] = React.useState<number>(1);
  const [gapsLimit, setGapsLimit] = React.useState<number>(12);

  // Reset pagination saat filter berubah
  React.useEffect(() => {
    setLabPage(1);
    setTheoryPage(1);
    setGapsPage(1);
  }, [selectedKampus, filterType, searchRoom, selectedDate, activeTab]);

  const paginatedLabs = React.useMemo(() => {
    const offset = (labPage - 1) * labLimit;
    return usedLabs.slice(offset, offset + labLimit);
  }, [usedLabs, labPage, labLimit]);

  const paginatedTheoryRooms = React.useMemo(() => {
    const offset = (theoryPage - 1) * theoryLimit;
    return usedTheoryRooms.slice(offset, offset + theoryLimit);
  }, [usedTheoryRooms, theoryPage, theoryLimit]);

  const paginatedGaps = React.useMemo(() => {
    const offset = (gapsPage - 1) * gapsLimit;
    return filteredGaps.slice(offset, offset + gapsLimit);
  }, [filteredGaps, gapsPage, gapsLimit]);

  // Data Ruangan untuk Tampilan Matriks Status Ruangan (Sesuai Layout Screenshot)
  const matrixRoomData = React.useMemo(() => {
    // 1. Kumpulkan semua master ruangan
    const roomList: MasterRoomDefinition[] = [...MASTER_ROOMS];

    // 2. Tambahkan ruangan tambahan dari data jadwal jika ada yang belum terdaftar di master
    for (const item of items) {
      if (!item.ruangan) continue;
      const itemCampus =
        (item.kampus as "Kampus Thehok" | "Kampus Kobar") ||
        (getCampusForRoom(item.ruangan, items) as "Kampus Thehok" | "Kampus Kobar");
      const isLab = isLabRoom(item.ruangan);
      const existing = roomList.find((r) => matchesRoom(item, r));
      if (!existing) {
        roomList.push({
          ruangan: item.ruangan,
          displayName: formatRoomDisplayName(item.ruangan),
          kampus: itemCampus || "Kampus Thehok",
          isLabor: isLab,
        });
      }
    }

    // 3. Proses status dan warna untuk setiap ruangan
    const processed: RoomGridItem[] = roomList.map((room) => {
      const roomClasses = items.filter((item) => matchesRoom(item, room));
      const physicalClasses = roomClasses.filter((c) => isPhysicalClass(c.status, c.ruangan));

      let status: RoomGridStatus = "kosong";
      let subtitle = "Kosong";
      let jamAwal: string | null = null;
      let colorClass = "bg-rose-600 hover:bg-rose-700 text-white border-transparent";
      let badgeColor = "bg-rose-600 text-white border-transparent";
      let dotColor = "bg-white";
      let subtitleColor = "text-rose-100";

      if (physicalClasses.length > 0) {
        const sorted = [...physicalClasses].sort(
          (a, b) => timeToMinutes(a.waktuMulai) - timeToMinutes(b.waktuMulai)
        );

        const targetDateStr = selectedDate ? formatDateDb(selectedDate) : sorted[0]?.tanggal;
        const isPast = targetDateStr ? isDatePast(targetDateStr) : false;
        const isFuture = targetDateStr ? isDateFuture(targetDateStr) : false;

        if (isPast) {
          status = "selesai";
          subtitle = `Selesai (${sorted.length})`;
          jamAwal = sorted[0].waktuMulai;
          colorClass = "bg-slate-600 hover:bg-slate-700 text-white border-transparent";
          badgeColor = "bg-slate-600 text-white border-transparent";
          dotColor = "bg-white/80";
          subtitleColor = "text-slate-100";
        } else if (isFuture) {
          status = "terjadwal";
          subtitle = `Terjadwal (${sorted.length})`;
          jamAwal = sorted[0].waktuMulai;
          colorClass = "bg-blue-600 hover:bg-blue-700 text-white border-transparent";
          badgeColor = "bg-blue-600 text-white border-transparent";
          dotColor = "bg-white";
          subtitleColor = "text-blue-100";
        } else {
          // Hari Ini: Evaluasi realtime berdasarkan jam
          const liveClass = sorted.find((c) => {
            const s = timeToMinutes(c.waktuMulai);
            const duration = c.sks ? c.sks * 45 : 90;
            const end = c.waktuSelesai ? timeToMinutes(c.waktuSelesai) : s + duration;
            return currentMins >= s && currentMins < end;
          });

          if (liveClass) {
            status = "dipakai";
            subtitle = "Sedang Dipakai";
            jamAwal = liveClass.waktuMulai;
            colorClass = "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent";
            badgeColor = "bg-emerald-600 text-white border-transparent";
            dotColor = "bg-white";
            subtitleColor = "text-emerald-100";
          } else {
            const firstStart = timeToMinutes(sorted[0].waktuMulai);
            const lastClass = sorted[sorted.length - 1];
            const lastDuration = lastClass.sks ? lastClass.sks * 45 : 90;
            const lastEnd = lastClass.waktuSelesai
              ? timeToMinutes(lastClass.waktuSelesai)
              : timeToMinutes(lastClass.waktuMulai) + lastDuration;

            if (currentMins < firstStart) {
              status = "terjadwal";
              subtitle = `Terjadwal (${sorted.length})`;
              jamAwal = sorted[0].waktuMulai;
              colorClass = "bg-blue-600 hover:bg-blue-700 text-white border-transparent";
              badgeColor = "bg-blue-600 text-white border-transparent";
              dotColor = "bg-white";
              subtitleColor = "text-blue-100";
            } else if (currentMins >= lastEnd) {
              status = "selesai";
              subtitle = `Selesai (${sorted.length})`;
              jamAwal = sorted[0].waktuMulai;
              colorClass = "bg-slate-600 hover:bg-slate-700 text-white border-transparent";
              badgeColor = "bg-slate-600 text-white border-transparent";
              dotColor = "bg-white/80";
              subtitleColor = "text-slate-100";
            } else {
              const nextClass = sorted.find((c) => timeToMinutes(c.waktuMulai) > currentMins);
              status = "jeda";
              subtitle = "Jeda";
              jamAwal = nextClass?.waktuMulai ?? sorted[0].waktuMulai;
              colorClass = "bg-amber-600 hover:bg-amber-700 text-white border-transparent";
              badgeColor = "bg-amber-600 text-white border-transparent";
              dotColor = "bg-white";
              subtitleColor = "text-amber-100";
            }
          }
        }
      }

      return {
        id: `${room.kampus}-${room.ruangan}`,
        ruangan: room.ruangan,
        displayName: room.displayName,
        kampus: room.kampus,
        isLabor: room.isLabor,
        status,
        subtitle,
        jamAwal,
        colorClass,
        badgeColor,
        dotColor,
        subtitleColor,
        classes: roomClasses,
      };
    });

    const naturalSort = (a: RoomGridItem, b: RoomGridItem) => {
      const idxA = MASTER_ROOMS.findIndex((m) => m.ruangan === a.ruangan && m.kampus === a.kampus);
      const idxB = MASTER_ROOMS.findIndex((m) => m.ruangan === b.ruangan && m.kampus === b.kampus);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.displayName.localeCompare(b.displayName, undefined, { numeric: true });
    };

    return {
      thehokLabs: processed.filter((r) => r.isLabor && r.kampus === "Kampus Thehok").sort(naturalSort),
      kobarLabs: processed.filter((r) => r.isLabor && r.kampus === "Kampus Kobar").sort(naturalSort),
      thehokTheoryRooms: processed.filter((r) => !r.isLabor && r.kampus === "Kampus Thehok").sort(naturalSort),
      kobarTheoryRooms: processed.filter((r) => !r.isLabor && r.kampus === "Kampus Kobar").sort(naturalSort),
      allGridRooms: processed,
    };
  }, [items, currentMins, selectedDate]);

  // Render Kartu Ruangan Matriks Berwarna Sesuai Screenshot Asli & globals.css (rounded-lg)
  const renderRoomGridCard = (room: RoomGridItem) => {
    const isHighlighted =
      !searchRoom.trim() ||
      room.displayName.toLowerCase().includes(searchRoom.toLowerCase()) ||
      room.ruangan.toLowerCase().includes(searchRoom.toLowerCase()) ||
      room.classes.some(
        (c) =>
          c.mataKuliah.toLowerCase().includes(searchRoom.toLowerCase()) ||
          c.dosen.toLowerCase().includes(searchRoom.toLowerCase()) ||
          c.kodeKelas.toLowerCase().includes(searchRoom.toLowerCase())
      );

    const isLongName = room.displayName.length > 11;

    return (
      <button
        key={`${room.kampus}-${room.ruangan}`}
        type="button"
        onClick={() => {
          openRoomModal(room);
          setModalPage(1);
        }}
        className={cn(
          "group relative flex flex-col items-center justify-center rounded-none text-center transition-all cursor-pointer shadow-xs",
          isFullscreen
            ? "px-2.5 py-3 min-h-[82px] sm:min-h-[88px]"
            : "px-2 py-2 sm:py-2.5 min-h-[66px] sm:min-h-[72px]",
          "border border-black/10 dark:border-white/10",
          "hover:opacity-95 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          room.colorClass,
          !isHighlighted && "opacity-25 grayscale-[60%]"
        )}
        title={`Klik untuk melihat jadwal ${room.displayName} (${room.subtitle})`}
      >
        <div className="absolute top-1.5 right-1.5 p-0.5 rounded-xs bg-white/15 group-hover:bg-white/25 transition-colors pointer-events-none z-10">
          <Lock className={cn(isFullscreen ? "size-2.5 sm:size-3" : "size-2.5", "text-white/90")} />
        </div>

        <span
          className={cn(
            "font-bold text-white leading-tight tracking-tight text-center line-clamp-1 w-full px-1",
            isFullscreen
              ? isLongName ? "text-xs sm:text-sm" : "text-sm sm:text-base"
              : isLongName ? "text-[11px] sm:text-xs" : "text-xs sm:text-[13px]"
          )}
        >
          {room.displayName}
        </span>
        <span
          className={cn(
            "leading-tight line-clamp-1 w-full px-1 font-medium",
            isFullscreen ? "text-xs mt-1" : "text-[10px] sm:text-[11px] mt-0.5",
            room.subtitleColor
          )}
        >
          {isFullscreen
            ? room.subtitle
                .replace(/^Terjadwal \((\d+)\)$/, "Terjadwal ($1 kelas)")
                .replace(/^Selesai \((\d+)\)$/, "Selesai ($1 kelas)")
            : room.subtitle}
        </span>
        {room.jamAwal && (
          <span
            className={cn(
              "font-mono font-bold tracking-tight leading-tight",
              isFullscreen ? "text-xs sm:text-sm mt-1" : "text-[10px] sm:text-[11px] mt-0.5",
              room.subtitleColor
            )}
          >
            {room.jamAwal.replace(/\s*WIB/i, "").trim()}
          </span>
        )}
      </button>
    );
  };

  return (
    <section
      ref={containerRef}
      aria-label="Panel Asisten Laboratorium"
      className={cn(
        "relative border border-primary/30 bg-card p-3 sm:p-6 shadow-xs transition-all",
        isFullscreen && "fixed inset-0 z-50 flex flex-col h-screen max-h-screen overflow-hidden bg-background p-3 sm:p-4 m-0 rounded-none border-none shadow-2xl",
        className
      )}
    >
      {/* Header Panel Aslab */}
      <div className="flex flex-col gap-2.5 pb-2.5 sm:pb-3 border-b border-border/70 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="space-y-0.5 sm:space-y-1">
          <h3 className="text-sm sm:text-xl font-bold tracking-tight text-foreground leading-snug">
            Status Penggunaan Ruangan
          </h3>
          <p className="text-[11px] sm:text-xs text-muted-foreground">
            Informasi real-time ruang kelas dan laboratorium aktif serta estimasi jeda waktu kosong.
          </p>
        </div>

          {/* Quick Tabs & Action Button: 3 Kolom Kompak di Mobile, Baris Elegan di Desktop */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1 sm:pt-0">
            {isFullscreen && (
              <LiveRunningClock className="h-7.5 sm:h-8 py-0 px-2.5 text-xs font-mono font-bold shrink-0 shadow-2xs" />
            )}

            <Button
              variant={activeTab === "matriks" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("matriks")}
              className={cn(
                "h-7.5 sm:h-8 px-2 sm:px-3 gap-1 sm:gap-1.5 cursor-pointer text-[11px] sm:text-xs rounded-none justify-center transition-colors font-semibold",
                activeTab === "matriks"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 border-transparent"
                  : "border-blue-500/40 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10"
              )}
            >
              <LayoutGrid className={cn("size-3 sm:size-3.5 shrink-0", activeTab === "matriks" ? "text-primary-foreground" : "text-blue-600 dark:text-blue-400")} />
              <span className="truncate">
                Matriks<span className="hidden sm:inline"> Ruangan</span>
              </span>
            </Button>

            <Button
              variant={activeTab === "terpakai" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("terpakai")}
              className="h-7.5 sm:h-8 px-2 sm:px-3 gap-1 sm:gap-1.5 cursor-pointer text-[11px] sm:text-xs rounded-none justify-center"
            >
              <DoorClosed className="size-3 sm:size-3.5 shrink-0" />
              <span className="truncate">
                <span className="hidden sm:inline">Ruang </span>Terpakai ({filteredUsedRooms.length})
              </span>
            </Button>
          </div>
        </div>

      {/* Sub-Filters: Unified Control Toolbar */}
      <div className="flex flex-col gap-2.5 py-2.5 sm:py-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 text-xs">
        {/* Kontrol Kalender & Filter Kampus Segmented Group */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {onDateChange && (
            <DateSelector selectedDate={selectedDate || null} onDateChange={onDateChange} />
          )}

          {/* Segmented Campus Switcher */}
          <div className="hidden sm:inline-flex items-center border border-border bg-muted/40 p-0.5">
            {["Semua", "Kampus Thehok", "Kampus Kobar"].map((kp) => (
              <button
                key={kp}
                type="button"
                onClick={() => setSelectedKampus(kp)}
                aria-pressed={selectedKampus === kp}
                className={cn(
                  "px-2.5 py-1 text-xs transition-colors cursor-pointer rounded-none",
                  selectedKampus === kp
                    ? "bg-background text-foreground font-semibold shadow-2xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50 border border-transparent"
                )}
              >
                {kp === "Kampus Thehok" ? "Thehok" : kp === "Kampus Kobar" ? "Kobar" : kp}
              </button>
            ))}
          </div>

          {activeTab !== "matriks" && (
            <button
              type="button"
              onClick={() => setFilterType(filterType === "lab_only" ? "all" : "lab_only")}
              className={cn(
                "hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs border transition-colors cursor-pointer rounded-none",
                filterType === "lab_only"
                  ? "border-primary/50 bg-primary/10 text-primary font-medium"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              <Layers className="size-3" />
              <span>{filterType === "lab_only" ? "Khusus Lab" : "Semua Ruangan"}</span>
            </button>
          )}
        </div>

        {/* Sisi Kanan: Search Input & Action Tools */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeTab === "matriks" && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="h-7.5 sm:h-7 px-2.5 gap-1.5 cursor-pointer text-xs rounded-none border-border hover:bg-muted font-medium shrink-0"
              title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
            >
              {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
              <span className="hidden md:inline">{isFullscreen ? "Keluar Fullscreen" : "Layar Penuh"}</span>
            </Button>
          )}

          {/* Input Pencarian Ruangan */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
            <Input
              value={searchRoom}
              onChange={(e) => setSearchRoom(e.target.value)}
              placeholder="Cari ruang / matkul..."
              className="pl-7 pr-7 h-7.5 sm:h-7 text-xs rounded-none"
            />
            {searchRoom && (
              <button
                type="button"
                onClick={() => setSearchRoom("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Hapus pencarian"
                aria-label="Hapus pencarian"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* Tombol Filter Kampus & Khusus Lab untuk tampilan mobile */}
        <div className="flex sm:hidden flex-col gap-1.5 pt-0.5 w-full">
          <div className="grid grid-cols-3 gap-1 w-full border border-border bg-muted/40 p-0.5">
            {["Semua", "Kampus Thehok", "Kampus Kobar"].map((kp) => (
              <button
                key={kp}
                type="button"
                onClick={() => setSelectedKampus(kp)}
                aria-pressed={selectedKampus === kp}
                className={cn(
                  "h-7 text-center text-xs transition-colors cursor-pointer rounded-none truncate",
                  selectedKampus === kp
                    ? "bg-background text-foreground font-semibold shadow-2xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {kp === "Kampus Thehok" ? "Thehok" : kp === "Kampus Kobar" ? "Kobar" : kp}
              </button>
            ))}
          </div>

          {activeTab !== "matriks" && (
            <button
              type="button"
              onClick={() => setFilterType(filterType === "lab_only" ? "all" : "lab_only")}
              className={cn(
                "w-full h-7 px-2.5 text-xs border transition-colors cursor-pointer flex items-center justify-center gap-1.5 rounded-none font-medium",
                filterType === "lab_only"
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              <Layers className="size-3.5 shrink-0" />
              <span>{filterType === "lab_only" ? "Khusus Lab" : "Semua Ruangan"}</span>
            </button>
          )}
        </div>
      </div>

      {/* KONTEN TAB 1: CARD RUANG TERPAKAI (SINKRON DENGAN SCHEDULE-GRID.TSX) */}
      {activeTab === "terpakai" && (
        <div className="pt-4 space-y-6">
          {/* Quick Summary Pill Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-xs">
            <div className="p-2 sm:p-2.5 border border-border bg-muted/20">
              <span className="text-muted-foreground text-[10px] sm:text-[11px] block truncate">
                Lab Sedang Berlangsung
              </span>
              <span className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 block truncate">
                <strong className="font-bold">{activeLabsNowCount}</strong> Lab Aktif
              </span>
            </div>
            <div className="p-2 sm:p-2.5 border border-border bg-muted/20">
              <span className="text-muted-foreground text-[10px] sm:text-[11px] block truncate">
                Total Lab Terpakai Hari Ini
              </span>
              <span className="text-xs sm:text-sm font-semibold text-foreground mt-0.5 block truncate">
                <strong className="font-bold">{usedLabs.length}</strong> Sesi Lab
              </span>
            </div>
            <div className="p-2 sm:p-2.5 border border-border bg-muted/20">
              <span className="text-muted-foreground text-[10px] sm:text-[11px] block truncate">
                Ruang Kelas Teori Terpakai
              </span>
              <span className="text-xs sm:text-sm font-semibold text-foreground mt-0.5 block truncate">
                <strong className="font-bold">{usedTheoryRooms.length}</strong> Kelas
              </span>
            </div>
            <div className="p-2 sm:p-2.5 border border-border bg-muted/20">
              <span className="text-muted-foreground text-[10px] sm:text-[11px] block truncate">
                Jeda Waktu Terbuka
              </span>
              <span className="text-xs sm:text-sm font-semibold text-primary mt-0.5 block truncate">
                <strong className="font-bold">{filteredGaps.length}</strong> Slot Kosong
              </span>
            </div>
          </div>

          {/* Section 1: Laboratorium Sedang Dipakai */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="size-4 text-primary shrink-0" />
                <h4 className="text-sm font-semibold text-foreground">
                  Laboratorium Komputer Terpakai ({usedLabs.length})
                </h4>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {usedLabs.filter((l) => l.isLiveNow).length} Sedang Berjalan Sekarang
              </span>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col justify-between gap-3 border border-border bg-card p-4 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : usedLabs.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-border bg-muted/10 text-xs text-muted-foreground">
                <DoorOpen className="size-6 mx-auto mb-2 opacity-50" />
                Tidak ada laboratorium yang sedang terpakai pada kriteria ini.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedLabs.map((room) => {
                  const rawItem = room.rawItem || {
                    id: room.id,
                    hari: "Hari Ini",
                    tanggal: selectedDate ? selectedDate.toLocaleDateString("id-ID") : "Aktif",
                    waktuMulai: room.waktuMulai,
                    dosen: room.dosen,
                    kodeKelas: room.kodeKelas,
                    mataKuliah: room.mataKuliah,
                    kampus: room.kampus,
                    ruangan: room.ruangan,
                    status: room.status,
                  };

                  return (
                    <div
                      key={room.id}
                      role={onSelectItem ? "button" : undefined}
                      tabIndex={onSelectItem ? 0 : undefined}
                      onClick={() => onSelectItem && onSelectItem(rawItem)}
                      onKeyDown={(e) => {
                        if (onSelectItem && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          onSelectItem(rawItem);
                        }
                      }}
                      className={cn(
                        "group relative flex flex-col justify-between gap-3 border bg-card p-4 text-left shadow-xs transition-all",
                        onSelectItem ? "cursor-pointer hover:border-primary/50 hover:shadow-sm hover:bg-muted/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : "",
                        room.isLiveNow
                          ? "border-emerald-500/60 ring-1 ring-emerald-500/30"
                          : "border-border"
                      )}
                    >
                      {/* Header Row: Jam Mulai, Kode Kelas, Status (Sinkron persis dengan ScheduleGrid) */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center flex-wrap gap-2">
                          <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium text-foreground bg-muted/60 px-2.5 py-0.5 border border-border">
                            <Clock className="size-3.5 text-muted-foreground shrink-0" />
                            <span>{room.waktuMulai} - {room.waktuSelesai} WIB</span>
                          </div>
                          <div className="flex items-center font-mono text-[11px] font-bold px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/30 dark:bg-primary/20 dark:border-primary/40">
                            <span className="tracking-wider">{room.kodeKelas}</span>
                          </div>
                        </div>

                        {room.isLiveNow ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 bg-emerald-500 text-white dark:bg-emerald-600">
                            <span className="size-1.5 rounded-full bg-white animate-ping" />
                            LIVE
                          </span>
                        ) : (
                          <RealtimeStatusBadge
                            status={room.status}
                            waktuMulai={room.waktuMulai}
                            tanggal={rawItem.tanggal}
                            currentMins={currentMins}
                            className="text-[11px] px-2.5 py-0.5 h-auto"
                          />
                        )}
                      </div>

                      {/* Course Name & Lecturer (Sinkron persis dengan ScheduleGrid) */}
                      <div className="space-y-1.5">
                        <h3
                          className="font-heading text-sm sm:text-base font-semibold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2"
                          title={room.mataKuliah}
                        >
                          {room.mataKuliah}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title={room.dosen}>
                          <User className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="font-medium text-foreground/90 truncate">{formatDosenName(room.dosen)}</span>
                        </div>
                      </div>

                      {/* Info Row: Status Live / Hari & Ruangan / Kampus (Sinkron persis dengan ScheduleGrid) */}
                      <div className="space-y-2 pt-2 border-t border-border text-xs">
                        <div className="flex items-center justify-between gap-2 text-foreground font-medium">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                            <span>{rawItem.hari}, {rawItem.tanggal}</span>
                          </div>
                          {room.isLiveNow && (
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              Sedang Digunakan
                            </span>
                          )}
                        </div>

                        {/* Ruangan & Lokasi Kampus */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                          <div className="flex items-center gap-1.5 font-bold text-foreground">
                            <DoorOpen className="size-4 text-primary shrink-0" />
                            <span className="truncate">{room.ruangan}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                            <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">{room.kampus}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls untuk Laboratorium Terpakai */}
            {usedLabs.length > 0 && (
              <PaginationControls
                currentPage={labPage}
                totalPages={Math.max(1, Math.ceil(usedLabs.length / labLimit))}
                totalItems={usedLabs.length}
                limit={labLimit}
                onPageChange={setLabPage}
                onLimitChange={(l) => {
                  setLabLimit(l);
                  setLabPage(1);
                }}
              />
            )}
          </div>

          {/* Section 2: Ruang Kelas Teori (Jika tidak dibatasi ke lab only) */}
          {filterType === "all" && usedTheoryRooms.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Building2 className="size-4 text-muted-foreground" />
                  Ruang Kelas Teori Terpakai ({usedTheoryRooms.length})
                </h4>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedTheoryRooms.map((room) => {
                  const rawItem = room.rawItem || {
                    id: room.id,
                    hari: "Hari Ini",
                    tanggal: selectedDate ? selectedDate.toLocaleDateString("id-ID") : "Aktif",
                    waktuMulai: room.waktuMulai,
                    dosen: room.dosen,
                    kodeKelas: room.kodeKelas,
                    mataKuliah: room.mataKuliah,
                    kampus: room.kampus,
                    ruangan: room.ruangan,
                    status: room.status,
                  };

                  return (
                    <div
                      key={room.id}
                      role={onSelectItem ? "button" : undefined}
                      tabIndex={onSelectItem ? 0 : undefined}
                      onClick={() => onSelectItem && onSelectItem(rawItem)}
                      onKeyDown={(e) => {
                        if (onSelectItem && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          onSelectItem(rawItem);
                        }
                      }}
                      className={cn(
                        "group relative flex flex-col justify-between gap-3 border border-border bg-card p-4 text-left shadow-xs transition-all",
                        onSelectItem ? "cursor-pointer hover:border-primary/50 hover:shadow-sm hover:bg-muted/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : ""
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center flex-wrap gap-2">
                          <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium text-foreground bg-muted/60 px-2.5 py-0.5 border border-border">
                            <Clock className="size-3.5 text-muted-foreground shrink-0" />
                            <span>{room.waktuMulai} - {room.waktuSelesai} WIB</span>
                          </div>
                          <div className="flex items-center font-mono text-[11px] font-bold px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/30 dark:bg-primary/20 dark:border-primary/40">
                            <span className="tracking-wider">{room.kodeKelas}</span>
                          </div>
                        </div>
                        {room.isLiveNow ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 bg-emerald-500 text-white dark:bg-emerald-600">
                            <span className="size-1.5 rounded-full bg-white animate-ping" />
                            LIVE
                          </span>
                        ) : (
                          <RealtimeStatusBadge
                            status={room.status}
                            waktuMulai={room.waktuMulai}
                            tanggal={rawItem.tanggal}
                            currentMins={currentMins}
                            className="text-[11px] px-2.5 py-0.5 h-auto"
                          />
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <h3
                          className="font-heading text-sm sm:text-base font-semibold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2"
                          title={room.mataKuliah}
                        >
                          {room.mataKuliah}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title={room.dosen}>
                          <User className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="font-medium text-foreground/90 truncate">{formatDosenName(room.dosen)}</span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-border text-xs">
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                          <span>{rawItem.hari}, {rawItem.tanggal}</span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                          <div className="flex items-center gap-1.5 font-bold text-foreground">
                            <DoorOpen className="size-4 text-primary shrink-0" />
                            <span className="truncate">{room.ruangan}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                            <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">{room.kampus}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls untuk Ruang Kelas Teori Terpakai */}
              {usedTheoryRooms.length > 0 && (
                <PaginationControls
                  currentPage={theoryPage}
                  totalPages={Math.max(1, Math.ceil(usedTheoryRooms.length / theoryLimit))}
                  totalItems={usedTheoryRooms.length}
                  limit={theoryLimit}
                  onPageChange={setTheoryPage}
                  onLimitChange={(l) => {
                    setTheoryLimit(l);
                    setTheoryPage(1);
                  }}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* KONTEN TAB 2: INFORMASI JEDA RUANG LABOR KOSONG (SINKRON PERSIS DENGAN VISUAL SCHEDULE-GRID) */}
      {activeTab === "jeda_kosong" && (
        <div className="pt-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs">
            <div className="flex items-center gap-2">
              <Info className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p>
                <strong>Daftar Jeda Ruangan Kosong:</strong> Waktu senggang antar sesi perkuliahan untuk pemeliharaan, praktikum mandiri, atau kegiatan aslab.
              </p>
            </div>
            <span className="font-mono text-[11px] shrink-0 font-medium">
              Kobar: hingga 17:00 WIB • Thehok: hingga selesai
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col justify-between gap-3 border border-border bg-card p-4 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : !selectedDate ? (
            <div className="p-8 text-center border border-dashed border-border text-xs text-muted-foreground">
              Mode &quot;Semua Tanggal&quot; aktif. Silakan pilih tanggal spesifik pada kalender di atas untuk melihat estimasi jeda waktu ruangan kosong harian.
            </div>
          ) : filteredGaps.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border text-xs text-muted-foreground">
              Tidak ditemukan jeda kosong pada filter yang dipilih.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedGaps.map((gap) => (
                  <div
                    key={gap.id}
                    className="group relative flex flex-col justify-between gap-3 border border-border bg-card p-4 text-left shadow-xs transition-all hover:border-emerald-500/60 hover:shadow-sm hover:bg-muted/15"
                  >
                    {/* Header Row: Jam Rentang Kosong di Kiri, Badge Jeda di Kanan (Konsisten 1 Baris Rapi) */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium text-foreground bg-muted/60 px-2.5 py-0.5 border border-border shrink-0">
                        <Clock className="size-3.5 text-muted-foreground shrink-0" />
                        <span>{gap.waktuMulai} - {gap.waktuSelesai} WIB</span>
                      </div>
                      <div className="flex items-center font-mono text-[11px] font-bold px-2.5 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
                        <Timer className="size-3 text-emerald-600 dark:text-emerald-400 mr-1 shrink-0" />
                        <span className="tracking-wider">JEDA {gap.totalJamText.toUpperCase()}</span>
                      </div>
                    </div>

                    {/* Title & Subtitle: Ringkas dan Informatif (Sinkron dengan ScheduleGrid) */}
                    <div className="space-y-1.5">
                      <h3
                        className="font-heading text-sm sm:text-base font-semibold leading-snug text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1"
                        title={gap.formattedText}
                      >
                        {gap.ruangan.toLowerCase().startsWith("labor") || gap.ruangan.toLowerCase().startsWith("ruang")
                          ? gap.ruangan
                          : `Ruang ${gap.ruangan}`}
                      </h3>
                      <div className="text-xs text-muted-foreground space-y-0.5 min-h-[36px]">
                        {gap.tipeJeda === "seharian_kosong" ? (
                          <>
                            <div className="line-clamp-2 leading-relaxed">
                              {gap.onlineClasses && gap.onlineClasses.length > 0 ? (
                                <span>
                                  <span className="text-muted-foreground">Sesi daring: </span>
                                  {gap.onlineClasses.map((c, idx) => (
                                    <React.Fragment key={idx}>
                                      {idx > 0 && <span className="text-muted-foreground mr-1">,</span>}
                                      {c.rawItem && onSelectItem ? (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectItem(c.rawItem!);
                                          }}
                                          className="hover:underline cursor-pointer font-medium text-foreground group-hover:text-primary transition-colors inline"
                                          title={`Buka detail kelas: ${c.mataKuliah} (${c.dosen})`}
                                        >
                                          {c.mataKuliah}
                                        </button>
                                      ) : (
                                        <span className="font-medium text-foreground">{c.mataKuliah}</span>
                                      )}
                                      <ClassStatusTag status={c.status || c.rawItem?.status} />
                                    </React.Fragment>
                                  ))}
                                </span>
                              ) : (
                                <span>Kosong seharian</span>
                              )}
                            </div>
                            <div className="truncate text-foreground/80">
                              {gap.onlineClasses && gap.onlineClasses.length > 0
                                ? `Lab kosong fisik seharian (Tutup ${gap.waktuSelesai} WIB)`
                                : `Lab tutup ${gap.waktuSelesai} WIB`}
                            </div>
                          </>
                        ) : gap.tipeJeda === "antar_kelas" ? (
                          <>
                            <div className="truncate">
                              {gap.sebelumKelas?.rawItem && onSelectItem ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectItem(gap.sebelumKelas!.rawItem!);
                                  }}
                                  className="group/btn inline text-left hover:underline cursor-pointer transition-colors max-w-full"
                                  title={`Buka detail kelas: ${gap.sebelumKelas.mataKuliah} (${gap.sebelumKelas.dosen})`}
                                >
                                  <span>Setelah </span>
                                  <strong className="font-medium text-foreground group-hover/btn:text-primary">
                                    {gap.sebelumKelas.mataKuliah}
                                  </strong>
                                  <ClassStatusTag status={gap.sebelumKelas.status || gap.sebelumKelas.rawItem?.status} />
                                </button>
                              ) : (
                                <span title={`Setelah ${gap.sebelumKelas?.mataKuliah}`}>
                                  <span>Setelah </span>
                                  <span className="font-medium text-foreground">{gap.sebelumKelas?.mataKuliah}</span>
                                  <ClassStatusTag status={gap.sebelumKelas?.status || gap.sebelumKelas?.rawItem?.status} />
                                </span>
                              )}
                            </div>
                            <div className="truncate">
                              {gap.setelahKelas?.rawItem && onSelectItem ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectItem(gap.setelahKelas!.rawItem!);
                                  }}
                                  className="group/btn inline text-left hover:underline cursor-pointer transition-colors max-w-full"
                                  title={`Buka detail kelas: ${gap.setelahKelas.mataKuliah} (${gap.setelahKelas.dosen})`}
                                >
                                  <span>Sebelum </span>
                                  <strong className="font-medium text-foreground group-hover/btn:text-primary">
                                    {gap.setelahKelas.mataKuliah}
                                  </strong>
                                  <ClassStatusTag status={gap.setelahKelas.status || gap.setelahKelas.rawItem?.status} />
                                </button>
                              ) : (
                                <span className="text-foreground/80" title={`Sebelum ${gap.setelahKelas?.mataKuliah}`}>
                                  <span>Sebelum </span>
                                  <span className="font-medium text-foreground">{gap.setelahKelas?.mataKuliah}</span>
                                  <ClassStatusTag status={gap.setelahKelas?.status || gap.setelahKelas?.rawItem?.status} />
                                </span>
                              )}
                            </div>
                          </>
                        ) : gap.tipeJeda === "sebelum_kelas" ? (
                          <>
                            <div className="line-clamp-2 leading-relaxed">
                              {gap.onlineClasses && gap.onlineClasses.length > 0 ? (
                                <span>
                                  <span className="text-muted-foreground">Sesi daring: </span>
                                  {gap.onlineClasses.map((c, idx) => (
                                    <React.Fragment key={idx}>
                                      {idx > 0 && <span className="text-muted-foreground mr-1">,</span>}
                                      {c.rawItem && onSelectItem ? (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectItem(c.rawItem!);
                                          }}
                                          className="hover:underline cursor-pointer font-medium text-foreground group-hover:text-primary transition-colors inline"
                                          title={`Buka detail kelas: ${c.mataKuliah} (${c.dosen})`}
                                        >
                                          {c.mataKuliah}
                                        </button>
                                      ) : (
                                        <span className="font-medium text-foreground">{c.mataKuliah}</span>
                                      )}
                                      <ClassStatusTag status={c.status || c.rawItem?.status} />
                                    </React.Fragment>
                                  ))}
                                </span>
                              ) : (
                                <span>Awal hari</span>
                              )}
                            </div>
                            <div className="truncate">
                              {gap.setelahKelas?.rawItem && onSelectItem ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectItem(gap.setelahKelas!.rawItem!);
                                  }}
                                  className="group/btn inline text-left hover:underline cursor-pointer transition-colors max-w-full"
                                  title={`Buka detail kelas: ${gap.setelahKelas.mataKuliah} (${gap.setelahKelas.dosen})`}
                                >
                                  <span>Sebelum </span>
                                  <strong className="font-medium text-foreground group-hover/btn:text-primary">
                                    {gap.setelahKelas.mataKuliah}
                                  </strong>
                                  <ClassStatusTag status={gap.setelahKelas.status || gap.setelahKelas.rawItem?.status} />
                                </button>
                              ) : (
                                <span className="text-foreground/80" title={`Sebelum ${gap.setelahKelas?.mataKuliah}`}>
                                  <span>Sebelum </span>
                                  <span className="font-medium text-foreground">{gap.setelahKelas?.mataKuliah}</span>
                                  <ClassStatusTag status={gap.setelahKelas?.status || gap.setelahKelas?.rawItem?.status} />
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="truncate">
                              {gap.sebelumKelas?.rawItem && onSelectItem ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectItem(gap.sebelumKelas!.rawItem!);
                                  }}
                                  className="group/btn inline text-left hover:underline cursor-pointer transition-colors max-w-full"
                                  title={`Buka detail kelas: ${gap.sebelumKelas.mataKuliah} (${gap.sebelumKelas.dosen})`}
                                >
                                  <span>Setelah </span>
                                  <strong className="font-medium text-foreground group-hover/btn:text-primary">
                                    {gap.sebelumKelas.mataKuliah}
                                  </strong>
                                  <ClassStatusTag status={gap.sebelumKelas.status || gap.sebelumKelas.rawItem?.status} />
                                </button>
                              ) : (
                                <span title={`Setelah ${gap.sebelumKelas?.mataKuliah}`}>
                                  <span>Setelah </span>
                                  <span className="font-medium text-foreground">{gap.sebelumKelas?.mataKuliah}</span>
                                  <ClassStatusTag status={gap.sebelumKelas?.status || gap.sebelumKelas?.rawItem?.status} />
                                </span>
                              )}
                            </div>
                            <div className="line-clamp-2 leading-relaxed text-foreground/80">
                              {gap.onlineClasses && gap.onlineClasses.length > 0 ? (
                                <span>
                                  <span className="text-muted-foreground">Sesi daring: </span>
                                  {gap.onlineClasses.map((c, idx) => (
                                    <React.Fragment key={idx}>
                                      {idx > 0 && <span className="text-muted-foreground mr-1">,</span>}
                                      {c.rawItem && onSelectItem ? (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectItem(c.rawItem!);
                                          }}
                                          className="hover:underline cursor-pointer font-medium text-foreground group-hover:text-primary transition-colors inline"
                                          title={`Buka detail kelas: ${c.mataKuliah} (${c.dosen})`}
                                        >
                                          {c.mataKuliah}
                                        </button>
                                      ) : (
                                        <span className="font-medium text-foreground">{c.mataKuliah}</span>
                                      )}
                                      <ClassStatusTag status={c.status || c.rawItem?.status} />
                                    </React.Fragment>
                                  ))}
                                </span>
                              ) : (
                                `Hingga lab tutup (${gap.waktuSelesai} WIB)`
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Clear & Legible Info Row: Status & Ruangan/Kampus (Sinkron persis dengan ScheduleGrid) */}
                    <div className="space-y-2 pt-2 border-t border-border text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-medium">
                        <CheckCircle2 className="size-3.5 shrink-0" />
                        <span>Status: Ruangan Tersedia / Kosong</span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                          <User className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="truncate">{getLabCaretaker(gap.ruangan)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                          <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{gap.kampus}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls untuk Jeda Kosong */}
              {filteredGaps.length > 0 && (
                <PaginationControls
                  currentPage={gapsPage}
                  totalPages={Math.max(1, Math.ceil(filteredGaps.length / gapsLimit))}
                  totalItems={filteredGaps.length}
                  limit={gapsLimit}
                  onPageChange={setGapsPage}
                  onLimitChange={(l) => {
                    setGapsLimit(l);
                    setGapsPage(1);
                  }}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* KONTEN TAB 3: STATUS PENGGUNAAN RUANGAN (MATRIKS GRID SESUAI SCREENSHOT) */}
      {activeTab === "matriks" && (
        <div className={cn("space-y-4", isFullscreen ? "pt-2 flex-1 flex flex-col overflow-y-auto" : "pt-4")}>
          {/* Top Bar Matriks: Total Ruangan Badge & Status Legend Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-border/60 shrink-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono font-medium rounded-none border-border bg-muted/30">
                {matrixRoomData.allGridRooms.length} Ruangan Terpantau
              </Badge>
            </div>

            {/* Legenda Warna Status Terpadu */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-medium text-muted-foreground bg-muted/20 px-2.5 py-0.5 sm:py-1 border border-border/50">
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <span className="size-2 rounded-full bg-emerald-600" />
                <span>Dipakai</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <span className="size-2 rounded-full bg-amber-600" />
                <span>Jeda</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <span className="size-2 rounded-full bg-rose-600" />
                <span>Kosong</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <span className="size-2 rounded-full bg-blue-600" />
                <span>Terjadwal</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <span className="size-2 rounded-full bg-slate-600" />
                <span>Selesai</span>
              </span>
            </div>
          </div>

          {/* 2 Kontainer Bersisian: Laboratorium (Kiri) vs Ruangan Kelas Teori (Kanan) */}
          {isLoading ? (
            <div className={cn("grid grid-cols-1 xl:grid-cols-2 items-start flex-1", isFullscreen ? "gap-4 sm:gap-6" : "gap-4 sm:gap-5")}>
              {/* SKELETON CONTAINER 1: Laboratorium Komputer */}
              <div className={cn("border border-border shadow-xs rounded-none", isFullscreen ? "p-3.5 sm:p-5 space-y-4 bg-card" : "p-3 sm:p-4 space-y-3 bg-muted/20 dark:bg-card/40")}>
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-6" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
                <div className={cn("grid grid-cols-2 sm:grid-cols-4", isFullscreen ? "gap-2.5 sm:gap-3" : "gap-2 sm:gap-2.5")}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className={cn("w-full", isFullscreen ? "h-20 sm:h-22" : "h-16 sm:h-18")} />
                  ))}
                </div>
              </div>

              {/* SKELETON CONTAINER 2: Ruangan Kelas Teori */}
              <div className={cn("border border-border shadow-xs rounded-none", isFullscreen ? "p-3.5 sm:p-5 space-y-4 bg-card" : "p-3 sm:p-4 space-y-3 bg-muted/20 dark:bg-card/40")}>
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-6" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
                <div className={cn("grid grid-cols-2 sm:grid-cols-4", isFullscreen ? "gap-2.5 sm:gap-3" : "gap-2 sm:gap-2.5")}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className={cn("w-full", isFullscreen ? "h-20 sm:h-22" : "h-16 sm:h-18")} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className={cn("grid grid-cols-1 xl:grid-cols-2 items-start", isFullscreen ? "gap-4 sm:gap-6 flex-1" : "gap-4 sm:gap-5")}>
              {/* CONTAINER 1: Laboratorium Komputer */}
              <div className={cn("border border-border shadow-xs rounded-none", isFullscreen ? "p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 bg-card" : "p-3 sm:p-4 space-y-3 bg-muted/20 dark:bg-card/40")}>
                <div className="flex items-center justify-between border-b border-border pb-2 sm:pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1 border border-primary/20 bg-primary/10 text-primary rounded-none">
                      <Monitor className="size-3.5 sm:size-4" />
                    </div>
                    <h4 className={cn("font-heading font-bold text-foreground tracking-tight", isFullscreen ? "text-xs sm:text-sm md:text-base" : "text-xs sm:text-sm")}>
                      Laboratorium Komputer
                    </h4>
                  </div>
                  <Badge variant="outline" className="text-[10px] sm:text-[11px] font-mono rounded-none border-border">
                    {matrixRoomData.thehokLabs.length + matrixRoomData.kobarLabs.length} Labor
                  </Badge>
                </div>

                {/* Subgroup Thehok */}
                {(selectedKampus === "Semua" || selectedKampus === "Kampus Thehok") && matrixRoomData.thehokLabs.length > 0 && (
                  <div className={cn(isFullscreen ? "space-y-2" : "space-y-1.5 sm:space-y-2")}>
                    {selectedKampus === "Semua" && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <span className="size-1.5 bg-primary rounded-full" />
                        <span>Kampus Thehok</span>
                      </div>
                    )}
                    <div className={cn("grid grid-cols-2 sm:grid-cols-4", isFullscreen ? "gap-2.5 sm:gap-3" : "gap-2 sm:gap-2.5")}>
                      {matrixRoomData.thehokLabs.map((room) => renderRoomGridCard(room))}
                    </div>
                  </div>
                )}

                {/* Subgroup Kobar */}
                {(selectedKampus === "Semua" || selectedKampus === "Kampus Kobar") && matrixRoomData.kobarLabs.length > 0 && (
                  <div className={cn(isFullscreen ? "space-y-2" : "space-y-1.5 sm:space-y-2", selectedKampus === "Semua" && "pt-2.5 border-t border-border/60")}>
                    {selectedKampus === "Semua" && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <span className="size-1.5 bg-primary rounded-full" />
                        <span>Kampus Kobar</span>
                      </div>
                    )}
                    <div className={cn("grid grid-cols-2 sm:grid-cols-4", isFullscreen ? "gap-2.5 sm:gap-3" : "gap-2 sm:gap-2.5")}>
                      {matrixRoomData.kobarLabs.map((room) => renderRoomGridCard(room))}
                    </div>
                  </div>
                )}
              </div>

              {/* CONTAINER 2: Ruangan Kelas Teori */}
              <div className={cn("border border-border shadow-xs rounded-none", isFullscreen ? "p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 bg-card" : "p-3 sm:p-4 space-y-3 bg-muted/20 dark:bg-card/40")}>
                <div className="flex items-center justify-between border-b border-border pb-2 sm:pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1 border border-primary/20 bg-primary/10 text-primary rounded-none">
                      <Building2 className="size-3.5 sm:size-4" />
                    </div>
                    <h4 className={cn("font-heading font-bold text-foreground tracking-tight", isFullscreen ? "text-xs sm:text-sm md:text-base" : "text-xs sm:text-sm")}>
                      Ruangan Kelas Teori
                    </h4>
                  </div>
                  <Badge variant="outline" className="text-[10px] sm:text-[11px] font-mono rounded-none border-border">
                    {matrixRoomData.thehokTheoryRooms.length + matrixRoomData.kobarTheoryRooms.length} Ruangan
                  </Badge>
                </div>

                {/* Subgroup Thehok */}
                {(selectedKampus === "Semua" || selectedKampus === "Kampus Thehok") && matrixRoomData.thehokTheoryRooms.length > 0 && (
                  <div className={cn(isFullscreen ? "space-y-2" : "space-y-1.5 sm:space-y-2")}>
                    {selectedKampus === "Semua" && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <span className="size-1.5 bg-primary rounded-full" />
                        <span>Kampus Thehok</span>
                      </div>
                    )}
                    <div className={cn("grid grid-cols-2 sm:grid-cols-4", isFullscreen ? "gap-2.5 sm:gap-3" : "gap-2 sm:gap-2.5")}>
                      {matrixRoomData.thehokTheoryRooms.map((room) => renderRoomGridCard(room))}
                    </div>
                  </div>
                )}

                {/* Subgroup Kobar */}
                {(selectedKampus === "Semua" || selectedKampus === "Kampus Kobar") && matrixRoomData.kobarTheoryRooms.length > 0 && (
                  <div className={cn(isFullscreen ? "space-y-2" : "space-y-1.5 sm:space-y-2", selectedKampus === "Semua" && "pt-2.5 border-t border-border/60")}>
                    {selectedKampus === "Semua" && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <span className="size-1.5 bg-primary rounded-full" />
                        <span>Kampus Kobar</span>
                      </div>
                    )}
                    <div className={cn("grid grid-cols-2 sm:grid-cols-4", isFullscreen ? "gap-2.5 sm:gap-3" : "gap-2 sm:gap-2.5")}>
                      {matrixRoomData.kobarTheoryRooms.map((room) => renderRoomGridCard(room))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Dialog Detail Jadwal Ruangan Terpilih (Sesuai Style Bawaan globals.css) */}
      <Dialog
        open={isRoomModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeModal();
          }
        }}
      >
        <DialogContent
          className="w-full sm:max-w-2xl md:max-w-3xl max-h-[88vh] overflow-y-auto p-4 sm:p-6 text-sm rounded-none border border-border bg-card"
        >
          <DialogHeader className="pb-3 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pr-6">
              <DialogTitle className="text-lg sm:text-xl font-heading font-bold flex items-center gap-2.5 text-foreground">
                <div className="p-2 border border-primary/20 bg-primary/10 text-primary rounded-none shrink-0">
                  {selectedRoomForModal?.isLabor ? (
                    <Monitor className="size-5" />
                  ) : (
                    <Building2 className="size-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span>{selectedRoomForModal?.displayName}</span>
                    <span className={cn("text-xs font-mono font-bold px-2 py-0.5 border rounded-none", selectedRoomForModal?.badgeColor)}>
                      {selectedRoomForModal?.subtitle}
                    </span>
                  </div>
                  <p className="text-xs font-normal text-muted-foreground mt-0.5">
                    {selectedRoomForModal?.kampus} {selectedRoomForModal?.isLabor ? "• Laboratorium Komputer" : "• Ruang Kelas Teori"}
                  </p>
                </div>
              </DialogTitle>

              {/* Jam Berjalan Real-Time (WIB) */}
              <div className="self-start sm:self-center shrink-0">
                <LiveRunningClock />
              </div>
            </div>

            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Jadwal penggunaan ruangan pada <strong>{selectedDate ? selectedDate.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "Seluruh Jadwal"}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            {!selectedRoomForModal?.classes || selectedRoomForModal.classes.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border bg-muted/10 rounded-none space-y-2">
                <DoorOpen className="size-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm font-semibold text-foreground">Ruangan Berstatus Kosong</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Tidak ada jadwal sesi perkuliahan fisik yang terdaftar di ruangan ini untuk tanggal terpilih. Ruangan siap digunakan.
                </p>
              </div>
            ) : (() => {
              const sortedModalClasses = [...selectedRoomForModal.classes].sort((a, b) => {
                if (a.tanggal && b.tanggal && a.tanggal !== b.tanggal) {
                  const dateA = parseDateFromDbString(a.tanggal)?.getTime() ?? 0;
                  const dateB = parseDateFromDbString(b.tanggal)?.getTime() ?? 0;
                  if (dateA !== dateB) return dateA - dateB;
                }
                return timeToMinutes(a.waktuMulai) - timeToMinutes(b.waktuMulai);
              });

              const totalModalItems = sortedModalClasses.length;
              const totalModalPages = Math.max(1, Math.ceil(totalModalItems / modalLimit));
              const offset = (modalPage - 1) * modalLimit;
              const paginatedModalClasses = sortedModalClasses.slice(offset, offset + modalLimit);

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <span>Daftar Sesi Perkuliahan</span>
                    <span className="font-mono text-primary font-bold">
                      {totalModalItems} Sesi Terjadwal
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {paginatedModalClasses.map((cls, idx) => {
                      const absoluteIdx = offset + idx;
                      const prevCls = absoluteIdx > 0 ? sortedModalClasses[absoluteIdx - 1] : null;
                      const isSameDay = !prevCls?.tanggal || !cls.tanggal || prevCls.tanggal === cls.tanggal;
                      const isFirstClassOfDay = !prevCls || !isSameDay;
                      const prevStart = prevCls ? timeToMinutes(prevCls.waktuMulai) : 0;
                      const prevDuration = prevCls?.sks ? prevCls.sks * 45 : 90;
                      const prevEnd = prevCls
                        ? prevCls.waktuSelesai
                          ? timeToMinutes(prevCls.waktuSelesai)
                          : prevStart + prevDuration
                        : 0;
                      const curStart = timeToMinutes(cls.waktuMulai);
                      const curDuration = cls.sks ? cls.sks * 45 : 90;
                      const curEnd = cls.waktuSelesai
                        ? timeToMinutes(cls.waktuSelesai)
                        : curStart + curDuration;
                      const waktuSelesai = cls.waktuSelesai || minutesToTime(curEnd);
                      const gapMinutes = prevCls && isSameDay ? curStart - prevEnd : 0;
                      const isCurrentBreak =
                        gapMinutes > 0 && currentMins >= prevEnd && currentMins < curStart;

                      const realtime = getRealtimeScheduleStatus(cls, currentMins);

                      let cardStyle = "border border-border bg-card hover:border-primary/60 hover:bg-muted/30";
                      if (realtime.isCancelled) {
                        cardStyle = "border border-destructive/30 bg-destructive/5 opacity-80 hover:opacity-100";
                      } else if (realtime.isLive) {
                        cardStyle = "border-2 border-emerald-500 bg-emerald-500/5 dark:bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-xs";
                      } else if (realtime.isUpcoming) {
                        cardStyle = "border-2 border-blue-500/80 bg-blue-500/5 dark:bg-blue-950/20 ring-1 ring-blue-500/40 shadow-xs";
                      } else if (realtime.isPassed) {
                        cardStyle = "border border-border/70 bg-muted/20 opacity-80 hover:opacity-100";
                      }

                      return (
                        <React.Fragment key={cls.id}>
                          {/* Jeda di Antara 2 Matkul (HANYA jika pada hari yang sama dan sedang jeda saat ini) */}
                          {isCurrentBreak && (
                            <div
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 p-3 rounded-none transition-all border-2 border-amber-500 bg-amber-500/10 dark:bg-amber-950/20 text-foreground ring-1 ring-amber-500/50 shadow-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="p-1.5 rounded-none shrink-0 border bg-amber-500 text-black border-amber-500">
                                   <Timer className="size-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs sm:text-sm text-foreground">
                                      Jeda Antar Perkuliahan
                                    </span>
                                    <span className="inline-flex items-center gap-1 font-bold px-1.5 py-0.5 bg-amber-500 text-black text-[10px] uppercase font-mono tracking-wider rounded-none">
                                      <span className="size-1.5 rounded-full bg-black" />
                                      Sedang Jeda Saat Ini
                                    </span>
                                  </div>
                                  <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                                    {minutesToTime(prevEnd)} - {minutesToTime(curStart)} WIB ({formatDuration(gapMinutes)})
                                  </p>
                                </div>
                              </div>

                              <div className="self-start sm:self-center shrink-0">
                                <span className="inline-flex items-center font-mono text-xs px-2.5 py-1 border rounded-none bg-amber-500 text-black border-amber-600 font-bold">
                                  {gapMinutes} Menit Jeda
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Kartu Sesi Perkuliahan (Outline Hijau jika Dipakai, Outline Biru jika Terjadwal paling atas, Outline Abu-abu jika Selesai paling bawah) */}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              if (currentRoom) {
                                openDetailModal(cls, true, currentRoom);
                              } else if (onSelectItem) {
                                onSelectItem(cls);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                if (currentRoom) {
                                  openDetailModal(cls, true, currentRoom);
                                } else if (onSelectItem) {
                                  onSelectItem(cls);
                                }
                              }
                            }}
                            className={cn(
                              "group p-3.5 sm:p-4 transition-all rounded-none text-left space-y-2.5",
                              cardStyle,
                              onSelectItem && "cursor-pointer"
                            )}
                          >
                            {/* Baris Atas: Jam, Tanggal (jika multi-tanggal), Kode Kelas, Status, Penanda Status */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1.5 font-mono text-xs sm:text-sm font-bold text-foreground bg-muted/60 px-2.5 py-1 border border-border rounded-none">
                                  <Clock className="size-3.5 text-primary shrink-0" />
                                  <span>{cls.waktuMulai} - {waktuSelesai} WIB</span>
                                </div>
                                {!selectedDate && (cls.hari || cls.tanggal) && (
                                  <div className="font-mono text-xs font-medium px-2 py-1 bg-muted/70 text-muted-foreground border border-border rounded-none">
                                    {cls.hari}{cls.tanggal ? `, ${cls.tanggal}` : ""}
                                  </div>
                                )}
                                <div className="font-mono text-xs sm:text-sm font-bold px-2.5 py-1 bg-primary/10 text-primary border border-primary/30 rounded-none">
                                  {cls.kodeKelas}
                                </div>
                                {realtime.isLive && (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500 text-white font-mono text-[10px] sm:text-xs font-bold uppercase rounded-none">
                                    <span className="size-1.5 rounded-full bg-white animate-ping" />
                                    Sedang Digunakan
                                  </span>
                                )}
                                {realtime.isPassed && (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-500 text-white font-mono text-[10px] sm:text-xs font-bold uppercase rounded-none">
                                    Selesai
                                  </span>
                                )}
                                {realtime.isUpcoming && (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-600 text-white font-mono text-[10px] sm:text-xs font-bold uppercase rounded-none">
                                    {isFirstClassOfDay ? "Terjadwal" : "Terjadwal Berikutnya"}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {realtime.isCancelled ? (
                                  <Badge variant="destructive" className="text-xs px-2.5 py-1 h-auto rounded-none font-bold">
                                    Cancel
                                  </Badge>
                                ) : (
                                  <MethodBadge status={cls.status} className="text-xs px-2.5 py-1 h-auto rounded-none" />
                                )}
                                {selectedRoomForModal?.isLabor && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={isDateFuture(cls.tanggal)}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openAttendanceModal(cls, selectedRoomForModal, true);
                                    }}
                                    className={cn(
                                      "h-6 sm:h-7 px-2 text-[11px] font-semibold rounded-none gap-1 shadow-2xs font-mono select-none",
                                      isDateFuture(cls.tanggal)
                                        ? "bg-muted/70 text-muted-foreground border border-border cursor-not-allowed opacity-75"
                                        : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                                    )}
                                    title={
                                      isDateFuture(cls.tanggal)
                                        ? "Absensi tidak dapat dilakukan untuk jadwal di masa mendatang"
                                        : `Buka form absen untuk ${cls.mataKuliah} (${cls.kodeKelas})`
                                    }
                                  >
                                    <CheckCircle2 className="size-3 shrink-0" />
                                    <span>Absen</span>
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Baris Tengah: Nama Mata Kuliah */}
                            <div>
                              <h4 className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                                {cls.mataKuliah}
                              </h4>
                            </div>

                            {/* Baris Bawah: Dosen */}
                            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground pt-1.5 border-t border-border/40">
                              <User className="size-3.5 text-muted-foreground shrink-0" />
                              <span className="font-medium text-foreground/80">{formatDosenName(cls.dosen)}</span>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Pagination Controls untuk Modal Detail Ruangan */}
                  {totalModalItems > modalLimit && (
                    <div className="pt-2 border-t border-border">
                      <PaginationControls
                        currentPage={modalPage}
                        totalPages={totalModalPages}
                        totalItems={totalModalItems}
                        limit={modalLimit}
                        onPageChange={setModalPage}
                        onLimitChange={(l) => {
                          setModalLimit(l);
                          setModalPage(1);
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
