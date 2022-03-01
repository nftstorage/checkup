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
 * }} Output
 */

export class IpfsCheckClient {
  /**
   * @param {string} endpoint 
   */
  constructor (endpoint) {
    this.endpoint = endpoint
  }

  async check (cid, multiaddr) {
    const url = new URL(this.endpoint)
    url.searchParams.set('cid', String(cid))
    url.searchParams.set('multiaddr', String(multiaddr))
    const res = await fetch(url, { method: 'POST' })
    if (!res.ok) {
      throw new Error(`failed to check ${cid} @ ${multiaddr}: ${await res.text()}`)
    }
    /** @type {Output} */
    const out = await res.json()
    return out
  }
}