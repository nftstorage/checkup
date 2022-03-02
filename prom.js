import http from 'http'
import * as Prom from 'prom-client'

export function create (ns = 'checkup') {
  return {
    server: http.createServer(async (_, res) => {
      res.write(await Prom.register.metrics())
      res.end()
    }),
    metrics: {
      samplesTotal: new Prom.Counter({
        name: `${ns}_samples_total`,
        help: 'Number of random samples taken by peer ID.',
        labelNames: ['peer']
      }),
      connectionErrorsTotal: new Prom.Counter({
        name: `${ns}_connection_errors_total`,
        help: 'Number of samples taken where we were not able to connect to the target peer.',
        labelNames: ['peer']
      }),
      dhtProviderRecordsTotal: new Prom.Counter({
        name: `${ns}_dht_provider_records_total`,
        help: 'Provider records found or not found by peer ID.',
        labelNames: ['peer', 'found']
      }),
      bitswapHaveDurationSeconds: new Prom.Counter({
        name: `${ns}_bitswap_have_duration_seconds`,
        help: 'Time taken to check the peer HAS the sample CID over bitswap by peer ID.',
        labelNames: ['peer', 'responded', 'found']
      })
    }
  }
}
