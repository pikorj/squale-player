import type { SongTrack } from "./audioEngine";

export type CoverColorMode = "dynamic" | "amber" | "cyan" | "mono";

export interface CoverColors {
  aura: string;
  accent: string;
  softBg: string;
  glow: string;
}

/**
 * Genera una paleta de color ambiental, acentos y resplandor
 * armónicos basados en la carátula o metadatos de la canción.
 */
export function getTrackCoverColors(track?: SongTrack, mode: CoverColorMode = "dynamic"): CoverColors {
  if (mode === "mono" || !track) {
    return {
      aura: "rgba(180, 180, 180, 0.22)",
      accent: "#111111",
      softBg: "#fcfcfc",
      glow: "rgba(0, 0, 0, 0.2)",
    };
  }

  if (mode === "amber") {
    return {
      aura: "rgba(245, 158, 11, 0.38)",
      accent: "#b45309",
      softBg: "#fef3c7",
      glow: "rgba(217, 119, 6, 0.35)",
    };
  }

  if (mode === "cyan") {
    return {
      aura: "rgba(6, 182, 212, 0.38)",
      accent: "#0e7490",
      softBg: "#e0f2fe",
      glow: "rgba(8, 145, 178, 0.35)",
    };
  }

  // Modo dinámico: genera un tono vivo y armónico determinista basado en título, artista y género
  const seed = (track.title + track.artist + track.album + track.genre)
    .split("")
    .reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0);

  const hue = seed % 360;
  return {
    aura: `hsla(${hue}, 85%, 58%, 0.38)`,
    accent: `hsl(${hue}, 85%, 38%)`,
    softBg: `hsla(${hue}, 65%, 95%, 0.95)`,
    glow: `hsla(${hue}, 80%, 48%, 0.35)`,
  };
}
