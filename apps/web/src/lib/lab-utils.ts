import { JadwalItem } from "./types";
import { getGlobalMinutesWib } from "./time-sync";

export interface LabGapClassRef {
  mataKuliah: string;
  dosen: string;
  status?: string;
  rawItem?: JadwalItem;
}

export interface LabGapInfo {
  id: string;
  ruangan: string;
  kampus: string;
  isLabor: boolean;
  totalMenit: number;
  totalJamText: string;
  waktuMulai: string;
  waktuSelesai: string;
  tipeJeda: "sebelum_kelas" | "antar_kelas" | "setelah_kelas" | "seharian_kosong";
  sebelumKelas?: LabGapClassRef;
  setelahKelas?: LabGapClassRef;
  onlineClasses?: LabGapClassRef[];
  formattedText: string;
}

export interface InUseRoomInfo {
  id: number;
  ruangan: string;
  kampus: string;
  isLabor: boolean;
  mataKuliah: string;
  dosen: string;
  kodeKelas: string;
  waktuMulai: string;
  waktuSelesai: string;
  status: string;
  isLiveNow: boolean;
  progressPercent: number;
  rawItem?: JadwalItem;
}

export const UNAMA_LABS = [
  "Labor 1.3",
  "Labor 1.4",
  "Labor 1.5",
  "Labor 1.6",
  "Labor 1.7",
  "Labor 1.8",
  "Labor 1.9",
  "Labor 2.7",
  "Labor 3.2",
  "Labor 4.1",
  "Labor Cisco 4.3",
  "Gedung Pasca, Lab. B2.3",
];

/**
 * Data petugas jaga aslab laboratorium
 */
export const ASLAB_CARETAKERS: Record<string, string> = {
  "Labor 1.9": "Raffi",
  "Labor 1.8": "Haikal",
};

/**
 * Dapatkan nama petugas jaga laboratorium berdasarkan nama ruangan
 */
export function getLabCaretaker(room: string): string {
  if (!room) return "Penjaga Labor";
  const normalized = room.trim();

  for (const [key, name] of Object.entries(ASLAB_CARETAKERS)) {
    if (key.toLowerCase() === normalized.toLowerCase()) {
      return name;
    }
  }

  if (normalized.toLowerCase().startsWith("labor")) {
    return `Penjaga ${normalized}`;
  }
  return `Penjaga Labor ${normalized}`;
}

/**
 * Cek apakah sebuah nama ruangan merupakan Laboratorium
 */
export function isLabRoom(roomName: string): boolean {
  if (!roomName) return false;
  const lower = roomName.toLowerCase();
  return (
    lower.includes("labor") ||
    lower.includes("lab ") ||
    lower.startsWith("lab") ||
    UNAMA_LABS.some((l) => l.toLowerCase() === lower)
  );
}

/**
 * Cek apakah status perkuliahan adalah online / daring (tidak menggunakan ruangan laboratorium fisik)
 */
export function isOnlineClass(status?: string, ruangan?: string): boolean {
  const s = (status || "").toLowerCase();
  const r = (ruangan || "").toLowerCase();
  return (
    s.includes("(ol)") ||
    s.includes("online") ||
    s.includes("daring") ||
    s.includes("zoom") ||
    s.includes("elearning") ||
    s.includes("e-learning") ||
    r.includes("online") ||
    r.includes("daring") ||
    r.includes("zoom")
  );
}

/**
 * Cek apakah status perkuliahan dibatalkan
 */
export function isCancelledClass(status?: string): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s.includes("cancel") || s.includes("batal");
}

/**
 * Cek apakah kelas memakai ruangan laboratorium fisik secara nyata (tatap muka dan tidak batal)
 */
export function isPhysicalClass(status?: string, ruangan?: string): boolean {
  return !isCancelledClass(status) && !isOnlineClass(status, ruangan);
}

/**
 * Konversi waktu "HH:mm" ke total menit dari jam 00:00
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(":");
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Konversi total menit ke format "HH:mm"
 */
export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Format total menit menjadi representasi durasi yang ringkas dan alami (e.g. "30 Menit", "1 Jam", "1 Jam 30 Menit")
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) {
    return `${m} Menit`;
  }
  if (m === 0) {
    return `${h} Jam`;
  }
  return `${h} Jam ${m} Menit`;
}

/**
 * Normalisasi nama kampus
 */
export function normalizeCampus(campus?: string): string {
  if (!campus) return "Kampus Thehok";
  const lower = campus.toLowerCase();
  if (lower.includes("kobar")) return "Kampus Kobar";
  if (lower.includes("thehok")) return "Kampus Thehok";
  return campus;
}

/**
 * Ambil kampus dari ruangan berdasarkan data jadwal atau pola nama ruangan
 */
export function getCampusForRoom(room: string, items?: JadwalItem[]): string {
  if (!room) return "Kampus Thehok";

  // 1. Prioritaskan jika ada data jadwal aktual yang memuat kampus untuk ruangan ini
  if (items && items.length > 0) {
    const itemWithCampus = items.find(
      (i) => i.ruangan?.trim().toLowerCase() === room.trim().toLowerCase() && i.kampus
    );
    if (itemWithCampus?.kampus) {
      return normalizeCampus(itemWithCampus.kampus);
    }
  }

  const trimmed = room.trim();
  const lower = trimmed.toLowerCase();

  // 2. Ruangan Gedung Pascasarjana / S2 selalu berada di Kampus Thehok
  if (
    lower.includes("pasca") ||
    lower.includes("s2") ||
    lower.includes("b1.") ||
    lower.includes("b2.") ||
    lower.includes("b3.") ||
    lower.includes("thehok") ||
    lower.includes("cisco")
  ) {
    return "Kampus Thehok";
  }

  // 3. Eksplisit keyword "kobar"
  if (lower.includes("kobar")) {
    return "Kampus Kobar";
  }

  // 4. Laboratorium Kampus Kobar (Labor 1.5, 1.6, 1.7, 1.8, 1.9)
  if (
    lower.includes("labor 1.5") ||
    lower.includes("labor 1.6") ||
    lower.includes("labor 1.7") ||
    lower.includes("labor 1.8") ||
    lower.includes("labor 1.9") ||
    lower.includes("lab 1.5") ||
    lower.includes("lab 1.6") ||
    lower.includes("lab 1.7") ||
    lower.includes("lab 1.8") ||
    lower.includes("lab 1.9")
  ) {
    return "Kampus Kobar";
  }

  // 5. Ruangan Teori Kampus Kobar (R. 2.2, R. 2.3, R. 2.11 - R. 2.18)
  // Dicocokkan secara presisi agar tidak salah mencocokkan Lab B2.3 atau Labor 2.3 Thehok
  if (
    /(?:^|[^a-z0-9])r\.?\s*2\.(?:2|3|1[1-8])\b/i.test(lower) ||
    /(?:^|[^a-z0-9])ruang(?:an)?\s*2\.(?:2|3|1[1-8])\b/i.test(lower)
  ) {
    return "Kampus Kobar";
  }

  // Default ke Kampus Thehok (kampus utama)
  return "Kampus Thehok";
}

/**
 * Hitung waktu tutup operasional lab per kampus:
 * - Kampus Kobar: Pulang pukul 17:00 WIB
 * - Kampus Thehok: Sampai sesi praktikum lab terakhir selesai pada hari tersebut ("sampe selesai pokoknya")
 */
export function getCampusLabCloseTimes(items: JadwalItem[]): Record<string, number> {
  const KOBAR_CLOSING = timeToMinutes("17:00"); // 17:00 WIB (1020 menit) - Aslab Kobar pulang jam 17:00
  const closeTimes: Record<string, number> = {
    "Kampus Kobar": KOBAR_CLOSING,
  };

  let maxThehokEnd = 0;

  for (const item of items) {
    if (
      isPhysicalClass(item.status, item.ruangan) &&
      isLabRoom(item.ruangan)
    ) {
      const campus = getCampusForRoom(item.ruangan, items);
      const startMins = timeToMinutes(item.waktuMulai);
      const endMins = startMins + 100; // Durasi standar 100 menit perkuliahan

      if (campus === "Kampus Thehok") {
        if (endMins > maxThehokEnd) {
          maxThehokEnd = endMins;
        }
      }
    }
  }

  // Di Thehok, operasional berjalan sampai sesi lab terakhir selesai
  closeTimes["Kampus Thehok"] = maxThehokEnd > 0 ? maxThehokEnd : timeToMinutes("21:00");

  return closeTimes;
}

/**
 * Estimasi waktu selesai perkuliahan UNAMA (Standar ~100 menit per sesi)
 */
export function estimateEndTime(waktuMulai: string, nextClassStart?: string): string {
  const startMins = timeToMinutes(waktuMulai);
  const defaultDuration = 100; // 100 menit standar perkuliahan 2 SKS

  if (nextClassStart) {
    const nextMins = timeToMinutes(nextClassStart);
    if (nextMins > startMins && nextMins - startMins <= defaultDuration) {
      return nextClassStart;
    }
  }

  return minutesToTime(Math.min(startMins + defaultDuration, 21 * 60 + 30));
}

/**
 * Ambil daftar ruangan yang sedang dipakai berdasarkan data jadwal
 * @param items Daftar jadwal kelas untuk tanggal tertentu
 * @param nowTime Optional waktu spesifik "HH:mm". Jika tidak diisi, menggunakan jam sistem saat ini (WIB)
 */
export function getInUseRooms(
  items: JadwalItem[],
  nowTime?: string
): {
  activeNow: InUseRoomInfo[];
  allTodayUsed: InUseRoomInfo[];
} {
  let currentMinutes: number;

  if (nowTime) {
    currentMinutes = timeToMinutes(nowTime);
  } else {
    currentMinutes = getGlobalMinutesWib();
  }

  // Tampilkan seluruh jadwal hari ini (Tatap Muka, Online, maupun Batal)
  const validItems = items.filter((item) => item.ruangan && item.waktuMulai);

  const allTodayUsed: InUseRoomInfo[] = [];
  const activeNow: InUseRoomInfo[] = [];

  for (let i = 0; i < validItems.length; i++) {
    const item = validItems[i];
    const startMins = timeToMinutes(item.waktuMulai);
    const endMins = startMins + 100; // 100 menit
    const waktuSelesai = minutesToTime(endMins);

    const isPhysical = isPhysicalClass(item.status, item.ruangan);
    const isLive = isPhysical && currentMinutes >= startMins && currentMinutes < endMins;
    const elapsed = Math.max(0, currentMinutes - startMins);
    const progress = Math.min(100, Math.max(0, Math.round((elapsed / 100) * 100)));

    const inUseInfo: InUseRoomInfo = {
      id: item.id,
      ruangan: item.ruangan,
      kampus: item.kampus || "Kampus Thehok",
      isLabor: isLabRoom(item.ruangan),
      mataKuliah: item.mataKuliah,
      dosen: item.dosen,
      kodeKelas: item.kodeKelas,
      waktuMulai: item.waktuMulai,
      waktuSelesai,
      status: item.status,
      isLiveNow: isLive,
      progressPercent: progress,
      rawItem: item,
    };

    allTodayUsed.push(inUseInfo);

    if (isLive) {
      activeNow.push(inUseInfo);
    }
  }

  return { activeNow, allTodayUsed };
}

/**
 * Menghitung seluruh jeda waktu kosong per ruang labor sepanjang hari operasional
 * (mulai 07:30 WIB hingga sesi praktikum lab terakhir di kampus tersebut tutup)
 */
export function calculateLabGaps(
  items: JadwalItem[],
  allKnownRooms: string[] = UNAMA_LABS,
  filterKampus?: string
): LabGapInfo[] {
  const CAMPUS_START = timeToMinutes("07:30"); // 450 menit (07:30 WIB)
  const MIN_GAP_MINUTES = 30; // Jeda minimal 30 menit untuk dihitung kosong

  // Hitung jam lab terakhir selesai per kampus hari ini
  const campusCloseTimes = getCampusLabCloseTimes(items);

  // Gabungkan semua ruangan laboratorium yang diketahui
  const allRooms = Array.from(new Set([...UNAMA_LABS, ...allKnownRooms])).filter((r) => isLabRoom(r));

  const gaps: LabGapInfo[] = [];

  for (const room of allRooms) {
    // Tentukan kampus ruangan ini
    const campus = getCampusForRoom(room, items);

    if (filterKampus && filterKampus !== "Semua" && campus !== filterKampus) {
      continue;
    }

    // Jam lab terakhir tutup untuk kampus ini hari ini
    const campusClose = campusCloseTimes[campus];

    // Jika di kampus ini tidak ada perkuliahan lab sama sekali hari ini, aslab tidak berdinas / lab tutup
    if (!campusClose || campusClose <= CAMPUS_START) {
      continue;
    }

    // Seluruh jadwal di ruangan ini
    const allRoomItems = items
      .filter(
        (item) =>
          item.ruangan?.trim().toLowerCase() === room.trim().toLowerCase() &&
          item.waktuMulai
      )
      .sort((a, b) => timeToMinutes(a.waktuMulai) - timeToMinutes(b.waktuMulai));

    // Hanya kelas tatap muka fisik yang benar-benar menempati ruangan laboratorium fisik
    const physicalClasses = allRoomItems.filter((item) =>
      isPhysicalClass(item.status, item.ruangan)
    );

    const isLabor = isLabRoom(room);

    // Helper untuk mengumpulkan kelas daring / batal yang berlangsung di dalam rentang jeda ini
    const getOnlineClassesInRange = (startMins: number, endMins: number): LabGapClassRef[] => {
      return allRoomItems
        .filter((item) => {
          if (isPhysicalClass(item.status, item.ruangan)) return false;
          const s = timeToMinutes(item.waktuMulai);
          return s >= startMins && s < endMins;
        })
        .map((item) => ({
          mataKuliah: item.mataKuliah,
          dosen: item.dosen,
          status: item.status,
          rawItem: item,
        }));
    };

    // Kasus 1: Tidak ada sesi perkuliahan fisik sama sekali di lab ini hari ini (DIGABUNG SEHARIAN PENUH)
    if (physicalClasses.length === 0) {
      if (campusClose - CAMPUS_START >= MIN_GAP_MINUTES) {
        const durationMins = campusClose - CAMPUS_START;
        const totalJam = formatDuration(durationMins);
        const endTimeStr = minutesToTime(campusClose);
        const text = `${room} kosong 07:30 - ${endTimeStr} (${totalJam})`;
        const onlineInGap = getOnlineClassesInRange(CAMPUS_START, campusClose);

        gaps.push({
          id: `gap-${room}-full`,
          ruangan: room,
          kampus: campus,
          isLabor,
          totalMenit: durationMins,
          totalJamText: totalJam,
          waktuMulai: "07:30",
          waktuSelesai: endTimeStr,
          tipeJeda: "seharian_kosong",
          onlineClasses: onlineInGap.length > 0 ? onlineInGap : undefined,
          formattedText: text,
        });
      }
      continue;
    }

    // Kasus 2: Jeda di awal hari sebelum kelas fisik pertama (otomatis menggabungkan sesi daring pagi ke dalam satu jeda)
    const firstPhysical = physicalClasses[0];
    const firstPhysicalStart = timeToMinutes(firstPhysical.waktuMulai);
    const effectiveFirstStart = Math.min(firstPhysicalStart, campusClose);

    if (effectiveFirstStart - CAMPUS_START >= MIN_GAP_MINUTES) {
      const durationMins = effectiveFirstStart - CAMPUS_START;
      const totalJam = formatDuration(durationMins);
      const waktuSelesai = minutesToTime(effectiveFirstStart);
      const text = `${room} kosong 07:30 - ${waktuSelesai} (${totalJam})`;
      const onlineInGap = getOnlineClassesInRange(CAMPUS_START, effectiveFirstStart);

      gaps.push({
        id: `gap-${room}-start`,
        ruangan: room,
        kampus: campus,
        isLabor,
        totalMenit: durationMins,
        totalJamText: totalJam,
        waktuMulai: "07:30",
        waktuSelesai,
        tipeJeda: "sebelum_kelas",
        setelahKelas: {
          mataKuliah: firstPhysical.mataKuliah,
          dosen: firstPhysical.dosen,
          status: firstPhysical.status,
          rawItem: firstPhysical,
        },
        onlineClasses: onlineInGap.length > 0 ? onlineInGap : undefined,
        formattedText: text,
      });
    }

    // Kasus 3: Jeda antar kelas fisik (otomatis menggabungkan sesi daring di antara dua kelas fisik)
    for (let i = 0; i < physicalClasses.length - 1; i++) {
      const currentPhysical = physicalClasses[i];
      const nextPhysical = physicalClasses[i + 1];

      const currentStart = timeToMinutes(currentPhysical.waktuMulai);
      const currentEnd = currentStart + 100; // Durasi standar 100 menit
      const nextStart = timeToMinutes(nextPhysical.waktuMulai);

      if (currentEnd >= campusClose) {
        continue;
      }

      const effectiveEnd = Math.min(nextStart, campusClose);

      if (effectiveEnd - currentEnd >= MIN_GAP_MINUTES) {
        const durationMins = effectiveEnd - currentEnd;
        const totalJam = formatDuration(durationMins);
        const startTimeStr = minutesToTime(currentEnd);
        const endTimeStr = minutesToTime(effectiveEnd);
        const text = `${room} kosong ${startTimeStr} - ${endTimeStr} (${totalJam})`;
        const onlineInGap = getOnlineClassesInRange(currentEnd, effectiveEnd);

        gaps.push({
          id: `gap-${room}-${i}`,
          ruangan: room,
          kampus: campus,
          isLabor,
          totalMenit: durationMins,
          totalJamText: totalJam,
          waktuMulai: startTimeStr,
          waktuSelesai: endTimeStr,
          tipeJeda: "antar_kelas",
          sebelumKelas: {
            mataKuliah: currentPhysical.mataKuliah,
            dosen: currentPhysical.dosen,
            status: currentPhysical.status,
            rawItem: currentPhysical,
          },
          setelahKelas: {
            mataKuliah: nextPhysical.mataKuliah,
            dosen: nextPhysical.dosen,
            status: nextPhysical.status,
            rawItem: nextPhysical,
          },
          onlineClasses: onlineInGap.length > 0 ? onlineInGap : undefined,
          formattedText: text,
        });
      }
    }

    // Kasus 4: Jeda setelah kelas fisik terakhir hingga lab kampus tutup
    const lastPhysical = physicalClasses[physicalClasses.length - 1];
    const lastPhysicalEnd = timeToMinutes(lastPhysical.waktuMulai) + 100;

    if (lastPhysicalEnd < campusClose && campusClose - lastPhysicalEnd >= MIN_GAP_MINUTES) {
      const durationMins = campusClose - lastPhysicalEnd;
      const totalJam = formatDuration(durationMins);
      const startTimeStr = minutesToTime(lastPhysicalEnd);
      const endTimeStr = minutesToTime(campusClose);
      const text = `${room} kosong ${startTimeStr} - ${endTimeStr} (${totalJam})`;
      const onlineInGap = getOnlineClassesInRange(lastPhysicalEnd, campusClose);

      gaps.push({
        id: `gap-${room}-end`,
        ruangan: room,
        kampus: campus,
        isLabor,
        totalMenit: durationMins,
        totalJamText: totalJam,
        waktuMulai: startTimeStr,
        waktuSelesai: endTimeStr,
        tipeJeda: "setelah_kelas",
        sebelumKelas: {
          mataKuliah: lastPhysical.mataKuliah,
          dosen: lastPhysical.dosen,
          status: lastPhysical.status,
          rawItem: lastPhysical,
        },
        onlineClasses: onlineInGap.length > 0 ? onlineInGap : undefined,
        formattedText: text,
      });
    }
  }

  // Urutkan berdasarkan ruangan, lalu waktu mulai
  return gaps.sort((a, b) => {
    if (a.ruangan === b.ruangan) {
      return timeToMinutes(a.waktuMulai) - timeToMinutes(b.waktuMulai);
    }
    return a.ruangan.localeCompare(b.ruangan);
  });
}
