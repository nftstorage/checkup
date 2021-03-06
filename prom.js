import * as Prom from 'prom-client'

/**
 * @typedef {{
 *   samplesTotal: Prom.Counter<'peer'>
 *   connectionErrorsTotal: Prom.Counter<'peer'>
 *   dhtProviderRecordsTotal: Prom.Counter<'peer'|'found'>
 *   bitswapRequestsTotal: Prom.Counter<'peer'|'responded'|'found'>
 *   bitswapRequestDurationSeconds: Prom.Counter<'peer'|'responded'|'found'>
 * }} Metrics
 */

export function createRegistry (ns = 'checkup') {
  const registry = new Prom.Registry()
  return {
    registry,
    metrics: {
      samplesTotal: new Prom.Counter({
        name: `${ns}_samples_total`,
        help: 'Number of random samples taken by peer ID.',
        labelNames: ['peer'],
        registers: [registry]
      }),
      connectionErrorsTotal: new Prom.Counter({
        name: `${ns}_connection_errors_total`,
        help: 'Number of samples taken where we were not able to connect to the target peer.',
        labelNames: ['peer'],
        registers: [registry]
      }),
      dhtProviderRecordsTotal: new Prom.Counter({
        name: `${ns}_dht_provider_records_total`,
        help: 'Provider records found or not found for a CID for the given peer.',
        labelNames: ['peer', 'found'],
        registers: [registry]
      }),
      bitswapRequestsTotal: new Prom.Counter({
        name: `${ns}_bitswap_requests_total`,
        help: 'Number of bitswap HAVE messages sent to a peer in order to check the peer HAS the sample CID.',
        labelNames: ['peer', 'responded', 'found'],
        registers: [registry]
      }),
      bitswapRequestDurationSeconds: new Prom.Counter({
        name: `${ns}_bitswap_request_duration_seconds`,
        help: 'Time taken to check the peer HAS the sample CID over bitswap.',
        labelNames: ['peer', 'responded', 'found'],
        registers: [registry]
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
      const peerId = peer ? peer.split('/p2p/')[1] : 'unknown'
      metrics.samplesTotal.inc({ peer: peerId })

      if (peer) {
        metrics.dhtProviderRecordsTotal.inc({ peer: peerId, found: result.CidInDHT })

        if (result.ConnectionError) {
          metrics.connectionErrorsTotal.inc({ peer: peerId })
        } else {
          const { Responded: responded, Found: found } = result.DataAvailableOverBitswap
          metrics.bitswapRequestsTotal.inc({ peer: peerId, responded, found })
          metrics.bitswapRequestDurationSeconds.inc(
            { peer: peerId, responded, found },
            result.DataAvailableOverBitswap.Duration / 1e+9
          )
        }
      }

      yield sample
    }
  }
}
