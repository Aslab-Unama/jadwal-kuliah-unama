"use client";

import * as React from "react";
import { useJadwalStore } from "@/stores/use-jadwal-store";

let isProgrammaticNavigation = false;

export function triggerProgrammaticBack() {
  if (typeof window === "undefined") return;
  isProgrammaticNavigation = true;
  window.history.back();
}

export function pushModalHistory(level: number) {
  if (typeof window === "undefined") return;
  window.history.pushState(
    { ...window.history.state, __modal_level: level },
    "",
    window.location.href
  );
}

export function useGlobalModalHistory() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      if (isProgrammaticNavigation) {
        isProgrammaticNavigation = false;
        return;
      }

      // Hardware/virtual back button or browser back gesture
      const state = useJadwalStore.getState();
      if (state.activeModal) {
        state.closeModal(true);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);
}
