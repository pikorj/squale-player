// SQUALE Vinyl & Hi-Fi Audio Engine
// Generates realistic procedural vintage vinyl audio, crackle, bass, chords, and needle sounds offline,
// with Web Audio Analyser and HTML5 Audio fallback, plus MediaSession integration.

export interface SongTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  durationSec: number;
  album: string;
  image: string;
  genre: string;
  year: number;
  likes: number;
  bpm: number;
  key: string; // musical key e.g. "C minor"
  lyrics: string[];
  audioUrl?: string;
}

export const TRACK_LIST: SongTrack[] = [
  {
    id: "el-sufrimiento",
    title: "El sufrimiento",
    artist: "The Classics",
    duration: "3:35",
    durationSec: 215,
    album: "Cicatrices",
    image: "https://images.unsplash.com/photo-1659288796822-fdb7c46b6441?auto=format&fit=crop&w=600&q=85",
    genre: "Rock clásico",
    year: 1994,
    likes: 14820,
    bpm: 88,
    key: "E minor",
    lyrics: [
      "La noche cae sobre la ciudad,",
      "y sigo buscando un lugar para respirar.",
      "Mientras el ruido vuelve a comenzar,",
      "las luces tiemblan al verme pasar.",
      "No queda nada que pueda ocultar,",
      "solo esta canción y el tiempo detrás.",
      "Cicatrices que el tiempo no borró,",
      "ecos lejanos de un viejo amor."
    ]
  },
  {
    id: "despues-de-las-doce",
    title: "Después de las doce",
    artist: "Emilia Bryan",
    duration: "4:08",
    durationSec: 248,
    album: "Caos diario",
    image: "https://images.unsplash.com/photo-1712363279358-dcc16713568d?auto=format&fit=crop&w=600&q=85",
    genre: "Pop nocturno",
    year: 2022,
    likes: 22450,
    bpm: 104,
    key: "A minor",
    lyrics: [
      "Las horas pasan despacio en el reloj,",
      "después de las doce la luna me habló.",
      "Caminando por avenidas desiertas,",
      "con las promesas que dejaste abiertas.",
      "El neón refleja tus ojos de ayer,",
      "no hay vuelta atrás, ya no hay qué temer."
    ]
  },
  {
    id: "luces-de-estacion",
    title: "Luces de estación",
    artist: "Furkan Elveren",
    duration: "2:57",
    durationSec: 177,
    album: "Cosas sencillas",
    image: "https://images.unsplash.com/photo-1760205622923-0459561685ea?auto=format&fit=crop&w=600&q=85",
    genre: "Lofi instrumental",
    year: 2023,
    likes: 9830,
    bpm: 78,
    key: "F major",
    lyrics: [
      "[Instrumental - Solo de guitarra cálida]",
      "El último tren se aleja despacio,",
      "las luces de estación dibujan el espacio.",
      "Un rumor de viento entre los andenes,",
      "recuerdos lejanos de lo que tienes."
    ]
  },
  {
    id: "nunca-fue-tan-facil",
    title: "Nunca fue tan fácil",
    artist: "Onur Kurt",
    duration: "3:46",
    durationSec: 226,
    album: "No tan bien",
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=85",
    genre: "Indie acústico",
    year: 2021,
    likes: 18120,
    bpm: 92,
    key: "G major",
    lyrics: [
      "Decías que el invierno era un juego más,",
      "pero las hojas caían sin mirar atrás.",
      "Nunca fue tan fácil decir adiós,",
      "cuando en la lluvia se pierde la voz.",
      "Guardé tus cartas en una caja de ayer,",
      "aprendiendo de nuevo a perder."
    ]
  },
  {
    id: "domingo-gris",
    title: "Domingo gris",
    artist: "Eren",
    duration: "3:12",
    durationSec: 192,
    album: "La ciudad duerme",
    image: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=600&q=85",
    genre: "Jazz vinilo",
    year: 2019,
    likes: 31050,
    bpm: 72,
    key: "D minor",
    lyrics: [
      "Gotas de lluvia golpean el cristal,",
      "un café caliente y el humo otoñal.",
      "El vinilo gira en su propia espiral,",
      "melodías suaves en tono menor,",
      "un domingo gris lleno de calor."
    ]
  },
  {
    id: "vinilo-clasico-analogico",
    title: "Analog Whispers",
    artist: "The SQUALE Trio",
    duration: "3:15",
    durationSec: 195,
    album: "Vinilo Clásico",
    image: "", // Sin carátula para mostrar el vinilo analógico clásico con surcos
    genre: "Vinyl Hi-Fi",
    year: 1978,
    likes: 8520,
    bpm: 80,
    key: "A minor",
    lyrics: [
      "[Pista grabada en vinilo negro tradicional]",
      "Calidez analógica sin carátula gráfica,",
      "el tocadiscos muestra sus surcos oscuros y etiqueta central.",
    ]
  }
];

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private crackleGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isPlaying = false;
  private currentTrack: SongTrack = TRACK_LIST[0];
  private playbackPosition = 0;
  private lastUpdateTime = 0;
  private intervalId: number | null = null;
  private speedMultiplier = 1.0; // 33 RPM = 1.0, 45 RPM = 1.35
  private volume = 0.8;
  private onTimeUpdateCallback: ((time: number, duration: number) => void) | null = null;
  private onTrackEndCallback: (() => void) | null = null;

  // Synthesis timer
  private beatInterval: number | null = null;
  private beatStep = 0;
  private audioEl: HTMLAudioElement | null = null;

  constructor() {
    // Lazy initialized on first user interaction
  }

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      this.setupCrackle();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Authentic vinyl noise / crackle generator
  private setupCrackle() {
    if (!this.ctx || !this.masterGain) return;

    // Buffer of noise with occasional pops
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Gentle surface hiss
      let sample = (Math.random() * 2 - 1) * 0.015;
      // Random vinyl crackle clicks
      if (Math.random() < 0.0018) {
        sample += (Math.random() * 2 - 1) * 0.12;
      }
      output[i] = sample;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Lowpass filter for warm analog vinyl surface sound
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, this.ctx.currentTime);

    this.crackleGain = this.ctx.createGain();
    this.crackleGain.gain.setValueAtTime(0, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.crackleGain);
    this.crackleGain.connect(this.masterGain);

    whiteNoise.start();
  }

  // Needle drop sound when vinyl playback starts
  private playNeedleDrop() {
    if (!this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {
      console.warn('Needle drop error:', e);
    }
  }

  // Turntable brake sound (slow-down pitch fall) when paused
  private playBrakeEffect() {
    if (!this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.42);
    } catch (e) {
      console.warn('Brake sound error:', e);
    }
  }

  // Musical note player for analog synthesis
  private playTone(freq: number, type: OscillatorType, duration: number, gainVal = 0.08, delay = 0) {
    if (!this.ctx || !this.masterGain || !this.isPlaying) return;
    try {
      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq * this.speedMultiplier, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(gainVal, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + duration + 0.05);
    } catch {
      // AudioContext state errors caught silently
    }
  }

  // Synthesize rhythmic vinyl melody according to active song
  private triggerMusicStep() {
    if (!this.ctx || !this.isPlaying) return;

    const chordsByTrack: Record<string, number[][]> = {
      "el-sufrimiento": [
        [164.81, 196.00, 246.94], // Em
        [174.61, 220.00, 261.63], // F
        [196.00, 246.94, 293.66], // G
        [146.83, 174.61, 220.00], // Dm
      ],
      "despues-de-las-doce": [
        [220.00, 261.63, 329.63], // Am
        [174.61, 220.00, 261.63], // F
        [261.63, 329.63, 392.00], // C
        [196.00, 246.94, 293.66], // G
      ],
      "luces-de-estacion": [
        [174.61, 220.00, 261.63], // Fmaj
        [130.81, 164.81, 196.00], // C
        [146.83, 174.61, 220.00], // Dm
        [164.81, 196.00, 246.94], // Em
      ],
      "nunca-fue-tan-facil": [
        [196.00, 246.94, 293.66], // G
        [164.81, 196.00, 246.94], // Em
        [130.81, 164.81, 196.00], // C
        [146.83, 220.00, 293.66], // D
      ],
      "domingo-gris": [
        [146.83, 174.61, 220.00], // Dm
        [196.00, 246.94, 293.66], // Gm
        [220.00, 277.18, 329.63], // A7
        [146.83, 174.61, 220.00], // Dm
      ],
    };

    const chordList = chordsByTrack[this.currentTrack.id] || chordsByTrack["el-sufrimiento"];
    const chordIndex = Math.floor(this.beatStep / 4) % chordList.length;
    const currentChord = chordList[chordIndex];
    const subBeat = this.beatStep % 4;

    // Bass note on beat 0 and 2
    if (subBeat === 0 || subBeat === 2) {
      const bassFreq = currentChord[0] / 2;
      this.playTone(bassFreq, 'sine', 0.45, 0.14);
    }

    // Warm Rhodes / guitar chord arpeggio
    const noteFreq = currentChord[subBeat % currentChord.length];
    this.playTone(noteFreq, 'triangle', 0.5, 0.08);

    // Occasional gentle vinyl snare / brush tap
    if (subBeat === 2) {
      this.playTone(200, 'triangle', 0.1, 0.03);
    }

    this.beatStep++;
  }

  public play(track?: SongTrack) {
    this.initContext();

    if (track && track.id !== this.currentTrack.id) {
      if (this.audioEl) {
        this.audioEl.pause();
      }
      this.currentTrack = track;
      this.playbackPosition = 0;
      this.beatStep = 0;
    }

    this.isPlaying = true;
    this.lastUpdateTime = performance.now();

    // Turn up warm vinyl surface crackle
    if (this.crackleGain && this.ctx) {
      this.crackleGain.gain.setValueAtTime(0.045, this.ctx.currentTime);
    }

    this.playNeedleDrop();

    if (this.currentTrack.audioUrl) {
      if (!this.audioEl) {
        this.audioEl = new Audio();
      }

      if (this.audioEl.src !== this.currentTrack.audioUrl) {
        this.audioEl.src = this.currentTrack.audioUrl;
      }
      this.audioEl.currentTime = this.playbackPosition;
      this.audioEl.playbackRate = this.speedMultiplier;
      this.audioEl.volume = this.volume;
      this.audioEl.play().catch((err) => console.warn('Audio playback error:', err));

      this.audioEl.ontimeupdate = () => {
        if (!this.audioEl) return;
        this.playbackPosition = this.audioEl.currentTime;
        const dur = this.audioEl.duration && !isNaN(this.audioEl.duration) ? this.audioEl.duration : this.currentTrack.durationSec;
        if (this.onTimeUpdateCallback) {
          this.onTimeUpdateCallback(this.playbackPosition, dur);
        }
      };

      this.audioEl.onended = () => {
        this.pause();
        if (this.onTrackEndCallback) {
          this.onTrackEndCallback();
        }
      };

      // Disable synth beat interval when real audio file is playing
      if (this.beatInterval) {
        clearInterval(this.beatInterval);
        this.beatInterval = null;
      }
    } else {
      if (this.audioEl) {
        this.audioEl.pause();
      }

      // Setup synthesis interval
      const stepDurationMs = (60 / this.currentTrack.bpm / 2) * 1000 / this.speedMultiplier;
      if (this.beatInterval) clearInterval(this.beatInterval);
      this.beatInterval = window.setInterval(() => {
        this.triggerMusicStep();
      }, stepDurationMs);

      // Setup progress timer
      if (this.intervalId) clearInterval(this.intervalId);
      this.intervalId = window.setInterval(() => {
        if (!this.isPlaying) return;
        const now = performance.now();
        const deltaSec = ((now - this.lastUpdateTime) / 1000) * this.speedMultiplier;
        this.lastUpdateTime = now;

        this.playbackPosition += deltaSec;
        if (this.playbackPosition >= this.currentTrack.durationSec) {
          this.playbackPosition = this.currentTrack.durationSec;
          this.pause();
          if (this.onTrackEndCallback) {
            this.onTrackEndCallback();
          }
        }

        if (this.onTimeUpdateCallback) {
          this.onTimeUpdateCallback(this.playbackPosition, this.currentTrack.durationSec);
        }
      }, 200);
    }

    this.updateMediaSession();
  }

  public pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    if (this.audioEl) {
      this.audioEl.pause();
    }

    if (this.beatInterval) {
      clearInterval(this.beatInterval);
      this.beatInterval = null;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.crackleGain && this.ctx) {
      this.crackleGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }

    this.playBrakeEffect();
    this.updateMediaSession();
  }

  public togglePlay(track?: SongTrack) {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play(track);
    }
  }

  public seek(positionRatio: number) {
    const clamped = Math.max(0, Math.min(1, positionRatio));
    if (this.audioEl && this.currentTrack.audioUrl) {
      const dur = this.audioEl.duration && !isNaN(this.audioEl.duration) ? this.audioEl.duration : this.currentTrack.durationSec;
      this.audioEl.currentTime = clamped * dur;
      this.playbackPosition = this.audioEl.currentTime;
    } else {
      this.playbackPosition = clamped * this.currentTrack.durationSec;
    }
    if (this.onTimeUpdateCallback) {
      this.onTimeUpdateCallback(this.playbackPosition, this.currentTrack.durationSec);
    }
    this.updateMediaSessionPosition();
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.audioEl) {
      this.audioEl.volume = this.volume;
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public setSpeed(rpm: 33 | 45) {
    this.speedMultiplier = rpm === 45 ? 1.35 : 1.0;
    if (this.audioEl) {
      this.audioEl.playbackRate = this.speedMultiplier;
    }
    if (this.isPlaying && !this.currentTrack.audioUrl) {
      if (this.beatInterval) clearInterval(this.beatInterval);
      const stepDurationMs = (60 / this.currentTrack.bpm / 2) * 1000 / this.speedMultiplier;
      this.beatInterval = window.setInterval(() => {
        this.triggerMusicStep();
      }, stepDurationMs);
    }
  }

  public getAudioFrequencyData(): Uint8Array {
    if (!this.analyser || !this.isPlaying) {
      return new Uint8Array(32);
    }
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  public onTimeUpdate(cb: (time: number, duration: number) => void) {
    this.onTimeUpdateCallback = cb;
  }

  public onTrackEnd(cb: () => void) {
    this.onTrackEndCallback = cb;
  }

  public getCurrentTrack(): SongTrack {
    return this.currentTrack;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getVolume(): number {
    return this.volume;
  }

  // Native PWA Media Session API
  private updateMediaSession() {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      const track = this.currentTrack;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
        artwork: track.image
          ? [
              { src: track.image, sizes: "512x512", type: "image/jpeg" },
              { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
            ]
          : [{ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }],
      });

      navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';
      this.updateMediaSessionPosition();
    }
  }

  private updateMediaSessionPosition() {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      try {
        navigator.mediaSession.setPositionState({
          duration: this.currentTrack.durationSec,
          playbackRate: this.speedMultiplier,
          position: Math.min(this.playbackPosition, this.currentTrack.durationSec),
        });
      } catch {
        // Some browsers may reject if values are not finite
      }
    }
  }

  public setMediaSessionHandlers(handlers: {
    onPlay: () => void;
    onPause: () => void;
    onNext: () => void;
    onPrev: () => void;
  }) {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', handlers.onPlay);
      navigator.mediaSession.setActionHandler('pause', handlers.onPause);
      navigator.mediaSession.setActionHandler('previoustrack', handlers.onPrev);
      navigator.mediaSession.setActionHandler('nexttrack', handlers.onNext);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && details.seekTime !== null) {
          this.seek(details.seekTime / this.currentTrack.durationSec);
        }
      });
    }
  }
}

export const audioEngine = new AudioEngine();
