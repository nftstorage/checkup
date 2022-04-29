# Checkup

A tool to check up on data stored in dotStorage, ensuring it is available and retrievable. It continuously takes random samples of CIDs and exposes prometheus metrics on their availability.

## Usage

Drop a `.env` file in the project root and populate:

```sh
DATABASE_CONNECTION=<value>
IPFS_CHECK_API_URL=<value>
CLUSTER_API_URL=<value>
CLUSTER_BASIC_AUTH_TOKEN=<value>
CLUSTER_STATUS_BATCH_SIZE=120 # optional, default (and maximum) shown
PORT=3000 # optional, default shown
PROM_NAMESPACE=checkup # optional, default shown
SAMPLE_METHOD=universal # optional, default shown, also randomid (nft.storage only)
ELASTIC_PROVIDER_ADDR=/p2p/Qm... # optional, if set, CIDs will be checked on elastic provider also (assumed ALL CIDs are available here)
```

Replace the following values as specified:

* `DATABASE_CONNECTION` with the connection string for the database you want read from.
* `IPFS_CHECK_URL` with an [ipfs-check](https://github.com/aschmahmann/ipfs-check) backend API URL.
* `CLUSTER_API_URL` with the base URL of the Cluster API.
* `CLUSTER_BASIC_AUTH_TOKEN` with the base64 encoded basic auth token for the Cluster API.

Start the checker:

```sh
npm start
```

Metrics for reports are available at `http://localhost:3000/metrics`

### Docker

There's a `Dockerfile` that runs the tool in docker.

```sh
docker build -t checkup .
docker run -d checkup
```
