const VERSION = 6;
const SIZE = VERSION * 4 + 17;
const DATA_CODEWORDS = 108;
const ECC_CODEWORDS_PER_BLOCK = 16;
const NUM_BLOCKS = 4;
const ALIGNMENT_POSITIONS = [6, 34];
const MASK_PATTERN = 0;

const EXP = new Array(255);
const LOG = new Array(256).fill(0);

let value = 1;
for (let i = 0; i < 255; i += 1) {
  EXP[i] = value;
  LOG[value] = i;
  value <<= 1;
  if (value & 0x100) value ^= 0x11d;
}

const textEncoder = new TextEncoder();

function gfMultiply(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP[(LOG[a] + LOG[b]) % 255];
}

function reedSolomonCoefficients(degree) {
  const coefficients = new Array(degree).fill(0);
  coefficients[degree - 1] = 1;
  let root = 1;

  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < coefficients.length; j += 1) {
      coefficients[j] = gfMultiply(coefficients[j], root);
      if (j + 1 < coefficients.length) coefficients[j] ^= coefficients[j + 1];
    }
    root = gfMultiply(root, 2);
  }

  return coefficients;
}

const RS_COEFFICIENTS = reedSolomonCoefficients(ECC_CODEWORDS_PER_BLOCK);

function reedSolomonRemainder(data) {
  const result = new Array(RS_COEFFICIENTS.length).fill(0);

  for (const byte of data) {
    const factor = byte ^ result.shift();
    result.push(0);
    for (let i = 0; i < result.length; i += 1) {
      result[i] ^= gfMultiply(RS_COEFFICIENTS[i], factor);
    }
  }

  return result;
}

class BitBuffer {
  constructor() {
    this.bits = [];
  }

  append(value, length) {
    for (let i = length - 1; i >= 0; i -= 1) {
      this.bits.push((value >>> i) & 1);
    }
  }

  toBytes() {
    const bytes = [];
    for (let i = 0; i < this.bits.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8; j += 1) {
        byte = (byte << 1) | (this.bits[i + j] || 0);
      }
      bytes.push(byte);
    }
    return bytes;
  }
}

function encodeData(text) {
  const bytes = Array.from(textEncoder.encode(text));
  const capacityBits = DATA_CODEWORDS * 8;
  const buffer = new BitBuffer();

  if (bytes.length > 106) {
    throw new Error("验证链接太长，无法生成二维码");
  }

  buffer.append(0b0100, 4);
  buffer.append(bytes.length, 8);
  for (const byte of bytes) buffer.append(byte, 8);

  const terminator = Math.min(4, capacityBits - buffer.bits.length);
  buffer.append(0, terminator);
  while (buffer.bits.length % 8 !== 0) buffer.append(0, 1);

  const data = buffer.toBytes();
  const pads = [0xec, 0x11];
  for (let i = 0; data.length < DATA_CODEWORDS; i += 1) {
    data.push(pads[i % 2]);
  }

  return data;
}

function interleaveCodewords(data) {
  const dataBlocks = [];
  const eccBlocks = [];
  const blockLength = DATA_CODEWORDS / NUM_BLOCKS;

  for (let i = 0; i < NUM_BLOCKS; i += 1) {
    const block = data.slice(i * blockLength, (i + 1) * blockLength);
    dataBlocks.push(block);
    eccBlocks.push(reedSolomonRemainder(block));
  }

  const result = [];
  for (let i = 0; i < blockLength; i += 1) {
    for (const block of dataBlocks) result.push(block[i]);
  }

  for (let i = 0; i < ECC_CODEWORDS_PER_BLOCK; i += 1) {
    for (const block of eccBlocks) result.push(block[i]);
  }

  return result;
}

function emptyMatrix() {
  return {
    modules: Array.from({ length: SIZE }, () => new Array(SIZE).fill(false)),
    reserved: Array.from({ length: SIZE }, () => new Array(SIZE).fill(false))
  };
}

function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < SIZE && y < SIZE;
}

function setFunction(matrix, x, y, dark) {
  if (!inBounds(x, y)) return;
  matrix.modules[y][x] = dark;
  matrix.reserved[y][x] = true;
}

function drawFinder(matrix, centerX, centerY) {
  for (let dy = -4; dy <= 4; dy += 1) {
    for (let dx = -4; dx <= 4; dx += 1) {
      const x = centerX + dx;
      const y = centerY + dy;
      if (!inBounds(x, y)) continue;

      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      const dark = distance === 3 || (Math.abs(dx) <= 1 && Math.abs(dy) <= 1);
      setFunction(matrix, x, y, distance <= 3 && dark);
    }
  }
}

function drawAlignment(matrix, centerX, centerY) {
  if (matrix.reserved[centerY][centerX]) return;
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      setFunction(matrix, centerX + dx, centerY + dy, distance === 2 || distance === 0);
    }
  }
}

function reserveFormat(matrix) {
  for (let i = 0; i <= 8; i += 1) {
    if (i !== 6) {
      setFunction(matrix, 8, i, false);
      setFunction(matrix, i, 8, false);
    }
  }

  for (let i = 0; i < 8; i += 1) setFunction(matrix, SIZE - 1 - i, 8, false);
  for (let i = 0; i < 7; i += 1) setFunction(matrix, 8, SIZE - 1 - i, false);
}

function drawFunctionPatterns(matrix) {
  drawFinder(matrix, 3, 3);
  drawFinder(matrix, SIZE - 4, 3);
  drawFinder(matrix, 3, SIZE - 4);

  for (let i = 0; i < SIZE; i += 1) {
    if (!matrix.reserved[6][i]) setFunction(matrix, i, 6, i % 2 === 0);
    if (!matrix.reserved[i][6]) setFunction(matrix, 6, i, i % 2 === 0);
  }

  for (const y of ALIGNMENT_POSITIONS) {
    for (const x of ALIGNMENT_POSITIONS) drawAlignment(matrix, x, y);
  }

  setFunction(matrix, 8, SIZE - 8, true);
  reserveFormat(matrix);
}

function maskBit(x, y) {
  return (x + y) % 2 === 0;
}

function drawData(matrix, codewords) {
  const bits = [];
  for (const byte of codewords) {
    for (let i = 7; i >= 0; i -= 1) bits.push((byte >>> i) & 1);
  }

  let index = 0;
  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;

    for (let vertical = 0; vertical < SIZE; vertical += 1) {
      const upward = ((SIZE - 1 - right) / 2) % 2 === 0;
      const y = upward ? SIZE - 1 - vertical : vertical;

      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        if (matrix.reserved[y][x]) continue;

        const bit = index < bits.length ? bits[index] === 1 : false;
        matrix.modules[y][x] = bit !== maskBit(x, y);
        index += 1;
      }
    }
  }
}

function formatBits() {
  const data = MASK_PATTERN;
  let bits = data << 10;
  const generator = 0x537;

  for (let i = 14; i >= 10; i -= 1) {
    if (((bits >>> i) & 1) !== 0) bits ^= generator << (i - 10);
  }

  return ((data << 10) | bits) ^ 0x5412;
}

function drawFormatBits(matrix) {
  const bits = formatBits();

  for (let i = 0; i <= 5; i += 1) setFunction(matrix, 8, i, ((bits >>> i) & 1) !== 0);
  setFunction(matrix, 8, 7, ((bits >>> 6) & 1) !== 0);
  setFunction(matrix, 8, 8, ((bits >>> 7) & 1) !== 0);
  setFunction(matrix, 7, 8, ((bits >>> 8) & 1) !== 0);
  for (let i = 9; i < 15; i += 1) setFunction(matrix, 14 - i, 8, ((bits >>> i) & 1) !== 0);

  for (let i = 0; i < 8; i += 1) setFunction(matrix, SIZE - 1 - i, 8, ((bits >>> i) & 1) !== 0);
  for (let i = 8; i < 15; i += 1) setFunction(matrix, 8, SIZE - 15 + i, ((bits >>> i) & 1) !== 0);
  setFunction(matrix, 8, SIZE - 8, true);
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function generateQrSvg(text) {
  const matrix = emptyMatrix();
  drawFunctionPatterns(matrix);
  drawData(matrix, interleaveCodewords(encodeData(text)));
  drawFormatBits(matrix);

  const quiet = 4;
  const viewSize = SIZE + quiet * 2;
  const path = [];

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      if (matrix.modules[y][x]) path.push(`M${x + quiet},${y + quiet}h1v1h-1z`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 ${viewSize} ${viewSize}" shape-rendering="crispEdges" role="img" aria-label="QR code"><title>${escapeXml(text)}</title><rect width="${viewSize}" height="${viewSize}" fill="#fff"/><path fill="#000" d="${path.join("")}"/></svg>\n`;
}
