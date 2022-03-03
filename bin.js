#!/usr/bin/env node

import dotenv from 'dotenv'
import { startCheckup } from './index.js'

dotenv.config()

startCheckup({
  dbConnString: mustGetEnv('DATABASE_CONNECTION'),
  ipfsCheckEndpoint: mustGetEnv('IPFS_CHECK_API_URL'),
  clusterEndpoint: mustGetEnv('CLUSTER_API_URL'),
  clusterBasicAuthToken: mustGetEnv('CLUSTER_BASIC_AUTH_TOKEN'),
  port: process.env.PORT
})

/**
 * @param {string} name
 */
function mustGetEnv (name) {
  const value = process.env[name]
  if (!value) throw new Error(`missing ${name} environment variable`)
  return value
}
