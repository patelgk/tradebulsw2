#!/usr/bin/env python3
"""Generate a minimal valid PNG (1x1 red pixel) for og-image placeholder."""
import struct, zlib, os

def chunk(ctype: bytes, data: bytes) -> bytes:
    c = ctype + data
    return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

w, h = 1200, 630
# Each row: filter byte (0) + w RGB triples (red: ff 00 00)
row = b'\x00' + b'\xff\x00\x00' * w
raw = b''.join(row for _ in range(h))
compressed = zlib.compress(raw)

sig = b'\x89PNG\r\n\x1a\n'
ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
idat = chunk(b'IDAT', compressed)
iend = chunk(b'IEND', b'')

path = os.path.join(os.path.dirname(__file__), '..', 'public', 'og-image.png')
os.makedirs(os.path.dirname(path), exist_ok=True)
with open(path, 'wb') as f:
    f.write(sig + ihdr + idat + iend)
print(f'Written {os.path.getsize(path)} bytes → {path}')
