const fs = require('fs');
const zlib = require('zlib');

const width = 1200;
const height = 630;

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type);
  const crcData = Buffer.concat([typeBuf, data]);
  const crc = zlib.crc32(crcData);
  const header = Buffer.alloc(4);
  header.writeUInt32BE(data.length, 0);
  const footer = Buffer.alloc(4);
  footer.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([header, typeBuf, data, footer]);
}

// IHDR chunk
const ihdrData = Buffer.alloc(13);
ihdrData.writeUInt32BE(width, 0);
ihdrData.writeUInt32BE(height, 4);
ihdrData[8] = 8; // bit depth
ihdrData[9] = 2; // RGB color type
ihdrData[10] = 0; // compression
ihdrData[11] = 0; // filter
ihdrData[12] = 0; // interlace
const ihdr = pngChunk('IHDR', ihdrData);

// Generate raw pixel rows (RGB, no alpha for simplicity and smaller size)
const rawRows = [];
for (let y = 0; y < height; y++) {
  const row = Buffer.alloc(1 + width * 3); // filter byte + RGB pixels
  row[0] = 0; // no filter
  for (let x = 0; x < width; x++) {
    // Dark gradient background: deep navy/teal theme matching site aesthetic
    const progressX = x / width;
    const progressY = y / height;

    // Base dark color with subtle gradient
    const baseR = Math.floor(8 + progressX * 10 + progressY * 5);
    const baseG = Math.floor(20 + progressX * 5);
    const baseB = Math.floor(28 + progressX * 10 + progressY * 8);

    // Add a warm emerald/cyan accent glow from center
    const cx = width * 0.5;
    const cy = height * 0.5;
    const dx = (x - cx) / cx;
    const dy = (y - cy) / cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const glow = Math.max(0, 1 - dist) * 12;

    const r = Math.min(255, Math.max(0, baseR + glow * 0.3));
    const g = Math.min(255, Math.max(0, baseG + glow * 0.9)); // greenish glow
    const b = Math.min(255, Math.max(0, baseB + glow * 0.7)); // bluish tint

    row.set([r, g, b], 1 + x * 3);
  }
  rawRows.push(row);
}

const rawData = Buffer.concat(rawRows);
const compressed = zlib.deflateSync(rawData);
const idat = pngChunk('IDAT', compressed);
const iend = pngChunk('IEND', Buffer.alloc(0));

const pngBuffer = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  ihdr,
  idat,
  iend
]);

fs.writeFileSync('D:/proprupee/tradebulsw2/public/og-image.png', pngBuffer);
console.log('Created og-image.png successfully:', pngBuffer.length, 'bytes');
