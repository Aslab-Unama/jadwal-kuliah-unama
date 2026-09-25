"use client";

import * as React from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

/**
 * Global Clock Offset (in milliseconds)
 * Offset = GlobalRealTime - LocalDeviceTime
 */
let globalClockOffsetMs = 0;
let isClockSynchronized = false;
let syncPromise: Promise<number> | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener error
    }
  });
}

/**
 * Ambil waktu global nyata (mengompensasi jika jam di PC/Device lokal salah)
 */
export function getGlobalNow(): Date {
  return new Date(Date.now() + globalClockOffsetMs);
}

/**
 * Apakah jam sudah tersinkronisasi dengan server/internet global
 */
export function isGlobalTimeSynced(): boolean {
  return isClockSynchronized;
}

/**
 * Update clock offset dari HTTP Date header atau timestamp server
 */
export function updateGlobalClockFromHeader(dateHeaderString: string | null) {
  if (!dateHeaderString) return;
  try {
    const serverTimestamp = Date.parse(dateHeaderString);
    if (!isNaN(serverTimestamp)) {
      globalClockOffsetMs = serverTimestamp - Date.now();
      isClockSynchronized = true;
      notifyListeners();
    }
  } catch {
    // Ignore parse error
  }
}

/**
 * Sinkronisasi jam dengan server global:
 * 1. Coba endpoint internal Next.js: /api/time
 * 2. Coba endpoint Elysia backend: /api/time
 * 3. Coba public Internet Time API (Asia/Jakarta): timeapi.io
 */
export async function syncGlobalTime(): Promise<number> {
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    const endpoints = [
      "/api/time",
      process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/time` : "http://localhost:8000/api/time",
      "https://timeapi.io/api/time/current/zone?timeZone=Asia/Jakarta",
    ];

    for (const url of endpoints) {
      try {
        const t0 = performance.now();
        const res = await fetch(url, {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(3500),
        });

        if (res.ok) {
          const t1 = performance.now();
          const rtt = Math.max(0, t1 - t0);

          // Coba ambil dari json response
          let serverTimeMs: number | null = null;
          try {
            const data = await res.json();
            if (data.timestamp && typeof data.timestamp === "number") {
              serverTimeMs = data.timestamp;
            } else if (data.dateTime) {
              serverTimeMs = Date.parse(data.dateTime);
            }
          } catch {
            // Json parse failed, cek header
          }

          // Fallback ke header Date jika json tidak ada timestamp
          if (!serverTimeMs) {
            const dateHdr = res.headers.get("Date") || res.headers.get("date");
            if (dateHdr) {
              serverTimeMs = Date.parse(dateHdr);
            }
          }

          if (serverTimeMs && !isNaN(serverTimeMs)) {
            // Standar algoritma NTP: kompensasi setengah dari Round-Trip Time
            const estimatedGlobalNow = serverTimeMs + Math.round(rtt / 2);
            globalClockOffsetMs = estimatedGlobalNow - Date.now();
            isClockSynchronized = true;
            notifyListeners();
            return globalClockOffsetMs;
          }
        }
      } catch {
        // Coba endpoint berikutnya
        continue;
      }
    }

    return globalClockOffsetMs;
  })().finally(() => {
    syncPromise = null;
  });

  return syncPromise;
}

// Inisialisasi otomatis di browser
if (typeof window !== "undefined") {
  syncGlobalTime();

  // Sinkronisasi ulang saat tab kembali aktif
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      syncGlobalTime();
    }
  });

  // Sinkronisasi ulang berkala setiap 5 menit
  setInterval(() => {
    syncGlobalTime();
  }, 5 * 60 * 1000);
}

/**
 * Format string waktu WIB saat ini: "HH:mm:ss WIB"
 */
export function getGlobalTimeWib(): string {
  const now = getGlobalNow();
  return (
    now.toLocaleTimeString("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }) + " WIB"
  );
}

/**
 * Total menit saat ini dari jam 00:00 (WIB)
 */
export function getGlobalMinutesWib(): number {
  const now = getGlobalNow();
  const parts = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);

  const h = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const m = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
  return h * 60 + m;
}

/**
 * Tanggal hari ini (WIB) sebagai Date object jam 00:00:00
 */
export function getTodayWib(): Date {
  const now = getGlobalNow();
  const wibDateStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const [year, month, day] = wibDateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Tanggal hari ini (WIB) dalam format database BAAK: "dd MMMM yyyy" (contoh: "25 September 2026")
 */
export function getTodayDbFormat(): string {
  return format(getTodayWib(), "dd MMMM yyyy", { locale: localeId });
}

const INDO_MONTHS: Record<string, number> = {
  januari: 0,
  februari: 1,
  maret: 2,
  april: 3,
  mei: 4,
  juni: 5,
  juli: 6,
  agustus: 7,
  september: 8,
  oktober: 9,
  november: 10,
  desember: 11,
};

export function parseDateFromDbString(str: string): Date | null {
  if (!str) return null;
  const parts = str.trim().split(" ");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const monthName = parts[1].toLowerCase();
  const year = parseInt(parts[2], 10);
  const month = INDO_MONTHS[monthName];
  if (isNaN(day) || month === undefined || isNaN(year)) return null;
  return new Date(year, month, day);
}

/**
 * Cek apakah string tanggal sama dengan hari ini (WIB)
 */
export function isDateToday(tanggalStr?: string): boolean {
  if (!tanggalStr) return false;
  return tanggalStr.trim().toLowerCase() === getTodayDbFormat().toLowerCase();
}

/**
 * Cek apakah tanggal sudah lewat sebelum hari ini (WIB)
 */
export function isDatePast(tanggalStr?: string): boolean {
  if (!tanggalStr) return false;
  const parsed = parseDateFromDbString(tanggalStr);
  if (!parsed) return false;
  const today = getTodayWib();
  return parsed.getTime() < today.getTime();
}

/**
 * Cek apakah tanggal berada di masa depan setelah hari ini (WIB)
 */
export function isDateFuture(tanggalStr?: string): boolean {
  if (!tanggalStr) return false;
  const parsed = parseDateFromDbString(tanggalStr);
  if (!parsed) return false;
  const today = getTodayWib();
  return parsed.getTime() > today.getTime();
}

/**
 * Konversi waktu "HH:mm" ke total menit dari 00:00
 */
export function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(":");
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

export type RealtimeStatusKey = "cancel" | "ongoing" | "terjadwal" | "selesai";

export interface RealtimeScheduleStatusResult {
  statusKey: RealtimeStatusKey;
  statusLabel: "Cancel" | "Sedang Berlangsung" | "Terjadwal" | "Selesai";
  method: "TM" | "OL" | "-";
  methodLabel: "Tatap Muka" | "Online" | "-";
  isLive: boolean;
  isPassed: boolean;
  isUpcoming: boolean;
  isCancelled: boolean;
  isToday: boolean;
}

/**
 * Menghitung status perkuliahan secara realtime:
 * - Cancel: Jika status memuat Cancel/Batal
 * - Hari Ini:
 *   - "yang udah udah, buat selesai" (currentMins >= endMins) -> "Selesai"
 *   - Sedang berlangsung (startMins <= currentMins < endMins) -> "Sedang Berlangsung"
 *   - "yang belum buat terjadwal" (currentMins < startMins) -> "Terjadwal"
 * - Hari Kemarin / Lewat: "Selesai"
 * - Hari Mendatang: "Terjadwal"
 */
export function getRealtimeScheduleStatus(
  item: { status?: string; waktuMulai: string; tanggal?: string },
  currentMinsOverride?: number,
  durationMinutes = 100
): RealtimeScheduleStatusResult {
  const rawStatus = item.status || "";
  const s = rawStatus.toLowerCase();

  // Ekstraksi Metode (TM / OL)
  let method: "TM" | "OL" | "-" = "-";
  let methodLabel: "Tatap Muka" | "Online" | "-" = "-";
  if (s.includes("(tm)") || s.includes("tatap muka")) {
    method = "TM";
    methodLabel = "Tatap Muka";
  } else if (s.includes("(ol)") || s.includes("online") || s.includes("daring")) {
    method = "OL";
    methodLabel = "Online";
  }

  // 1. Cancel / Batal
  if (s.includes("cancel") || s.includes("batal")) {
    return {
      statusKey: "cancel",
      statusLabel: "Cancel",
      method,
      methodLabel,
      isLive: false,
      isPassed: false,
      isUpcoming: false,
      isCancelled: true,
      isToday: isDateToday(item.tanggal),
    };
  }

  const currentMins =
    currentMinsOverride !== undefined ? currentMinsOverride : getGlobalMinutesWib();
  const startMins = parseTimeToMinutes(item.waktuMulai);
  const endMins = startMins + durationMinutes;

  const isToday = isDateToday(item.tanggal);
  const isPast = isDatePast(item.tanggal);
  const isFuture = isDateFuture(item.tanggal);

  // 2. Jika jadwal adalah HARI INI
  if (isToday) {
    if (currentMins >= endMins) {
      return {
        statusKey: "selesai",
        statusLabel: "Selesai",
        method,
        methodLabel,
        isLive: false,
        isPassed: true,
        isUpcoming: false,
        isCancelled: false,
        isToday: true,
      };
    }
    if (currentMins >= startMins && currentMins < endMins) {
      return {
        statusKey: "ongoing",
        statusLabel: "Sedang Berlangsung",
        method,
        methodLabel,
        isLive: true,
        isPassed: false,
        isUpcoming: false,
        isCancelled: false,
        isToday: true,
      };
    }
    // currentMins < startMins
    return {
      statusKey: "terjadwal",
      statusLabel: "Terjadwal",
      method,
      methodLabel,
      isLive: false,
      isPassed: false,
      isUpcoming: true,
      isCancelled: false,
      isToday: true,
    };
  }

  // 3. Jika tanggal di masa lalu (sebelum hari ini)
  if (isPast) {
    return {
      statusKey: "selesai",
      statusLabel: "Selesai",
      method,
      methodLabel,
      isLive: false,
      isPassed: true,
      isUpcoming: false,
      isCancelled: false,
      isToday: false,
    };
  }

  // 4. Jika tanggal di masa depan (setelah hari ini) atau tidak ada tanggal
  return {
    statusKey: "terjadwal",
    statusLabel: "Terjadwal",
    method,
    methodLabel,
    isLive: false,
    isPassed: false,
    isUpcoming: true,
    isCancelled: false,
    isToday: false,
  };
}

/**
 * React Hook untuk mendengarkan waktu global secara realtime (berdetik setiap intervalMs)
 */
export function useGlobalTime(intervalMs = 1000) {
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    // Sinkronisasi otomatis saat komponen mount
    syncGlobalTime();

    const timer = setInterval(() => {
      setTick((t) => (t + 1) % 1000000);
    }, intervalMs);

    const onSync = () => setTick((t) => (t + 1) % 1000000);
    listeners.add(onSync);

    return () => {
      clearInterval(timer);
      listeners.delete(onSync);
    };
  }, [intervalMs]);

  const now = getGlobalNow();
  const currentMins = getGlobalMinutesWib();
  const timeWibStr = getGlobalTimeWib();
  const todayDbStr = getTodayDbFormat();

  return {
    now,
    currentMins,
    timeWibStr,
    todayDbStr,
    isSynced: isClockSynchronized,
  };
}
