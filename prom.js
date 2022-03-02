import * as Prom from 'prom-client'

/**
 * @typedef {{
 *   samplesTotal: Prom.Counter
 *   connectionErrorsTotal: Prom.Counter
 *   dhtProviderRecordsTotal: Prom.Counter
 *   bitswapHaveDurationSeconds: Prom.Counter
 * }} Metrics
 */

export function createRegistry (ns = 'checkup') {
  return {
    registry: Prom.register,
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

/**
 * @param {Metrics} metrics
 */
export function recordMetrics (metrics) {
  /**
   * @param {AsyncIterable<import('./check').CheckedSample>} source
   */
  return async function * (source) {
    for await (const sample of source) {
      const { peer, result } = sample

      metrics.samplesTotal.inc({ peer })
      metrics.dhtProviderRecordsTotal.inc({ peer, found: result.CidInDHT })

      if (result.ConnectionError) {
        metrics.connectionErrorsTotal.inc({ peer })
      } else {
        metrics.bitswapHaveDurationSeconds.inc({
          peer,
          responded: result.DataAvailableOverBitswap.Responded,
          found: result.DataAvailableOverBitswap.Found
        }, result.DataAvailableOverBitswap.Duration / 1e+9)
      }

      yield sample
    }
  }
}
