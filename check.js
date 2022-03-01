import debug from 'debug'

const log = debug('checkup:check')

/**
 * @param {import('./ipfs-check-client').IpfsCheckClient} checker
 */
export function checkCid (checker) {
  return async function * checkCid (source) {
    // TODO: parallelise
    for await (const candidate of source) {
      log(`checking candidate ${candidate.sourceCid} @ ${candidate.peerId}`)
      try {
        const result = await checker.check(candidate.sourceCid, candidate.peerId)
        yield { cid: candidate.sourceCid, peerId: candidate.peerId, result }
      } catch (err) {
        log(`failed to checkup on: ${candidate.sourceCid}`, err)
      }
    }
  }
}
