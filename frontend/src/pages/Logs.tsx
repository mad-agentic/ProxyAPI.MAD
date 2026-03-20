import { useEffect, useMemo, useState } from "react"
import { Activity, Clock, CheckCircle2, XCircle, Info, RefreshCw } from "lucide-react"
import { clearLogs, fetchLogs } from "../api/client"

const PAGE_SIZE = 50

interface ParsedLog {
  id: string
  time: string
  status: number | null
  duration: string
  method: string
  path: string
  ip: string
  level: string
  raw: string
}

interface CollapsedLog extends ParsedLog {
  count: number
}

function parseLogLine(line: string, idx: number): ParsedLog {
  const regex = /(\d{3})\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(\w+)\s+"([^"]+)"/
  const matched = line.match(regex)
  const status = matched ? Number(matched[1]) : null
  const duration = matched ? matched[2].trim() : '-'
  const ip = matched ? matched[3].trim() : '-'
  const method = matched ? matched[4].trim() : '-'
  const path = matched ? matched[5].trim() : '-'

  const tsMatch = line.match(/^\[([^\]]+)\]/)
  const lvlMatch = line.match(/\[(info|error|warn|debug)\]/i)

  return {
    id: `log-${idx}`,
    time: tsMatch ? tsMatch[1] : '-',
    status,
    duration,
    method,
    path,
    ip,
    level: lvlMatch ? lvlMatch[1].toLowerCase() : 'info',
    raw: line,
  }
}

export function Logs() {
  const [filter, setFilter] = useState<'all' | 'errors'>('all')
  const [logs, setLogs] = useState<ParsedLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [clearing, setClearing] = useState(false)

  const loadLogs = async () => {
    setLoading(true)
    try {
      const data = await fetchLogs()
      const lines: string[] = Array.isArray(data?.lines) ? data.lines : []
      const parsed = lines.map((line, index) => parseLogLine(line, index)).reverse()
      setLogs(parsed)
      setPage(1)
      setError('')
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch logs')
      setLogs([])
      setPage(1)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const filteredLogs = useMemo(() => {
    if (filter === 'errors') {
      return logs.filter(l => (l.status !== null && l.status >= 400) || l.level === 'error')
    }
    return logs
  }, [logs, filter])

  const collapsedLogs = useMemo<CollapsedLog[]>(() => {
    const map = new Map<string, CollapsedLog>()
    for (const log of filteredLogs) {
      const key = `${log.status}|${log.method}|${log.path}|${log.ip}|${log.level}`
      const existing = map.get(key)
      if (existing) {
        existing.count += 1
      } else {
        map.set(key, { ...log, count: 1 })
      }
    }
    return Array.from(map.values())
  }, [filteredLogs])

  const totalPages = Math.max(1, Math.ceil(collapsedLogs.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedLogs = collapsedLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [filter])

  const handleClearLogs = async () => {
    if (clearing) return
    setClearing(true)
    try {
      await clearLogs()
      setLogs([])
      setPage(1)
      setError('')
    } catch (err: any) {
      setError(err?.message || 'Failed to clear logs')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Request Logs</h1>
          <p className="text-gray-400">Real-time monitoring of API requests passing through the proxy.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-800/60"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={handleClearLogs}
            disabled={clearing || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/10 disabled:opacity-50"
          >
            <span className={clearing ? 'animate-pulse' : ''}>Clear Logs</span>
          </button>
          <div className="flex bg-gray-800/60 rounded-xl p-1 border border-gray-700/50 gap-0.5">
            <button
              onClick={() => setFilter('all')}
              className={"px-4 py-1.5 text-sm rounded-lg transition-colors " + (filter === 'all' ? 'font-medium bg-gray-700/80 text-white shadow-sm' : 'font-medium text-gray-400 hover:text-gray-200 hover:bg-gray-700/40')}
            >
              All
            </button>
            <button
              onClick={() => setFilter('errors')}
              className={"px-4 py-1.5 text-sm rounded-lg transition-colors " + (filter === 'errors' ? 'font-medium bg-gray-700/80 text-white shadow-sm' : 'font-medium text-gray-400 hover:text-gray-200 hover:bg-gray-700/40')}
            >
              Errors
            </button>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-500/8 border border-blue-500/20 text-sm text-blue-300">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
        <span>
          {error
            ? `Live logs unavailable: ${error}. Enable logging-to-file and ensure backend is running.`
            : 'Showing live log lines from management /logs endpoint.'}
        </span>
      </div>

      <div className="rounded-2xl bg-gray-800/40 border border-gray-700/50 backdrop-blur-sm overflow-hidden">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-gray-800/80 text-gray-400 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-medium">Timestamp</th>
              <th className="px-6 py-4 font-medium">Provider & Model</th>
              <th className="px-6 py-4 font-medium">Tokens</th>
              <th className="px-6 py-4 font-medium">Duration</th>
              <th className="px-6 py-4 font-medium text-right">Status</th>
              <th className="px-6 py-4 font-medium text-right">Count</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {!loading && pagedLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-700/20 transition-colors cursor-pointer group">
                <td className="px-6 py-4 text-gray-400 whitespace-nowrap">
                  {log.time}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-200">{log.method}</span>
                    <span className="text-gray-500 text-xs px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700">
                      {log.path}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-blue-400 text-xs">
                    <span>{log.ip}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-gray-400 group-hover:text-gray-300">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{log.duration}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  {log.status !== null && log.status < 400 ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-400">
                      HTTP {log.status}
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-red-400">
                      {log.status !== null ? `HTTP ${log.status}` : log.level.toUpperCase()}
                      <XCircle className="w-4 h-4" />
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-700/60 text-gray-200">
                    x{log.count}
                  </span>
                </td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">Loading logs...</td>
              </tr>
            )}
            {!loading && filteredLogs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No logs found for current filter.</td>
              </tr>
            )}
          </tbody>
        </table>
        
        <div className="p-4 border-t border-gray-700/50 flex items-center justify-between text-sm text-gray-500 bg-gray-800/20">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span>{loading ? 'Loading...' : 'Live logs loaded'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>
              {collapsedLogs.length === 0
                ? 'Showing 0 entries'
                : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, collapsedLogs.length)} of ${collapsedLogs.length}`}
            </span>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading}
              className="px-2 py-1 rounded border border-gray-700 text-gray-300 disabled:opacity-40"
            >
              Prev
            </button>
            <span>Page {currentPage}/{totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loading}
              className="px-2 py-1 rounded border border-gray-700 text-gray-300 disabled:opacity-40"
            >
              Next
            </button>
            <span className="text-xs text-gray-500">(Collapsed {filteredLogs.length} lines → {collapsedLogs.length} unique)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
