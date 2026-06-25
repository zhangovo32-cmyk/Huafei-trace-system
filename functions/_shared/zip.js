const encoder = new TextEncoder();

let crcTable;

function getCrcTable() {
  if (crcTable) return crcTable;

  crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let j = 0; j < 8; j += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    crcTable[i] = value >>> 0;
  }

  return crcTable;
}

function crc32(bytes) {
  const table = getCrcTable();
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function toBytes(content) {
  if (content instanceof Uint8Array) return content;
  return encoder.encode(String(content));
}

function writeUInt16(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
}

function writeUInt32(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function concat(parts, totalLength) {
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export function createZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const { time, day } = dosDateTime();

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const data = toBytes(file.content);
    const crc = crc32(data);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    writeUInt32(localHeader, 0, 0x04034b50);
    writeUInt16(localHeader, 4, 20);
    writeUInt16(localHeader, 6, 0x0800);
    writeUInt16(localHeader, 8, 0);
    writeUInt16(localHeader, 10, time);
    writeUInt16(localHeader, 12, day);
    writeUInt32(localHeader, 14, crc);
    writeUInt32(localHeader, 18, data.length);
    writeUInt32(localHeader, 22, data.length);
    writeUInt16(localHeader, 26, nameBytes.length);
    writeUInt16(localHeader, 28, 0);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    writeUInt32(centralHeader, 0, 0x02014b50);
    writeUInt16(centralHeader, 4, 20);
    writeUInt16(centralHeader, 6, 20);
    writeUInt16(centralHeader, 8, 0x0800);
    writeUInt16(centralHeader, 10, 0);
    writeUInt16(centralHeader, 12, time);
    writeUInt16(centralHeader, 14, day);
    writeUInt32(centralHeader, 16, crc);
    writeUInt32(centralHeader, 20, data.length);
    writeUInt32(centralHeader, 24, data.length);
    writeUInt16(centralHeader, 28, nameBytes.length);
    writeUInt16(centralHeader, 30, 0);
    writeUInt16(centralHeader, 32, 0);
    writeUInt16(centralHeader, 34, 0);
    writeUInt16(centralHeader, 36, 0);
    writeUInt32(centralHeader, 38, 0);
    writeUInt32(centralHeader, 42, offset);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralOffset = offset;
  const centralLength = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  writeUInt32(end, 0, 0x06054b50);
  writeUInt16(end, 4, 0);
  writeUInt16(end, 6, 0);
  writeUInt16(end, 8, files.length);
  writeUInt16(end, 10, files.length);
  writeUInt32(end, 12, centralLength);
  writeUInt32(end, 16, centralOffset);
  writeUInt16(end, 20, 0);

  return concat([...localParts, ...centralParts, end], centralOffset + centralLength + end.length);
}
