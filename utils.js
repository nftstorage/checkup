/**
 * The maximum is exclusive and the minimum is inclusive.
 * @param {number} min
 * @param {number} max
 */
export function randomInt (min, max) {
  return Math.floor(Math.random() * (max - min) + min)
}

/**
 * The maximum is exclusive and the minimum is inclusive.
 * @param {bigint} min
 * @param {bigint} max
 */
export function randomBigInt (min, max) {
  const range = max - min
  let rand = 0n
  let digits = range.toString().length / 9 + 2 | 0
  while (digits--) {
    rand *= 1000000000n
    rand += BigInt(Math.random() * 1000000000 | 0)
  }
  return min + (rand % range)
}

/**
 * @param {number} ms
 */
export function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
