#!/usr/bin/env node

import dotenv from 'dotenv'
import { startCheckup } from './index.js'

dotenv.config()

startCheckup({
  dbConnString: mustGetEnv('DATABASE_CONNECTION'),
  ipfsCheckEndpoint: mustGetEnv('IPFS_CHECK_API_URL'),
  clusterEndpoint: mustGetEnv('CLUSTER_API_URL'),
  clusterBasicAuthToken: mustGetEnv('CLUSTER_BASIC_AUTH_TOKEN'),
  sampleMethod: process.env.SAMPLE_METHOD,
  port: process.env.PORT,
  elasticProvider: process.env.ELASTIC_PROVIDER_ADDR
    ? {
        multiaddr: mustGetEnv('ELASTIC_PROVIDER_ADDR'),
        s3Region: mustGetEnv('ELASTIC_PROVIDER_S3_REGION'),
        s3Bucket: mustGetEnv('ELASTIC_PROVIDER_S3_BUCKET'),
        s3AccessKeyId: mustGetEnv('ELASTIC_PROVIDER_S3_ACCESS_KEY_ID'),
        s3SecretAccessKey: mustGetEnv('ELASTIC_PROVIDER_S3_SECRET_ACCESS_KEY')
      }
    : undefined
})

/**
 * @param {string} name
 */
function mustGetEnv (name) {
  const value = process.env[name]
  if (!value) throw new Error(`missing ${name} environment variable`)
  return value
}
