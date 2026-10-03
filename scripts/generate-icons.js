import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(__dirname, '../public/icons');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Function to generate an RGBA buffer for SQUALE vinyl icon
function createVinylIconBuffer(size) {
  const buffer = Buffer.alloc(size * size * 4);
  const center = size / 2;
  const radius = size * 0.45;
  const innerRadius = size * 0.16;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded rect background border
      const bgPad = size * 0.05;
      const inBg = x >= bgPad && x <= size - bgPad && y >= bgPad && y <= size - bgPad;

      // Base background color #babbbb
      let r = 186, g = 187, b = 187, a = 255;

      if (dist <= radius) {
        // Vinyl Record
        if (dist <= innerRadius * 0.2) {
          // Center spindle hole
          r = 245; g = 245; b = 245; a = 255;
        } else if (dist <= innerRadius * 0.45) {
          // Spindle ring
          r = 24; g = 24; b = 24; a = 255;
        } else if (dist <= innerRadius) {
          // Record Label (vintage gold/paper)
          const factor = (y - (center - innerRadius)) / (innerRadius * 2);
          r = factor < 0.5 ? 200 : 235;
          g = factor < 0.5 ? 200 : 230;
          b = factor < 0.5 ? 200 : 200;
          a = 255;
        } else {
          // Vinyl body with grooves
          const groove = Math.sin(dist * 0.7);
          const grooveBrightness = groove > 0.5 ? 40 : 18;
          r = grooveBrightness;
          g = grooveBrightness;
          b = grooveBrightness;
          a = 255;
        }
      } else if (!inBg) {
        // Outside rounded corners: transparent or theme bg
        a = 255;
        r = 180; g = 180; b = 180;
      }

      buffer[idx] = r;
      buffer[idx + 1] = g;
      buffer[idx + 2] = b;
      buffer[idx + 3] = a;
    }
  }

  return buffer;
}

// Minimal pure Node PNG encoder using node:zlib
function encodePNG(width, height, rgbaBuffer) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0; // compression method
  ihdrData[11] = 0; // filter method
  ihdrData[12] = 0; // interlace method

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image data with filter byte 0 at start of each scanline
  const scanlineLength = width * 4;
  const filteredData = Buffer.alloc(height * (scanlineLength + 1));

  for (let y = 0; y < height; y++) {
    filteredData[y * (scanlineLength + 1)] = 0; // Filter type 0 (None)
    rgbaBuffer.copy(
      filteredData,
      y * (scanlineLength + 1) + 1,
      y * scanlineLength,
      (y + 1) * scanlineLength
    );
  }

  const compressedData = zlib.deflateSync(filteredData, { level: 9 });
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(8 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + length));
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Generate icons
const sizes = [192, 512];
for (const size of sizes) {
  const buf = createVinylIconBuffer(size);
  const png = encodePNG(size, size, buf);
  const filePath = path.join(outputDir, `icon-${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Generated ${filePath}`);
}

// Also maskable 512
const maskableBuf = createVinylIconBuffer(512);
fs.writeFileSync(path.join(outputDir, 'icon-maskable-512.png'), encodePNG(512, 512, maskableBuf));
console.log('Generated icon-maskable-512.png');
