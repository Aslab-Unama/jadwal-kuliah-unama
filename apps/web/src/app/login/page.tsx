import type { Metadata } from "next";
import { LoginForm } from "@/components/login/login-form";

export const metadata: Metadata = {
  title: "Login Aslab - Portal Jadwal UNAMA",
  description: "Otentikasi khusus Asisten Laboratorium Universitas Dinamika Bangsa (UNAMA)",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-4 sm:p-6 md:p-10 bg-muted/30 dark:bg-background">
      <div className="w-full max-w-sm border border-border bg-card p-6 shadow-xs sm:p-8">
        <LoginForm />
      </div>
    </div>
  );
}

