import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

export class ElasticProvider {
  /**
   * @param {string} addr Multiaddr of the elastic provider IPFS node.
   * @param {{
   *   bucket: string
   *   region: string
   *   accessKeyId: string
   *   secretAccessKey: string
   * }} s3Config S3 config for the bucket that elastic provider uses.
   */
  constructor (addr, s3Config) {
    this._addr = addr
    this._s3 = new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey
      }
    })
    this._bucketName = s3Config.bucket
  }

  get multiaddr () {
    return this._addr
  }

  /**
   * Determine if the elastic provider has the passed root CID.
   * @param {import('multiformats').CID} cid
   */
  async has (cid) {
    const listObjects = async dir => {
      const command = new ListObjectsV2Command({
        Bucket: this._bucketName,
        Prefix: `${dir}/${cid}`,
        MaxKeys: 1
      })
      const response = await this._s3.send(command)
      return !!(response.Contents && response.Contents.length)
    }
    return await listObjects('raw') ? true : await listObjects('complete')
  }
}
