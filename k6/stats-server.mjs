/**
 * Tiny HTTP server that samples Docker stats for the load-test Compose stack.
 * k6 polls GET /stats and records CPU / RAM as custom metrics.
 */
import http from 'node:http'
import { URL } from 'node:url'

const SOCKET = process.env.DOCKER_SOCKET || '/var/run/docker.sock'
const PORT = Number(process.env.STATS_PORT || 9123)
const PROJECT = process.env.COMPOSE_PROJECT_NAME || 'survey-builder-load'
const TARGET_SERVICES = new Set(
  (process.env.STATS_SERVICES || 'postgres,api,web').split(',').map((s) => s.trim()).filter(Boolean),
)
const CPU_BUDGET = Number(process.env.APP_CPU_BUDGET || 2)
const MEM_BUDGET_BYTES = Number(process.env.APP_MEM_BUDGET_BYTES || 4 * 1024 * 1024 * 1024)

function dockerRequest(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      socketPath: SOCKET,
      path,
      method: 'GET',
    }, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8')
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Docker API ${res.statusCode} ${path}: ${raw.slice(0, 200)}`))
          return
        }
        try {
          resolve(raw ? JSON.parse(raw) : null)
        } catch {
          reject(new Error(`Docker API returned non-JSON for ${path}`))
        }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

function cpuPercent(stats) {
  const cpuDelta = (stats.cpu_stats?.cpu_usage?.total_usage || 0)
    - (stats.precpu_stats?.cpu_usage?.total_usage || 0)
  const systemDelta = (stats.cpu_stats?.system_cpu_usage || 0)
    - (stats.precpu_stats?.system_cpu_usage || 0)
  let online = stats.cpu_stats?.online_cpus || 0
  if (!online) {
    online = stats.cpu_stats?.cpu_usage?.percpu_usage?.length || 0
  }
  if (systemDelta > 0 && cpuDelta > 0 && online > 0) {
    return (cpuDelta / systemDelta) * online * 100
  }
  return 0
}

function memoryUsage(stats) {
  const usage = stats.memory_stats?.usage || 0
  const cache = stats.memory_stats?.stats?.cache
    ?? stats.memory_stats?.stats?.inactive_file
    ?? 0
  return Math.max(0, usage - cache)
}

function memoryLimit(stats) {
  const limit = stats.memory_stats?.limit || 0
  if (!limit || limit > MEM_BUDGET_BYTES * 8) return 0
  return limit
}

async function collect() {
  const filters = encodeURIComponent(JSON.stringify({
    label: [`com.docker.compose.project=${PROJECT}`],
  }))
  const containers = await dockerRequest(`/containers/json?filters=${filters}`)
  const services = {}

  for (const container of containers || []) {
    const service = container.Labels?.['com.docker.compose.service']
    if (!TARGET_SERVICES.has(service)) continue
    const stats = await dockerRequest(`/containers/${container.Id}/stats?stream=false`)
    const memBytes = memoryUsage(stats)
    const memLimit = memoryLimit(stats)
    services[service] = {
      name: container.Names?.[0]?.replace(/^\//, '') || service,
      cpuPct: Number(cpuPercent(stats).toFixed(2)),
      memBytes,
      memMb: Number((memBytes / (1024 * 1024)).toFixed(1)),
      memLimitBytes: memLimit,
    }
  }

  const cpuPct = Object.values(services).reduce((sum, row) => sum + row.cpuPct, 0)
  const memBytes = Object.values(services).reduce((sum, row) => sum + row.memBytes, 0)
  const cpuBudgetPct = CPU_BUDGET > 0 ? (cpuPct / (CPU_BUDGET * 100)) * 100 : 0
  const memBudgetPct = MEM_BUDGET_BYTES > 0 ? (memBytes / MEM_BUDGET_BYTES) * 100 : 0

  return {
    ts: new Date().toISOString(),
    project: PROJECT,
    budget: { cpu: CPU_BUDGET, memBytes: MEM_BUDGET_BYTES },
    services,
    totals: {
      cpuPct: Number(cpuPct.toFixed(2)),
      cpuBudgetPct: Number(cpuBudgetPct.toFixed(2)),
      memBytes,
      memMb: Number((memBytes / (1024 * 1024)).toFixed(1)),
      memBudgetPct: Number(memBudgetPct.toFixed(2)),
    },
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`)
  const json = (status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(body))
  }

  if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/')) {
    json(200, { ok: true, service: 'load-stats' })
    return
  }

  if (req.method === 'GET' && url.pathname === '/stats') {
    try {
      json(200, await collect())
    } catch (err) {
      json(503, { ok: false, error: err.message })
    }
    return
  }

  json(404, { error: 'Not found' })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`load-stats listening on ${PORT} (project=${PROJECT})`)
})
