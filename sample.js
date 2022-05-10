import debug from 'debug'
import { randomBigInt } from './utils.js'

/** @typedef {{ cid: string }} Sample */

const log = debug('checkup:sample')

const MAX_ID_RANGE_AGE = 1000 * 60
/**
 * Maximum number of uploads to fetch when sampling from a random offset.
 */
const MAX_UPLOADS_AT_OFFSET = 5

/**
 * @param {import('pg').Client} db
 */
async function fetchUploadIdRange (db) {
  const { rows } = await db.query('SELECT MIN(id), MAX(id) FROM upload')
  if (!rows.length) throw new Error('no rows returned fetching min/max ID')
  return { min: BigInt(rows[0].min), max: BigInt(rows[0].max) }
}

/**
 * @param {import('pg').Client} db
 * @param {bigint} id
 * @returns {Promise<{ source_cid: string }|undefined>}
 */
async function fetchUploadById (db, id) {
  const { rows } = await db.query('SELECT source_cid FROM upload WHERE id = $1', [id.toString()])
  if (!rows.length) return
  log(`fetched upload ${id}: ${rows[0].source_cid}`)
  return rows[0]
}

/**
 * @param {import('pg').Client} db
 */
export function getSampleRandomId (db) {
  return async function * () {
    let min, max
    let lastIdRangeUpdate = -MAX_ID_RANGE_AGE
    while (true) {
      if (Date.now() > lastIdRangeUpdate + MAX_ID_RANGE_AGE) {
        ;({ min, max } = await fetchUploadIdRange(db))
        lastIdRangeUpdate = Date.now()
        log(`taking sample between IDs ${min} -> ${max}`)
      }
      const upload = await fetchUploadById(db, randomBigInt(min, max + 1n))
      if (!upload) continue
      log(`sample ready: ${upload.source_cid}`)
      yield /** @type {Sample} */ ({ cid: upload.source_cid })
    }
  }
}

/**
 * @param {import('pg').Client} db
 */
async function estimateUploads (db) {
  const { rows } = await db.query('SELECT reltuples::bigint AS estimate FROM pg_class WHERE relname = \'upload\'')
  if (!rows.length) throw new Error('no rows returned estimating uploads')
  return BigInt(rows[0].estimate)
}

/**
 * @param {bigint} offset
 * @param {number} limit
 * @returns {{ source_cid: string }|undefined}
 */
async function fetchUploads (db, offset, limit) {
  const { rows } = await db.query('SELECT source_cid FROM upload OFFSET $1 LIMIT $2', [offset.toString(), limit])
  rows.forEach((r, i) => log(`fetched upload at offset ${offset} + ${i}: ${r.source_cid}`))
  return rows
}

export function getSample (db) {
  return async function * () {
    while (true) {
      const count = await estimateUploads(db)
      const uploads = await fetchUploads(db, randomBigInt(1n, count), MAX_UPLOADS_AT_OFFSET)
      for (const upload of uploads) {
        log(`sample ready: ${upload.source_cid}`)
        yield /** @type {Sample} */ ({ cid: upload.source_cid })
      }
    }
  }
}
