import { useEffect, useRef } from "react";

export interface BackNavigationProps {
  detailsModalOpen: boolean;
  setDetailsModalOpen: (open: boolean) => void;
  showImportModal: boolean;
  setShowImportModal: (open: boolean) => void;
  showInstallModal: boolean;
  setShowInstallModal: (open: boolean) => void;
  queueOpen: boolean;
  setQueueOpen: (open: boolean) => void;
  lyricsOpen: boolean;
  setLyricsOpen: (open: boolean) => void;
  showVolumePopover: boolean;
  setShowVolumePopover: (open: boolean) => void;
  mobilePlayerOpen: boolean;
  setMobilePlayerOpen: (open: boolean) => void;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  activeNav: string;
  setActiveNav: (nav: string) => void;
  showNotification: (msg: string) => void;
}

/**
 * Gestor de navegación hacia atrás para móviles y PWA.
 * Intercepta el botón físico/gesto de "Atrás" de Android e iOS para que:
 * 1. Cierre modales abiertos (detalles, importar música, instalar).
 * 2. Cierre sub-vistas del reproductor (cola, letras, volumen).
 * 3. Minimice el reproductor móvil expandido al reproductor mini.
 * 4. Limpie filtros activos o regrese a la pestaña anterior / Inicio.
 * 5. Si está en la pantalla de Inicio, solicite confirmar ("Presiona atrás otra vez para salir")
 *    para evitar cierres accidentales de la app mientras se escucha música.
 */
export function useBackNavigation({
  detailsModalOpen,
  setDetailsModalOpen,
  showImportModal,
  setShowImportModal,
  showInstallModal,
  setShowInstallModal,
  queueOpen,
  setQueueOpen,
  lyricsOpen,
  setLyricsOpen,
  showVolumePopover,
  setShowVolumePopover,
  mobilePlayerOpen,
  setMobilePlayerOpen,
  selectedTag,
  setSelectedTag,
  activeNav,
  setActiveNav,
  showNotification,
}: BackNavigationProps) {
  // Banderas para sincronizar el historial sin bucles
  const isPopStateHandlingRef = useRef(false);
  const ignorePopStateRef = useRef(false);
  const lastBackPressTimeRef = useRef(0);
  const navHistoryRef = useRef<string[]>([activeNav]);

  // Refs siempre actualizados para el listener de popstate
  const detailsModalOpenRef = useRef(detailsModalOpen);
  detailsModalOpenRef.current = detailsModalOpen;

  const showImportModalRef = useRef(showImportModal);
  showImportModalRef.current = showImportModal;

  const showInstallModalRef = useRef(showInstallModal);
  showInstallModalRef.current = showInstallModal;

  const queueOpenRef = useRef(queueOpen);
  queueOpenRef.current = queueOpen;

  const lyricsOpenRef = useRef(lyricsOpen);
  lyricsOpenRef.current = lyricsOpen;

  const showVolumePopoverRef = useRef(showVolumePopover);
  showVolumePopoverRef.current = showVolumePopover;

  const mobilePlayerOpenRef = useRef(mobilePlayerOpen);
  mobilePlayerOpenRef.current = mobilePlayerOpen;

  const selectedTagRef = useRef(selectedTag);
  selectedTagRef.current = selectedTag;

  const activeNavRef = useRef(activeNav);
  activeNavRef.current = activeNav;

  // Estado del stack en historial
  const detailsPushedRef = useRef(false);
  const importPushedRef = useRef(false);
  const installPushedRef = useRef(false);
  const playerSubPushedRef = useRef(false);
  const playerPushedRef = useRef(false);
  const tagPushedRef = useRef(false);
  const navPushedRef = useRef(false);

  // 1. Sincronizar Modal de Detalles
  useEffect(() => {
    if (detailsModalOpen) {
      if (!detailsPushedRef.current) {
        detailsPushedRef.current = true;
        try {
          window.history.pushState({ squaleModal: "details" }, "");
        } catch {}
      }
    } else {
      if (detailsPushedRef.current) {
        detailsPushedRef.current = false;
        if (!isPopStateHandlingRef.current) {
          ignorePopStateRef.current = true;
          try {
            window.history.back();
          } catch {}
        }
      }
    }
  }, [detailsModalOpen]);

  // 2. Sincronizar Modal de Importación
  useEffect(() => {
    if (showImportModal) {
      if (!importPushedRef.current) {
        importPushedRef.current = true;
        try {
          window.history.pushState({ squaleModal: "import" }, "");
        } catch {}
      }
    } else {
      if (importPushedRef.current) {
        importPushedRef.current = false;
        if (!isPopStateHandlingRef.current) {
          ignorePopStateRef.current = true;
          try {
            window.history.back();
          } catch {}
        }
      }
    }
  }, [showImportModal]);

  // 3. Sincronizar Modal de Instalación
  useEffect(() => {
    if (showInstallModal) {
      if (!installPushedRef.current) {
        installPushedRef.current = true;
        try {
          window.history.pushState({ squaleModal: "install" }, "");
        } catch {}
      }
    } else {
      if (installPushedRef.current) {
        installPushedRef.current = false;
        if (!isPopStateHandlingRef.current) {
          ignorePopStateRef.current = true;
          try {
            window.history.back();
          } catch {}
        }
      }
    }
  }, [showInstallModal]);

  // 4. Sincronizar Subvistas del Reproductor (Cola, Letras o Volumen)
  const isPlayerSubOpen = mobilePlayerOpen && (queueOpen || lyricsOpen || showVolumePopover);
  useEffect(() => {
    if (isPlayerSubOpen) {
      if (!playerSubPushedRef.current) {
        playerSubPushedRef.current = true;
        try {
          window.history.pushState({ squaleModal: "player_sub" }, "");
        } catch {}
      }
    } else {
      if (playerSubPushedRef.current) {
        playerSubPushedRef.current = false;
        if (!isPopStateHandlingRef.current) {
          ignorePopStateRef.current = true;
          try {
            window.history.back();
          } catch {}
        }
      }
    }
  }, [isPlayerSubOpen]);

  // 5. Sincronizar Reproductor Móvil Expandido y Color de la Barra del Teléfono
  useEffect(() => {
    // Sincronizar dinámicamente el color de la barra de estado y gestos (hora, batería, etc.)
    try {
      const themeMeta = document.querySelector('meta[name="theme-color"]');
      if (themeMeta) {
        themeMeta.setAttribute("content", mobilePlayerOpen ? "#fcfcfc" : "#e6e6e6");
      }
    } catch {}

    if (mobilePlayerOpen) {
      if (!playerPushedRef.current) {
        playerPushedRef.current = true;
        try {
          window.history.pushState({ squaleModal: "player" }, "");
        } catch {}
      }
    } else {
      if (playerPushedRef.current) {
        playerPushedRef.current = false;
        if (!isPopStateHandlingRef.current) {
          ignorePopStateRef.current = true;
          try {
            window.history.back();
          } catch {}
        }
      }
    }
  }, [mobilePlayerOpen]);

  // 6. Sincronizar Filtro de Etiquetas
  useEffect(() => {
    if (selectedTag !== null) {
      if (!tagPushedRef.current) {
        tagPushedRef.current = true;
        try {
          window.history.pushState({ squaleFilter: "tag" }, "");
        } catch {}
      }
    } else {
      if (tagPushedRef.current) {
        tagPushedRef.current = false;
        if (!isPopStateHandlingRef.current) {
          ignorePopStateRef.current = true;
          try {
            window.history.back();
          } catch {}
        }
      }
    }
  }, [selectedTag]);

  // 7. Sincronizar Pestañas de Navegación
  useEffect(() => {
    if (activeNav !== "Inicio") {
      if (!navHistoryRef.current.includes(activeNav)) {
        navHistoryRef.current.push(activeNav);
      }
      if (!navPushedRef.current) {
        navPushedRef.current = true;
        try {
          window.history.pushState({ squaleNav: activeNav }, "");
        } catch {}
      }
    } else {
      navHistoryRef.current = ["Inicio"];
      if (navPushedRef.current) {
        navPushedRef.current = false;
        if (!isPopStateHandlingRef.current) {
          ignorePopStateRef.current = true;
          try {
            window.history.back();
          } catch {}
        }
      }
    }
  }, [activeNav]);

  // 8. Listener global del botón Atrás (popstate)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Inicializar estado base en el historial con un guardián para Inicio
    try {
      window.history.replaceState({ squaleRoot: true }, "");
      window.history.pushState({ squaleHomeGuard: true }, "");
    } catch {}

    const handlePopState = () => {
      // Si el pop fue generado intencionalmente por un cierre vía UI, ignorar
      if (ignorePopStateRef.current) {
        ignorePopStateRef.current = false;
        return;
      }

      isPopStateHandlingRef.current = true;

      // Jerarquía de capas (de más frontal a más profunda):
      if (detailsModalOpenRef.current) {
        setDetailsModalOpen(false);
      } else if (showImportModalRef.current) {
        setShowImportModal(false);
      } else if (showInstallModalRef.current) {
        setShowInstallModal(false);
      } else if (
        mobilePlayerOpenRef.current &&
        (queueOpenRef.current || lyricsOpenRef.current || showVolumePopoverRef.current)
      ) {
        setQueueOpen(false);
        setLyricsOpen(false);
        setShowVolumePopover(false);
      } else if (mobilePlayerOpenRef.current) {
        setMobilePlayerOpen(false);
      } else if (selectedTagRef.current !== null) {
        setSelectedTag(null);
      } else if (activeNavRef.current !== "Inicio") {
        if (navHistoryRef.current.length > 1) {
          navHistoryRef.current.pop();
          const prev = navHistoryRef.current[navHistoryRef.current.length - 1] || "Inicio";
          setActiveNav(prev);
        } else {
          setActiveNav("Inicio");
        }
      } else {
        // En Inicio con nada abierto: confirmar doble pulsación para salir
        const now = Date.now();
        if (now - lastBackPressTimeRef.current < 2000) {
          // Si pulsa 2 veces en menos de 2 segundos, permitir salir
          window.history.back();
        } else {
          lastBackPressTimeRef.current = now;
          showNotification("Presiona atrás otra vez para salir");
          try {
            window.history.pushState({ squaleHomeGuard: true }, "");
          } catch {}
        }
      }

      // Restablecer bandera tras el ciclo de renderizado
      setTimeout(() => {
        isPopStateHandlingRef.current = false;
      }, 70);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [
    setDetailsModalOpen,
    setShowImportModal,
    setShowInstallModal,
    setQueueOpen,
    setLyricsOpen,
    setShowVolumePopover,
    setMobilePlayerOpen,
    setSelectedTag,
    setActiveNav,
    showNotification,
  ]);
}
