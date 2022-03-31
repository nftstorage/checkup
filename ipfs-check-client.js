/* global AbortController */
import fetch from '@web-std/fetch'

/**
 * @typedef {{
 *   ConnectionError: string
 *   PeerFoundInDHT: Record<string, number>
 *   CidInDHT: boolean
 *   DataAvailableOverBitswap: {
 *     Duration: number
 *     Found: boolean
 *     Responded: boolean
 *     Error: string
 *   }
 * }} IpfsCheckResult
 */

const TIMEOUT = 30_000

export class IpfsCheckClient {
  /**
   * @param {string} endpoint
   * @param {{ timeout?: number }} [options]
   */
  constructor (endpoint, options) {
    this.endpoint = endpoint
    this._options = options || {}
  }

  /**
   * @param {string} cid
   * @param {string} multiaddr
   */
  async check (cid, multiaddr) {
    const url = new URL(this.endpoint)
    url.searchParams.set('cid', String(cid))
    url.searchParams.set('multiaddr', String(multiaddr))

    const controller = new AbortController()
    const timeoutMs = this._options.timeout || TIMEOUT
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(url, { method: 'POST', signal: controller.signal })
      if (!res.ok) {
        throw new Error(`failed to check ${cid} @ ${multiaddr}: ${await res.text()}`)
      }
      /** @type {IpfsCheckResult} */
      const out = await res.json()
      return out
    } finally {
      clearTimeout(timeoutId)
    }
  }
}
