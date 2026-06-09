"use client";

import { useEffect } from "react";
import { PWA_ENABLED } from "@/lib/pwa/config";

async function unregisterPwa() {
  if (!("serviceWorker" in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("ai-photo-")).map((key) => caches.delete(key)));
  }
}

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (PWA_ENABLED) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
        console.error("[pwa] service worker registration failed:", error);
      });
      return;
    }

    void unregisterPwa().catch((error) => {
      console.error("[pwa] service worker unregister failed:", error);
    });
  }, []);

  return null;
}
