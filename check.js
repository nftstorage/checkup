import debug from 'debug'

/**
 * @typedef {import('./sample').Sample} Sample
 * @typedef {import('./ipfs-check-client').IpfsCheckResult} IpfsCheckResult
 * @typedef {{ result: IpfsCheckResult } & Sample} CheckedSample
 */

const log = debug('checkup:check')

/**
 * @param {import('./ipfs-check-client').IpfsCheckClient} checker
 */
export function checkCid (checker) {
  /**
   * @param {AsyncIterable<Sample>} source
   */
  return async function * (source) {
    for await (const sample of source) {
      log(`checking sample ${sample.cid} @ ${sample.peer}`)
      try {
        const result = await checker.check(sample.cid, `/p2p/${sample.peer}`)
        /** @type {CheckedSample} */
        const checkedSample = { ...sample, result }
        yield checkedSample
      } catch (err) {
        log(`failed to checkup on: ${sample.cid}`, err)
      }
    }
  }
}
