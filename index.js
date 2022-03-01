import { pipe } from 'it-pipe'
import debug from 'debug'
import pg from 'pg'
import { IpfsCheckClient } from './ipfs-check-client.js'
import { getSample } from './sample.js'
import { checkCid } from './check.js'
import { create } from './prom.js'

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

  const { metrics, server } = create(process.env.PROM_NAMESPACE)
  server.listen(port)

  try {
    while (true) {
      await pipe(
        getSample(db),
        checkCid(ipfsChecker),
        async source => {
          for await (const data of source) {
            metrics.samplesTotal.inc({ peer: data.peerId })
            if (data.result.ConnectionError) {
              metrics.connectionErrorsTotal.inc({ peer: data.peerId })
            }
            metrics.dhtProviderRecordsTotal.inc({
              peer: data.peerId,
              found: data.result.CidInDHT
            })
            metrics.bitswapDurationSeconds.inc({
              peer: data.peerId,
              responded: data.result.DataAvailableOverBitswap.Responded,
              found: data.result.DataAvailableOverBitswap.Found
            }, data.result.DataAvailableOverBitswap.Duration / 1e+9)
          }
        }
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
