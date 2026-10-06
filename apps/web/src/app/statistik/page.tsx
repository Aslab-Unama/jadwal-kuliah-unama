import type { Metadata } from "next";
import { StatistikPageContent } from "./statistik-content";

export const metadata: Metadata = {
  title: "Pusat Statistik & Analitik Akademik | Universitas Dinamika Bangsa",
  description:
    "Statistik beban perkuliahan, utilisasi laboratorium, dan analitik operasional perkuliahan UNAMA semester aktif.",
};

export default function StatistikPage() {
  return <StatistikPageContent />;
}
