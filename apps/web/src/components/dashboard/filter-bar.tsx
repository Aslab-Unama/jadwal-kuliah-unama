"use client";

import * as React from "react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  LayoutGrid,
  RotateCcw,
  Search,
  Table as TableIcon,
  X,
} from "lucide-react";
import { DateSelector } from "./date-selector";
import { JadwalFilters } from "@/lib/types";
import { useDebounce } from "@/hooks/use-debounce";

export interface FilterBarProps {
  filters: JadwalFilters;
  onFilterChange: (newFilters: Partial<JadwalFilters>) => void;
  onResetFilters: () => void;
  kampusList: string[];
  ruanganList: string[];
  viewMode: "grid" | "table";
  onViewModeChange: (mode: "grid" | "table") => void;
  totalFiltered: number;
  selectedDate: Date | null;
  onDateChange: (date: Date | null) => void;
  className?: string;
}

const STATUS_OPTIONS = [
  { value: "Semua", label: "Semua Status" },
  { value: "OnSchedule (TM)", label: "Tatap Muka" },
  { value: "OnSchedule (OL)", label: "Online" },
  { value: "Cancel", label: "Cancel" },
];

export function FilterBar({
  filters,
  onFilterChange,
  onResetFilters,
  kampusList,
  ruanganList,
  viewMode,
  onViewModeChange,
  totalFiltered,
  selectedDate,
  onDateChange,
  className,
}: FilterBarProps) {
  // Search state dengan pelindung ref user typing agar tidak terjadi race condition saat filter direset
  const [searchValue, setSearchValue] = React.useState(filters.search || "");
  const debouncedSearch = useDebounce(searchValue, 150);
  const isUserTypingRef = React.useRef(false);

  // Sync hanya jika filters.search direset/diubah dari luar (misal: tombol reset)
  React.useEffect(() => {
    const externalSearch = filters.search || "";
    setSearchValue((prev) => {
      if (externalSearch !== prev) {
        isUserTypingRef.current = false;
        return externalSearch;
      }
      return prev;
    });
  }, [filters.search]);

  // Eksekusi filter search HANYA jika dipicu oleh ketikan user (debounced 400ms)
  React.useEffect(() => {
    if (isUserTypingRef.current) {
      isUserTypingRef.current = false;
      onFilterChange({ search: debouncedSearch, page: 1 });
    }
  }, [debouncedSearch, onFilterChange]);

  const isFiltered = Boolean(
    (filters.search && filters.search.trim().length > 0) ||
      filters.tanggal ||
      (filters.kampus && filters.kampus !== "Semua") ||
      (filters.ruangan && filters.ruangan !== "Semua") ||
      (filters.status && filters.status !== "Semua")
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isUserTypingRef.current = true;
    setSearchValue(e.target.value);
  };

  const handleClearSearch = () => {
    isUserTypingRef.current = false;
    setSearchValue("");
    onFilterChange({ search: "", page: 1 });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      isUserTypingRef.current = false;
      onFilterChange({ search: searchValue, page: 1 });
    }
  };

  return (
    <div className={cn("space-y-3 border border-border bg-card p-3 sm:p-4 shadow-xs", className)}>
      {/* Search Bar (Full width with responsive placeholder) */}
      <div className="relative w-full">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Cari matkul, dosen, atau kode..."
          value={searchValue}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
          className="h-9 sm:h-10 pl-9 pr-9 text-xs sm:text-sm"
        />
        {searchValue && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
            aria-label="Hapus teks pencarian"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Date Selector & View Mode Switcher */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 py-0.5">
        {/* Unified Date Selector */}
        <DateSelector selectedDate={selectedDate} onDateChange={onDateChange} />

        <div className="h-4 w-px bg-border mx-0.5 hidden sm:block" />

        {/* View Toggle */}
        <div className="inline-flex items-center gap-1.5 shrink-0">
          <div className="inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              aria-pressed={viewMode === "grid"}
              className={cn(
                "h-7 px-2 sm:px-2.5 text-xs border transition-colors cursor-pointer rounded-none inline-flex items-center gap-1.5 select-none",
                viewMode === "grid"
                  ? "border-primary bg-primary text-primary-foreground font-medium"
                  : "border-border bg-background hover:bg-muted text-muted-foreground"
              )}
              title="Tampilan Kartu Grid"
              aria-label="Tampilan Kartu Grid"
            >
              <LayoutGrid className="size-3.5" />
              <span>Kartu</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("table")}
              aria-pressed={viewMode === "table"}
              className={cn(
                "h-7 px-2 sm:px-2.5 text-xs border transition-colors cursor-pointer rounded-none inline-flex items-center gap-1.5 select-none",
                viewMode === "table"
                  ? "border-primary bg-primary text-primary-foreground font-medium"
                  : "border-border bg-background hover:bg-muted text-muted-foreground"
              )}
              title="Tampilan Tabel"
              aria-label="Tampilan Tabel"
            >
              <TableIcon className="size-3.5" />
              <span>Tabel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dropdown Filters (Kampus, Ruangan, Status) */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 pt-1 border-t border-border/50">
        <div>
          <label htmlFor="filter-kampus" className="block text-[11px] font-medium text-muted-foreground mb-1">
            Kampus
          </label>
          <NativeSelect
            id="filter-kampus"
            value={filters.kampus || "Semua"}
            onChange={(e) => onFilterChange({ kampus: e.target.value, page: 1 })}
            className="w-full"
          >
            <NativeSelectOption value="Semua">Semua Kampus</NativeSelectOption>
            {kampusList.map((k) => (
              <NativeSelectOption key={k} value={k}>
                {k}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div>
          <label htmlFor="filter-ruangan" className="block text-[11px] font-medium text-muted-foreground mb-1">
            Ruangan
          </label>
          <NativeSelect
            id="filter-ruangan"
            value={filters.ruangan || "Semua"}
            onChange={(e) => onFilterChange({ ruangan: e.target.value, page: 1 })}
            className="w-full"
          >
            <NativeSelectOption value="Semua">Semua Ruangan</NativeSelectOption>
            {ruanganList.map((r) => (
              <NativeSelectOption key={r} value={r}>
                {r}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div>
          <label htmlFor="filter-status" className="block text-[11px] font-medium text-muted-foreground mb-1">
            Status Jadwal
          </label>
          <NativeSelect
            id="filter-status"
            value={filters.status || "Semua"}
            onChange={(e) => onFilterChange({ status: e.target.value, page: 1 })}
            className="w-full"
          >
            {STATUS_OPTIONS.map((s) => (
              <NativeSelectOption key={s.value} value={s.value}>
                {s.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      {/* Active Filter Info & Reset Action */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-muted-foreground border-t border-border/40">
        <div>
          <span>Menampilkan </span>
          <span className="font-semibold text-foreground">{totalFiltered.toLocaleString("id-ID")}</span>
          <span> sesi jadwal kelas</span>
        </div>

        {isFiltered && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <RotateCcw className="size-3" />
            <span>Atur Ulang Filter</span>
          </Button>
        )}
      </div>
    </div>
  );
}
