// SQUALE Audio Metadata & Cover Art Extractor
// Self-contained zero-dependency browser parser for ID3v2 (MP3), Vorbis/FLAC, and MP4/M4A embedded covers.

export interface AudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  coverUrl?: string;
}

/**
 * Extracts metadata (title, artist, album, and embedded cover art) from an audio File.
 */
export async function extractAudioMetadata(file: File): Promise<AudioMetadata> {
  try {
    const sliceSize = Math.min(file.size, 4 * 1024 * 1024); // First 4MB is plenty for tags + art
    const buffer = await file.slice(0, sliceSize).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const result: AudioMetadata = {};

    // 1. Check ID3v2 (MP3 / AIFF)
    if (bytes.length > 10 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
      parseId3v2(bytes, result);
    }
    // 2. Check FLAC ("fLaC")
    else if (bytes.length > 8 && bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43) {
      parseFlac(bytes, result);
    }
    // 3. Check MP4 / M4A / AAC
    else {
      parseMp4(bytes, result);
    }

    // 4. If cover art was not found by specific frame, attempt raw image scan in the metadata region
    if (!result.coverUrl && bytes.length > 64) {
      result.coverUrl = scanRawImage(bytes);
    }

    return result;
  } catch (err) {
    console.warn("Error parsing audio metadata:", err);
    return {};
  }
}

/**
 * ID3v2.2, ID3v2.3, and ID3v2.4 parser
 */
function parseId3v2(bytes: Uint8Array, result: AudioMetadata): void {
  const version = bytes[3]; // 2 = v2.2, 3 = v2.3, 4 = v2.4
  const tagSize =
    ((bytes[6] & 0x7f) << 21) |
    ((bytes[7] & 0x7f) << 14) |
    ((bytes[8] & 0x7f) << 7) |
    (bytes[9] & 0x7f);

  const maxOffset = Math.min(bytes.length, tagSize + 10);
  let offset = 10;

  if (version === 2) {
    // ID3v2.2: 3-character frame IDs, 3-byte size
    while (offset + 6 < maxOffset) {
      const frameId = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2]);
      if (!frameId || frameId[0] < "A" || frameId[0] > "Z") break;
      const frameSize = (bytes[offset + 3] << 16) | (bytes[offset + 4] << 8) | bytes[offset + 5];
      const dataOffset = offset + 6;
      if (frameSize <= 0 || dataOffset + frameSize > bytes.length) break;

      if (frameId === "TT2" && !result.title) {
        result.title = decodeTextFrame(bytes, dataOffset, frameSize);
      } else if (frameId === "TP1" && !result.artist) {
        result.artist = decodeTextFrame(bytes, dataOffset, frameSize);
      } else if (frameId === "TAL" && !result.album) {
        result.album = decodeTextFrame(bytes, dataOffset, frameSize);
      } else if (frameId === "PIC" && !result.coverUrl) {
        const cover = decodeApicFrame(bytes, dataOffset, frameSize);
        if (cover) result.coverUrl = cover;
      }
      offset = dataOffset + frameSize;
    }
  } else {
    // ID3v2.3 & ID3v2.4: 4-character frame IDs, 4-byte size, 2-byte flags
    while (offset + 10 < maxOffset) {
      const frameId = String.fromCharCode(
        bytes[offset],
        bytes[offset + 1],
        bytes[offset + 2],
        bytes[offset + 3]
      );
      if (!frameId || frameId[0] < "A" || frameId[0] > "Z") break;

      let frameSize = 0;
      if (version === 4) {
        frameSize =
          ((bytes[offset + 4] & 0x7f) << 21) |
          ((bytes[offset + 5] & 0x7f) << 14) |
          ((bytes[offset + 6] & 0x7f) << 7) |
          (bytes[offset + 7] & 0x7f);
      } else {
        frameSize =
          (bytes[offset + 4] << 24) |
          (bytes[offset + 5] << 16) |
          (bytes[offset + 6] << 8) |
          bytes[offset + 7];
      }

      const dataOffset = offset + 10;
      if (frameSize <= 0 || dataOffset + frameSize > bytes.length) break;

      if (frameId === "TIT2" && !result.title) {
        result.title = decodeTextFrame(bytes, dataOffset, frameSize);
      } else if (frameId === "TPE1" && !result.artist) {
        result.artist = decodeTextFrame(bytes, dataOffset, frameSize);
      } else if (frameId === "TALB" && !result.album) {
        result.album = decodeTextFrame(bytes, dataOffset, frameSize);
      } else if (frameId === "APIC" && !result.coverUrl) {
        const cover = decodeApicFrame(bytes, dataOffset, frameSize);
        if (cover) result.coverUrl = cover;
      }
      offset = dataOffset + frameSize;
    }
  }
}

function decodeTextFrame(bytes: Uint8Array, offset: number, size: number): string {
  if (size <= 1) return "";
  const encoding = bytes[offset];
  const payload = bytes.subarray(offset + 1, offset + size);
  try {
    if (encoding === 1 || encoding === 2) {
      return new TextDecoder("utf-16").decode(payload).replace(/\0/g, "").trim();
    }
    return new TextDecoder("utf-8").decode(payload).replace(/\0/g, "").trim();
  } catch {
    return "";
  }
}

function decodeApicFrame(bytes: Uint8Array, offset: number, size: number): string | undefined {
  const frameBytes = bytes.subarray(offset, offset + size);
  if (frameBytes.length < 12) return undefined;

  // Search for JPEG (FF D8 FF) or PNG (89 50 4E 47) signatures inside APIC
  for (let i = 0; i < frameBytes.length - 8; i++) {
    if (frameBytes[i] === 0xff && frameBytes[i + 1] === 0xd8 && frameBytes[i + 2] === 0xff) {
      const imgData = frameBytes.subarray(i);
      const blob = new Blob([imgData], { type: "image/jpeg" });
      return URL.createObjectURL(blob);
    }
    if (
      frameBytes[i] === 0x89 &&
      frameBytes[i + 1] === 0x50 &&
      frameBytes[i + 2] === 0x4e &&
      frameBytes[i + 3] === 0x47
    ) {
      const imgData = frameBytes.subarray(i);
      const blob = new Blob([imgData], { type: "image/png" });
      return URL.createObjectURL(blob);
    }
  }
  return undefined;
}

/**
 * FLAC parser: Vorbis comments and Picture block (type 6)
 */
function parseFlac(bytes: Uint8Array, result: AudioMetadata): void {
  let offset = 4; // Skip "fLaC"
  while (offset + 4 < bytes.length) {
    const isLast = (bytes[offset] & 0x80) !== 0;
    const blockType = bytes[offset] & 0x7f;
    const blockLength =
      (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
    offset += 4;

    if (blockType === 6 && offset + blockLength <= bytes.length && !result.coverUrl) {
      // FLAC Picture block
      const mimeLen =
        (bytes[offset + 4] << 24) |
        (bytes[offset + 5] << 16) |
        (bytes[offset + 6] << 8) |
        bytes[offset + 7];
      const mime = new TextDecoder().decode(bytes.subarray(offset + 8, offset + 8 + mimeLen));
      const descLenOffset = offset + 8 + mimeLen;
      const descLen =
        (bytes[descLenOffset] << 24) |
        (bytes[descLenOffset + 1] << 16) |
        (bytes[descLenOffset + 2] << 8) |
        bytes[descLenOffset + 3];
      const dataLenOffset = descLenOffset + 4 + descLen + 16;
      if (dataLenOffset + 4 <= bytes.length) {
        const dataLen =
          (bytes[dataLenOffset] << 24) |
          (bytes[dataLenOffset + 1] << 16) |
          (bytes[dataLenOffset + 2] << 8) |
          bytes[dataLenOffset + 3];
        const imgStart = dataLenOffset + 4;
        if (imgStart + dataLen <= bytes.length) {
          const imgData = bytes.subarray(imgStart, imgStart + dataLen);
          const blob = new Blob([imgData], { type: mime || "image/jpeg" });
          result.coverUrl = URL.createObjectURL(blob);
        }
      }
    }

    offset += blockLength;
    if (isLast) break;
  }
}

/**
 * MP4 / M4A parser: Search covr atom
 */
function parseMp4(bytes: Uint8Array, result: AudioMetadata): void {
  // Search for 'covr' atom in the buffer
  for (let i = 0; i < bytes.length - 12; i++) {
    if (
      bytes[i] === 0x63 && // 'c'
      bytes[i + 1] === 0x6f && // 'o'
      bytes[i + 2] === 0x76 && // 'v'
      bytes[i + 3] === 0x72 // 'r'
    ) {
      // Inside covr atom: look for 'data' atom
      for (let j = i + 4; j < Math.min(bytes.length - 8, i + 500); j++) {
        if (
          bytes[j] === 0x64 && // 'd'
          bytes[j + 1] === 0x61 && // 'a'
          bytes[j + 2] === 0x74 && // 't'
          bytes[j + 3] === 0x61 // 'a'
        ) {
          const dataPayload = j + 12; // Skip 'data' + version + flags + reserved
          if (dataPayload < bytes.length) {
            const raw = scanRawImage(bytes.subarray(dataPayload));
            if (raw) {
              result.coverUrl = raw;
              return;
            }
          }
        }
      }
    }
  }
}

/**
 * Fast scanner for JPEG / PNG magic bytes in header data
 */
function scanRawImage(bytes: Uint8Array): string | undefined {
  const maxScan = Math.min(bytes.length, 3 * 1024 * 1024);
  for (let i = 0; i < maxScan - 8; i++) {
    // JPEG (FF D8 FF E0 / FF D8 FF E1 / FF D8 FF DB)
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
      const imgData = bytes.subarray(i);
      const blob = new Blob([imgData], { type: "image/jpeg" });
      return URL.createObjectURL(blob);
    }
    // PNG (89 50 4E 47)
    if (
      bytes[i] === 0x89 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x4e &&
      bytes[i + 3] === 0x47
    ) {
      const imgData = bytes.subarray(i);
      const blob = new Blob([imgData], { type: "image/png" });
      return URL.createObjectURL(blob);
    }
  }
  return undefined;
}
