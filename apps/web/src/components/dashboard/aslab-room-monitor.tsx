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
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateSelector } from "./date-selector";
import { StatusBadge } from "./status-badge";
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
  UNAMA_LABS,
} from "@/lib/lab-utils";
import { JadwalItem, formatDosenName } from "@/lib/types";

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
  const [time, setTime] = React.useState<string>("");

  React.useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("id-ID", {
          timeZone: "Asia/Jakarta",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " WIB"
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-xs sm:text-sm font-bold bg-muted/60 border border-border px-2.5 py-1 rounded-none text-foreground select-none",
        className
      )}
      title="Waktu Real-time Saat Ini (WIB)"
    >
      <Clock className="size-3.5 text-muted-foreground shrink-0" />
      <span>{time || "--:--:-- WIB"}</span>
    </div>
  );
}

export type RoomGridStatus = "dipakai" | "jeda" | "kosong" | "terjadwal" | "selesai";

export interface MasterRoomDefinition {
  ruangan: string;
  displayName: string;
  kampus: "Kampus Thehok" | "Kampus Kobar";
  isLabor: boolean;
}

export interface RoomGridItem {
  id: string;
  ruangan: string;
  displayName: string;
  kampus: "Kampus Thehok" | "Kampus Kobar";
  isLabor: boolean;
  status: RoomGridStatus;
  subtitle: string;
  colorClass: string;
  badgeColor: string;
  dotColor: string;
  subtitleColor: string;
  classes: JadwalItem[];
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
  return display;
}

/**
 * Master data daftar ruangan UNAMA (Thehok & Kobar) untuk tampilan matriks status ruangan.
 * Menjamin semua ruangan tetap muncul dalam status 'Kosong' meski belum memiliki jadwal kelas pada hari tersebut.
 */
const MASTER_ROOMS: MasterRoomDefinition[] = [
  // --- Laboratorium Thehok ---
  { ruangan: "Labor 1.3", displayName: "Labor 1.3", kampus: "Kampus Thehok", isLabor: true },
  { ruangan: "Labor 1.4", displayName: "Labor 1.4", kampus: "Kampus Thehok", isLabor: true },
  { ruangan: "Labor 1.5", displayName: "Labor 1.5", kampus: "Kampus Thehok", isLabor: true },
  { ruangan: "Labor 2.7", displayName: "Labor 2.7", kampus: "Kampus Thehok", isLabor: true },
  { ruangan: "Labor 3.2", displayName: "Labor 3.2", kampus: "Kampus Thehok", isLabor: true },
  { ruangan: "Labor 4.1", displayName: "Labor 4.1", kampus: "Kampus Thehok", isLabor: true },
  { ruangan: "Labor Cisco 4.3", displayName: "Labor Cisco 4.3", kampus: "Kampus Thehok", isLabor: true },
  { ruangan: "Gedung Pasca, Lab. B2.3", displayName: "S2, Lab. B2.3", kampus: "Kampus Thehok", isLabor: true },

  // --- Laboratorium Kobar (5 Lab Resmi UNAMA) ---
  { ruangan: "Labor 1.5", displayName: "Labor 1.5", kampus: "Kampus Kobar", isLabor: true },
  { ruangan: "Labor 1.6", displayName: "Labor 1.6", kampus: "Kampus Kobar", isLabor: true },
  { ruangan: "Labor 1.7", displayName: "Labor 1.7", kampus: "Kampus Kobar", isLabor: true },
  { ruangan: "Labor 1.8", displayName: "Labor 1.8", kampus: "Kampus Kobar", isLabor: true },
  { ruangan: "Labor 1.9", displayName: "Labor 1.9", kampus: "Kampus Kobar", isLabor: true },

  // --- Ruangan Teori Thehok ---
  { ruangan: "R. 1.6", displayName: "R. 1.6", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 1.7", displayName: "R. 1.7", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 2.10", displayName: "R. 2.10", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. Praktek 3.1", displayName: "R. 3.1", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. Praktek 3.4", displayName: "R. 3.4", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 3.5", displayName: "R. 3.5", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 3.6", displayName: "R. 3.6", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 3.7", displayName: "R. 3.7", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 3.8", displayName: "R. 3.8", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 3.9", displayName: "R. 3.9", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 3.10", displayName: "R. 3.10", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 4.2", displayName: "R. 4.2", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 4.5", displayName: "R. 4.5", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 4.6", displayName: "R. 4.6", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 4.7", displayName: "R. 4.7", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 4.8", displayName: "R. 4.8", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "R. 4.9", displayName: "R. 4.9", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "Gedung Pasca, R. B1.2", displayName: "S2, R. B1.2", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "Gedung Pasca, R. B1.3", displayName: "S2, R. B1.3", kampus: "Kampus Thehok", isLabor: false },
  { ruangan: "Gedung Pasca, R. B3.4", displayName: "S2, R. B3.4", kampus: "Kampus Thehok", isLabor: false },

  // --- Ruangan Teori Kobar ---
  { ruangan: "R. 2.2", displayName: "R. 2.2", kampus: "Kampus Kobar", isLabor: false },
  { ruangan: "R. 2.3", displayName: "R. 2.3", kampus: "Kampus Kobar", isLabor: false },
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
  if (item.kampus && item.kampus !== room.kampus) return false;

  const itemNorm = formatRoomDisplayName(item.ruangan).trim().toLowerCase();
  const roomNorm = room.displayName.trim().toLowerCase();
  const origNorm = room.ruangan.trim().toLowerCase();
  const rawNorm = item.ruangan.trim().toLowerCase();

  return itemNorm === roomNorm || rawNorm === origNorm || itemNorm === origNorm || rawNorm === roomNorm;
}

interface AslabRoomMonitorProps {
  items: JadwalItem[];
  selectedDate?: Date | null;
  onDateChange?: (date: Date | null) => void;
  globalKampus?: string;
  onSelectItem?: (item: JadwalItem) => void;
  className?: string;
}

export function AslabRoomMonitor({
  items,
  selectedDate,
  onDateChange,
  globalKampus,
  onSelectItem,
  className,
}: AslabRoomMonitorProps) {
  // Mode tampilan: "terpakai" (In-Use Cards) vs "jeda_kosong" (Empty Gaps) vs "matriks" (Matrix Grid)
  const [activeTab, setActiveTab] = React.useState<"terpakai" | "jeda_kosong" | "matriks">("terpakai");
  const [selectedKampus, setSelectedKampus] = React.useState<string>(globalKampus || "Semua");
  const [filterType, setFilterType] = React.useState<"all" | "lab_only">("lab_only");
  const [searchRoom, setSearchRoom] = React.useState<string>("");
  const [currentTimeWib, setCurrentTimeWib] = React.useState<string>("");

  const [currentMins, setCurrentMins] = React.useState<number>(() => {
    const parts = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const h = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
    const m = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
    return h * 60 + m;
  });

  React.useEffect(() => {
    const updateTime = () => {
      const parts = new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "numeric",
        minute: "numeric",
        hourCycle: "h23",
      }).formatToParts(new Date());
      const h = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
      const m = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
      setCurrentMins(h * 60 + m);
      setCurrentTimeWib(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 5000);
    return () => clearInterval(timer);
  }, []);

  // Fullscreen & Modal states untuk tampilan Matriks
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = React.useState<boolean>(false);
  const [selectedRoomForModal, setSelectedRoomForModal] = React.useState<RoomGridItem | null>(null);
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

  // Update jam real-time setiap 30 detik
  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleTimeString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
      });
      setCurrentTimeWib(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

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
      let colorClass = "bg-rose-500 hover:bg-rose-600 text-white border-transparent";
      let badgeColor = "bg-rose-500 text-white border-transparent";
      let dotColor = "bg-white";
      let subtitleColor = "text-rose-100";

      if (physicalClasses.length > 0) {
        const sorted = [...physicalClasses].sort(
          (a, b) => timeToMinutes(a.waktuMulai) - timeToMinutes(b.waktuMulai)
        );

        const liveClass = sorted.find((c) => {
          const s = timeToMinutes(c.waktuMulai);
          return currentMins >= s && currentMins < s + 100;
        });

        if (liveClass) {
          status = "dipakai";
          subtitle = "Sedang Dipakai";
          colorClass = "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent";
          badgeColor = "bg-emerald-500 text-white border-transparent";
          dotColor = "bg-white animate-pulse";
          subtitleColor = "text-emerald-100";
        } else {
          const firstStart = timeToMinutes(sorted[0].waktuMulai);
          const lastEnd = timeToMinutes(sorted[sorted.length - 1].waktuMulai) + 100;

          if (currentMins < firstStart) {
            status = "terjadwal";
            subtitle = `Terjadwal (${sorted.length} Kelas)`;
            colorClass = "bg-blue-500 hover:bg-blue-600 text-white border-transparent";
            badgeColor = "bg-blue-500 text-white border-transparent";
            dotColor = "bg-white";
            subtitleColor = "text-blue-100";
          } else if (currentMins >= lastEnd) {
            status = "selesai";
            subtitle = `Selesai (${sorted.length} Kelas)`;
            colorClass = "bg-slate-500 hover:bg-slate-600 text-white border-transparent";
            badgeColor = "bg-slate-500 text-white border-transparent";
            dotColor = "bg-white/80";
            subtitleColor = "text-slate-100";
          } else {
            status = "jeda";
            subtitle = "Jeda";
            colorClass = "bg-amber-500 hover:bg-amber-600 text-white border-transparent";
            badgeColor = "bg-amber-500 text-white border-transparent";
            dotColor = "bg-white";
            subtitleColor = "text-amber-100";
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
        colorClass,
        badgeColor,
        dotColor,
        subtitleColor,
        classes: roomClasses,
      };
    });

    const naturalSort = (a: RoomGridItem, b: RoomGridItem) =>
      a.displayName.localeCompare(b.displayName, undefined, { numeric: true });

    return {
      thehokLabs: processed.filter((r) => r.isLabor && r.kampus === "Kampus Thehok").sort(naturalSort),
      kobarLabs: processed.filter((r) => r.isLabor && r.kampus === "Kampus Kobar").sort(naturalSort),
      thehokTheoryRooms: processed.filter((r) => !r.isLabor && r.kampus === "Kampus Thehok").sort(naturalSort),
      kobarTheoryRooms: processed.filter((r) => !r.isLabor && r.kampus === "Kampus Kobar").sort(naturalSort),
      allGridRooms: processed,
    };
  }, [items, currentMins]);

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

    return (
      <button
        key={`${room.kampus}-${room.ruangan}`}
        type="button"
        onClick={() => {
          setSelectedRoomForModal(room);
          setModalPage(1);
        }}
        className={cn(
          "group relative flex flex-col items-center justify-center p-3 rounded-none text-center transition-all cursor-pointer shadow-xs min-h-[74px]",
          "hover:opacity-95 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          room.colorClass,
          !isHighlighted && "opacity-25 grayscale-[60%]"
        )}
        title={`Klik untuk melihat jadwal ${room.displayName} (${room.subtitle})`}
      >
        <span className="font-bold text-xs sm:text-sm text-white leading-tight tracking-tight line-clamp-1">
          {room.displayName}
        </span>
        <span className={cn("text-[11px] font-medium leading-tight mt-1", room.subtitleColor)}>
          {room.subtitle}
        </span>
      </button>
    );
  };

  return (
    <section
      ref={containerRef}
      aria-label="Panel Asisten Laboratorium"
      className={cn(
        "relative border border-primary/30 bg-card p-3.5 sm:p-6 shadow-xs transition-all",
        isFullscreen && "fixed inset-0 z-50 overflow-y-auto bg-background p-4 sm:p-8 m-0 rounded-none border-none shadow-2xl",
        className
      )}
    >
      {/* Header Panel Aslab */}
      <div className="flex flex-col gap-3 pb-3 sm:pb-4 border-b border-border/70 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] font-semibold tracking-wide uppercase border-primary/40 bg-primary/10 text-primary"
            >
              <ShieldCheck className="size-3 mr-1" />
              Panel Monitoring Aslab
            </Badge>
          </div>
          <h3 className="text-base sm:text-xl font-bold tracking-tight text-foreground leading-snug">
            Status Penggunaan Ruangan
          </h3>
          <p className="text-xs text-muted-foreground">
            Informasi real-time ruang kelas dan laboratorium aktif serta estimasi jeda waktu kosong.
          </p>
        </div>

        {/* Quick Tabs & Action Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 sm:pt-0">
          {isFullscreen && (
            <>
              <LiveRunningClock className="h-8 py-0 justify-center shrink-0 text-xs font-mono font-bold" />
              <div className="h-5 w-px bg-border mx-0.5 hidden sm:block" />
            </>
          )}

          <Button
            variant={activeTab === "terpakai" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("terpakai")}
            className="h-8 gap-1.5 cursor-pointer text-xs rounded-none justify-center"
          >
            <DoorClosed className="size-3.5" />
            <span>Ruang Terpakai ({filteredUsedRooms.length})</span>
          </Button>

          <Button
            variant={activeTab === "jeda_kosong" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("jeda_kosong")}
            className={cn(
              "h-8 gap-1.5 cursor-pointer text-xs rounded-none justify-center transition-colors font-semibold",
              activeTab === "jeda_kosong"
                ? "bg-primary text-primary-foreground hover:bg-primary/90 border-transparent"
                : "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
            )}
          >
            <Timer className={cn("size-3.5", activeTab === "jeda_kosong" ? "text-primary-foreground" : "text-emerald-600 dark:text-emerald-400")} />
            <span>Cek Jeda & Ruang Kosong ({filteredGaps.length})</span>
          </Button>

          <Button
            variant={activeTab === "matriks" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("matriks")}
            className={cn(
              "h-8 gap-1.5 cursor-pointer text-xs rounded-none justify-center transition-colors font-semibold",
              activeTab === "matriks"
                ? "bg-primary text-primary-foreground hover:bg-primary/90 border-transparent"
                : "border-blue-500/40 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10"
            )}
          >
            <LayoutGrid className={cn("size-3.5", activeTab === "matriks" ? "text-primary-foreground" : "text-blue-600 dark:text-blue-400")} />
            <span>Matriks Ruangan</span>
          </Button>
        </div>
      </div>

      {/* Sub-Filters: Tanggal Picker, Kampus, Tipe Ruang, Pencarian */}
      <div className="flex flex-col gap-2.5 py-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Kontrol Kalender & Navigasi Hari Identik dengan FilterBar */}
          {onDateChange && (
            <DateSelector selectedDate={selectedDate || null} onDateChange={onDateChange} />
          )}

          <div className="h-4 w-px bg-border mx-0.5 hidden sm:block" />

          {/* Filter Kampus */}
          {["Semua", "Kampus Thehok", "Kampus Kobar"].map((kp) => (
            <button
              key={kp}
              type="button"
              onClick={() => setSelectedKampus(kp)}
              className={cn(
                "px-2 sm:px-2.5 py-1 text-xs border transition-colors cursor-pointer rounded-none",
                selectedKampus === kp
                  ? "border-primary bg-primary text-primary-foreground font-medium"
                  : "border-border bg-background hover:bg-muted text-muted-foreground"
              )}
            >
              {kp}
            </button>
          ))}

          {/* Toggle Khusus Lab vs Semua Ruangan (hanya tampil di tab Terpakai dan Jeda Kosong, disembunyikan di Matriks Ruangan) */}
          {activeTab !== "matriks" && (
            <>
              <div className="h-4 w-px bg-border mx-0.5 hidden sm:block" />

              <button
                type="button"
                onClick={() => setFilterType(filterType === "lab_only" ? "all" : "lab_only")}
                className={cn(
                  "px-2 sm:px-2.5 py-1 text-xs border transition-colors cursor-pointer flex items-center gap-1 rounded-none",
                  filterType === "lab_only"
                    ? "border-primary/60 bg-primary/10 text-primary font-medium"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                <Layers className="size-3" />
                {filterType === "lab_only" ? "Khusus Lab" : "Semua Ruangan"}
              </button>
            </>
          )}
        </div>

        {/* Input Pencarian Ruangan dengan tombol reset */}
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
          <Input
            value={searchRoom}
            onChange={(e) => setSearchRoom(e.target.value)}
            placeholder="Cari ruang / matkul..."
            className="pl-7 pr-7 h-8 sm:h-7 text-xs rounded-none"
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

      {/* KONTEN TAB 1: CARD RUANG TERPAKAI (SINKRON DENGAN SCHEDULE-GRID.TSX) */}
      {activeTab === "terpakai" && (
        <div className="pt-4 space-y-6">
          {/* Quick Summary Pill Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 border border-border bg-muted/20">
              <span className="text-muted-foreground text-[11px] block">Lab Sedang Berlangsung</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                {activeLabsNowCount} Lab Aktif
              </span>
            </div>
            <div className="p-2.5 border border-border bg-muted/20">
              <span className="text-muted-foreground text-[11px] block">Total Lab Terpakai Hari Ini</span>
              <span className="text-base font-bold text-foreground">
                {usedLabs.length} Sesi Lab
              </span>
            </div>
            <div className="p-2.5 border border-border bg-muted/20">
              <span className="text-muted-foreground text-[11px] block">Ruang Kelas Teori Terpakai</span>
              <span className="text-base font-bold text-foreground">
                {usedTheoryRooms.length} Kelas
              </span>
            </div>
            <div className="p-2.5 border border-border bg-muted/20">
              <span className="text-muted-foreground text-[11px] block">Jeda Waktu Terbuka</span>
              <span className="text-base font-bold text-primary">
                {filteredGaps.length} Slot Kosong
              </span>
            </div>
          </div>

          {/* Section 1: Laboratorium Sedang Dipakai */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="size-4 text-primary animate-pulse" />
                <h4 className="text-sm font-semibold text-foreground">
                  Laboratorium Komputer Terpakai ({usedLabs.length})
                </h4>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {usedLabs.filter((l) => l.isLiveNow).length} Sedang Berjalan Sekarang
              </span>
            </div>

            {usedLabs.length === 0 ? (
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
                          <StatusBadge status={room.status} className="text-[11px] px-2.5 py-0.5 h-auto" />
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
                        <StatusBadge status={room.status} className="text-[11px] px-2.5 py-0.5 h-auto" />
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
              Kobar: s/d 17:00 WIB • Thehok: s/d Selesai
            </span>
          </div>

          {!selectedDate ? (
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
        <div className="pt-4 space-y-5">
          {/* Top Bar Matriks: Tombol Fullscreen, Kampus Pills, dan Legenda Status */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-border/60">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="h-8 gap-1.5 cursor-pointer text-xs rounded-none border-border hover:bg-muted font-medium"
              >
                {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                <span>{isFullscreen ? "Exit Full Screen" : "Full Screen"}</span>
              </Button>

              <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

              <span className="text-xs text-muted-foreground">
                Total <strong>{matrixRoomData.allGridRooms.length}</strong> Ruangan Terpantau
              </span>
            </div>

            {/* Legenda Warna Status Persis Sesuai Screenshot */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-xs font-medium">
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <span className="size-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                <span>Dipakai</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <span className="size-2.5 rounded-full bg-amber-500 ring-2 ring-amber-500/20" />
                <span>Jeda</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <span className="size-2.5 rounded-full bg-rose-500 ring-2 ring-rose-500/20" />
                <span>Kosong</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <span className="size-2.5 rounded-full bg-blue-500 ring-2 ring-blue-500/20" />
                <span>Terjadwal</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <span className="size-2.5 rounded-full bg-slate-500 ring-2 ring-slate-500/20" />
                <span>Selesai</span>
              </span>
            </div>
          </div>

          {/* 2 Kontainer Bersisian: Laboratorium (Kiri) vs Ruangan Kelas Teori (Kanan) */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
            {/* CONTAINER 1: Laboratorium Komputer */}
            <div className="border border-border bg-card p-4 sm:p-5 shadow-xs rounded-none space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 border border-primary/20 bg-primary/10 text-primary rounded-none">
                    <Monitor className="size-4" />
                  </div>
                  <h4 className="font-heading font-bold text-sm sm:text-base text-foreground tracking-tight">
                    Laboratorium Komputer
                  </h4>
                </div>
                <Badge variant="outline" className="text-[11px] font-mono rounded-none border-border">
                  {matrixRoomData.thehokLabs.length + matrixRoomData.kobarLabs.length} Labor
                </Badge>
              </div>

              {/* Subgroup Thehok */}
              {(selectedKampus === "Semua" || selectedKampus === "Kampus Thehok") && matrixRoomData.thehokLabs.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="size-1.5 bg-primary rounded-full" />
                    <span>Kampus Thehok</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {matrixRoomData.thehokLabs.map((room) => renderRoomGridCard(room))}
                  </div>
                </div>
              )}

              {/* Subgroup Kobar */}
              {(selectedKampus === "Semua" || selectedKampus === "Kampus Kobar") && matrixRoomData.kobarLabs.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-border/60">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="size-1.5 bg-primary rounded-full" />
                    <span>Kampus Kobar</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {matrixRoomData.kobarLabs.map((room) => renderRoomGridCard(room))}
                  </div>
                </div>
              )}
            </div>

            {/* CONTAINER 2: Ruangan Kelas Teori */}
            <div className="border border-border bg-card p-4 sm:p-5 shadow-xs rounded-none space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 border border-primary/20 bg-primary/10 text-primary rounded-none">
                    <Building2 className="size-4" />
                  </div>
                  <h4 className="font-heading font-bold text-sm sm:text-base text-foreground tracking-tight">
                    Ruangan Kelas Teori
                  </h4>
                </div>
                <Badge variant="outline" className="text-[11px] font-mono rounded-none border-border">
                  {matrixRoomData.thehokTheoryRooms.length + matrixRoomData.kobarTheoryRooms.length} Ruangan
                </Badge>
              </div>

              {/* Subgroup Thehok */}
              {(selectedKampus === "Semua" || selectedKampus === "Kampus Thehok") && matrixRoomData.thehokTheoryRooms.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="size-1.5 bg-primary rounded-full" />
                    <span>Kampus Thehok</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {matrixRoomData.thehokTheoryRooms.map((room) => renderRoomGridCard(room))}
                  </div>
                </div>
              )}

              {/* Subgroup Kobar */}
              {(selectedKampus === "Semua" || selectedKampus === "Kampus Kobar") && matrixRoomData.kobarTheoryRooms.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-border/60">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="size-1.5 bg-primary rounded-full" />
                    <span>Kampus Kobar</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {matrixRoomData.kobarTheoryRooms.map((room) => renderRoomGridCard(room))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog Detail Jadwal Ruangan Terpilih (Sesuai Style Bawaan globals.css) */}
      <Dialog open={!!selectedRoomForModal} onOpenChange={(open) => !open && setSelectedRoomForModal(null)}>
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
                  return a.tanggal.localeCompare(b.tanggal);
                }
                return timeToMinutes(a.waktuMulai) - timeToMinutes(b.waktuMulai);
              });

              const firstStart = sortedModalClasses.length > 0 ? timeToMinutes(sortedModalClasses[0].waktuMulai) : 0;
              const lastEnd = sortedModalClasses.length > 0 ? timeToMinutes(sortedModalClasses[sortedModalClasses.length - 1].waktuMulai) + 100 : 0;
              const isRoomTerjadwal = currentMins < firstStart;
              const isRoomSelesai = currentMins >= lastEnd;

              const totalModalItems = sortedModalClasses.length;
              const totalModalPages = Math.max(1, Math.ceil(totalModalItems / modalLimit));
              const offset = (modalPage - 1) * modalLimit;
              const paginatedModalClasses = sortedModalClasses.slice(offset, offset + modalLimit);

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                      const prevStart = prevCls ? timeToMinutes(prevCls.waktuMulai) : 0;
                      const prevEnd = prevStart + 100;
                      const curStart = timeToMinutes(cls.waktuMulai);
                      const gapMinutes = prevCls && isSameDay ? curStart - prevEnd : 0;
                      const isCurrentBreak =
                        gapMinutes > 0 && currentMins >= prevEnd && currentMins < curStart;

                      const startMins = timeToMinutes(cls.waktuMulai);
                      const endMins = startMins + 100;
                      const isPhysical = isPhysicalClass(cls.status, cls.ruangan);
                      const isLive = isPhysical && currentMins >= startMins && currentMins < endMins;

                      const isTopTerjadwal = isRoomTerjadwal && absoluteIdx === 0;
                      const isBottomSelesai = isRoomSelesai && absoluteIdx === sortedModalClasses.length - 1;

                      let cardStyle = "border border-border bg-card hover:border-primary/60 hover:bg-muted/30";
                      if (isLive) {
                        cardStyle = "border-2 border-emerald-500 bg-emerald-500/5 dark:bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-xs";
                      } else if (isTopTerjadwal) {
                        cardStyle = "border-2 border-blue-500 bg-blue-500/5 dark:bg-blue-950/20 ring-1 ring-blue-500/40 shadow-xs";
                      } else if (isBottomSelesai) {
                        cardStyle = "border-2 border-slate-500 bg-slate-500/5 dark:bg-slate-900/30 ring-1 ring-slate-500/40 shadow-xs";
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
                                    {minutesToTime(prevEnd)} – {minutesToTime(curStart)} WIB ({formatDuration(gapMinutes)})
                                  </p>
                                </div>
                              </div>

                              <div className="self-start sm:self-center shrink-0">
                                <span className="inline-flex items-center font-bold font-mono text-xs px-2.5 py-1 border rounded-none bg-amber-500 text-black border-amber-600 font-bold">
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
                              if (onSelectItem) {
                                onSelectItem(cls);
                                setSelectedRoomForModal(null);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (onSelectItem && (e.key === "Enter" || e.key === " ")) {
                                e.preventDefault();
                                onSelectItem(cls);
                                setSelectedRoomForModal(null);
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
                                  <span>{cls.waktuMulai} WIB</span>
                                </div>
                                {(!selectedDate || cls.hari) && (
                                  <div className="font-mono text-xs font-medium px-2 py-1 bg-muted/70 text-muted-foreground border border-border rounded-none">
                                    {cls.hari}{cls.tanggal ? `, ${cls.tanggal}` : ""}
                                  </div>
                                )}
                                <div className="font-mono text-xs sm:text-sm font-bold px-2.5 py-1 bg-primary/10 text-primary border border-primary/30 rounded-none">
                                  {cls.kodeKelas}
                                </div>
                                {isLive && (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500 text-white font-mono text-[10px] sm:text-xs font-bold uppercase rounded-none">
                                    <span className="size-1.5 rounded-full bg-white" />
                                    Sedang Digunakan
                                  </span>
                                )}
                                {isTopTerjadwal && (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-500 text-white font-mono text-[10px] sm:text-xs font-bold uppercase rounded-none">
                                    Terjadwal Berikutnya
                                  </span>
                                )}
                                {isBottomSelesai && (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-500 text-white font-mono text-[10px] sm:text-xs font-bold uppercase rounded-none">
                                    Selesai
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <StatusBadge status={cls.status} className="text-xs px-2.5 py-1 h-auto rounded-none" />
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
