"use client";

import * as React from "react";
import { CalendarCheck, CalendarX, Laptop, Users } from "lucide-react";
import { cn } from "cn";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsOverviewProps {
  totalJadwal: number;
  totalCancel?: number;
  totalOnline?: number;
  totalTatapMuka?: number;
  totalKampus?: number;
  totalRuangan?: number;
  selectedDate?: Date | null;
  selectedKampus?: string;
  selectedRuangan?: string;
  isLoading?: boolean;
  className?: string;
}

export function StatsOverview({
  totalJadwal,
  totalCancel = 0,
  totalOnline = 0,
  totalTatapMuka = 0,
  isLoading,
  className,
}: StatsOverviewProps) {
  const stats = [
    {
      title: "Total Sesi",
      count: isLoading ? "..." : totalJadwal.toLocaleString("id-ID"),
      suffix: "Sesi",
      icon: CalendarCheck,
      iconClass: "bg-muted text-foreground/80 border-border/60 dark:border-transparent dark:text-muted-foreground",
      titleClass: "text-foreground",
      valueClass: "text-foreground",
    },
    {
      title: "Cancel",
      count: isLoading ? "..." : totalCancel.toLocaleString("id-ID"),
      suffix: "Sesi",
      icon: CalendarX,
      iconClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
      titleClass: "text-red-600 dark:text-red-400",
      valueClass: "text-red-600 dark:text-red-400",
    },
    {
      title: "Online",
      count: isLoading ? "..." : totalOnline.toLocaleString("id-ID"),
      suffix: "Sesi",
      icon: Laptop,
      iconClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
      titleClass: "text-sky-600 dark:text-sky-400",
      valueClass: "text-sky-600 dark:text-sky-400",
    },
    {
      title: "Tatap Muka",
      count: isLoading ? "..." : totalTatapMuka.toLocaleString("id-ID"),
      suffix: "Sesi",
      icon: Users,
      iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      titleClass: "text-emerald-600 dark:text-emerald-400",
      valueClass: "text-emerald-600 dark:text-emerald-400",
    },
  ];

  const itemBorderClasses = [
    "border-r border-b sm:border-b-0 border-border",
    "border-b sm:border-b-0 sm:border-r border-border",
    "border-r border-border",
    "",
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-2 border border-border bg-card shadow-2xs sm:grid-cols-4 print:border-none print:shadow-none print:bg-transparent print:grid-cols-4 print:gap-3",
        className
      )}
    >
      {stats.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={index}
            className={cn(
              "flex flex-col justify-center p-2.5 sm:px-3.5 sm:py-2.5 hover:bg-muted/30 transition-colors print:border-none print:p-0",
              itemBorderClasses[index]
            )}
          >
            <div className="flex items-center justify-between gap-1.5 mb-1">
              <span className={cn("text-xs font-bold tracking-tight truncate print:text-[10px] print:text-neutral-700", item.titleClass)}>
                {item.title}
              </span>
              <div
                className={cn("flex size-6 shrink-0 items-center justify-center border print:hidden", item.iconClass)}
              >
                <Icon className="size-3.5" />
              </div>
            </div>

            <div className="flex items-baseline gap-1 min-h-[28px] items-center">
              {isLoading ? (
                <Skeleton className="h-5 w-16 my-0.5" />
              ) : (
                <>
                  <span className={cn("text-base sm:text-xl font-bold tracking-tight font-mono print:text-sm print:text-black", item.valueClass)}>
                    {item.count}
                  </span>
                  <span className={cn("text-[11px] sm:text-xs font-semibold print:text-[10px] print:text-black opacity-80", item.valueClass)}>
                    {item.suffix}
                  </span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
