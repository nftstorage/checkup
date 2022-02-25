import pipe from 'it-pipe'
import debug from 'debug'
import pg from 'pg'
import { IpfsCheckClient } from './ipfs-check-client.js'
import { getCandidate } from './candidate.js'
import { checkCid } from './check.js'
import { generateReport } from './report.js'
import { createServer } from './prom.js'

const log = debug('checkup:index')
const INTERVAL = 1000 * 60 * 5

/**
 * @param {Object} config
 * @param {string} config.dbConnString dotStorage PostgreSQL connection string.
 * @param {string} config.ipfsCheckEndpoint IPFS Check backend API URL.
 * @param {number} [config.port] Port to run the metrics server on.
 */
export async function startCheckup ({
  dbConnString,
  ipfsCheckEndpoint,
  port = 3000
}) {
  log('connecting to PostgreSQL database...')
  const db = new pg.Client({ connectionString: dbConnString })
  await db.connect()

  log('creating IPFS check client...')
  const ipfsChecker = new IpfsCheckClient(ipfsCheckEndpoint)

  let report
  const server = createServer(() => report)
  server.listen(port)

  try {
    while (true) {
      report = await pipe(
        getCandidate(db),
        checkCid(ipfsChecker),
        generateReport
      )
      await new Promise(resolve => setTimeout(resolve, INTERVAL))
    }
  } finally {
    try {
      log('closing DB connection...')
      await db.end()
    } catch (err) {
      log('failed to close DB connection:', err)
    }
    server.close()
  }
}
