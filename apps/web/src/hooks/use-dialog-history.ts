"use client";
 
import * as React from "react";
import { useJadwalStore } from "@/stores/use-jadwal-store";
import type { ActiveModal } from "@/lib/types";

let isProgrammaticNavigation = false;
let currentHistoryIdx = 0;

export function triggerProgrammaticBack() {
  if (typeof window === "undefined") return;
  isProgrammaticNavigation = true;
  window.history.back();
}

export function pushModalHistory(level: number, modal?: ActiveModal | null) {
  if (typeof window === "undefined") return;
  const currentIdx =
    typeof window.history.state?.__history_idx === "number"
      ? window.history.state.__history_idx
      : currentHistoryIdx;
  const nextIdx = currentIdx + 1;
  currentHistoryIdx = nextIdx;

  window.history.pushState(
    {
      ...window.history.state,
      __history_idx: nextIdx,
      __modal_level: level,
      __active_modal: modal ?? null,
    },
    "",
    window.location.href
  );
}

export function useGlobalModalHistory() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const state = window.history.state || {};
    if (typeof state.__history_idx !== "number") {
      currentHistoryIdx = 0;
      window.history.replaceState(
        { ...state, __history_idx: 0, __modal_level: 0, __active_modal: null },
        "",
        window.location.href
      );
    } else {
      currentHistoryIdx = state.__history_idx;
    }

    const handlePopState = (event: PopStateEvent) => {
      if (isProgrammaticNavigation) {
        isProgrammaticNavigation = false;
        currentHistoryIdx =
          typeof event.state?.__history_idx === "number"
            ? event.state.__history_idx
            : currentHistoryIdx;
        return;
      }

      const prevIdx = currentHistoryIdx;
      const nextIdx =
        typeof event.state?.__history_idx === "number"
          ? event.state.__history_idx
          : -1;
      currentHistoryIdx = Math.max(0, nextIdx);

      const store = useJadwalStore.getState();
      const targetModal = event.state?.__active_modal as
        | ActiveModal
        | null
        | undefined;

      if (nextIdx > prevIdx) {
        // Forward: restore the forward modal state recorded at this history point
        if (targetModal) {
          store.restoreModal(targetModal);
        }
      } else if (nextIdx < prevIdx) {
        // Back: step down to the parent modal or close if base level reached
        if (targetModal) {
          store.restoreModal(targetModal);
        } else {
          store.closeModal(true);
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);
}
