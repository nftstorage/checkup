#!/usr/bin/env node

import dotenv from 'dotenv'
import { startCheckup } from './index.js'

dotenv.config()

startCheckup({
  dbConnString: mustGetEnv('DATABASE_CONNECTION'),
  ipfsCheckEndpoint: mustGetEnv('IPFS_CHECK_API_URL'),
  clusterEndpoint: mustGetEnv('CLUSTER_API_URL'),
  clusterBasicAuthToken: mustGetEnv('CLUSTER_BASIC_AUTH_TOKEN'),
  clusterStatusBatchSize: process.env.CLUSTER_STATUS_BATCH_SIZE && parseInt(process.env.CLUSTER_STATUS_BATCH_SIZE),
  sampleMethod: process.env.SAMPLE_METHOD,
  port: process.env.PORT,
  elasticProviderAddr: process.env.ELASTIC_PROVIDER_ADDR
})

/**
 * @param {string} name
 */
function mustGetEnv (name) {
  const value = process.env[name]
  if (!value) throw new Error(`missing ${name} environment variable`)
  return value
}
