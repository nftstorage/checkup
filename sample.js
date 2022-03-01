/**
 * 8k max request length to cluster for statusAll, we hit this at around 126 CIDs
 * http://nginx.org/en/docs/http/ngx_http_core_module.html#large_client_header_buffers
 */
const MAX_CLUSTER_STATUS_CIDS = 120
const ESTIMATE_UPLOADS_SQL = 'SELECT reltuples::bigint AS estimate FROM pg_class WHERE relname = \'upload\''
const FETCH_UPLOAD_AT_OFFSET_SQL = 'SELECT source_cid FROM upload OFFSET $1 LIMIT 1'

/**
 * The maximum is exclusive and the minimum is inclusive.
 * @param {number} min
 * @param {number} max
 */
function randomInt (min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min) + min)
}

/**
 * @param {import('pg').Client} db
 */
async function estimateUploads (db) {
  const { rows } = await db.query(ESTIMATE_UPLOADS_SQL)
  if (!rows.length) throw new Error('no rows returned estimating uploads')
  return rows[0].estimate
}

/**
 * @param {import('pg').Client} db
 * @param {number} offset
 * @returns {{ source_cid }|undefined}
 */
async function fetchUploadAtOffset (db, offset) {
  const { rows } = await db.query(FETCH_UPLOAD_AT_OFFSET_SQL, [offset])
  if (!rows.length) return
  return rows[0]
}

/**
 * @param {import('pg').Client} db
 * @param {import('@nftstorage/ipfs-cluster').Cluster} cluster
 */
export function getSample (db, cluster) {
  return async function * () {
    while (true) {
      const count = await estimateUploads(db)
      const offsets = Array.from(Array(MAX_CLUSTER_STATUS_CIDS), () => randomInt(0, count))
      const uploads = await Promise.all(offsets.map(i => fetchUploadAtOffset(db, i)))
      const statuses = await cluster.statusAll({ cids: uploads.map(u => u.source_cid) })
    }
  }
}
