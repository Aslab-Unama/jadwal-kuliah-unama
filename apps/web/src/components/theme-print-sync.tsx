"use client";

import * as React from "react";

/**
 * Sinkronisasi mode cetak browser:
 * Mencegah browser Chromium (Google Chrome / Edge) mencetak margin/header/footer
 * berwarna hitam saat aplikasi sedang berada dalam mode Gelap (Dark Mode).
 *
 * Saat event 'beforeprint' dipicu, class 'dark' dilepas sementara dan color-scheme
 * dipaksa menjadi 'light', sehingga kanvas pracetak browser 100% putih bersih.
 * Begitu dialog cetak ditutup ('afterprint'), status tema pengguna dikembalikan normal.
 */
export function ThemePrintSync() {
  React.useEffect(() => {
    const handleBeforePrint = () => {
      const html = document.documentElement;
      if (html.classList.contains("dark")) {
        html.dataset.wasDark = "true";
        html.classList.remove("dark");
        html.classList.add("light");
        html.style.colorScheme = "light";
        document.body.style.backgroundColor = "#ffffff";
        document.body.style.color = "#000000";
      }
    };

    const handleAfterPrint = () => {
      const html = document.documentElement;
      if (html.dataset.wasDark === "true") {
        delete html.dataset.wasDark;
        html.classList.remove("light");
        html.classList.add("dark");
        html.style.colorScheme = "";
        document.body.style.backgroundColor = "";
        document.body.style.color = "";
      }
    };

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  return null;
}
