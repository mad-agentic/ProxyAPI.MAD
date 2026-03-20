import { useEffect, useRef, useState } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { TrendingUp, CircleDollarSign, RefreshCw, Download, Upload } from 'lucide-react'
import { exportUsage, fetchConfig, fetchUsage, importUsage } from '../api/client'

type TimeRangeId = '1h' | '4h' | '12h' | '24h' | '7d' | '30d' | 'all'

interface UsageDetailRecord {
  modelName: string
  timestamp: number
  source: string
  failed: boolean
  inputTokens: number
  outputTokens: number
  reasoningTokens: number
  cachedTokens: number
  totalTokens: number
}

interface ModelUsageRow {
  name: string
  requests: number
  tokens: number
  inputTokens: number
  outputTokens: number
  cachedTokens: number
  chatRequests: number
  apiRequests: number
  cost: number
}

const RANGE_OPTIONS: Array<{ id: TimeRangeId; label: string }> = [
  { id: '1h', label: '1H' },
  { id: '4h', label: '4H' },
  { id: '12h', label: '12H' },
  { id: '24h', label: '24H' },
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: 'all', label: 'All' },
]

function formatCompact(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return value.toLocaleString()
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
}

function formatUpdated(ts: number | null): string {
  if (!ts) return 'Never'
  const diff = Date.now() - ts
  if (diff < 10000) return 'just now'
  if (diff < 60000) return `${Math.max(1, Math.floor(diff / 1000))}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return new Date(ts).toLocaleTimeString()
}

function rangeToMs(range: TimeRangeId): number | null {
  switch (range) {
    case '1h': return 60 * 60 * 1000
    case '4h': return 4 * 60 * 60 * 1000
    case '12h': return 12 * 60 * 60 * 1000
    case '24h': return 24 * 60 * 60 * 1000
    case '7d': return 7 * 24 * 60 * 60 * 1000
    case '30d': return 30 * 24 * 60 * 60 * 1000
    default: return null
  }
}

function getModelPricing(modelName: string): { input: number; output: number; cached: number } {
  const value = modelName.toLowerCase()
  if (value.includes('claude-opus')) return { input: 15, output: 75, cached: 1.5 }
  if (value.includes('claude-sonnet')) return { input: 3, output: 15, cached: 0.3 }
  if (value.includes('gpt-5-codex') || value.includes('gpt-5.1-codex')) return { input: 1.5, output: 6, cached: 0.15 }
  if (value.includes('gpt-5.3-codex')) return { input: 2, output: 8, cached: 0.2 }
  if (value.includes('gpt-5')) return { input: 1.25, output: 5, cached: 0.125 }
  if (value.includes('gemini')) return { input: 1.25, output: 5, cached: 0.125 }
  return { input: 1, output: 4, cached: 0.1 }
}

function estimateCost(detail: UsageDetailRecord): number {
  const pricing = getModelPricing(detail.modelName)
  return ((detail.inputTokens + detail.reasoningTokens) / 1000000) * pricing.input
    + (detail.outputTokens / 1000000) * pricing.output
    + (detail.cachedTokens / 1000000) * pricing.cached
}

function bucketStart(timestamp: number, range: TimeRangeId): number {
  const date = new Date(timestamp)
  if (range === '1h') {
    date.setMinutes(Math.floor(date.getMinutes() / 5) * 5, 0, 0)
    return date.getTime()
  }
  if (range === '4h') {
    date.setMinutes(Math.floor(date.getMinutes() / 30) * 30, 0, 0)
    return date.getTime()
  }
  if (range === '12h' || range === '24h') {
    date.setMinutes(0, 0, 0)
    return date.getTime()
  }
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function bucketLabel(timestamp: number, range: TimeRangeId): string {
  const date = new Date(timestamp)
  if (range === '1h' || range === '4h') {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  if (range === '12h' || range === '24h') {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [usageEnabled, setUsageEnabled] = useState<boolean | null>(null)
  const [range, setRange] = useState<TimeRangeId>('24h')
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement | null>(null)

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const [usageData, configData] = await Promise.all([fetchUsage(), fetchConfig()])
      setStats(usageData?.usage || usageData || null)
      setUsageEnabled(Boolean(configData?.['usage-statistics-enabled']))
      setUpdatedAt(Date.now())
      setError('')
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard statistics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const allDetails: UsageDetailRecord[] = []
  const fallbackModelMap = new Map<string, ModelUsageRow>()

  if (stats?.apis) {
    for (const apiSnap of Object.values(stats.apis) as any[]) {
      for (const [modelName, modelSnap] of Object.entries(apiSnap?.models || {})) {
        const modelKey = String(modelName)
        const existing = fallbackModelMap.get(modelKey) || {
          name: modelKey,
          requests: 0,
          tokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          cachedTokens: 0,
          chatRequests: 0,
          apiRequests: 0,
          cost: 0,
        }

        existing.requests += Number((modelSnap as any)?.total_requests || 0)
        existing.tokens += Number((modelSnap as any)?.total_tokens || 0)

        const details = Array.isArray((modelSnap as any)?.details) ? (modelSnap as any).details : []
        for (const detail of details) {
          const timestamp = new Date(detail?.timestamp || 0).getTime()
          const record: UsageDetailRecord = {
            modelName: modelKey,
            timestamp,
            source: String(detail?.source || 'api'),
            failed: Boolean(detail?.failed),
            inputTokens: Number(detail?.tokens?.input_tokens || 0),
            outputTokens: Number(detail?.tokens?.output_tokens || 0),
            reasoningTokens: Number(detail?.tokens?.reasoning_tokens || 0),
            cachedTokens: Number(detail?.tokens?.cached_tokens || 0),
            totalTokens: Number(detail?.tokens?.total_tokens || 0),
          }
          if (!Number.isNaN(record.timestamp) && record.timestamp > 0) {
            allDetails.push(record)
          }
          existing.inputTokens += record.inputTokens + record.reasoningTokens
          existing.outputTokens += record.outputTokens
          existing.cachedTokens += record.cachedTokens
          existing.cost += estimateCost(record)
          if (record.source.toLowerCase().includes('chat')) existing.chatRequests += 1
          else existing.apiRequests += 1
        }

        if (details.length === 0) {
          existing.apiRequests += Number((modelSnap as any)?.total_requests || 0)
          existing.cost += (Number((modelSnap as any)?.total_tokens || 0) / 1000000) * 2
        }

        fallbackModelMap.set(modelKey, existing)
      }
    }
  }

  const cutoff = rangeToMs(range) ? Date.now() - Number(rangeToMs(range)) : null
  const filteredDetails = cutoff ? allDetails.filter(detail => detail.timestamp >= cutoff) : allDetails
  const hasDetailData = filteredDetails.length > 0

  const modelMap = new Map<string, ModelUsageRow>()
  const bucketMap = new Map<number, { label: string; requests: number; tokens: number }>()
  let successCount = 0
  let failureCount = 0
  let totalCost = 0
  let totalRequests = 0
  let totalTokens = 0
  let sourceChat = 0
  let sourceApi = 0

  if (hasDetailData) {
    for (const detail of filteredDetails) {
      totalRequests += 1
      totalTokens += detail.totalTokens
      totalCost += estimateCost(detail)
      if (detail.failed) failureCount += 1
      else successCount += 1
      if (detail.source.toLowerCase().includes('chat')) sourceChat += 1
      else sourceApi += 1

      const bucket = bucketStart(detail.timestamp, range)
      const existingBucket = bucketMap.get(bucket) || { label: bucketLabel(bucket, range), requests: 0, tokens: 0 }
      existingBucket.requests += 1
      existingBucket.tokens += detail.totalTokens
      bucketMap.set(bucket, existingBucket)

      const existingModel = modelMap.get(detail.modelName) || {
        name: detail.modelName,
        requests: 0,
        tokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        chatRequests: 0,
        apiRequests: 0,
        cost: 0,
      }
      existingModel.requests += 1
      existingModel.tokens += detail.totalTokens
      existingModel.inputTokens += detail.inputTokens + detail.reasoningTokens
      existingModel.outputTokens += detail.outputTokens
      existingModel.cachedTokens += detail.cachedTokens
      existingModel.cost += estimateCost(detail)
      if (detail.source.toLowerCase().includes('chat')) existingModel.chatRequests += 1
      else existingModel.apiRequests += 1
      modelMap.set(detail.modelName, existingModel)
    }
  } else {
    for (const row of fallbackModelMap.values()) {
      modelMap.set(row.name, row)
      totalRequests += row.requests
      totalTokens += row.tokens
      totalCost += row.cost
      sourceChat += row.chatRequests
      sourceApi += row.apiRequests
    }
    successCount = Math.max(0, totalRequests - Number(stats?.failure_count || 0))
    failureCount = Number(stats?.failure_count || 0)

    const fallbackSeries = range === '7d' || range === '30d' || range === 'all'
      ? Object.entries(stats?.requests_by_day || {}).map(([label, value]) => ({
          time: label,
          requests: Number(value || 0),
          tokens: Number(stats?.tokens_by_day?.[label] || 0),
        }))
      : Object.entries(stats?.requests_by_hour || {}).map(([label, value]) => ({
          time: `${label}:00`,
          requests: Number(value || 0),
          tokens: Number(stats?.tokens_by_hour?.[label] || 0),
        }))

    for (const item of fallbackSeries) {
      bucketMap.set(bucketMap.size, { label: item.time, requests: item.requests, tokens: item.tokens })
    }
  }

  const chartData = Array.from(bucketMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, value]) => ({ time: value.label, requests: value.requests, tokens: value.tokens }))

  const modelRows = Array.from(modelMap.values()).sort((a, b) => b.requests - a.requests)
  const successRate = totalRequests > 0 ? (successCount / totalRequests) * 100 : 0
  const topModels = modelRows.slice(0, 6)

  const handleExport = async () => {
    try {
      setExporting(true)
      const payload = await exportUsage()
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `usage-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err?.message || 'Failed to export usage')
    } finally {
      setExporting(false)
    }
  }

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      setImporting(true)
      const text = await file.text()
      const payload = JSON.parse(text)
      await importUsage(payload)
      await loadDashboard()
    } catch (err: any) {
      setError(err?.message || 'Failed to import usage')
    } finally {
      setImporting(false)
      if (event.target) event.target.value = ''
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Analytics</h1>
          <p className="text-gray-400">Track usage, model trends, and estimated cost.</p>
          {!loading && !error && totalRequests > 0 && (
            <p className="text-xs text-gray-500 mt-1">Traffic split — Chat: {sourceChat.toLocaleString()} · API: {sourceApi.toLocaleString()}</p>
          )}
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          {!loading && !error && usageEnabled === false && (
            <p className="text-xs text-amber-400 mt-1">Usage statistics are disabled. Enable `usage-statistics-enabled` to collect live analytics.</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex bg-gray-800/60 rounded-xl p-1 border border-gray-700/50 gap-0.5">
            {RANGE_OPTIONS.map(option => (
              <button
                key={option.id}
                onClick={() => setRange(option.id)}
                className={"px-3 py-1.5 text-xs rounded-lg transition-colors " + (range === option.id
                  ? 'font-medium bg-gray-700/80 text-white shadow-sm'
                  : 'font-medium text-gray-400 hover:text-gray-200 hover:bg-gray-700/40')}
              >
                {option.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-500">Updated {formatUpdated(updatedAt)}</span>
          <button onClick={loadDashboard} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800/60 border border-gray-700 text-gray-100 hover:bg-gray-700/70 disabled:opacity-60">
            <RefreshCw className={'w-4 h-4 ' + (loading ? 'animate-spin' : '')} /> Refresh
          </button>
          <button onClick={handleExport} disabled={exporting} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800/60 border border-gray-700 text-gray-100 hover:bg-gray-700/70 disabled:opacity-60">
            <Download className={'w-4 h-4 ' + (exporting ? 'animate-pulse' : '')} /> Export
          </button>
          <button onClick={() => importInputRef.current?.click()} disabled={importing} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800/60 border border-gray-700 text-gray-100 hover:bg-gray-700/70 disabled:opacity-60">
            <Upload className={'w-4 h-4 ' + (importing ? 'animate-pulse' : '')} /> Import
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="p-6 rounded-2xl bg-gray-800/40 border border-blue-500/20 backdrop-blur-sm">
          <div className="flex items-start justify-between mb-4">
            <p className="text-sm font-medium text-blue-300">Total Requests</p>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white">{totalRequests.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-2">{range === 'all' ? 'Across all available data' : `Within ${RANGE_OPTIONS.find(item => item.id === range)?.label}`}</p>
        </div>

        <div className="p-6 rounded-2xl bg-gray-800/40 border border-blue-500/20 backdrop-blur-sm">
          <div className="flex items-start justify-between mb-4">
            <p className="text-sm font-medium text-blue-300">Success Rate</p>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white">{successRate.toFixed(0)}%</p>
          <p className="text-xs text-gray-500 mt-2">{failureCount.toLocaleString()} failed</p>
        </div>

        <div className="p-6 rounded-2xl bg-gray-800/40 border border-blue-500/20 backdrop-blur-sm">
          <div className="flex items-start justify-between mb-4">
            <p className="text-sm font-medium text-blue-300">Est. Cost</p>
            <CircleDollarSign className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white">{formatCurrency(totalCost)}</p>
          <p className="text-xs text-gray-500 mt-2">{formatCompact(totalTokens)} tokens</p>
        </div>
      </div>

      <div className="rounded-2xl bg-gray-800/40 border border-gray-700/50 backdrop-blur-sm p-6 space-y-8">
        <div>
          <h3 className="font-semibold text-xl text-gray-100 mb-4">{range === 'all' ? 'Request Trends' : `Last ${RANGE_OPTIONS.find(item => item.id === range)?.label}`}</h3>
          <div className="w-full h-[230px]">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">No traffic data for selected range.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="time" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '0.5rem' }} itemStyle={{ color: '#E5E7EB' }} />
                  <Area type="monotone" dataKey="requests" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorRequests)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-xl text-gray-100 mb-4">Token Usage</h3>
          <div className="w-full h-[230px]">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">No token data for selected range.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="time" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatCompact(Number(value || 0))} />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '0.5rem' }} itemStyle={{ color: '#E5E7EB' }} />
                  <Area type="monotone" dataKey="tokens" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorTokens)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-2xl bg-gray-800/40 border border-gray-700/50 backdrop-blur-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700/50">
            <h3 className="font-semibold text-base text-gray-200">Model Usage</h3>
          </div>
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-800/80 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 font-medium">Model</th>
                <th className="px-6 py-3 font-medium text-right">Requests</th>
                <th className="px-6 py-3 font-medium text-right">Tokens</th>
                <th className="px-6 py-3 font-medium text-right">In</th>
                <th className="px-6 py-3 font-medium text-right">Out</th>
                <th className="px-6 py-3 font-medium text-right">Chat/API</th>
                <th className="px-6 py-3 font-medium text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {modelRows.map((row) => (
                <tr key={row.name} className="hover:bg-gray-700/20 transition-colors">
                  <td className="px-6 py-3 text-gray-200">{row.name}</td>
                  <td className="px-6 py-3 text-right">{row.requests.toLocaleString()}</td>
                  <td className="px-6 py-3 text-right">{formatCompact(row.tokens)}</td>
                  <td className="px-6 py-3 text-right">{formatCompact(row.inputTokens)}</td>
                  <td className="px-6 py-3 text-right">{formatCompact(row.outputTokens)}</td>
                  <td className="px-6 py-3 text-right">{row.chatRequests}/{row.apiRequests}</td>
                  <td className="px-6 py-3 text-right text-blue-300">{formatCurrency(row.cost)}</td>
                </tr>
              ))}
              {modelRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No model usage data yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="lg:col-span-2 rounded-2xl bg-gray-800/40 border border-gray-700/50 backdrop-blur-sm p-6 overflow-hidden flex flex-col">
          <h3 className="font-semibold text-base text-gray-200 mb-4">Top Models</h3>
          <div className="space-y-3 flex-1 overflow-auto pr-1">
            {topModels.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <p className="text-gray-500 text-sm">No traffic yet.</p>
                <p className="text-gray-600 text-xs">Send requests through the proxy to see stats.</p>
              </div>
            ) : (() => {
              const maxReqs = Math.max(...topModels.map(item => item.requests), 1)
              return topModels.map((row) => {
                const pct = Math.round((row.requests / maxReqs) * 100)
                return (
                  <div key={row.name} className="p-3 rounded-xl bg-gray-800/30 border border-gray-700/30 hover:border-gray-600/50 transition-colors">
                    <div className="flex items-center justify-between mb-2 gap-3">
                      <span className="font-medium text-xs text-gray-200 truncate">{row.name}</span>
                      <span className="text-xs text-gray-400 shrink-0">{row.requests} reqs</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-2">Chat {row.chatRequests} · API {row.apiRequests}</p>
                    <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-600 mt-1.5">{formatCompact(row.tokens)} tokens · {formatCurrency(row.cost)}</p>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}