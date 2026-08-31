// ────────────────────────────────────────────────────────────────────────────
// useServiceWorker
// Expõe estado do PWA Service Worker e permite aplicar atualizações.
// Integra com o ciclo já mapeado no PwaUpdateSection.
// ────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';

interface ServiceWorkerState {
  isInstalled: boolean;
  updateAvailable: boolean;
  applyUpdate: () => void;
}

export function useServiceWorker(): ServiceWorkerState {
  const [isInstalled, setIsInstalled] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;

    const checkForUpdate = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
        setUpdateAvailable(true);
      }
    };

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      registration = reg;
      setIsInstalled(true);
      checkForUpdate(reg);

      // Detectar novo SW em espera
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setUpdateAvailable(true);
          }
        });
      });
    });

    // Detectar quando o novo SW toma controle (após skipWaiting)
    const handleControllerChange = () => {
      setUpdateAvailable(false);
      setWaitingWorker(null);
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      void registration;
    };
  }, []);

  const applyUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      // Recarregar após troca de controle
      window.location.reload();
    }
  }, [waitingWorker]);

  return { isInstalled, updateAvailable, applyUpdate };
}
