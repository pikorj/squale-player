// SQUALE PWA Manager: Service Worker registration and install prompt handler

export interface PWAInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferredPrompt: PWAInstallPromptEvent | null = null;
const installListeners = new Set<(canInstall: boolean) => void>();

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[SQUALE PWA] Service Worker registrado con éxito:', registration.scope);

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[SQUALE PWA] Nueva versión disponible');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[SQUALE PWA] Error al registrar Service Worker:', error);
        });
    });

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e as PWAInstallPromptEvent;
      notifyInstallListeners(true);
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      notifyInstallListeners(false);
      try {
        localStorage.setItem('squale_is_installed', 'true');
      } catch {}
      console.log('[SQUALE PWA] ¡App instalada en el dispositivo!');
    });
  }
}

function notifyInstallListeners(canInstall: boolean) {
  installListeners.forEach((listener) => listener(canInstall));
}

export function subscribeToInstallPrompt(callback: (canInstall: boolean) => void) {
  installListeners.add(callback);
  callback(deferredPrompt !== null);
  return () => {
    installListeners.delete(callback);
  };
}

export async function promptPWAInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    return false;
  }
  try {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    notifyInstallListeners(false);
    if (choice.outcome === 'accepted') {
      try {
        localStorage.setItem('squale_is_installed', 'true');
      } catch {}
      return true;
    }
    return false;
  } catch (err) {
    console.error('[SQUALE PWA] Error mostrando prompt de instalación:', err);
    return false;
  }
}

export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://');

  if (isStandalone) {
    try {
      localStorage.setItem('squale_is_installed', 'true');
    } catch {}
  }

  return isStandalone;
}

export function isAppInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  if (isStandaloneApp()) return true;
  try {
    return localStorage.getItem('squale_is_installed') === 'true';
  } catch {
    return false;
  }
}

