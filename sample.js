import debug from 'debug'
import { randomInt, randomBigInt, sleep } from './utils.js'

/** @typedef {{ cid: string, peer: string }} Sample */

const log = debug('checkup:sample')
/**
 * 8k max request length to cluster for statusAll, we hit this at around 126 CIDs
 * http://nginx.org/en/docs/http/ngx_http_core_module.html#large_client_header_buffers
 */
const MAX_CLUSTER_STATUS_CIDS = 120

/**
 * @param {import('pg').Client} db
 */
async function fetchMinMaxUploadId (db) {
  const { rows } = await db.query('SELECT MIN(id), MAX(id) FROM upload')
  if (!rows.length) throw new Error('no rows returned fetching min/max ID')
  return { min: BigInt(rows[0].min), max: BigInt(rows[0].max) }
}

/**
 * @param {import('pg').Client} db
 * @param {bigint} id
 * @returns {{ source_cid: string }|undefined}
 */
async function fetchUploadById (db, id) {
  const { rows } = await db.query('SELECT source_cid FROM upload WHERE id = $1', [id.toString()])
  if (!rows.length) return
  log(`fetched upload ${id}: ${rows[0].source_cid}`)
  return rows[0]
}

/**
 * @param {import('pg').Client} db
 * @param {import('@nftstorage/ipfs-cluster').Cluster} cluster
 */
export function getSample (db, cluster) {
  return async function * () {
    while (true) {
      const { min, max } = await fetchMinMaxUploadId(db)
      log(`taking samples between IDs ${min} -> ${max}`)
      const ids = Array.from(Array(MAX_CLUSTER_STATUS_CIDS), () => randomBigInt(min, max + 1n))
      const uploads = (await Promise.all(ids.map(id => fetchUploadById(db, id)))).filter(Boolean)

      if (!uploads.length) {
        log('⚠️ no uploads')
        await sleep(5000)
        continue
      }

      log(`retrieving cluster pin statuses for ${uploads.length} CIDs`)
      const statuses = await cluster.statusAll({ cids: uploads.map(u => u.source_cid) })

      for (const status of statuses) {
        const pinInfos = Object.values(status.peerMap)
        if (pinInfos.every(e => e.status === 'unpinned')) {
          log(`⚠️ ${status.cid} is not pinned on ANY peer!`)
          continue
        }

        // pin information where:
        // status != remote (pinned on another peer in the cluster)
        // status != pin_queued (may not be available on this peer yet)
        const eligiblePinInfos = pinInfos
          .filter(info => info.status !== 'remote')
          .filter(info => info.status !== 'pin_queued')

        const pinInfo = eligiblePinInfos[randomInt(0, eligiblePinInfos.length)]
        if (!pinInfo) {
          log(`⚠️ ${status.cid} no eligible pin statuses`)
          continue
        }

        log(`sample ready: ${status.cid} @ ${pinInfo.ipfsPeerId} (${pinInfo.status})`)
        yield /** @type {Sample} */ ({ cid: status.cid, peer: pinInfo.ipfsPeerId })
      }
    }
  }
}
