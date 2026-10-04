import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { audioEngine, TRACK_LIST, type SongTrack } from "./audioEngine";
import { promptPWAInstall, subscribeToInstallPrompt, isStandaloneApp, isAppInstalled } from "./pwa";
import { extractAudioMetadata } from "./metadataParser";
import {
  saveTrackRecords,
  loadAllTrackRecords,
  deleteTrackRecord,
  clearAllTrackRecords,
  recordsToSongTracks,
  type StoredTrackRecord,
} from "./trackStorage";
import { useBackNavigation } from "./useBackNavigation";
import { getTrackCoverColors, type CoverColorMode } from "./coverColors";

type IconName =
  | "home"
  | "heart"
  | "music"
  | "disc"
  | "sliders"
  | "tag"
  | "mail"
  | "bell"
  | "search"
  | "expand"
  | "previous"
  | "next"
  | "shuffle"
  | "play"
  | "pause"
  | "close"
  | "repeat"
  | "list"
  | "volume"
  | "volume-mute"
  | "share"
  | "lyrics"
  | "download"
  | "check"
  | "wifi"
  | "wifi-off"
  | "plus"
  | "folder"
  | "more-vertical";

const iconPaths: Record<IconName, React.ReactNode> = {
  home: (
    <>
      <path d="m3 9.5 9-7 9 7v10.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20Z" />
      <path d="M9 21.5v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6" />
    </>
  ),
  heart: <path d="M20.8 5.8a5.5 5.5 0 0 0-7.8 0L12 6.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z" />,
  music: <path d="M9 18V5l11-2v13M9 9l11-2M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm11-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />,
  disc: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /></>,
  sliders: <><path d="M4 7h16M4 17h16M8 4v6M16 14v6" /><circle cx="8" cy="7" r="1.5" /><circle cx="16" cy="17" r="1.5" /></>,
  tag: <path d="m20 13-7 7-9-9V4h7l9 9ZM8 8h.01" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 12h4" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  expand: <path d="M8 3H3v5M16 21h5v-5M3 8l6-6M21 16l-6 6" />,
  previous: <><path d="M6 5v14" /><path d="m18 6-9 6 9 6Z" /></>,
  next: <><path d="M18 5v14" /><path d="m6 6 9 6-9 6Z" /></>,
  shuffle: <><path d="M3 7h3c5 0 5 10 10 10h5" /><path d="m18 14 3 3-3 3M18 4l3 3-3 3" /><path d="M3 17h3c1.8 0 3-1.3 4-3" /></>,
  play: <path d="m8 5 11 7-11 7Z" />,
  pause: <><path d="M8 5v14M16 5v14" /></>,
  close: <path d="m5 5 14 14M19 5 5 19" />,
  repeat: <><path d="m17 2 4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" /></>,
  list: <><path d="M9 6h12M9 12h12M9 18h12" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>,
  volume: <><path d="M11 5 6 9H3v6h3l5 4Z" /><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" /></>,
  "volume-mute": <><path d="M11 5 6 9H3v6h3l5 4Z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></>,
  share: <><path d="M12 16V3M8 7l4-4 4 4" /><path d="M5 12H3v9h18v-9h-2" /></>,
  lyrics: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  download: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />,
  check: <path d="M20 6 9 17l-5-5" />,
  wifi: <><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></>,
  "wifi-off": <><line x1="1" y1="1" x2="23" y2="23" /><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" /><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" /><path d="M10.71 5.05A16 16 0 0 1 22.58 9" /><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></>,
  plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
  folder: <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />,
  "more-vertical": (
    <>
      <circle cx="12" cy="5" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.8" fill="currentColor" stroke="none" />
    </>
  ),
};

function Icon({
  name,
  size = 22,
  filled,
}: {
  name: IconName;
  size?: number;
  filled?: boolean;
}) {
  const isFilled =
    filled !== undefined
      ? filled
      : name === "play" || name === "more-vertical";

  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill={isFilled ? "currentColor" : "none"}
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9">
        {iconPaths[name]}
      </g>
    </svg>
  );
}

function formatTime(sec: number): string {
  if (isNaN(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function formatLikes(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
}

function triggerHaptic(type: "light" | "medium" | "heavy" = "light") {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    try {
      if (type === "light") {
        navigator.vibrate(8);
      } else if (type === "medium") {
        navigator.vibrate(16);
      } else if (type === "heavy") {
        navigator.vibrate([22, 30, 22]);
      }
    } catch {
      // browser vibration policy
    }
  }
}

const categories = ["Clásicos", "90s", "Novedades", "Instrumental", "Pop moderno"];

interface AlbumItem {
  id: string;
  title: string;
  artist: string;
  image: string;
  trackId: string;
  year?: number;
  tracksCount: number;
}

const navItems: { icon: IconName; label: string }[] = [
  { icon: "home", label: "Inicio" },
  { icon: "heart", label: "Favoritos" },
  { icon: "music", label: "Canciones" },
  { icon: "disc", label: "Álbumes" },
  { icon: "sliders", label: "Ajustes" },
  { icon: "tag", label: "Etiquetas" },
];

const baseWaveform = [16, 30, 24, 38, 29, 44, 33, 52, 42, 28, 38, 47, 29, 36, 20, 43, 31, 38, 25, 32, 22, 40, 27, 34, 20, 32, 24, 38, 28, 45, 33, 26, 20, 31];

const EMPTY_TRACK: SongTrack = {
  id: "squale-empty",
  title: "Colección Vacía",
  artist: "Importa tu música con +",
  album: "SQUALE Hi-Fi",
  duration: "0:00",
  durationSec: 0,
  image: "",
  genre: "Local",
  year: new Date().getFullYear(),
  likes: 0,
  bpm: 0,
  key: "--",
  lyrics: [
    "No hay canciones en tu colección todavía.",
    "Pulsa el botón '+' para importar archivos o carpetas completas.",
    "SQUALE las recordará y guardará siempre en tu dispositivo.",
  ],
  audioUrl: "",
};

function Turntable({
  playing,
  speed,
  onToggleSpeed,
  onTogglePower,
  track,
  showPictureDisc = true,
  ambientGlow = true,
  glowColor,
}: {
  playing: boolean;
  speed: 33 | 45;
  onToggleSpeed?: () => void;
  onTogglePower?: () => void;
  track?: SongTrack;
  showPictureDisc?: boolean;
  ambientGlow?: boolean;
  glowColor?: string;
}) {
  const hasCover = Boolean(showPictureDisc && track?.image && track.image.trim() !== "");

  return (
    <div
      className={`turntable ${playing ? "is-playing" : ""}`}
      aria-label="Tocadiscos analógico SQUALE"
      style={
        ambientGlow && glowColor
          ? {
              boxShadow: `inset 0 0 0 3px #cfd0d0, 0 12px 28px rgba(0, 0, 0, 0.22), 0 0 45px ${glowColor}`,
            }
          : undefined
      }
    >
      <span className="screw screw-a" />
      <span className="screw screw-b" />
      <span className="screw screw-c" />
      <span className="screw screw-d" />
      <div className="record-wrapper">
        <div
          className={`record ${playing ? "spinning" : ""} ${speed === 45 ? "speed-45" : ""} ${hasCover ? "picture-disc" : ""}`}
          onClick={onToggleSpeed}
          role="button"
          tabIndex={0}
          title={hasCover ? `Picture Disc: ${track?.title} (${speed} RPM). Haz clic para cambiar velocidad.` : `Velocidad actual: ${speed} RPM. Haz clic para cambiar.`}
        >
          {hasCover ? (
            <>
              <img
                alt={`Carátula de ${track?.title || "canción"}`}
                className="picture-disc-art"
                src={track?.image}
              />
              <span className="picture-disc-sheen" />
              <span className="picture-disc-spindle" />
            </>
          ) : (
            <div
              className="record-label"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSpeed?.();
              }}
              role="button"
              tabIndex={0}
              title={`Velocidad actual: ${speed} RPM. Haz clic para cambiar.`}
            >
              <span>{speed}⅓ RPM</span>
            </div>
          )}
        </div>
      </div>
      <div className="tonearm">
        <span className="tonearm-pivot" />
        <span className="tonearm-arm" />
        <span className="tonearm-head" />
      </div>
      <span
        className="deck-knob"
        onClick={onToggleSpeed}
        role="button"
        tabIndex={0}
        title="Control de velocidad RPM"
      />
      <span
        className="deck-button"
        onClick={onTogglePower}
        role="button"
        tabIndex={0}
        title="Botón motor tocadiscos (Reproducir/Pausar)"
      />
      {playing && (
        <div className="vinyl-floating-notes" aria-hidden="true">
          <span className="note note-1">♪</span>
          <span className="note note-2">♫</span>
          <span className="note note-3">♩</span>
        </div>
      )}
    </div>
  );
}

function PlaylistRow({
  image,
  title,
  count = 32,
  onPlay,
  index = 0,
}: {
  image: string;
  title: string;
  count?: number;
  onPlay: () => void;
  index?: number;
}) {
  return (
    <button
      className="playlist-row"
      onClick={onPlay}
      style={{ "--row-index": index } as React.CSSProperties}
      type="button"
    >
      <img alt="" src={image} />
      <span className="playlist-copy">
        <strong>{title}</strong>
        <small>{count} canciones en esta lista</small>
      </span>
      <span className="row-play"><Icon name="play" size={25} /></span>
    </button>
  );
}

function ScreenHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="screen-header">
      <p>{eyebrow}</p>
      <h1>{title}</h1>
    </header>
  );
}

function SongTable({
  tracks,
  currentTrackId,
  playing,
  onSelectTrack,
  onDeleteTrack,
}: {
  tracks: SongTrack[];
  currentTrackId: string;
  playing: boolean;
  onSelectTrack: (track: SongTrack) => void;
  onDeleteTrack?: (trackId: string, e: React.MouseEvent) => void;
}) {
  return (
    <div className="song-table">
      <div className="song-row song-labels">
        <span>#</span>
        <span>Título</span>
        <span>Álbum</span>
        <span>Duración</span>
      </div>
      {tracks.map((song, index) => {
        const isCurrent = song.id === currentTrackId;
        return (
          <button
            className={`song-row ${isCurrent ? "current-row" : ""}`}
            key={song.id}
            onClick={() => onSelectTrack(song)}
            style={{ "--row-index": Math.min(index, 20) } as React.CSSProperties}
            type="button"
          >
            <span className="song-index">
              {isCurrent && playing ? (
                <span className="dancing-eq" title="Reproduciendo">
                  <i /><i /><i />
                </span>
              ) : (
                String(index + 1).padStart(2, "0")
              )}
            </span>
            <span className="song-title">
              <span className={`song-thumb-box ${isCurrent && playing ? "is-playing" : ""}`}>
                {song.image ? (
                  <img alt="" className="song-thumb-img" src={song.image} />
                ) : (
                  <span className="song-thumb-vinyl">
                    <Icon name="disc" size={20} />
                  </span>
                )}
                <span className="song-thumb-overlay">
                  <Icon name={isCurrent && playing ? "pause" : "play"} size={16} />
                </span>
              </span>
              <span><strong>{song.title}</strong><small>{song.artist}</small></span>
            </span>
            <span className="song-album">{song.album}</span>
            <span className="song-duration">
              {song.duration}
              {onDeleteTrack && song.id.startsWith("local-") && (
                <span
                  className="song-delete-action"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTrack(song.id, e);
                  }}
                  title="Eliminar de biblioteca permanente"
                  role="button"
                  tabIndex={0}
                  style={{
                    marginLeft: 10,
                    cursor: "pointer",
                    display: "inline-grid",
                    placeItems: "center",
                    padding: 4,
                    color: "#777",
                    borderRadius: 4,
                  }}
                >
                  <Icon name="close" size={13} />
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SongDetailsModal({
  track,
  isOpen,
  onClose,
  speed,
  isLiked,
  onToggleLike,
}: {
  track: SongTrack;
  isOpen: boolean;
  onClose: () => void;
  speed: 33 | 45;
  isLiked: boolean;
  onToggleLike: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      aria-label="Detalles de la canción"
      aria-modal="true"
      className="details-modal-overlay"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="details-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="details-modal-header">
          <div>
            <span className="details-eyebrow">METADATOS · VINILO HI-FI</span>
            <h2 className="details-title">Detalles de la Canción</h2>
          </div>
          <button
            aria-label="Cerrar modal de detalles"
            className="details-close-btn"
            onClick={onClose}
            type="button"
          >
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="details-modal-body">
          {/* Cover & Title Block */}
          <div className="details-hero">
            <div className="details-cover-wrap">
              {track.image ? (
                <img
                  alt={`Carátula de ${track.title}`}
                  className="details-cover-img"
                  src={track.image}
                />
              ) : (
                <div className="details-vinyl-thumb">
                  <div className="details-vinyl-label">
                    <span>{speed}⅓</span>
                  </div>
                </div>
              )}
            </div>
            <div className="details-hero-info">
              <strong className="details-track-name">{track.title}</strong>
              <span className="details-track-artist">{track.artist}</span>
              <span className="details-track-album">Álbum: {track.album}</span>
              <span className="genre-pill" style={{ alignSelf: "flex-start", marginTop: 4 }}>
                {track.genre}
              </span>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="details-grid">
            <div className="details-cell">
              <label>DURACIÓN</label>
              <span>{track.duration}</span>
            </div>
            <div className="details-cell">
              <label>AÑO DE EDICIÓN</label>
              <span>{track.year}</span>
            </div>
            <div className="details-cell">
              <label>TEMPO</label>
              <span>{track.bpm} BPM</span>
            </div>
            <div className="details-cell">
              <label>TONALIDAD</label>
              <span>{track.key}</span>
            </div>
            <div className="details-cell">
              <label>VELOCIDAD TOCADISCOS</label>
              <span>{speed}⅓ RPM</span>
            </div>
            <div className="details-cell">
              <label>TIPO DE DISCO</label>
              <span>{track.image ? "Picture Disc (Con Carátula)" : "Vinilo Negro Clásico"}</span>
            </div>
            <div className="details-cell full-width">
              <label>FUENTE DE AUDIO</label>
              <span>
                {track.audioUrl
                  ? "Archivo local importado (.mp3 / .wav / .flac)"
                  : "Síntesis analógica de tocadiscos SQUALE"}
              </span>
            </div>
          </div>

          {/* Lyrics / Notes Box if present */}
          {track.lyrics && track.lyrics.length > 0 && (
            <div className="details-lyrics-section">
              <label>NOTAS DE LA PISTA / LETRAS</label>
              <div className="details-lyrics-box">
                {track.lyrics.slice(0, 4).map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <footer className="details-modal-footer">
          <button
            className={`details-fav-btn ${isLiked ? "active" : ""}`}
            onClick={onToggleLike}
            type="button"
          >
            <Icon name="heart" size={16} filled={isLiked} />
            <span>{isLiked ? "En Favoritos" : "Añadir a Favoritos"}</span>
          </button>
          <button
            className="details-done-btn"
            onClick={onClose}
            type="button"
          >
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  const [activeNav, setActiveNav] = useState("Inicio");
  const [activeCategory, setActiveCategory] = useState("Clásicos");

  // Persistent library storage state
  const [savedTracks, setSavedTracks] = useState<SongTrack[]>([]);
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);
  const [hideDemoTracks, setHideDemoTracks] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("squale_hide_demo_tracks");
      if (saved !== null) return saved === "true";
      return isAppInstalled();
    } catch {
      return false;
    }
  });

  // Active track list: When demo tracks are hidden (installed app), ONLY user imported songs appear
  const tracks = useMemo<SongTrack[]>(() => {
    if (hideDemoTracks) {
      return savedTracks;
    }
    return [...savedTracks, ...TRACK_LIST];
  }, [savedTracks, hideDemoTracks]);

  const [currentTrack, setCurrentTrack] = useState<SongTrack>(() => {
    try {
      const savedPref = localStorage.getItem("squale_hide_demo_tracks");
      const installed = isAppInstalled();
      const hideDemos = savedPref !== null ? savedPref === "true" : installed;
      if (hideDemos) return EMPTY_TRACK;
    } catch {}
    return TRACK_LIST[0];
  });

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<33 | 45>(33);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [likedTracks, setLikedTracks] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("squale_liked_tracks");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [query, setQuery] = useState("");
  const [mobilePlayerOpen, setMobilePlayerOpen] = useState(false);
  const [sheetDragY, setSheetDragY] = useState(0);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const sheetTouchStartYRef = useRef(0);

  const handleSheetTouchStart = (e: React.TouchEvent) => {
    sheetTouchStartYRef.current = e.touches[0].clientY;
    setIsDraggingSheet(true);
  };

  const handleSheetTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingSheet) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - sheetTouchStartYRef.current;
    if (diff > 0) {
      setSheetDragY(diff);
    }
  };

  const handleSheetTouchEnd = () => {
    if (sheetDragY > 80) {
      setMobilePlayerOpen(false);
      triggerHaptic("light");
    }
    setSheetDragY(0);
    setIsDraggingSheet(false);
  };
  const [repeatMode, setRepeatMode] = useState<"none" | "all" | "one">("all");
  const [shuffle, setShuffle] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumePopover, setShowVolumePopover] = useState(false);

  // Settings & PWA state
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [canInstallPWA, setCanInstallPWA] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [crossfade, setCrossfade] = useState(true);
  const [normalizeVolume, setNormalizeVolume] = useState(true);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Cover art & dynamic color settings
  const [coverAmbientGlow, setCoverAmbientGlow] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("squale_cover_ambient_glow");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const [coverPictureDisc, setCoverPictureDisc] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("squale_cover_picture_disc");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const [coverAccentTint, setCoverAccentTint] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("squale_cover_accent_tint");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const [coverColorPalette, setCoverColorPalette] = useState<CoverColorMode>(() => {
    try {
      const saved = localStorage.getItem("squale_cover_palette");
      return (saved as CoverColorMode) || "dynamic";
    } catch {
      return "dynamic";
    }
  });

  const handleToggleCoverAmbient = (val: boolean) => {
    setCoverAmbientGlow(val);
    try {
      localStorage.setItem("squale_cover_ambient_glow", String(val));
    } catch {}
    showNotification(val ? "Aura ambiental de carátula activada" : "Aura ambiental desactivada");
  };

  const handleToggleCoverPictureDisc = (val: boolean) => {
    setCoverPictureDisc(val);
    try {
      localStorage.setItem("squale_cover_picture_disc", String(val));
    } catch {}
    showNotification(val ? "Arte de carátula en vinilo activado" : "Vinilo analógico 33⅓ RPM clásico activado");
  };

  const handleToggleCoverAccentTint = (val: boolean) => {
    setCoverAccentTint(val);
    try {
      localStorage.setItem("squale_cover_accent_tint", String(val));
    } catch {}
    showNotification(val ? "Acento adaptativo con carátula activado" : "Acentos neutros analógicos activados");
  };

  const handleChangeCoverPalette = (val: CoverColorMode) => {
    setCoverColorPalette(val);
    try {
      localStorage.setItem("squale_cover_palette", val);
    } catch {}
    const labels: Record<CoverColorMode, string> = {
      dynamic: "Dinámico (Carátula)",
      amber: "Ámbar Cálido (Válvulas)",
      cyan: "Neón Retro (80s)",
      mono: "Monocromo",
    };
    showNotification(`Paleta de carátula: ${labels[val]}`);
  };

  // Compute cover colors
  const coverColors = useMemo(() => {
    if (!coverAmbientGlow && !coverAccentTint) {
      return {
        aura: "rgba(0, 0, 0, 0)",
        accent: "#111111",
        softBg: "#fcfcfc",
        glow: "rgba(0, 0, 0, 0.2)",
      };
    }
    return getTrackCoverColors(currentTrack, coverColorPalette);
  }, [currentTrack, coverAmbientGlow, coverAccentTint, coverColorPalette]);

  // Load persistent library from IndexedDB on startup
  useEffect(() => {
    let isMounted = true;
    loadAllTrackRecords()
      .then((records) => {
        if (!isMounted) return;
        if (records.length > 0) {
          const restored = recordsToSongTracks(records);
          setSavedTracks(restored);
        }
        setIsLibraryLoaded(true);
      })
      .catch((err) => {
        console.warn("Error cargando biblioteca de IndexedDB:", err);
        if (isMounted) setIsLibraryLoaded(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync currentTrack when tracks change or library finishes loading
  useEffect(() => {
    if (!isLibraryLoaded) return;
    if (tracks.length > 0) {
      if (currentTrack.id === EMPTY_TRACK.id || !tracks.some((t) => t.id === currentTrack.id)) {
        const lastId = localStorage.getItem("squale_last_track_id");
        const found = tracks.find((t) => t.id === lastId);
        const nextTrack = found || tracks[0];
        setCurrentTrack(nextTrack);
        setDuration(nextTrack.durationSec);
      }
    } else {
      setCurrentTrack(EMPTY_TRACK);
      setDuration(0);
      setPlaying(false);
      audioEngine.pause();
    }
  }, [tracks, isLibraryLoaded]);

  // Listen for PWA installation
  useEffect(() => {
    const handleAppInstalled = () => {
      setIsPWA(true);
      setHideDemoTracks(true);
      try {
        localStorage.setItem("squale_is_installed", "true");
        localStorage.setItem("squale_hide_demo_tracks", "true");
      } catch {}
      showNotification("¡App instalada! Se ha activado tu biblioteca personal exclusiva.");
    };
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => window.removeEventListener("appinstalled", handleAppInstalled);
  }, []);

  // Tags state
  const [tags, setTags] = useState<Array<[string, string]>>([
    ["Noches largas", "14 canciones"],
    ["Para trabajar", "23 canciones"],
    ["Vinilos", "8 álbumes"],
    ["Viajes", "31 canciones"],
    ["Domingo", "12 canciones"],
    ["Descubrimientos", "19 canciones"],
  ]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Online / Offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showNotification("Conexión restablecida. SQUALE está Online.");
    };
    const handleOffline = () => {
      setIsOnline(false);
      showNotification("Modo Offline activo: La app y música siguen funcionando.");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // PWA install prompt subscription
  useEffect(() => {
    setIsPWA(isStandaloneApp());
    const unsubscribe = subscribeToInstallPrompt((canInstall) => {
      setCanInstallPWA(canInstall);
    });
    return () => unsubscribe();
  }, []);

  // Save liked tracks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("squale_liked_tracks", JSON.stringify(Array.from(likedTracks)));
    } catch {
      // storage unavailable
    }
  }, [likedTracks]);

  // Toast notification helper
  const showNotification = useCallback((msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => {
      setNotificationMsg((curr) => (curr === msg ? null : curr));
    }, 3500);
  }, []);

  // Mobile & PWA Back Button / History navigation management
  useBackNavigation({
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
  });

  // Audio engine time update subscription
  useEffect(() => {
    audioEngine.onTimeUpdate((time, dur) => {
      setCurrentTime(time);
      setDuration(dur);
    });

    audioEngine.onTrackEnd(() => {
      if (repeatMode === "one") {
        audioEngine.seek(0);
        audioEngine.play();
      } else if (autoPlayNext || repeatMode === "all") {
        handleNextTrack();
      } else {
        setPlaying(false);
      }
    });
  }, [repeatMode, autoPlayNext, currentTrack]);

  // MediaSession API setup
  useEffect(() => {
    audioEngine.setMediaSessionHandlers({
      onPlay: () => handlePlay(currentTrack),
      onPause: () => handlePause(),
      onNext: () => handleNextTrack(),
      onPrev: () => handlePrevTrack(),
    });
  }, [currentTrack]);

  // Play / Pause handlers
  const handlePlay = useCallback((track?: SongTrack) => {
    const target = track || currentTrack;
    if (!target || target.id === EMPTY_TRACK.id || !target.audioUrl) {
      setShowImportModal(true);
      showNotification("Importa canciones o carpetas con el botón '+'");
      return;
    }
    setCurrentTrack(target);
    setDuration(target.durationSec);
    setPlaying(true);
    audioEngine.play(target);
    try {
      localStorage.setItem("squale_last_track_id", target.id);
    } catch {}
  }, [currentTrack]);

  const handlePause = useCallback(() => {
    setPlaying(false);
    audioEngine.pause();
  }, []);

  const handleTogglePlay = useCallback(() => {
    triggerHaptic("medium");
    if (tracks.length === 0 || currentTrack.id === EMPTY_TRACK.id || !currentTrack.audioUrl) {
      setShowImportModal(true);
      showNotification("Importa canciones o carpetas con el botón '+'");
      return;
    }
    if (playing) {
      handlePause();
    } else {
      handlePlay();
    }
  }, [playing, handlePause, handlePlay, tracks.length, currentTrack]);

  const handleNextTrack = useCallback(() => {
    triggerHaptic("light");
    if (tracks.length === 0) return;
    let nextIndex = 0;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * tracks.length);
    } else {
      const currIdx = tracks.findIndex((t) => t.id === currentTrack.id);
      nextIndex = currIdx >= 0 ? (currIdx + 1) % tracks.length : 0;
    }
    const next = tracks[nextIndex];
    if (next) handlePlay(next);
  }, [tracks, currentTrack, shuffle, handlePlay]);

  const handlePrevTrack = useCallback(() => {
    triggerHaptic("light");
    if (tracks.length === 0) return;
    if (currentTime > 4) {
      audioEngine.seek(0);
      setCurrentTime(0);
      return;
    }
    const currIdx = tracks.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = currIdx >= 0 ? (currIdx - 1 + tracks.length) % tracks.length : 0;
    const prev = tracks[prevIndex];
    if (prev) handlePlay(prev);
  }, [tracks, currentTrack, currentTime, handlePlay]);

  const processAudioFiles = useCallback(
    async (files: File[]) => {
      const audioFiles = files.filter(
        (f) =>
          f.type.startsWith("audio/") ||
          /\.(mp3|wav|ogg|m4a|aac|flac|wma)$/i.test(f.name),
      );

      if (audioFiles.length === 0) {
        showNotification("Selecciona archivos de audio válidos (.mp3, .wav, .ogg, etc.)");
        return;
      }

      showNotification(`Procesando y guardando ${audioFiles.length} archivo(s)...`);

      const recordsToSave: StoredTrackRecord[] = [];

      for (let index = 0; index < audioFiles.length; index++) {
        const file = audioFiles[index];
        const tempUrl = URL.createObjectURL(file);
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        let title = baseName;
        let artist = "Archivo local";
        let album = "";

        if (baseName.includes(" - ")) {
          const parts = baseName.split(" - ");
          artist = parts[0].trim();
          title = parts.slice(1).join(" - ").trim();
        }

        let coverBlob: Blob | null = null;
        try {
          const meta = await extractAudioMetadata(file);
          if (meta.title && meta.title.trim()) {
            title = meta.title.trim();
          }
          if (meta.artist && meta.artist.trim()) {
            artist = meta.artist.trim();
          }
          if (meta.album && meta.album.trim()) {
            album = meta.album.trim();
          }
          if (meta.coverBlob) {
            coverBlob = meta.coverBlob;
          }
        } catch (err) {
          console.warn("Error leyendo metadatos de", file.name, err);
        }

        if (!album || !album.trim()) {
          album = title;
        }

        // Get audio duration
        const durationSec = await new Promise<number>((resolve) => {
          const temp = new Audio();
          temp.src = tempUrl;
          temp.onloadedmetadata = () => {
            const dur = Math.round(temp.duration);
            resolve(dur > 0 ? dur : 180);
          };
          temp.onerror = () => {
            resolve(180);
          };
        });

        const trackId = `local-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`;

        const record: StoredTrackRecord = {
          id: trackId,
          title,
          artist,
          album,
          duration: formatTime(durationSec),
          durationSec: Math.max(1, durationSec),
          coverBlob,
          genre: "Audio importado",
          year: new Date().getFullYear(),
          likes: 1,
          bpm: 96,
          key: "Stereo",
          lyrics: [
            `[Pista importada: ${file.name}]`,
            `Artista: ${artist}`,
            `Álbum: ${album}`,
            `Formato: ${file.type || "audio"} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`,
            coverBlob ? "Carátula de álbum embebida cargada en el tocadiscos" : "Sin carátula (mostrando disco de vinilo clásico)",
            "Guardada permanentemente en SQUALE",
          ],
          audioBlob: file,
          addedAt: Date.now() + index,
        };

        recordsToSave.push(record);
      }

      try {
        await saveTrackRecords(recordsToSave);
      } catch (err) {
        console.error("Error guardando en IndexedDB:", err);
      }

      const createdTracks = recordsToSongTracks(recordsToSave);
      setSavedTracks((prev) => [...createdTracks, ...prev]);

      if (createdTracks.length > 0) {
        handlePlay(createdTracks[0]);
      }

      showNotification(
        createdTracks.length === 1
          ? `¡"${createdTracks[0].title}" guardada permanentemente!`
          : `¡${createdTracks.length} canciones guardadas permanentemente en tu dispositivo!`,
      );
    },
    [handlePlay],
  );

  const handleDeleteTrack = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic("medium");
    try {
      await deleteTrackRecord(id);
      setSavedTracks((prev) => prev.filter((t) => t.id !== id));
      showNotification("Canción eliminada de tu biblioteca");
    } catch (err) {
      console.warn("Error eliminando pista:", err);
    }
  };

  const handleClearImported = async () => {
    triggerHaptic("heavy");
    if (window.confirm("¿Seguro que deseas eliminar todas las canciones importadas guardadas en este dispositivo?")) {
      try {
        await clearAllTrackRecords();
        setSavedTracks([]);
        showNotification("Biblioteca local vaciada");
      } catch (err) {
        console.warn("Error vaciando biblioteca:", err);
      }
    }
  };

  const handleToggleHideDemo = (val: boolean) => {
    triggerHaptic("light");
    setHideDemoTracks(val);
    try {
      localStorage.setItem("squale_hide_demo_tracks", String(val));
    } catch {}
    showNotification(val ? "Canciones de prueba ocultadas" : "Canciones de prueba visibles");
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processAudioFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleFolderImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processAudioFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const openFolderPicker = async () => {
    setShowImportModal(false);
    triggerHaptic("medium");

    // Modern File System Access API for Chromium / Android supported browsers
    if ("showDirectoryPicker" in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({
          mode: "read",
        });
        showNotification("Escaneando carpeta de música...");

        const audioFiles: File[] = [];
        async function readDirectory(handle: any) {
          for await (const entry of handle.values()) {
            if (entry.kind === "file") {
              const file = await entry.getFile();
              if (
                file.type.startsWith("audio/") ||
                /\.(mp3|wav|ogg|m4a|aac|flac|wma)$/i.test(file.name)
              ) {
                audioFiles.push(file);
              }
            } else if (entry.kind === "directory") {
              await readDirectory(entry);
            }
          }
        }

        await readDirectory(dirHandle);

        if (audioFiles.length > 0) {
          await processAudioFiles(audioFiles);
        } else {
          showNotification("No se encontraron pistas de audio en la carpeta seleccionada.");
        }
        return;
      } catch (err: any) {
        if (err.name === "AbortError") {
          // User canceled folder selection
          return;
        }
        console.warn("showDirectoryPicker falló o no permitido, usando selector nativo:", err);
      }
    }

    // Standard cross-platform fallback (webkitdirectory, Android / iOS / Safari)
    if (folderInputRef.current) {
      folderInputRef.current.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  const openFilePicker = () => {
    setShowImportModal(false);
    triggerHaptic("light");
    fileInputRef.current?.click();
  };

  const handleSeek = (ratio: number) => {
    triggerHaptic("light");
    audioEngine.seek(ratio);
    setCurrentTime(ratio * duration);
  };

  const handleToggleLike = (trackId: string) => {
    triggerHaptic("medium");
    setLikedTracks((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
        showNotification("Eliminado de Favoritos");
      } else {
        next.add(trackId);
        showNotification("Añadido a Favoritos ♥");
      }
      return next;
    });
  };

  const handleToggleSpeed = () => {
    triggerHaptic("medium");
    const nextSpeed = speed === 33 ? 45 : 33;
    audioEngine.setSpeed(nextSpeed);
    setSpeed(nextSpeed);
    showNotification(`Velocidad ajustada a ${nextSpeed} RPM`);
  };

  const handleVolumeChange = (newVal: number) => {
    setVolume(newVal);
    setIsMuted(newVal === 0);
    audioEngine.setVolume(newVal / 100);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      audioEngine.setVolume(volume / 100);
    } else {
      setIsMuted(true);
      audioEngine.setVolume(0);
    }
  };

  const handlePWAInstall = async () => {
    if (canInstallPWA) {
      const accepted = await promptPWAInstall();
      if (accepted) {
        showNotification("¡Gracias por instalar SQUALE!");
      }
    } else {
      setShowInstallModal(true);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `SQUALE: ${currentTrack.title}`,
          text: `Escuchando "${currentTrack.title}" por ${currentTrack.artist} en SQUALE Vinyl Hi-Fi`,
          url: window.location.href,
        });
      } catch {
        // User cancelled share
      }
    } else {
      navigator.clipboard?.writeText(window.location.href);
      showNotification("Enlace copiado al portapapeles");
    }
  };

  // Keyboard shortcut for space bar play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      if (e.code === "Space") {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === "ArrowRight") {
        const nextTime = Math.min(duration, currentTime + 5);
        handleSeek(nextTime / duration);
      } else if (e.code === "ArrowLeft") {
        const prevTime = Math.max(0, currentTime - 5);
        handleSeek(prevTime / duration);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleTogglePlay, currentTime, duration]);

  // Dynamic albums derived dynamically from current tracks
  const dynamicAlbums = useMemo<AlbumItem[]>(() => {
    const albumMap = new Map<string, AlbumItem>();

    tracks.forEach((track) => {
      const albumTitle = track.album?.trim() || track.title;
      const key = `${albumTitle}:::${track.artist}`.toLowerCase();

      if (!albumMap.has(key)) {
        albumMap.set(key, {
          id: key,
          title: albumTitle,
          artist: track.artist,
          image: track.image || "",
          trackId: track.id,
          year: track.year || 2024,
          tracksCount: 1,
        });
      } else {
        const item = albumMap.get(key)!;
        item.tracksCount += 1;
        if (!item.image && track.image) {
          item.image = track.image;
        }
      }
    });

    return Array.from(albumMap.values());
  }, [tracks]);

  // Filtered albums / tracks for search
  const visibleAlbums = useMemo(
    () =>
      dynamicAlbums.filter((album) =>
        `${album.title} ${album.artist}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [dynamicAlbums, query],
  );

  const visibleTracks = useMemo(
    () =>
      tracks.filter((track) =>
        `${track.title} ${track.artist} ${track.album} ${track.genre}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [query, tracks],
  );

  const favoriteTracks = useMemo(
    () => tracks.filter((track) => likedTracks.has(track.id)),
    [likedTracks, tracks],
  );

  const isCurrentLiked = likedTracks.has(currentTrack.id);
  const isInstalled = isPWA || isAppInstalled();
  const progressRatio = duration > 0 ? currentTime / duration : 0;

  return (
    <main
      className={`app-shell ${isDragging ? "is-drag-over" : ""}`}
      onContextMenu={(e) => e.preventDefault()}
      onDragLeave={() => setIsDragging(false)}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processAudioFiles(Array.from(e.dataTransfer.files));
        }
      }}
    >
      {/* Hidden file input for importing local audio */}
      <input
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac"
        multiple
        onChange={handleFileImport}
        ref={fileInputRef}
        style={{ display: "none" }}
        type="file"
      />

      {/* Hidden directory input for reading entire folders (Android / iOS / Desktop) */}
      <input
        {...({ webkitdirectory: "", directory: "" } as any)}
        multiple
        onChange={handleFolderImport}
        ref={folderInputRef}
        style={{ display: "none" }}
        type="file"
      />

      {/* Drag overlay notice */}
      {isDragging && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(18, 18, 18, 0.85)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontFamily: "Silkscreen",
            gap: 12,
            border: "4px dashed #ffffff",
            pointerEvents: "none",
          }}
        >
          <Icon name="music" size={48} />
          <p style={{ fontSize: 20, margin: 0 }}>¡Suelta tus archivos de audio aquí!</p>
          <small style={{ color: "#eee" }}>Se añadirán a tu colección analógica SQUALE</small>
        </div>
      )}

      {/* Toast notification banner */}
      {notificationMsg && (
        <aside
          role="status"
          aria-live="polite"
          className="squale-toast"
        >
          <span className="toast-icon"><Icon name="disc" size={16} /></span>
          <span>{notificationMsg}</span>
        </aside>
      )}

      {/* Top Bar */}
      <header className="topbar">
        <a
          className="brand"
          href="#"
          aria-label="SQUALE, inicio"
          onClick={(e) => {
            e.preventDefault();
            setActiveNav("Inicio");
          }}
        >
          SQUALE
        </a>

        <label className="searchbox">
          <Icon name="search" size={18} />
          <input
            aria-label="Buscar canciones o artistas"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busca canciones, artistas o géneros..."
            value={query}
          />
          {query && (
            <button
              aria-label="Limpiar búsqueda"
              onClick={() => setQuery("")}
              style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }}
              type="button"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </label>

        <div className="header-actions">
          {!isInstalled && (
            <button
              className="web-install-btn"
              onClick={handlePWAInstall}
              title="Instalar SQUALE como aplicación en tu dispositivo"
              type="button"
            >
              <Icon name="download" size={15} />
              <span>Instalar App</span>
            </button>
          )}
          <button
            aria-label="Importar archivos o carpetas de música"
            onClick={() => {
              triggerHaptic("light");
              setShowImportModal(true);
            }}
            title="Importar música o carpetas enteras"
            type="button"
          >
            <Icon name="plus" size={19} />
          </button>
          <button
            aria-label="Mensajes"
            onClick={() => showNotification("Sin mensajes pendientes en SQUALE")}
            type="button"
          >
            <Icon name="mail" size={19} />
          </button>
          <button
            aria-label="Notificaciones"
            onClick={() => showNotification("SQUALE PWA v1.0.0 cargada y lista")}
            type="button"
          >
            <Icon name="bell" size={19} />
          </button>
          <button
            aria-label="Perfil"
            className="avatar"
            onClick={() => setActiveNav("Ajustes")}
            title="Ajustes de perfil y PWA"
            type="button"
          >
            MC
          </button>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <aside className="sidebar" aria-label="Navegación principal">
        <div className="nav-links">
          <button
            aria-label="Buscar"
            className={`mobile-search-button ${activeNav === "Buscar" ? "active" : ""}`}
            onClick={() => {
              triggerHaptic("light");
              setActiveNav("Buscar");
            }}
            title="Buscar"
            type="button"
          >
            <Icon name="search" size={22} />
          </button>
          {navItems.map((item) => (
            <button
              aria-label={item.label}
              className={activeNav === item.label ? "active" : ""}
              key={item.label}
              onClick={() => {
                triggerHaptic("light");
                setActiveNav(item.label);
              }}
              title={item.label}
              type="button"
            >
              <Icon name={item.icon} size={22} />
            </button>
          ))}
        </div>
      </aside>

      {/* Center Screen: Dynamic by activeNav */}
      {activeNav === "Inicio" ? (
        <section key="screen-inicio" className="discover-panel discover-home">
          <div className="section-heading">
            <h2>Categorías<br />musicales</h2>
            <button onClick={() => setActiveNav("Canciones")} type="button">Ver todo</button>
          </div>
          <div className="category-list">
            {categories.map((category) => (
              <button
                className={activeCategory === category ? "selected" : ""}
                key={category}
                onClick={() => setActiveCategory(category)}
                type="button"
              >
                {category}
              </button>
            ))}
          </div>

          {tracks.length === 0 ? (
            <div
              className="empty-state"
              style={{
                padding: "36px 20px",
                textAlign: "center",
                margin: "20px 0",
                background: "#dedede",
                border: "2px solid #222",
                borderRadius: 12,
              }}
            >
              <Icon name="vinyl" size={44} />
              <h3 style={{ marginTop: 14, fontFamily: "Silkscreen", fontSize: 16 }}>BIENVENIDO A SQUALE</h3>
              <p style={{ fontSize: 13, color: "#333", maxWidth: 440, margin: "8px auto 16px", lineHeight: 1.5 }}>
                En la versión instalada las pistas de prueba se han retirado.
                Tu reproductor tocadiscos analógico está listo para que importes tus archivos o carpetas completas de música.
              </p>
              <button
                className="btn-primary"
                onClick={() => setShowImportModal(true)}
                style={{
                  padding: "12px 22px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "Silkscreen",
                  fontSize: 12,
                  boxShadow: "2px 2px 0 #111",
                }}
                type="button"
              >
                + Importar Música o Carpetas
              </button>
            </div>
          ) : (
            <>
              <div className="album-strip">
                {visibleAlbums.length ? (
                  visibleAlbums.map((album, index) => (
                    <article
                      className="album-card"
                      key={album.id}
                      onClick={() => {
                        const track = tracks.find((t) => t.id === album.trackId) || tracks[0];
                        if (track) handlePlay(track);
                      }}
                      style={{ cursor: "pointer", "--card-index": Math.min(index, 12) } as React.CSSProperties}
                    >
                      {album.image ? (
                        <img alt={`Portada de ${album.title}`} src={album.image} />
                      ) : (
                        <div className="album-fallback-vinyl">
                          <Icon name="disc" size={36} />
                        </div>
                      )}
                      <h3>{album.title}</h3>
                      <p>por <u>{album.artist}</u></p>
                    </article>
                  ))
                ) : (
                  <p className="empty-state">No encontramos resultados para “{query}”.</p>
                )}
              </div>

              <section className="playlists">
                <h2>Listas y Colecciones ({dynamicAlbums.length})</h2>
                <PlaylistRow
                  count={tracks.length}
                  image={dynamicAlbums[0]?.image || ""}
                  index={0}
                  onPlay={() => handlePlay(tracks[0])}
                  title={dynamicAlbums[0]?.title || "Colección analógica"}
                />
                {tracks.length > 1 && (
                  <PlaylistRow
                    count={Math.max(1, Math.floor(tracks.length / 2))}
                    image={dynamicAlbums[1]?.image || dynamicAlbums[0]?.image || ""}
                    index={1}
                    onPlay={() => handlePlay(tracks[1])}
                    title="Sesión Hi-Fi"
                  />
                )}
              </section>
            </>
          )}
        </section>
      ) : activeNav === "Buscar" ? (
        <section key="screen-buscar" className="mobile-search-page secondary-screen" aria-label="Buscar música" style={{ display: "block", gridColumn: 2 }}>
          <div className="mobile-search-content">
            <p className="search-page-kicker">Explorar</p>
            <h1>Buscar</h1>
            <label className="mobile-search-field">
              <Icon name="search" size={21} />
              <input
                autoFocus
                aria-label="Buscar canciones o artistas"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Canciones, artistas o álbumes..."
                value={query}
              />
              {query && (
                <button aria-label="Borrar búsqueda" onClick={() => setQuery("")} type="button">
                  <Icon name="close" size={17} />
                </button>
              )}
            </label>

            {query ? (
              <div className="mobile-search-results">
                <div className="search-results-heading">
                  <h2>Resultados ({visibleTracks.length})</h2>
                </div>
                {visibleTracks.length ? (
                  visibleTracks.map((track, index) => (
                    <button
                      className="mobile-result-row"
                      key={track.id}
                      onClick={() => handlePlay(track)}
                      style={{ "--row-index": Math.min(index, 16) } as React.CSSProperties}
                      type="button"
                    >
                      {track.image ? (
                        <img alt="" src={track.image} />
                      ) : (
                        <span
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 6,
                            background: "#222",
                            display: "grid",
                            placeItems: "center",
                            color: "#888",
                            flexShrink: 0,
                          }}
                        >
                          <Icon name="disc" size={22} />
                        </span>
                      )}
                      <span><strong>{track.title}</strong><small>{track.artist} · {track.album}</small></span>
                      <Icon name={currentTrack.id === track.id && playing ? "pause" : "play"} size={19} />
                    </button>
                  ))
                ) : (
                  <div className="mobile-no-results">
                    <Icon name="disc" size={35} />
                    <strong>Sin resultados</strong>
                    <small>Prueba con otro título o género.</small>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="search-results-heading">
                  <h2>Explora tus géneros</h2>
                  <span>Para ti</span>
                </div>
                <div className="search-genre-grid">
                  {categories.map((suggestion, index) => (
                    <button
                      className={`search-genre genre-${(index % 4) + 1}`}
                      key={suggestion}
                      onClick={() => setQuery(suggestion)}
                      style={{ "--card-index": Math.min(index, 12) } as React.CSSProperties}
                      type="button"
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{suggestion}</strong>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      ) : activeNav === "Favoritos" ? (
        <section key="screen-favoritos" className="secondary-screen">
          <ScreenHeader eyebrow="Tu colección" title="Favoritos" />
          <div className="favorites-toolbar">
            <div className="favorites-info">
              <span className="favorites-badge">
                <Icon name="heart" size={14} filled />
                <span>{favoriteTracks.length} {favoriteTracks.length === 1 ? "canción" : "canciones"}</span>
              </span>
            </div>
            {favoriteTracks.length > 0 && (
              <div className="favorites-actions">
                <button
                  aria-label="Reproducir favoritos"
                  className="fav-action-btn fav-play-btn"
                  onClick={() => {
                    triggerHaptic("medium");
                    handlePlay(favoriteTracks[0]);
                  }}
                  title="Reproducir favoritos"
                  type="button"
                >
                  <Icon name="play" size={20} />
                </button>
                <button
                  aria-label="Reproducción aleatoria de favoritos"
                  className={`fav-action-btn ${shuffle ? "is-active" : ""}`}
                  onClick={() => {
                    triggerHaptic("light");
                    setShuffle(true);
                    const randomIndex = Math.floor(Math.random() * favoriteTracks.length);
                    handlePlay(favoriteTracks[randomIndex]);
                  }}
                  title={shuffle ? "Aleatorio activado" : "Reproducir favoritos en aleatorio"}
                  type="button"
                >
                  <Icon name="shuffle" size={18} />
                </button>
              </div>
            )}
          </div>
          {favoriteTracks.length > 0 ? (
            <SongTable
              currentTrackId={currentTrack.id}
              onDeleteTrack={handleDeleteTrack}
              onSelectTrack={handlePlay}
              playing={playing}
              tracks={favoriteTracks}
            />
          ) : (
            <p className="empty-state" style={{ padding: "40px 0" }}>
              Aún no tienes canciones favoritas. Pulsa el corazón ♥ en cualquier pista para añadirla.
            </p>
          )}
        </section>
      ) : activeNav === "Canciones" ? (
        <section key="screen-canciones" className="secondary-screen">
          <ScreenHeader eyebrow="Biblioteca analógica" title="Todas las canciones" />
          <div className="library-tools">
            <span>{tracks.length} canciones</span>
            <div className="library-tools-actions">
              <button
                aria-label="Importar archivos o carpetas de audio"
                className="btn-primary"
                onClick={() => {
                  triggerHaptic("light");
                  setShowImportModal(true);
                }}
                title="Importar archivos o carpetas enteras"
                type="button"
              >
                <Icon name="plus" size={18} />
              </button>
              <button
                aria-label="Reproducir aleatorio"
                className={shuffle ? "is-active" : ""}
                onClick={() => {
                  setShuffle((prev) => !prev);
                  handleNextTrack();
                }}
                title={shuffle ? "Aleatorio activado" : "Reproducir aleatorio"}
                type="button"
              >
                <Icon name="shuffle" size={18} />
              </button>
            </div>
          </div>
          {tracks.length > 0 ? (
            <SongTable
              currentTrackId={currentTrack.id}
              onDeleteTrack={handleDeleteTrack}
              onSelectTrack={handlePlay}
              playing={playing}
              tracks={tracks}
            />
          ) : (
            <div
              className="empty-state"
              style={{
                padding: "40px 20px",
                textAlign: "center",
                background: "#dedede",
                border: "2px solid #222",
                borderRadius: 12,
                marginTop: 16,
              }}
            >
              <Icon name="folder" size={40} />
              <p style={{ marginTop: 12, fontWeight: "bold", fontSize: 15 }}>
                Tu biblioteca personal está vacía
              </p>
              <p style={{ fontSize: 12, color: "#555", maxWidth: 420, margin: "6px auto 16px", lineHeight: 1.5 }}>
                En la aplicación instalada, las canciones de prueba desaparecen automáticamente para dar prioridad a tus archivos.
                Importa carpetas enteras o pistas de audio locales para comenzar a escuchar.
              </p>
              <button
                className="btn-primary"
                onClick={() => setShowImportModal(true)}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "Silkscreen",
                  fontSize: 11,
                  boxShadow: "2px 2px 0 #111",
                }}
                type="button"
              >
                + Importar Música o Carpetas
              </button>
            </div>
          )}
        </section>
      ) : activeNav === "Álbumes" ? (
        <section key="screen-albumes" className="secondary-screen">
          <ScreenHeader eyebrow="Biblioteca" title="Álbumes" />
          <div className="album-library">
            {visibleAlbums.length ? (
              visibleAlbums.map((album, index) => (
                <button
                  className="library-album"
                  key={album.id}
                  onClick={() => {
                    const track = tracks.find((t) => t.id === album.trackId) || tracks[0];
                    if (track) handlePlay(track);
                  }}
                  style={{ "--card-index": Math.min(index, 16) } as React.CSSProperties}
                  type="button"
                >
                  <span className="album-art-wrap">
                    {album.image ? (
                      <img alt="" src={album.image} />
                    ) : (
                      <span className="album-fallback-vinyl">
                        <Icon name="disc" size={42} />
                      </span>
                    )}
                    <i>{String(index + 1).padStart(2, "0")}</i>
                  </span>
                  <strong>{album.title}</strong>
                  <small>{album.artist} · LP {album.year || (1994 + index * 7)}</small>
                </button>
              ))
            ) : (
              <p className="empty-state">No encontramos álbumes para “{query}”.</p>
            )}
          </div>
        </section>
      ) : activeNav === "Ajustes" ? (
        <section key="screen-ajustes" className="secondary-screen settings-screen">
          <ScreenHeader eyebrow="SQUALE · PWA" title="Ajustes y Sistema" />
          <div className="settings-grid">
            <section style={{ "--card-index": 0 } as React.CSSProperties}>
              <h2>Reproducción Analógica</h2>
              <label>
                <span>
                  <strong>Fundido entre canciones (Crossfade)</strong>
                  <small>Transición suave analógica de 5 segundos</small>
                </span>
                <input
                  checked={crossfade}
                  onChange={(e) => setCrossfade(e.target.checked)}
                  type="checkbox"
                />
              </label>
              <label>
                <span>
                  <strong>Normalizar volumen</strong>
                  <small>Mantiene el nivel constante entre vinilos</small>
                </span>
                <input
                  checked={normalizeVolume}
                  onChange={(e) => setNormalizeVolume(e.target.checked)}
                  type="checkbox"
                />
              </label>
              <label>
                <span>
                  <strong>Reproducción automática</strong>
                  <small>Continúa con la siguiente canción del LP</small>
                </span>
                <input
                  checked={autoPlayNext}
                  onChange={(e) => setAutoPlayNext(e.target.checked)}
                  type="checkbox"
                />
              </label>
            </section>

            <section style={{ "--card-index": 1 } as React.CSSProperties}>
              <h2>Colores y Carátula del Álbum</h2>
              <label>
                <span>
                  <strong>Iluminación ambiental de carátula</strong>
                  <small>Halo y aura de luz viva proyectada según el arte del disco</small>
                </span>
                <input
                  checked={coverAmbientGlow}
                  onChange={(e) => handleToggleCoverAmbient(e.target.checked)}
                  type="checkbox"
                />
              </label>
              <label>
                <span>
                  <strong>Carátula en vinilo (Picture Disc)</strong>
                  <small>Arte del disco en el centro del tocadiscos o etiqueta vintage</small>
                </span>
                <input
                  checked={coverPictureDisc}
                  onChange={(e) => handleToggleCoverPictureDisc(e.target.checked)}
                  type="checkbox"
                />
              </label>
              <label>
                <span>
                  <strong>Acento adaptativo de carátula</strong>
                  <small>Adapta tonos del reproductor y formas de onda al color del álbum</small>
                </span>
                <input
                  checked={coverAccentTint}
                  onChange={(e) => handleToggleCoverAccentTint(e.target.checked)}
                  type="checkbox"
                />
              </label>

              <div className="palette-picker-wrap">
                <span className="palette-picker-label">Modo de color de carátula:</span>
                <div className="palette-picker-buttons">
                  <button
                    className={`palette-chip ${coverColorPalette === "dynamic" ? "active" : ""}`}
                    onClick={() => handleChangeCoverPalette("dynamic")}
                    type="button"
                  >
                    Dinámico (Arte)
                  </button>
                  <button
                    className={`palette-chip ${coverColorPalette === "amber" ? "active" : ""}`}
                    onClick={() => handleChangeCoverPalette("amber")}
                    type="button"
                  >
                    Ámbar Válvula
                  </button>
                  <button
                    className={`palette-chip ${coverColorPalette === "cyan" ? "active" : ""}`}
                    onClick={() => handleChangeCoverPalette("cyan")}
                    type="button"
                  >
                    Neón 80s
                  </button>
                  <button
                    className={`palette-chip ${coverColorPalette === "mono" ? "active" : ""}`}
                    onClick={() => handleChangeCoverPalette("mono")}
                    type="button"
                  >
                    Monocromo
                  </button>
                </div>
              </div>
            </section>

            <section style={{ "--card-index": 2 } as React.CSSProperties}>
              <h2>Archivos Locales & Carpetas</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ margin: 0, fontSize: 12 }}>
                  Importa canciones o carpetas enteras de música desde tu dispositivo Android, iOS, Windows o Mac (.mp3, .wav, .ogg, .flac).
                </p>

                <div style={{ background: "#dedede", padding: "10px 14px", borderRadius: 8, border: "1px dashed #666", fontSize: 12 }}>
                  <strong>Biblioteca guardada en este dispositivo:</strong>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <span>{savedTracks.length} canción(es) persistidas en almacenamiento seguro</span>
                    {savedTracks.length > 0 && (
                      <button
                        onClick={handleClearImported}
                        style={{
                          background: "#fee2e2",
                          color: "#991b1b",
                          border: "1px solid #ef4444",
                          borderRadius: 6,
                          padding: "4px 8px",
                          fontFamily: "Silkscreen",
                          fontSize: 10,
                          cursor: "pointer",
                        }}
                        type="button"
                      >
                        Vaciar
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    onClick={() => {
                      triggerHaptic("light");
                      openFolderPicker();
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "10px 16px",
                      background: "#111",
                      color: "#eee",
                      border: "2px solid #111",
                      borderRadius: 8,
                      fontFamily: "Silkscreen",
                      fontSize: 11,
                      cursor: "pointer",
                      boxShadow: "2px 2px 0 #111",
                    }}
                    type="button"
                  >
                    <Icon name="folder" size={16} /> Leer Carpeta Completa
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic("light");
                      openFilePicker();
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "10px 16px",
                      background: "#e6e6e6",
                      color: "#111",
                      border: "2px solid #111",
                      borderRadius: 8,
                      fontFamily: "Silkscreen",
                      fontSize: 11,
                      cursor: "pointer",
                      boxShadow: "2px 2px 0 #111",
                    }}
                    type="button"
                  >
                    <Icon name="plus" size={16} /> Seleccionar Archivos
                  </button>
                </div>
              </div>
            </section>

            <section style={{ "--card-index": 3 } as React.CSSProperties}>
              <h2>Canciones de Demostración (Demo)</h2>
              <label>
                <span>
                  <strong>Ocultar canciones de prueba</strong>
                  <small>
                    Al instalar SQUALE en tu dispositivo, las pistas demo desaparecen automáticamente para que disfrutes exclusivamente de tus archivos.
                  </small>
                </span>
                <input
                  checked={hideDemoTracks}
                  onChange={(e) => handleToggleHideDemo(e.target.checked)}
                  type="checkbox"
                />
              </label>
            </section>

            <section style={{ "--card-index": 4 } as React.CSSProperties}>
              <h2>Niveles de Sonido</h2>
              <label className="volume-setting">
                <span>
                  <strong>Volumen predeterminado ({volume}%)</strong>
                  <small>Se aplicará al tocadiscos analógico</small>
                </span>
                <input
                  max="100"
                  min="0"
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  type="range"
                  value={volume}
                />
              </label>
            </section>

            {/* PWA & Offline settings card */}
            <section style={{ gridColumn: "1 / -1", paddingTop: 10, "--card-index": 5 } as React.CSSProperties}>
              <h2>Aplicación Web Progresiva (PWA)</h2>
              <div
                style={{
                  background: "#dedede",
                  border: "2px solid #222",
                  borderRadius: 10,
                  padding: "16px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>Estado de instalación:</strong>
                    <p style={{ margin: "4px 0 0", fontSize: 12 }}>
                      {isPWA
                        ? "✓ Ejecutándose como App nativa independiente (Standalone)"
                        : canInstallPWA
                        ? "★ Lista para instalar en tu pantalla de inicio o escritorio"
                        : "✓ Navegador web con Service Worker activo"}
                    </p>
                  </div>
                  {!isInstalled && (
                    <button
                      className="pwa-install-btn"
                      onClick={handlePWAInstall}
                      type="button"
                    >
                      <Icon name="download" size={14} /> INSTALAR APP
                    </button>
                  )}
                </div>

                <div style={{ paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>Soporte Offline & Caché local:</strong>
                    <p style={{ margin: "4px 0 0", fontSize: 12 }}>
                      {isOnline ? "✓ Conexión online (Caché sincronizada)" : "⚡ Modo Offline activo (Reproducción sin internet)"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if ("caches" in window) {
                        caches.keys().then(() => showNotification("Caché offline verificada y actualizada"));
                      }
                    }}
                    style={{
                      border: "2px solid #222",
                      borderRadius: 6,
                      background: "#eee",
                      padding: "6px 12px",
                      fontFamily: "Silkscreen",
                      fontSize: 10,
                      cursor: "pointer",
                    }}
                    type="button"
                  >
                    Verificar Caché
                  </button>
                </div>
              </div>
            </section>
          </div>
        </section>
      ) : (
        /* Etiquetas screen */
        <section key="screen-etiquetas" className="secondary-screen">
          <ScreenHeader eyebrow="Organiza tu sonido" title="Etiquetas" />
          <div className="tag-cloud">
            {tags.map(([name, count], index) => (
              <button
                className={`tag-card tag-${(index % 6) + 1} ${selectedTag === name ? "selected" : ""}`}
                key={name}
                onClick={() => {
                  setSelectedTag(selectedTag === name ? null : name);
                  showNotification(`Filtrando canciones por "${name}"`);
                }}
                style={{ "--tag-index": Math.min(index, 12) } as React.CSSProperties}
                type="button"
              >
                <span><Icon name="tag" size={24} /></span>
                <strong>{name}</strong>
                <small>{count}</small>
              </button>
            ))}
            <button
              className="tag-card add-tag"
              onClick={() => {
                const name = prompt("Nombre de la nueva etiqueta:");
                if (name && name.trim()) {
                  setTags((prev) => [...prev, [name.trim(), "1 canción"]]);
                  showNotification(`Etiqueta "${name.trim()}" creada`);
                }
              }}
              type="button"
            >
              <span>+</span>
              <strong>Nueva etiqueta</strong>
            </button>
          </div>
        </section>
      )}

      {/* Desktop Player Panel (Column 3 on desktop) */}
      <section className="player-panel" aria-label="Reproductor tocadiscos SQUALE">
        <Turntable
          ambientGlow={coverAmbientGlow}
          glowColor={coverColors.glow}
          onTogglePower={handleTogglePlay}
          onToggleSpeed={handleToggleSpeed}
          playing={playing}
          showPictureDisc={coverPictureDisc}
          speed={speed}
          track={currentTrack}
        />

        <div className="track-heading">
          <div>
            <h1>{currentTrack.title}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span className="genre-pill">{currentTrack.genre}</span>
              {playing && (
                <span className="live-dancing-badge" title="Reproduciendo en tocadiscos analógico">
                  <span className="live-dancing-bar" />
                  <span className="live-dancing-bar" />
                  <span className="live-dancing-bar" />
                  <span className="live-dancing-bar" />
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              aria-label={isCurrentLiked ? "Quitar de favoritos" : "Añadir a favoritos"}
              className={`likes ${isCurrentLiked ? "liked" : ""}`}
              onClick={() => handleToggleLike(currentTrack.id)}
              type="button"
            >
              <span>♥</span> {formatLikes(currentTrack.likes + (isCurrentLiked ? 1 : 0))}
            </button>
            <button
              aria-label="Detalles de la canción"
              className="desktop-details-btn"
              onClick={() => setDetailsModalOpen(true)}
              title="Detalles de la canción"
              type="button"
            >
              <Icon name="more-vertical" size={18} />
            </button>
          </div>
        </div>

        {/* Live Audio Progress Waveform Scrubber */}
        <div className="progress">
          <strong>{formatTime(currentTime)}</strong>
          <div className="waveform" aria-label="Línea de tiempo de la canción">
            {baseWaveform.map((height, index) => {
              const barRatio = index / baseWaveform.length;
              const isPlayed = barRatio <= progressRatio;
              return (
                <i
                  className={!isPlayed ? "unplayed" : ""}
                  key={`desk-${height}-${index}`}
                  onClick={() => handleSeek(barRatio)}
                  role="button"
                  style={{
                    height,
                    ...(coverAccentTint && isPlayed ? { background: coverColors.accent } : {}),
                  }}
                  tabIndex={0}
                  title={`Saltar a ${formatTime(barRatio * duration)}`}
                />
              );
            })}
          </div>
          <strong>{formatTime(duration)}</strong>
        </div>

        {/* Desktop Player Controls */}
        <div className="controls">
          <button
            aria-label="Reproducción aleatoria"
            className={shuffle ? "active" : ""}
            onClick={() => {
              setShuffle((v) => !v);
              showNotification(!shuffle ? "Modo aleatorio activado" : "Modo aleatorio desactivado");
            }}
            type="button"
          >
            <Icon name="shuffle" size={20} />
          </button>

          <button aria-label="Canción anterior" onClick={handlePrevTrack} type="button">
            <Icon name="previous" size={26} />
          </button>

          <button
            aria-label={playing ? "Pausar música" : "Reproducir música"}
            className={`main-control ${playing ? "is-playing" : ""}`}
            onClick={handleTogglePlay}
            type="button"
          >
            <Icon name={playing ? "pause" : "play"} size={32} />
          </button>

          <button aria-label="Siguiente canción" onClick={handleNextTrack} type="button">
            <Icon name="next" size={26} />
          </button>

          <button
            aria-label={`Modo repetición: ${repeatMode}`}
            className={repeatMode !== "none" ? "active" : ""}
            onClick={() => {
              const nextMode = repeatMode === "none" ? "all" : repeatMode === "all" ? "one" : "none";
              setRepeatMode(nextMode);
              showNotification(
                nextMode === "all"
                  ? "Repetir todas las canciones"
                  : nextMode === "one"
                  ? "Repetir canción actual (1)"
                  : "Repetición desactivada",
              );
            }}
            type="button"
          >
            <Icon name="repeat" size={20} />
          </button>

          {/* Volume button with Popover */}
          <div className="volume-slider-wrap">
            <button
              aria-label="Control de volumen"
              onClick={() => setShowVolumePopover((v) => !v)}
              type="button"
            >
              <Icon name={isMuted ? "volume-mute" : "volume"} size={20} />
            </button>
            {showVolumePopover && (
              <div className="volume-popover">
                <span>{isMuted ? "Silenciado" : `${volume}%`}</span>
                <input
                  max="100"
                  min="0"
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  type="range"
                  value={isMuted ? 0 : volume}
                />
              </div>
            )}
          </div>

          <button
            aria-label="Expandir reproductor a pantalla completa"
            onClick={() => setMobilePlayerOpen(true)}
            type="button"
          >
            <Icon name="expand" size={19} />
          </button>
        </div>
      </section>

      {/* Mobile & Tablet Mini Player Bar */}
      <button
        aria-label="Abrir reproductor a pantalla completa"
        className={`mobile-mini-player ${playing ? "is-playing" : ""}`}
        onClick={() => {
          triggerHaptic("light");
          setMobilePlayerOpen(true);
        }}
        type="button"
      >
        <span
          className={`mini-record ${playing ? "spinning" : ""} ${currentTrack.image ? "has-cover" : ""}`}
          style={currentTrack.image ? { backgroundImage: `url(${currentTrack.image})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        />
        <span className="mini-track-copy">
          <strong>
            {currentTrack.title}
            {playing && (
              <span className="mini-dancing-eq" title="En reproducción">
                <i /><i /><i />
              </span>
            )}
          </strong>
          <small>{currentTrack.artist}</small>
        </span>
        <span
          aria-label={playing ? "Pausar" : "Reproducir"}
          className={`mini-player-control ${playing ? "is-playing" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            handleTogglePlay();
          }}
          role="button"
          tabIndex={0}
        >
          <Icon name={playing ? "pause" : "play"} size={23} />
        </span>
        <span
          className="mini-next"
          onClick={(event) => {
            event.stopPropagation();
            handleNextTrack();
          }}
          role="button"
          tabIndex={0}
        >
          <Icon name="next" size={22} />
        </span>
      </button>

      {/* Mobile & Fullscreen Expanded Player Modal with Pull-to-Dismiss */}
      {mobilePlayerOpen && (
        <section
          className="mobile-expanded-player"
          aria-label="Reproductor tocadiscos ampliado"
          style={{
            ...(sheetDragY > 0
              ? {
                  transform: `translateY(${sheetDragY}px)`,
                  transition: isDraggingSheet ? "none" : "transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
                }
              : {}),
            ...(coverAccentTint && coverAmbientGlow
              ? {
                  background: `radial-gradient(circle at 50% 16%, ${coverColors.softBg} 0%, #d8d8d8 60%, #c5c6c6 100%)`,
                }
              : {}),
          }}
        >
          {/* Native Grab Handle Pill */}
          <div
            className="mobile-sheet-pill-wrap"
            onTouchEnd={handleSheetTouchEnd}
            onTouchMove={handleSheetTouchMove}
            onTouchStart={handleSheetTouchStart}
          >
            <div className="mobile-sheet-pill" />
          </div>

          <header
            onTouchEnd={handleSheetTouchEnd}
            onTouchMove={handleSheetTouchMove}
            onTouchStart={handleSheetTouchStart}
          >
            <button
              aria-label="Minimizar reproductor"
              onClick={() => {
                triggerHaptic("light");
                setMobilePlayerOpen(false);
              }}
              type="button"
            >
              <span className="collapse-line" />
            </button>
            <span>Reproduciendo ahora</span>
            <button
              aria-label="Detalles de la canción"
              className="more-details-btn"
              onClick={() => {
                triggerHaptic("light");
                setDetailsModalOpen(true);
              }}
              title="Detalles de la canción"
              type="button"
            >
              <Icon name="more-vertical" size={24} />
            </button>
          </header>

          <div className="expanded-turntable">
            <Turntable
              ambientGlow={coverAmbientGlow}
              glowColor={coverColors.glow}
              onTogglePower={handleTogglePlay}
              onToggleSpeed={handleToggleSpeed}
              playing={playing}
              showPictureDisc={coverPictureDisc}
              speed={speed}
              track={currentTrack}
            />
          </div>

          <div className="expanded-track">
            <div className="track-info-text">
              <h1>{currentTrack.title}</h1>
              <p>
                {currentTrack.artist} · {currentTrack.album}
                {playing && (
                  <span className="live-dancing-badge" style={{ marginLeft: 8 }} title="Reproduciendo">
                    <span className="live-dancing-bar" />
                    <span className="live-dancing-bar" />
                    <span className="live-dancing-bar" />
                    <span className="live-dancing-bar" />
                  </span>
                )}
              </p>
            </div>
            <button
              aria-label={isCurrentLiked ? "Quitar de favoritos" : "Añadir a favoritos"}
              aria-pressed={isCurrentLiked}
              className={`track-heart ${isCurrentLiked ? "active" : ""}`}
              onClick={() => handleToggleLike(currentTrack.id)}
              type="button"
            >
              <Icon name="heart" size={26} filled={isCurrentLiked} />
            </button>
          </div>

          <div className="expanded-progress">
            <span>{formatTime(currentTime)}</span>
            <div className="expanded-waveform" aria-label="Progreso de reproducción">
              {baseWaveform.map((height, index) => {
                const barRatio = index / baseWaveform.length;
                const isPlayed = barRatio <= progressRatio;
                return (
                  <i
                    className={!isPlayed ? "unplayed" : ""}
                    key={`exp-${height}-${index}`}
                    onClick={() => handleSeek(barRatio)}
                    role="button"
                    style={{
                      height: Math.max(12, height * 0.78),
                      ...(coverAccentTint && isPlayed ? { background: coverColors.accent } : {}),
                    }}
                    tabIndex={0}
                  />
                );
              })}
            </div>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="expanded-controls">
            <button
              aria-label="Aleatorio"
              className={shuffle ? "active" : ""}
              onClick={() => setShuffle((v) => !v)}
              type="button"
            >
              <Icon name="shuffle" size={23} />
            </button>
            <button aria-label="Anterior" onClick={handlePrevTrack} type="button">
              <Icon name="previous" size={31} />
            </button>
            <button
              aria-label={playing ? "Pausar" : "Reproducir"}
              className="expanded-main-control"
              onClick={handleTogglePlay}
              type="button"
            >
              <Icon name={playing ? "pause" : "play"} size={34} />
            </button>
            <button aria-label="Siguiente" onClick={handleNextTrack} type="button">
              <Icon name="next" size={31} />
            </button>
            <button
              aria-pressed={repeatMode === "one"}
              aria-label="Repetir canción"
              className={`icon-only ${repeatMode !== "none" ? "active" : ""}`}
              onClick={() => {
                setRepeatMode((prev) => (prev === "none" ? "all" : prev === "all" ? "one" : "none"));
              }}
              type="button"
            >
              <Icon name="repeat" size={20} />
            </button>
          </div>

          <div className="expanded-secondary-actions">
            <div className="volume-slider-wrap">
              <button
                aria-label="Control de volumen"
                className="icon-only"
                onClick={() => setShowVolumePopover((v) => !v)}
                type="button"
              >
                <Icon name={isMuted ? "volume-mute" : "volume"} size={20} />
              </button>
              {showVolumePopover && (
                <div className="volume-popover">
                  <span>{isMuted ? "Silenciado" : `${volume}%`}</span>
                  <input
                    max="100"
                    min="0"
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    type="range"
                    value={isMuted ? 0 : volume}
                  />
                </div>
              )}
            </div>

            <button
              aria-label="Compartir canción"
              className="icon-only"
              onClick={handleShare}
              type="button"
            >
              <Icon name="share" size={20} />
            </button>

            <button
              aria-expanded={queueOpen}
              aria-label="Lista de reproducción"
              className={`icon-only ${queueOpen ? "active" : ""}`}
              onClick={() => {
                setQueueOpen((v) => !v);
                setLyricsOpen(false);
              }}
              type="button"
            >
              <Icon name="list" size={20} />
            </button>

            <button
              aria-expanded={lyricsOpen}
              aria-label="Ver letra completa"
              className={`icon-only ${lyricsOpen ? "active" : ""}`}
              onClick={() => {
                setLyricsOpen((v) => !v);
                setQueueOpen(false);
              }}
              type="button"
            >
              <Icon name="lyrics" size={20} />
            </button>
          </div>

          {/* Queue Sheet */}
          {queueOpen && (
            <section className="player-queue">
              <header>
                <div><span>A continuación</span><strong>Lista actual</strong></div>
                <small>{tracks.length} canciones</small>
              </header>
              {tracks.map((song, index) => {
                const isCurrent = song.id === currentTrack.id;
                return (
                  <button
                    className={isCurrent ? "current" : ""}
                    key={song.id}
                    onClick={() => handlePlay(song)}
                    type="button"
                  >
                    <span>{isCurrent ? <Icon name="music" size={16} /> : String(index + 1).padStart(2, "0")}</span>
                    <span><strong>{song.title}</strong><small>{song.artist}</small></span>
                    <small>{song.duration}</small>
                  </button>
                );
              })}
            </section>
          )}

          {/* Lyrics Sheet */}
          {lyricsOpen && (
            <section className="lyrics-screen" aria-label={`Letra de ${currentTrack.title}`}>
              <header>
                <div>
                  <span>Letra</span>
                  <strong>{currentTrack.title}</strong>
                  <small>{currentTrack.artist}</small>
                </div>
                <button
                  aria-label="Cerrar letra"
                  onClick={() => setLyricsOpen(false)}
                  type="button"
                >
                  <Icon name="close" size={22} />
                </button>
              </header>
              <div className="lyrics-copy">
                {currentTrack.lyrics.map((line, idx) => (
                  <p className={idx === 2 ? "current" : ""} key={`${idx}-${line}`}>
                    {line}
                  </p>
                ))}
              </div>
            </section>
          )}
        </section>
      )}

      {/* PWA Installation Guidance Modal */}
      {showInstallModal && (
        <div className="pwa-modal-backdrop" onClick={() => setShowInstallModal(false)}>
          <div className="pwa-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="pwa-modal-header">
              <h3>INSTALAR SQUALE</h3>
              <button onClick={() => setShowInstallModal(false)} type="button">
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="pwa-modal-body">
              <strong>Convierte SQUALE en tu reproductor de música en el dispositivo:</strong>
              <p>
                Disfruta de la experiencia analógica a pantalla completa, con soporte offline sin conexión y controles multimedia en tu pantalla de bloqueo.
              </p>
              <ol className="pwa-steps">
                <li>
                  <strong>En Chrome, Edge o Android:</strong> Pulsa el botón "Instalar" en la barra de direcciones o en el menú de opciones (⋮).
                </li>
                <li>
                  <strong>En iPhone / iPad (Safari):</strong> Pulsa el botón <strong>Compartir</strong> (icono de cuadrado con flecha hacia arriba) y selecciona <strong>"Añadir a pantalla de inicio"</strong>.
                </li>
                <li>
                  <strong>En Mac / Windows:</strong> Puedes instalarla como aplicación de escritorio nativa desde este mismo navegador.
                </li>
              </ol>
            </div>
            <div className="pwa-modal-footer">
              <button
                className="secondary"
                onClick={() => setShowInstallModal(false)}
                type="button"
              >
                Cerrar
              </button>
              <button
                onClick={async () => {
                  if (canInstallPWA) {
                    await promptPWAInstall();
                  }
                  setShowInstallModal(false);
                }}
                type="button"
              >
                Instalar Ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Music Import / Folder Modal */}
      {showImportModal && (
        <div className="pwa-modal-backdrop" onClick={() => setShowImportModal(false)}>
          <div className="pwa-modal-box import-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="pwa-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Icon name="folder" size={20} />
                <h3>IMPORTAR MÚSICA</h3>
              </div>
              <button aria-label="Cerrar modal" onClick={() => setShowImportModal(false)} type="button">
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="pwa-modal-body">
              <strong>Elige cómo deseas añadir música a SQUALE:</strong>
              <p>
                Puedes cargar carpetas completas de música desde tu almacenamiento local o seleccionar pistas individuales.
              </p>

              <div className="import-modal-options">
                <button
                  className="import-option-card primary"
                  onClick={openFolderPicker}
                  type="button"
                >
                  <div className="import-option-icon">
                    <Icon name="folder" size={24} />
                  </div>
                  <div className="import-option-text">
                    <strong>Leer Carpeta Completa</strong>
                    <small>
                      Escanea y añade automáticamente todas las canciones dentro de un directorio y subcarpetas (Android, iOS y PC).
                    </small>
                  </div>
                </button>

                <button
                  className="import-option-card"
                  onClick={openFilePicker}
                  type="button"
                >
                  <div className="import-option-icon">
                    <Icon name="music" size={24} />
                  </div>
                  <div className="import-option-text">
                    <strong>Seleccionar Archivos de Audio</strong>
                    <small>
                      Elige una o varias canciones (.mp3, .wav, .flac, .ogg, .m4a) de tu explorador de archivos.
                    </small>
                  </div>
                </button>
              </div>

              <div className="import-modal-tip">
                <Icon name="vinyl" size={14} />
                <span>
                  <strong>Tip Android / iOS:</strong> Al elegir "Leer Carpeta Completa", se abrirá el gestor de archivos de tu sistema para conceder acceso a la carpeta deseada.
                </span>
              </div>
            </div>
            <div className="pwa-modal-footer">
              <button
                className="secondary"
                onClick={() => setShowImportModal(false)}
                type="button"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Song Details Modal */}
      <SongDetailsModal
        isOpen={detailsModalOpen}
        isLiked={likedTracks.has(currentTrack.id)}
        onClose={() => setDetailsModalOpen(false)}
        onToggleLike={() => handleToggleLike(currentTrack.id)}
        speed={speed}
        track={currentTrack}
      />
    </main>
  );
}
