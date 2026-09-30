"use client";

import * as React from "react";

let programmaticBackCount = 0;

interface UseDialogHistoryOptions {
  isOpen: boolean;
  onClose: () => void;
  dialogId?: string;
}

export function useDialogHistory({
  isOpen,
  onClose,
  dialogId = "dialog",
}: UseDialogHistoryOptions) {
  const currentModalIdRef = React.useRef<string | null>(null);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    if (isOpen) {
      const modalId = `${dialogId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      currentModalIdRef.current = modalId;

      const currentState = window.history.state || {};
      window.history.pushState(
        {
          ...currentState,
          __dialog_id: modalId,
        },
        "",
        window.location.href
      );

      const handlePopState = () => {
        if (programmaticBackCount > 0) {
          programmaticBackCount--;
          return;
        }

        const activeState = window.history.state;
        if (!activeState || activeState.__dialog_id !== modalId) {
          currentModalIdRef.current = null;
          onCloseRef.current();
        }
      };

      window.addEventListener("popstate", handlePopState);

      return () => {
        window.removeEventListener("popstate", handlePopState);

        if (
          currentModalIdRef.current &&
          window.history.state?.__dialog_id === currentModalIdRef.current
        ) {
          currentModalIdRef.current = null;
          programmaticBackCount++;
          window.history.back();
        }
      };
    } else {
      if (
        currentModalIdRef.current &&
        window.history.state?.__dialog_id === currentModalIdRef.current
      ) {
        currentModalIdRef.current = null;
        programmaticBackCount++;
        window.history.back();
      }
    }
  }, [isOpen, dialogId]);
}
