"use client";

import * as React from "react";
import { format, addDays, subDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "cn";

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

  const handlePrevDay = () => {
    const cur = selectedDate || new Date();
    onDateChange(subDays(cur, 1));
  };

  const handleNextDay = () => {
    const cur = selectedDate || new Date();
    onDateChange(addDays(cur, 1));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onDateChange(date);
      setIsCalendarOpen(false);
    }
  };

  const handleClearDate = () => {
    onDateChange(null);
    setIsCalendarOpen(false);
  };

  return (
    <div className={cn("flex items-center gap-1 min-w-0", className)}>
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground mr-0.5 shrink-0">
          Tanggal:
        </span>
      )}

      {/* Tombol Hari Sebelumnya */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handlePrevDay}
        className="size-7 rounded-none shrink-0 cursor-pointer"
        title="Hari Sebelumnya"
        aria-label="Hari Sebelumnya"
      >
        <ChevronLeft className="size-3.5" />
      </Button>

      {/* Tombol Kalender Popover */}
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger className="inline-flex items-center gap-1.5 h-7 px-2 sm:px-2.5 border border-border bg-background text-foreground text-xs font-medium hover:bg-muted/40 transition-colors cursor-pointer select-none rounded-none shadow-2xs max-w-[150px] sm:max-w-none">
          <CalendarIcon className="size-3.5 text-primary shrink-0" />
          <span className="truncate hidden sm:inline">
            {selectedDate
              ? format(selectedDate, "EEEE, dd MMMM yyyy", { locale: localeId })
              : "Semua Tanggal"}
          </span>
          <span className="truncate sm:hidden">
            {selectedDate
              ? format(selectedDate, "dd MMM yyyy", { locale: localeId })
              : "Semua Tanggal"}
          </span>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-auto p-2 rounded-none bg-card border-border shadow-xl space-y-1.5 z-50"
        >
          <Calendar
            mode="single"
            selected={selectedDate || undefined}
            defaultMonth={selectedDate || new Date(2026, 3, 13)}
            onSelect={handleDateSelect}
            locale={localeId}
            className="rounded-none border border-border bg-background p-1"
          />
          <div className="flex items-center justify-between border-t border-border pt-1.5 px-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] font-medium rounded-none cursor-pointer"
              onClick={() => handleDateSelect(new Date())}
            >
              Hari Ini
            </Button>
            {selectedDate && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground rounded-none cursor-pointer"
                onClick={handleClearDate}
              >
                Semua Tanggal
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Tombol Hari Berikutnya */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleNextDay}
        className="size-7 rounded-none shrink-0 cursor-pointer"
        title="Hari Berikutnya"
        aria-label="Hari Berikutnya"
      >
        <ChevronRight className="size-3.5" />
      </Button>
    </div>
  );
}
