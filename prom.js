import http from 'http'

export function createServer (getReport) {
  return http.createServer((_, res) => {
    const report = getReport()
    if (report) {
      res.write(formatReport(report))
    } else {
      res.statusCode = 404
    }
    res.end()
  })
}

function formatReport (report) {
  return ''
}
