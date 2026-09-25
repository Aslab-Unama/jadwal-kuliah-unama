import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";
import { getRealtimeScheduleStatus } from "@/lib/time-sync";

interface RealtimeStatusBadgeProps {
  status?: string;
  waktuMulai?: string;
  tanggal?: string;
  currentMins?: number;
  className?: string;
}

/**
 * Badge Status Realtime Perkuliahan:
 * - Cancel (Merah)
 * - Sedang Berlangsung (Hijau + Live Ping)
 * - Selesai (Abu-abu / Slate)
 * - Terjadwal (Biru)
 */
export function RealtimeStatusBadge({
  status,
  waktuMulai = "08:00",
  tanggal,
  currentMins,
  className,
}: RealtimeStatusBadgeProps) {
  const result = getRealtimeScheduleStatus(
    { status, waktuMulai, tanggal },
    currentMins
  );

  if (result.statusKey === "cancel") {
    return (
      <Badge variant="destructive" className={cn("font-bold", className)} suppressHydrationWarning>
        Cancel
      </Badge>
    );
  }

  if (result.statusKey === "ongoing") {
    return (
      <Badge
        className={cn(
          "bg-emerald-600 hover:bg-emerald-600 text-white font-bold inline-flex items-center gap-1.5 shadow-2xs",
          className
        )}
        suppressHydrationWarning
      >
        <span className="size-1.5 rounded-full bg-white animate-ping" />
        Berlangsung
      </Badge>
    );
  }

  if (result.statusKey === "selesai") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30 font-semibold",
          className
        )}
        suppressHydrationWarning
      >
        Selesai
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className={cn(
        "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 font-semibold",
        className
      )}
      suppressHydrationWarning
    >
      Terjadwal
    </Badge>
  );
}

interface MethodBadgeProps {
  status?: string;
  short?: boolean;
  className?: string;
}

/**
 * Badge Metode Perkuliahan: Tatap Muka (TM) vs Online (OL)
 */
export function MethodBadge({ status, short = false, className }: MethodBadgeProps) {
  const s = (status || "").toLowerCase();

  if (s.includes("(ol)") || s.includes("online") || s.includes("daring")) {
    return (
      <Badge
        variant="secondary"
        className={cn(
          "bg-sky-500/10 text-sky-700 dark:text-sky-300 dark:bg-sky-500/20 border-sky-500/20 font-semibold",
          className
        )}
      >
        {short ? "OL" : "Online"}
      </Badge>
    );
  }

  if (s.includes("(tm)") || s.includes("tatap muka")) {
    return (
      <Badge
        variant="secondary"
        className={cn(
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-500/20 border-emerald-500/20 font-semibold",
          className
        )}
      >
        {short ? "TM" : "Tatap Muka"}
      </Badge>
    );
  }

  return null;
}

export interface StatusBadgeProps {
  status: string;
  waktuMulai?: string;
  tanggal?: string;
  currentMins?: number;
  className?: string;
  showRealtime?: boolean;
}

export function StatusBadge({
  status,
  waktuMulai,
  tanggal,
  currentMins,
  className,
  showRealtime = false,
}: StatusBadgeProps) {
  if (showRealtime && waktuMulai) {
    return (
      <RealtimeStatusBadge
        status={status}
        waktuMulai={waktuMulai}
        tanggal={tanggal}
        currentMins={currentMins}
        className={className}
      />
    );
  }

  const s = status || "";

  if (s.includes("Cancel") || s.toLowerCase().includes("cancel")) {
    return (
      <Badge variant="destructive" className={className}>
        Cancel
      </Badge>
    );
  }

  if (s.includes("(OL)") || s.toLowerCase().includes("online")) {
    return (
      <Badge
        variant="secondary"
        className={cn(
          "bg-sky-500/10 text-sky-700 dark:text-sky-300 dark:bg-sky-500/20 border-sky-500/20 font-semibold",
          className
        )}
      >
        Online
      </Badge>
    );
  }

  if (s.includes("(TM)") || s.toLowerCase().includes("tatap muka")) {
    return (
      <Badge
        variant="secondary"
        className={cn(
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-500/20 border-emerald-500/20 font-semibold",
          className
        )}
      >
        Tatap Muka
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={className}>
      {status}
    </Badge>
  );
}
