import http from 'http'
import { pipe } from 'it-pipe'
import debug from 'debug'
import pg from 'pg'
import { Cluster } from '@nftstorage/ipfs-cluster'
import fetch from '@web-std/fetch'
import { IpfsCheckClient } from './ipfs-check-client.js'
import { getSample } from './sample.js'
import { selectPeer } from './peer.js'
import { checkCid } from './check.js'
import { createRegistry, recordMetrics } from './prom.js'

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

  log('creating Prometheus metrics registry...')
  const { metrics, registry } = createRegistry(process.env.PROM_NAMESPACE)

  log('creating HTTP server...')
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`)
    if (url.pathname === '/metrics') {
      res.write(await registry.metrics())
    } else {
      res.statusCode = 404
      res.write('not found')
    }
    res.end()
  })
  server.listen(port, () => log(`server listening on: http://localhost:${port}`))

  try {
    await pipe(
      getSample(db),
      selectPeer(cluster),
      checkCid(ipfsChecker),
      recordMetrics(metrics),
      logResult
    )
  } finally {
    try {
      log('closing DB connection...')
      await db.end()
    } catch (err) {
      log('failed to close DB connection:', err)
    }
    log('closing HTTP server...')
    server.close()
  }
}

/**
 * @param {AsyncIterable<import('./sample').Sample|import('./check').CheckedSample>} source
 */
async function logResult (source) {
  for await (const { cid, peer, result } of source) {
    const isOk = peer &&
      !result.ConnectionError &&
      result.CidInDHT &&
      result.DataAvailableOverBitswap.Responded &&
      result.DataAvailableOverBitswap.Found
    log(`${isOk ? '✅' : '❌'} ${cid} @ ${peer || 'unknown'}`)
    if (peer) {
      if (result.ConnectionError) {
        log(`\t🔴 Connect success (${result.ConnectionError})`)
      } else {
        log('\t🟢 Connect success')
      }
      log(`\t${result.CidInDHT ? '🟢' : '🔴'} DHT provider record found`)
      if (!result.ConnectionError) {
        log(`\t${result.DataAvailableOverBitswap.Responded ? '🟢' : '🔴'} Bitswap responded`)
        log(`\t${result.DataAvailableOverBitswap.Found ? '🟢' : '🔴'} Bitswap found`)
      }
    }
  }
}
