const fs = require('fs');
const zlib = require('zlib');

function crc32(buf) {
  let c = 0xFFFFFFFF;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([type, data])), 0);
  return Buffer.concat([lenBuf, type, data, crcBuf]);
}

// 1200x630 red pixel image - minimal valid PNG
const w = 1200, h = 630;
const ihdrData = Buffer.from([
  (w >> 24) & 0xFF, (w >> 16) & 0xFF, (w >> 8) & 0xFF, w & 0xFF,
  (h >> 24) & 0xFF, (h >> 16) & 0xFF, (h >> 8) & 0xFF, h & 0xFF,
  8, // bit depth
  2, // color type RGB
  0, // compression
  0, // filter
  0  // interlace
]);

// Minimal raw row for single pixel: filter=0, R=255 G=0 B=0
const rawPixel = Buffer.from([0, 255, 0, 0]);
const idatData = zlib.deflateRawSync(rawPixel, { level: 9 });

const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const out = Buffer.concat([sig, chunk(Buffer.from('IHDR'), ihdrData), chunk(Buffer.from('IDAT'), idatData), chunk(Buffer.from('IEND'), Buffer.alloc(0))]);

const path = 'D:/proprupee/tradebulsw2/public/og-image.png';
fs.writeFileSync(path, out);
console.log(`PNG written: ${out.length} bytes at ${path}`);
console.log(`Note: This is a minimal placeholder. Replace with actual branded OG image before production.`);
