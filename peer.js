import debug from 'debug'
import batch from 'it-batch'
import { CID } from 'multiformats'
import { randomInt } from './utils.js'

/**
 * @typedef {import('./sample').Sample} Sample
 * @typedef {Sample & { peer: string }} PeeredSample
 */

const log = debug('checkup:peer')
/**
 * 8k max request length to cluster for statusAll, we hit this at around 126 CIDs
 * http://nginx.org/en/docs/http/ngx_http_core_module.html#large_client_header_buffers
 */
const MAX_CLUSTER_STATUS_CIDS = 120

/**
 * @param {import('@nftstorage/ipfs-cluster').Cluster} cluster
 */
export function selectPeer (cluster) {
  /**
   * @param {AsyncIterable<Sample>} source
   * @returns {AsyncIterable<Sample|PeeredSample>}
   */
  return async function * (source) {
    for await (const samples of batch(source, MAX_CLUSTER_STATUS_CIDS)) {
      log(`retrieving cluster pin statuses for ${samples.length} CIDs`)
      const statuses = await cluster.statusAll({ cids: samples.map(s => s.cid) })

      for (let status of statuses) {
        let pinInfos = Object.values(status.peerMap)
        if (pinInfos.every(e => e.status === 'unpinned')) {
          log(`⚠️ ${status.cid} is not pinned on ANY peer!`)
          let otherCid
          try {
            otherCid = toOtherCidVersion(status.cid)
          } catch {
            yield /** @type {Sample} */ ({ cid: status.cid })
            continue
          }

          log(`trying other CID version: ${otherCid}`)
          status = await cluster.status(otherCid)
          pinInfos = Object.values(status.peerMap)
          if (pinInfos.every(e => e.status === 'unpinned')) {
            log(`⚠️ ${otherCid} is not pinned on ANY peer!`)
            yield /** @type {Sample} */ ({ cid: status.cid })
            continue
          }
        }

        // pin information where:
        // status != remote (pinned on another peer in the cluster)
        // status != pin_queued (may not be available on this peer yet)
        const eligiblePinInfos = pinInfos
          .filter(i => i.status !== 'remote' && i.status !== 'pin_queued')

        const pinInfo = eligiblePinInfos[randomInt(0, eligiblePinInfos.length)]
        if (!pinInfo) {
          log(`⚠️ ${status.cid} no eligible pin statuses: ${pinInfos.map(i => i.status)}`)
          continue
        }

        log(`sample ready: ${status.cid} @ ${pinInfo.ipfsPeerId} (${pinInfo.status})`)
        yield /** @type {PeeredSample} */ ({ cid: status.cid, peer: pinInfo.ipfsPeerId })
      }
    }
  }
}

/**
 * @param {string} cidStr
 */
function toOtherCidVersion (cidStr) {
  const cid = CID.parse(cidStr)
  return String(cid.version === 0 ? cid.toV1() : cid.toV0())
}
