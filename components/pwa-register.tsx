"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const hadController = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;
    const onControllerChange = () => {
      if (!hadController || refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    void navigator.serviceWorker.register("/service-worker.js", { scope: "/" }).then((registration) => {
      // Check immediately instead of waiting for the browser's periodic SW
      // update, which is particularly slow for an installed iOS PWA.
      void registration.update();
      registration.waiting?.postMessage({ type: "SKIP_WAITING" });
    });

    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  return null;
}
