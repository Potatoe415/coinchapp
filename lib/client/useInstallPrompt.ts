"use client";

import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

/** Captures the browser's automatic "add to home screen" prompt so it can be
 *  triggered from our own footer button instead of the browser's own popup.
 *  Chrome/Edge on Android and desktop only - iOS Safari has no such API, so
 *  `installable` simply stays false there (users add it manually via Share). */
export function useInstallPrompt(): { installable: boolean; promptInstall: () => void } {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredEvent(event as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setDeferredEvent(null);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(() => {
    deferredEvent?.prompt();
  }, [deferredEvent]);

  return { installable: deferredEvent !== null, promptInstall };
}
