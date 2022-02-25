# Checkup

A tool to check up on data stored in dotStorage, ensuring it is available and retrievable. It continuously takes random samples of 1,000 CIDs and creates a report exposed as prometheus metrics. Each new report overwrites the last.

## Usage

Drop a `.env` file in the project root and populate:

```sh
DATABASE_CONNECTION=<value>
IPFS_CHECK_URL=<value>
PORT=3000 # optional, default shown
```

Replace `DATABASE_CONNECTION` with the connection string for the database you want read from. Replace `IPFS_CHECK_URL` with an [ipfs-check](https://github.com/aschmahmann/ipfs-check) backend API URL.

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
