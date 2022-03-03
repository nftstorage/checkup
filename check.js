import debug from 'debug'

/**
 * @typedef {import('./sample').Sample} Sample
 * @typedef {import('./peer').PeeredSample} PeeredSample
 * @typedef {import('./ipfs-check-client').IpfsCheckResult} IpfsCheckResult
 * @typedef {{ result: IpfsCheckResult } & PeeredSample} CheckedSample
 */

const log = debug('checkup:check')

/**
 * @param {import('./ipfs-check-client').IpfsCheckClient} checker
 */
export function checkCid (checker) {
  /**
   * @param {AsyncIterable<Sample|PeeredSample>} source
   * @returns {AsyncIterable<Sample|CheckedSample>}
   */
  return async function * (source) {
    for await (const sample of source) {
      // we can only check samples that have peers
      if (!sample.peer) {
        yield sample
        continue
      }
      log(`checking sample ${sample.cid} @ ${sample.peer}`)
      try {
        const result = await checker.check(sample.cid, `/p2p/${sample.peer}`)
        yield /** @type {CheckedSample} */ ({ ...sample, result })
      } catch (err) {
        log(`failed to checkup on: ${sample.cid}`, err)
      }
    }
  }
}
