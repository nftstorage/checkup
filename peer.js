import debug from 'debug'
import { CID } from 'multiformats'
import { randomInt } from './utils.js'

/**
 * @typedef {import('./sample').Sample} Sample
 * @typedef {Sample & { peer: string }} PeeredSample
 */

const log = debug('checkup:peer')

const CLUSTER_PEER = 'CLUSTER_PEER'
const ELASTIC_PROVIDER_PEER = 'ELASTIC_PROVIDER_PEER'

function randomPeerType () {
  return randomInt(0, 4) < 3 ? CLUSTER_PEER : ELASTIC_PROVIDER_PEER
}

/**
 * @param {import('@nftstorage/ipfs-cluster').Cluster} cluster
 * @param {import('./elastic-provider').ElasticProvider} [elasticProvider]
 */
export function selectPeer (cluster, elasticProvider) {
  /**
   * @param {AsyncIterable<Sample>} source
   * @returns {AsyncIterable<Sample|PeeredSample>}
   */
  return async function * (source) {
    for await (const sample of source) {
      const peerType = elasticProvider ? randomPeerType() : CLUSTER_PEER
      if (peerType === CLUSTER_PEER) {
        let status = await cluster.status(sample.cid)
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

        if (!eligiblePinInfos.length) {
          log(`⚠️ ${status.cid} no eligible pin statuses: ${pinInfos.map(i => i.status)}`)
          yield /** @type {Sample} */ ({ cid: status.cid })
          continue
        }

        const eligiblePeers = eligiblePinInfos.map(pi => `/p2p/${pi.ipfsPeerId}`)
        const index = randomInt(0, eligiblePeers.length)

        log(`sample ready: ${status.cid} @ ${eligiblePeers[index]} (${eligiblePinInfos[index].status})`)
        yield /** @type {PeeredSample} */ ({ cid: status.cid, peer: eligiblePeers[index] })
      } else if (peerType === ELASTIC_PROVIDER_PEER) {
        const hasCid = await elasticProvider.has(sample.cid)
        if (!hasCid) {
          log(`⚠️ ${sample.cid} not available on Elastic Provider`)
          yield /** @type {Sample} */ ({ cid: sample.cid })
          continue
        }
        log(`sample ready: ${sample.cid} @ ${elasticProvider.multiaddr} (found on S3)`)
        yield /** @type {PeeredSample} */ ({ cid: sample.cid, peer: elasticProvider.multiaddr })
      } else {
        throw new Error(`unknown peer type: ${peerType}`)
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
