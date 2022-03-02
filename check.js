import debug from 'debug'

const log = debug('checkup:check')

/**
 * @param {import('./ipfs-check-client').IpfsCheckClient} checker
 */
export function checkCid (checker) {
  /**
   * @param {ReturnType<ReturnType<import('./sample').getSample>>} source
   */
  return async function * (source) {
    // TODO: parallelise
    for await (const sample of source) {
      log(`checking sample ${sample.cid} @ ${sample.peer}`)
      try {
        const result = await checker.check(sample.cid, `/p2p/${sample.peer}`)
        yield { cid: sample.cid, peer: sample.peer, result }
      } catch (err) {
        log(`failed to checkup on: ${sample.cid}`, err)
      }
    }
  }
}
