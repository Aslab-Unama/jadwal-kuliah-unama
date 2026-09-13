import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Jadwal Kuliah UNAMA - Portal Jadwal Kelas & Laboratorium",
  description: "Portal publik informasi jadwal perkuliahan dan laboratorium komputer Universitas Dinamika Bangsa (UNAMA).",
  icons: {
    icon: "/unama.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={cn("font-sans antialiased", "font-sans", inter.variable)} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground selection:bg-primary/20">
        {children}
      </body>
    </html>
  );
}
