// A small QR code encoder (ISO/IEC 18004: byte mode, error correction level M, versions 1–10, which
// fits up to 213 bytes). Enough for an authenticator link (otpauth://…) in the two-step setup. In
// EzyCourse the server sends the QR for the account's secret; this draws the same thing in the demo.
// Based on the public algorithm as described by Project Nayuki's QR Code generator.

// Error correction level M, versions 1–10: codewords per block and number of blocks.
const ECC_PER_BLOCK = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26]
const NUM_BLOCKS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5]
const FORMAT_ECL_M = 0

function rawDataModules(ver) {
  let result = (16 * ver + 128) * ver + 64
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2
    result -= (25 * numAlign - 10) * numAlign - 55
    if (ver >= 7) result -= 36
  }
  return result
}
const dataCodewords = (ver) => Math.floor(rawDataModules(ver) / 8) - ECC_PER_BLOCK[ver] * NUM_BLOCKS[ver]

// Galois field GF(2^8) with the QR polynomial 0x11D.
function gfMul(x, y) {
  let z = 0
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d)
    z ^= ((y >>> i) & 1) * x
  }
  return z & 0xff
}
function rsDivisor(degree) {
  const result = new Array(degree).fill(0)
  result[degree - 1] = 1
  let root = 1
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMul(result[j], root)
      if (j + 1 < result.length) result[j] ^= result[j + 1]
    }
    root = gfMul(root, 0x02)
  }
  return result
}
function rsRemainder(data, divisor) {
  const result = divisor.map(() => 0)
  for (const b of data) {
    const factor = b ^ result.shift()
    result.push(0)
    divisor.forEach((coef, i) => { result[i] ^= gfMul(coef, factor) })
  }
  return result
}

function alignmentPositions(ver, size) {
  if (ver === 1) return []
  const numAlign = Math.floor(ver / 7) + 2
  const step = Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2
  const result = [6]
  for (let pos = size - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos)
  return result
}

const MASKS = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
]

// The QR modules for a text: a size × size grid of booleans (true = dark), or null if too long.
export function qrMatrix(text) {
  const bytes = Array.from(new TextEncoder().encode(text))
  let ver = 1
  for (; ver <= 10; ver++) if (4 + (ver <= 9 ? 8 : 16) + bytes.length * 8 <= dataCodewords(ver) * 8) break
  if (ver > 10) return null
  const size = ver * 4 + 17

  // Data bits: byte mode, length, data, terminator, padding.
  const bits = []
  const append = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1) }
  append(0b0100, 4)
  append(bytes.length, ver <= 9 ? 8 : 16)
  bytes.forEach((b) => append(b, 8))
  const capacity = dataCodewords(ver) * 8
  append(0, Math.min(4, capacity - bits.length))
  append(0, (8 - (bits.length % 8)) % 8)
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) append(pad, 8)
  const data = []
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((n, b) => (n << 1) | b, 0))

  // Split into blocks, add Reed–Solomon error correction, interleave.
  const numBlocks = NUM_BLOCKS[ver]
  const eccLen = ECC_PER_BLOCK[ver]
  const rawCodewords = Math.floor(rawDataModules(ver) / 8)
  const numShort = numBlocks - (rawCodewords % numBlocks)
  const shortLen = Math.floor(rawCodewords / numBlocks)
  const divisor = rsDivisor(eccLen)
  const blocks = []
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dat = data.slice(k, k + shortLen - eccLen + (i < numShort ? 0 : 1))
    k += dat.length
    const ecc = rsRemainder(dat, divisor)
    if (i < numShort) dat.push(0)
    blocks.push(dat.concat(ecc))
  }
  const codewords = []
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((block, j) => { if (i !== shortLen - eccLen || j >= numShort) codewords.push(block[i]) })
  }

  // Function patterns.
  const modules = Array.from({ length: size }, () => new Array(size).fill(false))
  const isFunction = Array.from({ length: size }, () => new Array(size).fill(false))
  const set = (x, y, dark) => { modules[y][x] = dark; isFunction[y][x] = true }
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0) }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy))
        const x = cx + dx
        const y = cy + dy
        if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, dist !== 2 && dist !== 4)
      }
    }
  }
  const align = alignmentPositions(ver, size)
  const last = align.length - 1
  align.forEach((ax, i) => align.forEach((ay, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
  }))
  const drawFormat = (mask) => {
    const val = (FORMAT_ECL_M << 3) | mask
    let rem = val
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
    const fbits = ((val << 10) | rem) ^ 0x5412
    const bit = (i) => ((fbits >>> i) & 1) === 1
    for (let i = 0; i <= 5; i++) set(8, i, bit(i))
    set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8))
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i))
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i))
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i))
    set(8, size - 8, true)
  }
  drawFormat(0) // reserve the format areas
  if (ver >= 7) {
    let rem = ver
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
    const vbits = (ver << 12) | rem
    for (let i = 0; i < 18; i++) {
      const dark = ((vbits >>> i) & 1) === 1
      const a = size - 11 + (i % 3)
      const b = Math.floor(i / 3)
      set(a, b, dark); set(b, a, dark)
    }
  }

  // Codewords, in the zigzag order.
  let i = 0
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j
        const upward = ((right + 1) & 2) === 0
        const y = upward ? size - 1 - vert : vert
        if (!isFunction[y][x] && i < codewords.length * 8) {
          modules[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) === 1
          i++
        }
      }
    }
  }

  // Pick the mask with the lowest penalty (runs, 2×2 blocks and balance).
  const penalty = (m) => {
    let score = 0
    for (let y = 0; y < size; y++) {
      for (const line of [m[y], m.map((row) => row[y])]) {
        let run = 1
        for (let x = 1; x <= size; x++) {
          if (x < size && line[x] === line[x - 1]) run++
          else { if (run >= 5) score += run - 2; run = 1 }
        }
      }
    }
    for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) {
      const c = m[y][x]
      if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) score += 3
    }
    const dark = m.reduce((n, row) => n + row.filter(Boolean).length, 0)
    score += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10
    return score
  }
  let best = null
  for (let mask = 0; mask < 8; mask++) {
    drawFormat(mask)
    const m = modules.map((row, y) => row.map((v, x) => (isFunction[y][x] ? v : v !== MASKS[mask](x, y))))
    const p = penalty(m)
    if (!best || p < best.p) best = { p, m }
  }
  return best.m
}

// An SVG path ("M x y h1 v1 h-1 z …") of the dark modules, with a 4-module quiet zone.
export function qrPath(matrix) {
  let d = ''
  matrix.forEach((row, y) => row.forEach((dark, x) => { if (dark) d += `M${x + 4} ${y + 4}h1v1h-1z` }))
  return { d, size: matrix.length + 8 }
}
