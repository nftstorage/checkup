import debug from 'debug'
import { randomBigInt } from './utils.js'

/** @typedef {{ cid: string }} Sample */

const log = debug('checkup:sample')

const MAX_ID_RANGE_AGE = 1000 * 60

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
export function getSample (db) {
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
