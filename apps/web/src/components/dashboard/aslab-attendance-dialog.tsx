"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { JadwalItem, formatDosenName } from "@/lib/types";
import {
  AsistenLabItem,
  AbsensiRecord,
  fetchAsistenList,
  fetchAbsensiList,
  submitAbsensi,
  getGoogleFormPrefillUrl,
  formatNomorLab,
  formatJamMasuk,
  formatStatusPerkuliahan,
  convertIndoDateToIso,
  generateAttendanceFingerprint,
} from "@/lib/aslab-attendance";
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  DoorOpen,
  ExternalLink,
  Loader2,
  Send,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
} from "lucide-react";
import { cn } from "cn";
import { useJadwalStore } from "@/stores/use-jadwal-store";

interface AslabAttendanceDialogProps {
  item?: JadwalItem | null;
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

const JAM_OPTIONS = [
  "08.00 WIB",
  "08.45 WIB",
  "09.30 WIB",
  "10.15 WIB",
  "11.00 WIB",
  "11.45 WIB",
  "12.30 WIB",
  "13.15 WIB",
  "14.00 WIB",
  "14.45 WIB",
  "15.30 WIB",
  "16.15 WIB",
  "17.00 WIB",
  "17.45 WIB",
  "18.30 WIB",
  "19.15 WIB",
  "20.00 WIB",
  "20.45 WIB",
];

const STATUS_OPTIONS: Array<"Tatap Muka" | "Online" | "Cancel"> = [
  "Tatap Muka",
  "Online",
  "Cancel",
];

export function AslabAttendanceDialog({
  item,
  isOpen,
  onClose,
  onSuccess,
}: AslabAttendanceDialogProps) {
  const activeModal = useJadwalStore((s) => s.activeModal);
  const closeModal = useJadwalStore((s) => s.closeModal);

  const isAttendanceModalOpen =
    isOpen !== undefined ? isOpen : activeModal?.type === "attendance";
  const modalItem =
    item !== undefined
      ? item
      : activeModal?.type === "attendance"
      ? activeModal.item
      : null;

  const [cachedItem, setCachedItem] = React.useState<JadwalItem | null>(modalItem);
  React.useEffect(() => {
    if (modalItem) {
      setCachedItem(modalItem);
    }
  }, [modalItem]);

  const effectiveItem = modalItem || cachedItem;

  const handleClose = () => {
    if (onClose) onClose();
    closeModal();
  };

  const [asistenList, setAsistenList] = React.useState<AsistenLabItem[]>([]);
  const [namaAsisten, setNamaAsisten] = React.useState<string>("");
  const [customNama, setCustomNama] = React.useState<string>("");
  const [statusPerkuliahan, setStatusPerkuliahan] = React.useState<"Tatap Muka" | "Online" | "Cancel">("Tatap Muka");
  const [jamMasuk, setJamMasuk] = React.useState<string>("08.00 WIB");
  const [nomorLab, setNomorLab] = React.useState<string>("");

  const [isLoadingCheck, setIsLoadingCheck] = React.useState<boolean>(false);
  const [alreadySubmitted, setAlreadySubmitted] = React.useState<AbsensiRecord | null>(null);

  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = React.useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = React.useState<string | null>(null);

  // Load asisten list once
  React.useEffect(() => {
    let isMounted = true;
    fetchAsistenList().then((data) => {
      if (isMounted && data.length > 0) {
        setAsistenList(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // When active item changes or modal opens
  React.useEffect(() => {
    if (!effectiveItem || !isAttendanceModalOpen) {
      setSubmitSuccess(false);
      setFeedbackMessage(null);
      setAlreadySubmitted(null);
      return;
    }

    const defaultNomorLab = formatNomorLab(effectiveItem.ruangan, effectiveItem.kampus);
    const defaultJam = formatJamMasuk(effectiveItem.waktuMulai);
    const defaultStatus = formatStatusPerkuliahan(effectiveItem.status);

    setNomorLab(defaultNomorLab);
    setJamMasuk(defaultJam);
    setStatusPerkuliahan(defaultStatus);
    setSubmitSuccess(false);
    setFeedbackMessage(null);

    // Cari asisten yang bertanggung jawab di lab ini dari data database (sesuai ruangan & kampus)
    const itemKampus = effectiveItem.kampus.toLowerCase();
    const itemRoom = effectiveItem.ruangan.toLowerCase();

    const matchedAslab =
      asistenList.find((a) => {
        const isRoom =
          a.ruangan.toLowerCase() === itemRoom ||
          (a.nomorLab && itemRoom.includes(a.nomorLab));
        const isKampus =
          (itemKampus.includes("thehok") && a.kampus.toLowerCase().includes("thehok")) ||
          (itemKampus.includes("kobar") && a.kampus.toLowerCase().includes("kobar"));
        return isRoom && isKampus;
      }) ||
      asistenList.find((a) => {
        return a.ruangan.toLowerCase() === itemRoom || (a.nomorLab && itemRoom.includes(a.nomorLab));
      });

    if (matchedAslab) {
      setNamaAsisten(matchedAslab.nama);
    } else if (asistenList.length > 0) {
      // Default fallback jika belum matched
      setNamaAsisten(asistenList[0].nama);
    } else {
      setNamaAsisten("M.Raffi Pra Diestyawan");
    }

    // Cek status duplikasi ke database
    setIsLoadingCheck(true);
    const expectedFingerprint = generateAttendanceFingerprint(
      effectiveItem.tanggal,
      effectiveItem.kodeKelas,
      effectiveItem.ruangan,
      effectiveItem.waktuMulai
    );

    fetchAbsensiList(effectiveItem.tanggal)
      .then((records) => {
        const found = records.find((r) => r.fingerprint === expectedFingerprint);
        if (found) {
          setAlreadySubmitted(found);
        } else {
          setAlreadySubmitted(null);
        }
      })
      .finally(() => {
        setIsLoadingCheck(false);
      });
  }, [effectiveItem, isAttendanceModalOpen, asistenList]);

  if (!effectiveItem) return null;

  const effectiveNamaAsisten = namaAsisten === "OTHER" ? customNama.trim() : namaAsisten;

  const currentPayload = {
    jadwalId: effectiveItem.id,
    tanggal: effectiveItem.tanggal,
    tanggalIso: convertIndoDateToIso(effectiveItem.tanggal),
    jamMasuk,
    waktuMulai: effectiveItem.waktuMulai,
    waktuSelesai: effectiveItem.waktuSelesai || undefined,
    ruangan: effectiveItem.ruangan,
    kampus: effectiveItem.kampus,
    nomorLab,
    kodeKelas: effectiveItem.kodeKelas,
    mataKuliah: effectiveItem.mataKuliah,
    dosen: effectiveItem.dosen,
    statusPerkuliahan,
    namaAsisten: effectiveNamaAsisten,
  };

  const handleKirimAbsensi = async () => {
    if (!effectiveNamaAsisten) {
      setFeedbackMessage("Mohon pilih atau masukkan nama asisten lab.");
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      const res = await submitAbsensi(currentPayload);

      if (res.alreadySubmitted) {
        setAlreadySubmitted(res.data);
        setFeedbackMessage(res.message);
      } else if (res.success) {
        setSubmitSuccess(true);
        setFeedbackMessage(res.message);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setFeedbackMessage(res.message || "Terjadi kesalahan saat mengirim absensi.");
      }
    } catch {
      setFeedbackMessage("Gagal mengirim absensi. Pastikan koneksi internet aktif.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const prefillUrl = getGoogleFormPrefillUrl(currentPayload);

  return (
    <Dialog open={isAttendanceModalOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-full sm:max-w-xl p-5 sm:p-6 rounded-none border border-border bg-card max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader className="space-y-1.5 text-left pb-3 border-b border-border pr-8">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center bg-primary/10 text-primary border border-primary/20">
              <ShieldCheck className="size-4" />
            </span>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                Absensi Asisten Laboratorium
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Sistem otomatis kirim ke Google Form Absensi Aslab UNAMA & database.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Status Loading Check */}
        {isLoadingCheck ? (
          <div className="flex items-center justify-center py-8 gap-2 text-xs text-muted-foreground font-mono">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span>Memeriksa status kehadiran di database...</span>
          </div>
        ) : alreadySubmitted ? (
          /* Tampilan jika SUDAH DIABSEN (Anti-duplikasi) */
          <div className="space-y-4 py-2">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 dark:text-emerald-200 rounded-none space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-5 shrink-0" />
                <span>Sesi Perkuliahan Ini Sudah Diabsen</span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Absensi untuk kelas ini telah tersimpan di sistem. Data tidak dapat diabsen ulang untuk mencegah duplikasi di Google Form.
              </p>
              <div className="pt-2 border-t border-emerald-500/20 text-xs font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Petugas Asisten:</span>
                  <span className="font-bold text-foreground">{alreadySubmitted.namaAsisten}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status Perkuliahan:</span>
                  <span className="font-bold text-foreground">{alreadySubmitted.statusPerkuliahan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Waktu Kirim:</span>
                  <span className="font-bold text-foreground">
                    {new Date(alreadySubmitted.createdAt).toLocaleString("id-ID", {
                      timeZone: "Asia/Jakarta",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })} WIB
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 border border-border bg-muted/20 text-xs space-y-1.5">
              <p className="font-semibold text-foreground">{effectiveItem.mataKuliah} ({effectiveItem.kodeKelas})</p>
              <p className="text-muted-foreground">{formatDosenName(effectiveItem.dosen)}</p>
              <p className="text-[11px] font-mono text-muted-foreground">
                {effectiveItem.ruangan} ({effectiveItem.kampus}) &bull; {effectiveItem.hari}, {effectiveItem.tanggal}
              </p>
            </div>
          </div>
        ) : submitSuccess ? (
          /* Tampilan Sukses Setelah Kirim */
          <div className="space-y-4 py-4 text-center">
            <div className="inline-flex size-12 items-center justify-center bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
              <Check className="size-6 stroke-[3]" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-base text-foreground">
                Absensi Berhasil Terkirim!
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {feedbackMessage || "Data absensi telah berhasil dicatat ke Google Form BAAK dan tersimpan di database."}
              </p>
            </div>
            <div className="p-3 bg-muted/20 border border-border text-xs text-left font-mono space-y-1">
              <p className="text-muted-foreground">Asisten: <strong className="text-foreground">{effectiveNamaAsisten}</strong></p>
              <p className="text-muted-foreground">Kelas: <strong className="text-foreground">{effectiveItem.kodeKelas} - {effectiveItem.mataKuliah}</strong></p>
              <p className="text-muted-foreground">Ruang: <strong className="text-foreground">{nomorLab}</strong> ({jamMasuk})</p>
            </div>
          </div>
        ) : (
          /* Form Pengisian & Konfirmasi Absensi */
          <div className="space-y-3.5 py-1 text-xs">
            {feedbackMessage && (
              <div className="p-2.5 bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <ShieldAlert className="size-4 shrink-0" />
                <span>{feedbackMessage}</span>
              </div>
            )}

            {/* Ringkasan Kelas Terpilih */}
            <div className="p-3 bg-muted/20 border border-border space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 mb-1 rounded-none">
                    {effectiveItem.kodeKelas}
                  </Badge>
                  <h4 className="font-bold text-sm text-foreground leading-snug">
                    {effectiveItem.mataKuliah}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Dosen: <strong className="text-foreground/80">{formatDosenName(effectiveItem.dosen)}</strong>
                  </p>
                </div>
                <Badge variant="secondary" className="font-mono text-[10px] shrink-0 rounded-none whitespace-nowrap">
                  {nomorLab}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-[11px] font-mono text-muted-foreground">
                <div>
                  <span className="block text-[10px] uppercase text-muted-foreground/70">Waktu Jadwal</span>
                  <span className="font-semibold text-foreground">{effectiveItem.waktuMulai} WIB</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-muted-foreground/70">Tanggal</span>
                  <span className="font-semibold text-foreground">{effectiveItem.tanggal}</span>
                </div>
              </div>
            </div>

            {/* Field Input: Nama Asisten */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="size-3.5 text-primary" />
                  Nama Asisten Bertugas
                </span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  (Otomatis sesuai lab PJ)
                </span>
              </label>

              <NativeSelect
                value={asistenList.some((a) => a.nama === namaAsisten) ? namaAsisten : "OTHER"}
                onChange={(e) => {
                  const val = e.target.value;
                  setNamaAsisten(val);
                }}
                className="w-full text-xs"
              >
                {asistenList.map((aslab) => (
                  <NativeSelectOption key={aslab.id} value={aslab.nama}>
                    {aslab.nama} ({aslab.ruangan} - {aslab.kampus.replace("Kampus ", "")})
                  </NativeSelectOption>
                ))}
                <NativeSelectOption value="OTHER">Lainnya / Ganti Nama...</NativeSelectOption>
              </NativeSelect>

              {namaAsisten === "OTHER" && (
                <input
                  type="text"
                  placeholder="Ketik nama lengkap asisten pengganti..."
                  value={customNama}
                  onChange={(e) => setCustomNama(e.target.value)}
                  className="w-full h-8 px-2.5 py-1 text-xs bg-background border border-border focus:border-primary outline-none"
                />
              )}
            </div>

            {/* Grid 2 Kolom: Jam Masuk & Status Perkuliahan */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5 text-muted-foreground" />
                  Jam Masuk
                </label>
                <NativeSelect
                  value={jamMasuk}
                  onChange={(e) => setJamMasuk(e.target.value)}
                  className="w-full text-xs"
                >
                  {JAM_OPTIONS.map((jam) => (
                    <NativeSelectOption key={jam} value={jam}>
                      {jam}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground flex items-center gap-1.5">
                  <DoorOpen className="size-3.5 text-muted-foreground" />
                  Status Kuliah
                </label>
                <NativeSelect
                  value={statusPerkuliahan}
                  onChange={(e) => setStatusPerkuliahan(e.target.value as any)}
                  className="w-full text-xs"
                >
                  {STATUS_OPTIONS.map((st) => (
                    <NativeSelectOption key={st} value={st}>
                      {st}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-4 border-t border-border mt-2">
          {/* Tombol Batal / Tutup di Desktop sebelah kiri, di Mobile paling bawah */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            className="w-full sm:w-auto rounded-none text-xs h-9 cursor-pointer text-muted-foreground hover:text-foreground shrink-0"
          >
            {submitSuccess || alreadySubmitted ? "Tutup" : "Batal"}
          </Button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Opsi Cek Google Form (Prefilled) sebagai alternatif manual */}
            <a
              href={prefillUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "w-full sm:w-auto rounded-none gap-1.5 text-xs h-9 cursor-pointer text-muted-foreground hover:text-foreground justify-center shrink-0"
              )}
            >
              <ExternalLink className="size-3.5" />
              <span>Cek Form</span>
            </a>

            {/* Tombol Eksekusi Kirim Absen Otomatis (Primary) */}
            {!alreadySubmitted && !submitSuccess && (
              <Button
                type="button"
                size="sm"
                onClick={handleKirimAbsensi}
                disabled={isSubmitting || !effectiveNamaAsisten}
                className="w-full sm:w-auto rounded-none bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs h-9 cursor-pointer shadow-2xs font-semibold justify-center shrink-0"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Mengirim...</span>
                  </>
                ) : (
                  <>
                    <Send className="size-3.5" />
                    <span>Kirim Absen Sekarang</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
