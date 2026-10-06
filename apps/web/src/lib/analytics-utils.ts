import { JadwalItem } from "./types";
import { isLabRoom, timeToMinutes } from "./lab-utils";
import { isDateFuture, parseDateFromDbString, getTodayDbFormat, getTodayWib } from "./time-sync";

export type AnalyticsPeriodScope = "realisasi" | "proyeksi_semester";

export interface RoomUtilizationStat {
  ruangan: string;
  displayName: string;
  isLabor: boolean;
  kampus: "Kampus Thehok" | "Kampus Kobar";
  totalSesi: number;
  totalJam: number;
  tatapMuka: number;
  online: number;
  dibatalkan: number;
  utilisasiPct: number;
}

export interface DayDistributionStat {
  hari: string;
  totalSesi: number;
  totalJam: number;
  pct: number;
}

export interface DosenStat {
  dosen: string;
  totalSesi: number;
  totalJam: number;
  mataKuliahList: string[];
  tatapMuka: number;
  online: number;
}

export interface CampusComparisonStat {
  kampus: string;
  totalSesi: number;
  totalJam: number;
  pct: number;
}

export interface MethodRatioStat {
  tatapMuka: number;
  tatapMukaPct: number;
  online: number;
  onlinePct: number;
  dibatalkan: number;
  dibatalkanPct: number;
  total: number;
}

export interface AcademicAnalyticsSummary {
  periodScope: AnalyticsPeriodScope;
  periodLabel: string;
  startDateFormatted: string;
  endDateFormatted: string;
  totalPastAndTodaySchedules: number;
  totalFutureSchedules: number;

  totalSchedules: number;
  totalJamOperasional: number;
  totalRuangAktif: number;
  totalLaborAktif: number;
  totalTeoriAktif: number;
  totalRombel: number;
  totalDosen: number;
  
  // Highlights
  labPalingSibuk: RoomUtilizationStat | null;
  labPalingLengang: RoomUtilizationStat | null;
  kampusComparison: CampusComparisonStat[];
  methodRatioLabor: MethodRatioStat;
  methodRatioAll: MethodRatioStat;

  // Breakdown lists
  roomStats: RoomUtilizationStat[];
  dayStats: DayDistributionStat[];
  topDosenStats: DosenStat[];
}

function calculateClassDurationHours(item: JadwalItem): number {
  if (item.waktuMulai && item.waktuSelesai) {
    const startMins = timeToMinutes(item.waktuMulai);
    const endMins = timeToMinutes(item.waktuSelesai);
    if (endMins > startMins) {
      return (endMins - startMins) / 60;
    }
  }
  if (item.sks && item.sks > 0) {
    return (item.sks * 45) / 60;
  }
  return 1.5; // default 90 menit = 1.5 jam
}

function formatRoomNameForDisplay(name: string): string {
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

export function computeAcademicAnalytics(
  items: JadwalItem[],
  periodScope: AnalyticsPeriodScope = "realisasi"
): AcademicAnalyticsSummary {
  const validItems = items.filter((item) => Boolean(item.ruangan && item.mataKuliah));

  const todayTimestamp = getTodayWib().getTime();
  const endDateFormatted = getTodayDbFormat();

  let minDateTimestamp = Infinity;
  let minDateStr = "";
  let pastOrTodayCount = 0;
  let futureCount = 0;

  const itemsToCompute: JadwalItem[] = [];

  for (let i = 0; i < validItems.length; i++) {
    const item = validItems[i];
    if (item.tanggal) {
      const parsed = parseDateFromDbString(item.tanggal);
      if (parsed) {
        const time = parsed.getTime();
        if (time > todayTimestamp) {
          futureCount++;
          if (periodScope === "proyeksi_semester") {
            itemsToCompute.push(item);
          }
        } else {
          pastOrTodayCount++;
          itemsToCompute.push(item);
          if (time < minDateTimestamp) {
            minDateTimestamp = time;
            minDateStr = item.tanggal;
          }
        }
      } else {
        pastOrTodayCount++;
        itemsToCompute.push(item);
      }
    } else {
      pastOrTodayCount++;
      itemsToCompute.push(item);
    }
  }

  const startDateFormatted = minDateStr || "Awal Semester";

  const periodLabel =
    periodScope === "realisasi"
      ? `${startDateFormatted} s/d Hari Ini (${endDateFormatted})`
      : `1 Semester Penuh (${startDateFormatted} s/d Selesai)`;

  let totalJamOperasional = 0;
  const roomMap = new Map<string, {
    ruangan: string;
    isLabor: boolean;
    kampus: "Kampus Thehok" | "Kampus Kobar";
    totalSesi: number;
    totalJam: number;
    tatapMuka: number;
    online: number;
    dibatalkan: number;
  }>();

  const rombelSet = new Set<string>();
  const dosenMap = new Map<string, {
    dosen: string;
    totalSesi: number;
    totalJam: number;
    mataKuliahSet: Set<string>;
    tatapMuka: number;
    online: number;
  }>();

  const dayMap = new Map<string, { totalSesi: number; totalJam: number }>();
  const DAYS_ORDER = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  DAYS_ORDER.forEach((d) => dayMap.set(d, { totalSesi: 0, totalJam: 0 }));

  let labTM = 0;
  let labOL = 0;
  let labCC = 0;

  let allTM = 0;
  let allOL = 0;
  let allCC = 0;

  for (const item of itemsToCompute) {
    const duration = calculateClassDurationHours(item);
    totalJamOperasional += duration;

    // Rombel (Kode Kelas)
    if (item.kodeKelas) {
      rombelSet.add(item.kodeKelas.trim());
    }

    // Status method
    const statusLower = (item.status || "").toLowerCase();
    const isOnline = statusLower.includes("online") || statusLower.includes("daring");
    const isCancel = statusLower.includes("batal") || statusLower.includes("cancel");
    const isTM = !isOnline && !isCancel;

    if (isOnline) allOL++;
    else if (isCancel) allCC++;
    else allTM++;

    const isLab = isLabRoom(item.ruangan);
    if (isLab) {
      if (isOnline) labOL++;
      else if (isCancel) labCC++;
      else labTM++;
    }

    // Room aggregation
    const roomKey = `${item.kampus || "Kampus Thehok"}-${item.ruangan.trim()}`;
    const campus = (item.kampus as "Kampus Thehok" | "Kampus Kobar") || "Kampus Thehok";
    
    let rStat = roomMap.get(roomKey);
    if (!rStat) {
      rStat = {
        ruangan: item.ruangan.trim(),
        isLabor: isLab,
        kampus: campus,
        totalSesi: 0,
        totalJam: 0,
        tatapMuka: 0,
        online: 0,
        dibatalkan: 0,
      };
      roomMap.set(roomKey, rStat);
    }
    rStat.totalSesi += 1;
    rStat.totalJam += duration;
    if (isOnline) rStat.online += 1;
    else if (isCancel) rStat.dibatalkan += 1;
    else rStat.tatapMuka += 1;

    // Dosen aggregation
    const dosenName = (item.dosen || "").trim();
    if (dosenName && dosenName !== "-" && dosenName.toLowerCase() !== "tba") {
      let dStat = dosenMap.get(dosenName);
      if (!dStat) {
        dStat = {
          dosen: dosenName,
          totalSesi: 0,
          totalJam: 0,
          mataKuliahSet: new Set(),
          tatapMuka: 0,
          online: 0,
        };
        dosenMap.set(dosenName, dStat);
      }
      dStat.totalSesi += 1;
      dStat.totalJam += duration;
      if (item.mataKuliah) dStat.mataKuliahSet.add(item.mataKuliah.trim());
      if (isOnline) dStat.online += 1;
      else dStat.tatapMuka += 1;
    }

    // Day aggregation
    if (item.hari) {
      const cleanHari = item.hari.trim();
      const currentDay = dayMap.get(cleanHari);
      if (currentDay) {
        currentDay.totalSesi += 1;
        currentDay.totalJam += duration;
      }
    }
  }

  // Calculate highest room hours for relative utilization benchmark (max standard ~1155.75 jam)
  let maxRoomHours = 0;
  roomMap.forEach((r) => {
    if (r.totalJam > maxRoomHours) maxRoomHours = r.totalJam;
  });
  if (maxRoomHours === 0) maxRoomHours = 1;

  const roomStats: RoomUtilizationStat[] = Array.from(roomMap.values()).map((r) => {
    const rawPct = (r.totalJam / maxRoomHours) * 100;
    return {
      ruangan: r.ruangan,
      displayName: formatRoomNameForDisplay(r.ruangan),
      isLabor: r.isLabor,
      kampus: r.kampus,
      totalSesi: r.totalSesi,
      totalJam: Math.round(r.totalJam * 100) / 100,
      tatapMuka: r.tatapMuka,
      online: r.online,
      dibatalkan: r.dibatalkan,
      utilisasiPct: Math.min(100, Math.round(rawPct * 10) / 10),
    };
  });

  // Sort descending by totalJam
  roomStats.sort((a, b) => b.totalJam - a.totalJam);

  // Lab busiest & quietest
  const labOnlyStats = roomStats.filter((r) => r.isLabor);
  const labPalingSibuk = labOnlyStats.length > 0 ? labOnlyStats[0] : null;
  const labPalingLengang = labOnlyStats.length > 0 ? labOnlyStats[labOnlyStats.length - 1] : null;

  // Campus comparison
  let kobarSesi = 0;
  let thehokSesi = 0;
  let kobarJam = 0;
  let thehokJam = 0;

  roomStats.forEach((r) => {
    if (r.kampus === "Kampus Kobar") {
      kobarSesi += r.totalSesi;
      kobarJam += r.totalJam;
    } else {
      thehokSesi += r.totalSesi;
      thehokJam += r.totalJam;
    }
  });

  const totalAllSesi = kobarSesi + thehokSesi || 1;
  const kampusComparison: CampusComparisonStat[] = [
    {
      kampus: "Kampus Kobar",
      totalSesi: kobarSesi,
      totalJam: Math.round(kobarJam * 10) / 10,
      pct: Math.round((kobarSesi / totalAllSesi) * 100),
    },
    {
      kampus: "Kampus Thehok",
      totalSesi: thehokSesi,
      totalJam: Math.round(thehokJam * 10) / 10,
      pct: Math.round((thehokSesi / totalAllSesi) * 100),
    },
  ];

  // Method ratios in labs
  const totalLabMethods = labTM + labOL + labCC || 1;
  const methodRatioLabor: MethodRatioStat = {
    tatapMuka: labTM,
    tatapMukaPct: Math.round((labTM / totalLabMethods) * 1000) / 10,
    online: labOL,
    onlinePct: Math.round((labOL / totalLabMethods) * 1000) / 10,
    dibatalkan: labCC,
    dibatalkanPct: Math.round((labCC / totalLabMethods) * 1000) / 10,
    total: labTM + labOL + labCC,
  };

  const totalAllMethods = allTM + allOL + allCC || 1;
  const methodRatioAll: MethodRatioStat = {
    tatapMuka: allTM,
    tatapMukaPct: Math.round((allTM / totalAllMethods) * 1000) / 10,
    online: allOL,
    onlinePct: Math.round((allOL / totalAllMethods) * 1000) / 10,
    dibatalkan: allCC,
    dibatalkanPct: Math.round((allCC / totalAllMethods) * 1000) / 10,
    total: allTM + allOL + allCC,
  };

  // Day distribution
  const dayStats: DayDistributionStat[] = DAYS_ORDER.map((hari) => {
    const d = dayMap.get(hari) || { totalSesi: 0, totalJam: 0 };
    return {
      hari,
      totalSesi: d.totalSesi,
      totalJam: Math.round(d.totalJam * 10) / 10,
      pct: Math.round((d.totalSesi / totalAllSesi) * 100),
    };
  });

  // Top Dosen stats
  const topDosenStats: DosenStat[] = Array.from(dosenMap.values())
    .map((d) => ({
      dosen: d.dosen,
      totalSesi: d.totalSesi,
      totalJam: Math.round(d.totalJam * 10) / 10,
      mataKuliahList: Array.from(d.mataKuliahSet),
      tatapMuka: d.tatapMuka,
      online: d.online,
    }))
    .sort((a, b) => b.totalJam - a.totalJam);

  return {
    periodScope,
    periodLabel,
    startDateFormatted,
    endDateFormatted,
    totalPastAndTodaySchedules: pastOrTodayCount,
    totalFutureSchedules: futureCount,
    totalSchedules: itemsToCompute.length,
    totalJamOperasional: Math.round(totalJamOperasional),
    totalRuangAktif: roomStats.length,
    totalLaborAktif: roomStats.filter((r) => r.isLabor).length,
    totalTeoriAktif: roomStats.filter((r) => !r.isLabor).length,
    totalRombel: rombelSet.size,
    totalDosen: dosenMap.size,
    labPalingSibuk,
    labPalingLengang,
    kampusComparison,
    methodRatioLabor,
    methodRatioAll,
    roomStats,
    dayStats,
    topDosenStats,
  };
}
