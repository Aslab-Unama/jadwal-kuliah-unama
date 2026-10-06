"use client";

// Helper cookie
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; Max-Age=0; path=/`;
}

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Clock,
  Lock,
  LogOut,
  Moon,
  RefreshCw,
  Sun,
  Calendar,
  LayoutDashboard,
  ChevronDown,
  BarChart3,
} from "lucide-react";
import { useGlobalTime } from "@/lib/time-sync";
import { cn } from "cn";

interface HeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function Header({ onRefresh, isRefreshing }: HeaderProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = React.useState<boolean>(false);
  const [isAslab, setIsAslab] = React.useState<boolean>(false);
  const { timeWibStr, isSynced } = useGlobalTime(1000);

  React.useEffect(() => {
    setMounted(true);
    // Cek status login Aslab
    setIsAslab(getCookie("aslab_logged_in") === "true");
  }, []);

  const isDark = mounted ? (resolvedTheme || theme) === "dark" : false;

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const handleLogout = () => {
    deleteCookie("aslab_token");
    deleteCookie("aslab_logged_in");
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/80 print:hidden">
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8 gap-2">
        {/* Brand & Identity */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 min-w-0 hover:opacity-90 transition-opacity">
          <div className="relative flex size-8 sm:size-10 shrink-0 items-center justify-center">
            <Image
              src="/unama.png"
              alt="Logo UNAMA"
              width={40}
              height={40}
              style={{ width: "auto" }}
              className="h-8 sm:h-10 w-auto object-contain"
              priority
            />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm font-bold tracking-tight sm:text-base md:text-lg truncate">
                <span className="sm:hidden">Jadwal UNAMA</span>
                <span className="hidden sm:inline">Jadwal Kuliah UNAMA</span>
              </h1>
              <Badge variant="outline" className="hidden sm:inline-flex text-[11px] font-normal shrink-0">
                Ganjil 2026/2027
              </Badge>
              {isAslab && (
                <Badge variant="default" className="hidden sm:inline-flex text-[10px] font-normal bg-emerald-600 text-white shrink-0">
                  Mode Aslab
                </Badge>
              )}
            </div>
          </div>
        </Link>

        {/* Status Indicators & Action Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {mounted && timeWibStr ? (
            <div
              className="hidden md:flex items-center gap-1.5 border border-border px-2.5 py-1 text-xs text-muted-foreground select-none"
              title={isSynced ? "Waktu Global Terverifikasi (WIB)" : "Waktu Real-time (WIB)"}
              suppressHydrationWarning
            >
              <Clock className={cn("size-3.5", isSynced ? "text-emerald-500" : "text-muted-foreground")} />
              <span className="font-mono" suppressHydrationWarning>{timeWibStr}</span>
            </div>
          ) : (
            <div
              className="hidden md:flex items-center gap-1.5 border border-transparent px-2.5 py-1 text-xs opacity-0 pointer-events-none select-none"
              aria-hidden="true"
            >
              <Clock className="size-3.5 text-muted-foreground" />
              <span className="font-mono">--:-- WIB</span>
            </div>
          )}

          {/* Refresh Button */}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3 sm:gap-1.5 cursor-pointer"
              title="Perbarui data"
              aria-label="Muat ulang data jadwal"
            >
              <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Perbarui</span>
            </Button>
          )}

          {/* Mobile Aslab Actions Dropdown */}
          {isAslab ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="sm:hidden inline-flex items-center gap-1.5 h-8 px-2.5 border border-emerald-600/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium cursor-pointer transition-colors select-none"
                aria-label="Menu Asisten Lab"
              >
                <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Menu Aslab</span>
                <ChevronDown className="size-3.5 opacity-70 shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1">
                <DropdownMenuLabel className="px-2 py-1.5 font-semibold text-xs text-foreground flex items-center justify-between">
                  <span>Asisten Lab UNAMA</span>
                  <span className="size-2 rounded-full bg-emerald-500" />
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {pathname === "/dashboard" ? (
                  <DropdownMenuItem
                    onClick={() => router.push("/")}
                    className="cursor-pointer gap-2.5 px-2 py-2"
                  >
                    <Calendar className="size-4 shrink-0 text-primary" />
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">Jadwal Kuliah</span>
                      <span className="text-[10px] text-muted-foreground">Lihat jadwal mahasiswa</span>
                    </div>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => router.push("/dashboard")}
                    className="cursor-pointer gap-2.5 px-2 py-2"
                  >
                    <LayoutDashboard className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">Dashboard Monitor</span>
                      <span className="text-[10px] text-muted-foreground">Pantau ruangan & presensi</span>
                    </div>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => router.push(pathname === "/statistik" ? "/" : "/statistik")}
                  className="cursor-pointer gap-2.5 px-2 py-2"
                >
                  <BarChart3 className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">
                      {pathname === "/statistik" ? "Jadwal Kuliah" : "Statistik Akademik"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {pathname === "/statistik" ? "Kembali ke jadwal kelas" : "Utilisasi lab & beban dosen"}
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={toggleTheme}
                  className="cursor-pointer gap-2.5 px-2 py-2"
                >
                  {isDark ? (
                    <>
                      <Sun className="size-4 shrink-0 text-amber-500" />
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">Mode Terang</span>
                        <span className="text-[10px] text-muted-foreground">Beralih ke tampilan terang</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Moon className="size-4 shrink-0 text-indigo-400" />
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">Mode Gelap</span>
                        <span className="text-[10px] text-muted-foreground">Beralih ke tampilan gelap</span>
                      </div>
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={handleLogout}
                  className="cursor-pointer gap-2.5 px-2 py-2"
                >
                  <LogOut className="size-4 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-medium">Keluar Aslab</span>
                    <span className="text-[10px] opacity-80">Akhiri sesi asisten lab</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-1.5 sm:hidden">
              <Link href={pathname === "/statistik" ? "/" : "/statistik"}>
                <Button
                  variant={pathname === "/statistik" ? "secondary" : "outline"}
                  size="sm"
                  className="h-8 w-8 p-0 cursor-pointer text-xs"
                  title={pathname === "/statistik" ? "Jadwal Kuliah" : "Statistik Akademik"}
                  aria-label={pathname === "/statistik" ? "Kembali ke Jadwal Kuliah" : "Buka Statistik Akademik"}
                >
                  {pathname === "/statistik" ? (
                    <Calendar className="size-3.5 shrink-0" />
                  ) : (
                    <BarChart3 className="size-3.5 shrink-0" />
                  )}
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 gap-1.5 cursor-pointer text-xs"
                  title="Login Aslab"
                  aria-label="Masuk sebagai Asisten Lab"
                >
                  <Lock className="size-3.5 shrink-0" />
                  <span>Login</span>
                </Button>
              </Link>
            </div>
          )}

          {/* Desktop Statistik Navigation */}
          <Link href={pathname === "/statistik" ? "/" : "/statistik"} className="hidden sm:inline-flex">
            <Button
              variant={pathname === "/statistik" ? "secondary" : "outline"}
              size="sm"
              className="h-9 px-3 gap-1.5 cursor-pointer text-xs"
              title={pathname === "/statistik" ? "Kembali ke Jadwal Kuliah" : "Buka Statistik & Analitik Akademik"}
            >
              {pathname === "/statistik" ? (
                <>
                  <Calendar className="size-3.5 shrink-0" />
                  <span>Jadwal Kuliah</span>
                </>
              ) : (
                <>
                  <BarChart3 className="size-3.5 shrink-0" />
                  <span>Statistik</span>
                </>
              )}
            </Button>
          </Link>

          {/* Desktop Aslab Switcher */}
          {isAslab && (
            <Link href={pathname === "/dashboard" ? "/" : "/dashboard"} className="hidden sm:inline-flex">
              <Button
                variant={pathname === "/dashboard" ? "secondary" : "outline"}
                size="sm"
                className="h-9 px-3 gap-1.5 cursor-pointer text-xs"
                title={pathname === "/dashboard" ? "Lihat Jadwal Mahasiswa" : "Buka Dashboard Aslab"}
              >
                {pathname === "/dashboard" ? (
                  <>
                    <Calendar className="size-3.5 shrink-0" />
                    <span>Jadwal Kuliah</span>
                  </>
                ) : (
                  <>
                    <LayoutDashboard className="size-3.5 shrink-0" />
                    <span>Dashboard</span>
                  </>
                )}
              </Button>
            </Link>
          )}

          {/* Desktop Logout Button */}
          {isAslab && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="hidden sm:inline-flex h-9 px-3 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 cursor-pointer text-xs"
              aria-label="Keluar dari sesi Aslab"
              title="Keluar Aslab"
            >
              <LogOut className="size-3.5 shrink-0" />
              <span>Keluar</span>
            </Button>
          )}

          {/* Desktop Login Button */}
          {!isAslab && (
            <Link href="/login" className="hidden sm:inline-flex">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 gap-1.5 cursor-pointer text-xs"
                aria-label="Masuk sebagai Asisten Lab"
                title="Login Aslab"
              >
                <Lock className="size-3.5 shrink-0" />
                <span>Login Aslab</span>
              </Button>
            </Link>
          )}

          {/* Theme Toggle Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className={cn(
              "cursor-pointer",
              isAslab ? "hidden sm:inline-flex h-9 w-9" : "h-8 w-8 sm:h-9 sm:w-9"
            )}
            aria-label="Ganti mode tema tampilan"
            title="Ganti tema tampilan"
          >
            <Sun className="size-3.5 sm:size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute size-3.5 sm:size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
      </div>
    </header>
  );
}
