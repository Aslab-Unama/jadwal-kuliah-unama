"use client";

import * as React from "react";

interface ModalStackEntry {
  id: string;
  onClose: () => void;
}

// Global stack of currently open modals in order of opening
const modalStack: ModalStackEntry[] = [];
let isPopstateHandling = false;

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    // If the pop was initiated programmatically by us, ignore it
    if (isPopstateHandling) {
      isPopstateHandling = false;
      return;
    }

    // A real browser back button / swipe back was pressed on mobile/desktop
    if (modalStack.length > 0) {
      const topModal = modalStack.pop();
      if (topModal) {
        topModal.onClose();
      }
    }
  });
}

interface UseDialogHistoryOptions {
  isOpen: boolean;
  onClose: () => void;
  dialogId: string;
}

export function useDialogHistory({
  isOpen,
  onClose,
  dialogId,
}: UseDialogHistoryOptions) {
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  const idRef = React.useRef(dialogId);
  idRef.current = dialogId;

  const isPushedRef = React.useRef(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    if (isOpen) {
      if (!isPushedRef.current) {
        isPushedRef.current = true;
        const entry: ModalStackEntry = {
          id: idRef.current,
          onClose: () => onCloseRef.current(),
        };
        modalStack.push(entry);

        window.history.pushState(
          { ...window.history.state, __modal_id: idRef.current },
          "",
          window.location.href
        );
      }
    } else {
      if (isPushedRef.current) {
        isPushedRef.current = false;

        const index = modalStack.findIndex((m) => m.id === idRef.current);
        if (index !== -1) {
          modalStack.splice(index, 1);
        }

        if (window.history.state?.__modal_id === idRef.current) {
          isPopstateHandling = true;
          window.history.back();
        }
      }
    }
  }, [isOpen]);

  React.useEffect(() => {
    return () => {
      if (isPushedRef.current) {
        isPushedRef.current = false;
        const index = modalStack.findIndex((m) => m.id === idRef.current);
        if (index !== -1) {
          modalStack.splice(index, 1);
        }
        if (window.history.state?.__modal_id === idRef.current) {
          isPopstateHandling = true;
          window.history.back();
        }
      }
    };
  }, []);
}
