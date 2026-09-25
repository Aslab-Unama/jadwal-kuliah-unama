"use client";

import * as React from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "cn";
import { getTodayWib } from "@/lib/time-sync";

export interface DateSelectorProps {
  selectedDate: Date | null;
  onDateChange: (date: Date | null) => void;
  className?: string;
  showLabel?: boolean;
}

export function DateSelector({
  selectedDate,
  onDateChange,
  className,
  showLabel = true,
}: DateSelectorProps) {
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onDateChange(date);
      setIsCalendarOpen(false);
    }
  };

  const activeDate = selectedDate || getTodayWib();

  return (
    <div className={cn("inline-flex items-center gap-1.5 min-w-0", className)}>
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground shrink-0 select-none">
          Tanggal:
        </span>
      )}

      {/* Tombol Kalender Popover Tunggal */}
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger className="inline-flex items-center gap-1.5 h-7 px-2.5 border border-border bg-background text-foreground text-xs font-medium hover:bg-muted/60 transition-colors cursor-pointer select-none rounded-none shadow-2xs max-w-[150px] sm:max-w-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <CalendarIcon className="size-3.5 text-primary shrink-0" />
          <span className="truncate hidden sm:inline" suppressHydrationWarning>
            {format(activeDate, "EEEE, dd MMMM yyyy", { locale: localeId })}
          </span>
          <span className="truncate sm:hidden" suppressHydrationWarning>
            {format(activeDate, "dd MMM yyyy", { locale: localeId })}
          </span>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-auto p-2 rounded-none bg-card border-border shadow-xl space-y-1.5 z-50"
        >
          <Calendar
            mode="single"
            selected={activeDate}
            defaultMonth={activeDate}
            onSelect={handleDateSelect}
            locale={localeId}
            className="rounded-none border border-border bg-background p-1"
          />
          <div className="flex items-center justify-center border-t border-border pt-1.5 px-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-full px-2 text-[11px] font-medium rounded-none cursor-pointer hover:bg-muted"
              onClick={() => handleDateSelect(getTodayWib())}
            >
              Hari Ini
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
