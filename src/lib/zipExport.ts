/**
 * Lightweight ZIP export using browser-native APIs (no external deps).
 *
 * Creates a minimal ZIP file (store-only, no compression) which is fine for
 * small text files like HTML/CSS/JS projects.
 */

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function u16(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff]);
}

function u32(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]);
}

interface ZipEntry {
  name: string;
  content: string;
}

export function createZip(entries: ZipEntry[]): Blob {
  const parts: Uint8Array[] = [];
  const centralDir: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = toBytes(entry.name);
    const dataBytes = toBytes(entry.content);
    const crc = crc32(dataBytes);
    const size = dataBytes.length;

    // Local file header (30 bytes + name + data)
    const localHeader = new Uint8Array([
      0x50, 0x4b, 0x03, 0x04, // signature
      0x14, 0x00,             // version needed (2.0)
      0x00, 0x00,             // flags
      0x00, 0x00,             // compression: store
      0x00, 0x00,             // mod time
      0x00, 0x00,             // mod date
      ...u32(crc),            // crc-32
      ...u32(size),           // compressed size
      ...u32(size),           // uncompressed size
      ...u16(nameBytes.length), // filename length
      0x00, 0x00,             // extra field length
    ]);

    parts.push(localHeader, nameBytes, dataBytes);

    // Central directory entry
    const cdEntry = new Uint8Array([
      0x50, 0x4b, 0x01, 0x02, // signature
      0x14, 0x00,             // version made by
      0x14, 0x00,             // version needed
      0x00, 0x00,             // flags
      0x00, 0x00,             // compression: store
      0x00, 0x00,             // mod time
      0x00, 0x00,             // mod date
      ...u32(crc),
      ...u32(size),
      ...u32(size),
      ...u16(nameBytes.length),
      0x00, 0x00,             // extra field length
      0x00, 0x00,             // comment length
      0x00, 0x00,             // disk number
      0x00, 0x00,             // internal attrs
      0x00, 0x00, 0x00, 0x00, // external attrs
      ...u32(offset),         // local header offset
    ]);

    centralDir.push(cdEntry, nameBytes);
    offset += localHeader.length + nameBytes.length + dataBytes.length;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const cd of centralDir) cdSize += cd.length;

  // End of central directory
  const eocd = new Uint8Array([
    0x50, 0x4b, 0x05, 0x06, // signature
    0x00, 0x00,             // disk number
    0x00, 0x00,             // disk with CD
    ...u16(entries.length),  // entries on disk
    ...u16(entries.length),  // total entries
    ...u32(cdSize),          // CD size
    ...u32(cdOffset),        // CD offset
    0x00, 0x00,             // comment length
  ]);

  return new Blob([...parts, ...centralDir, eocd], { type: "application/zip" });
}
