import debug from 'debug'

const log = debug('checkup:check')

/**
 * @param {IpfsCheckClient} checker
 */
export function checkCid (checker) {
  return async function * checkCid (source) {
    // TODO: parallelise
    for await (const candidate of source) {
      log(`processing candidate ${candidate.sourceCid}`)
      try {
        const info = checker.check(candidate.sourceCid)
        yield info
      } catch (err) {
        log(`failed to checkup on ${candidate.sourceCid}`, err)
      }
    }
  }
}
