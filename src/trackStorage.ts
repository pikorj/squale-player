import type { SongTrack } from "./audioEngine";

// SQUALE Offline IndexedDB Storage
// Persists audio files (Blobs) and metadata across sessions, restarts, and reboots.

export interface StoredTrackRecord {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  durationSec: number;
  coverBlob?: Blob | null;
  genre: string;
  year: number;
  likes: number;
  bpm: number;
  key: string;
  lyrics: string[];
  audioBlob: Blob;
  addedAt: number;
}

const DB_NAME = "squale_music_store";
const DB_VERSION = 1;
const STORE_NAME = "tracks";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB no está disponible en este entorno"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves one track record to IndexedDB
 */
export async function saveTrackRecord(record: StoredTrackRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Saves multiple track records in a single transaction
 */
export async function saveTrackRecords(records: StoredTrackRecord[]): Promise<void> {
  if (records.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    records.forEach((record) => {
      store.put(record);
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieves all stored tracks from IndexedDB sorted by addedAt (descending)
 */
export async function loadAllTrackRecords(): Promise<StoredTrackRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      const results: StoredTrackRecord[] = req.result || [];
      results.sort((a, b) => b.addedAt - a.addedAt);
      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Deletes a single track by its ID from IndexedDB
 */
export async function deleteTrackRecord(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Clears all tracks from IndexedDB
 */
export async function clearAllTrackRecords(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Reconstructs playable SongTrack items from stored records by creating fresh Blob URLs.
 */
export function recordsToSongTracks(records: StoredTrackRecord[]): SongTrack[] {
  return records.map((record) => {
    const audioUrl = URL.createObjectURL(record.audioBlob);
    let coverUrl = "";
    if (record.coverBlob) {
      coverUrl = URL.createObjectURL(record.coverBlob);
    }

    return {
      id: record.id,
      title: record.title,
      artist: record.artist,
      album: record.album,
      duration: record.duration,
      durationSec: record.durationSec,
      image: coverUrl,
      genre: record.genre,
      year: record.year,
      likes: record.likes,
      bpm: record.bpm,
      key: record.key,
      lyrics: record.lyrics,
      audioUrl,
    };
  });
}
