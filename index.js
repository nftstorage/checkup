import { pipe } from 'it-pipe'
import debug from 'debug'
import pg from 'pg'
import { Cluster } from '@nftstorage/ipfs-cluster'
import fetch from '@web-std/fetch'
import { IpfsCheckClient } from './ipfs-check-client.js'
import { getSample } from './sample.js'
import { checkCid } from './check.js'
import { create } from './prom.js'

globalThis.fetch = fetch

const log = debug('checkup:index')

/**
 * @param {Object} config
 * @param {string} config.dbConnString dotStorage PostgreSQL connection string.
 * @param {string} config.ipfsCheckEndpoint IPFS Check backend API URL.
 * @param {string} config.clusterEndpoint IPFS Cluster API URL.
 * @param {string} config.clusterBasicAuthToken IPFS Cluster basic auth token.
 * @param {number} [config.port] Port to run the metrics server on.
 */
export async function startCheckup ({
  dbConnString,
  ipfsCheckEndpoint,
  clusterEndpoint,
  clusterBasicAuthToken,
  port = 3000
}) {
  log('connecting to PostgreSQL database...')
  const db = new pg.Client({ connectionString: dbConnString })
  await db.connect()

  log('creating IPFS Cluster client...')
  const cluster = new Cluster(clusterEndpoint, { headers: { Authorization: `Basic ${clusterBasicAuthToken}` } })

  log('creating IPFS Check client...')
  const ipfsChecker = new IpfsCheckClient(ipfsCheckEndpoint)

  log('creating Prometheus metrics server...')
  const { metrics, server } = create(process.env.PROM_NAMESPACE)
  server.listen(port)

  try {
    await pipe(
      getSample(db, cluster),
      checkCid(ipfsChecker),
      async source => {
        for await (const data of source) {
          metrics.samplesTotal.inc({ peer: data.peer })
          if (data.result.ConnectionError) {
            metrics.connectionErrorsTotal.inc({ peer: data.peer })
          }
          metrics.dhtProviderRecordsTotal.inc({
            peer: data.peer,
            found: data.result.CidInDHT
          })
          metrics.bitswapHaveDurationSeconds.inc({
            peer: data.peer,
            responded: data.result.DataAvailableOverBitswap.Responded,
            found: data.result.DataAvailableOverBitswap.Found
          }, data.result.DataAvailableOverBitswap.Duration / 1e+9)

          if (
            !data.result.ConnectionError &&
            data.result.CidInDHT &&
            data.result.DataAvailableOverBitswap.Responded &&
            data.result.DataAvailableOverBitswap.Found
          ) {
            log(`✅ ${data.cid} @ ${data.peer}`)
          } else {
            log(`❌ ${data.cid} @ ${data.peer}`)
            log(`\t${data.result.ConnectionError ? '🔴' : '🟢'} Connected`)
            log(`\t${data.result.CidInDHT ? '🟢' : '🔴'} DHT provider record`)
            log(`\t${data.result.DataAvailableOverBitswap.Responded ? '🟢' : '🔴'} Bitswap responded`)
            log(`\t${data.result.DataAvailableOverBitswap.Found ? '🟢' : '🔴'} Bitswap found`)
          }
        }
      }
    )
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
