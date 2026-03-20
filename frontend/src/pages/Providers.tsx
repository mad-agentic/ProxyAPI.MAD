import { useEffect, useState } from 'react'
import { Loader2 as _L, CheckCircle2, XCircle, Zap, Key, RefreshCw, Activity, AlertTriangle, ShieldOff, Database } from 'lucide-react'
import { fetchAuthFilesDetailed, fetchAuthStatus, type AuthFileEntry } from '../api/client'
import { OAuthConnectModal } from '../components/OAuthConnectModal'

interface ProviderInfo {
  id: string
  name: string
  description: string
  gradient: string
  authType: 'oauth' | 'api-key' | 'both'
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: 'gemini-cli',
    name: 'Gemini CLI (OAuth)',
    description: 'Google Gemini via CLI OAuth. Best for Gemini Pro/Flash models.',
    gradient: 'from-blue-500/10 to-indigo-500/10',
    authType: 'oauth',
  },
  {
    id: 'claude',
    name: 'Claude (Anthropic)',
    description: 'Anthropic Claude models via OAuth. Supports Sonnet, Opus, Haiku.',
    gradient: 'from-orange-500/10 to-amber-500/10',
    authType: 'oauth',
  },
  {
    id: 'codex',
    name: 'Codex (OpenAI)',
    description: 'OpenAI Codex models. GPT-5 and coding assistant features.',
    gradient: 'from-emerald-500/10 to-teal-500/10',
    authType: 'oauth',
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    description: 'Google internal Antigravity access. Enhanced Gemini models.',
    gradient: 'from-pink-500/10 to-rose-500/10',
    authType: 'oauth',
  },
  {
    id: 'qwen',
    name: 'Qwen (Alibaba)',
    description: 'Alibaba Qwen models. Powerful for code and multilingual tasks.',
    gradient: 'from-purple-500/10 to-violet-500/10',
    authType: 'oauth',
  },
  {
    id: 'kimi',
    name: 'Kimi (Moonshot)',
    description: 'Moonshot Kimi models. Long-context AI with strong reasoning.',
    gradient: 'from-cyan-500/10 to-sky-500/10',
    authType: 'oauth',
  },
  {
    id: 'iflow',
    name: 'iFlow',
    description: 'iFlow AI access. Supports GLM and specialized Chinese AI models.',
    gradient: 'from-yellow-500/10 to-orange-500/10',
    authType: 'oauth',
  },
]

const PROVIDER_STATUS_ICON: Record<string, string> = {
  'gemini-cli': '🔵',
  claude: '🟠',
  codex: '🟢',
  antigravity: '⭐',
  qwen: '🟣',
  kimi: '🤖',
  iflow: '🔷',
}

export function Providers() {
  const [authStatus, setAuthStatus] = useState<Record<string, boolean>>({})
  const [authFiles, setAuthFiles] = useState<AuthFileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const normalizeProviderId = (raw?: string) => {
    const key = String(raw || '').trim().toLowerCase()
    const aliasMap: Record<string, string> = {
      anthropic: 'claude',
      claude: 'claude',
      codex: 'codex',
      openai: 'codex',
      gemini: 'gemini-cli',
      'gemini-cli': 'gemini-cli',
      antigravity: 'antigravity',
      qwen: 'qwen',
      kimi: 'kimi',
      iflow: 'iflow',
    }
    return aliasMap[key] || key
  }

  const loadStatus = async () => {
    setLoading(true)
    try {
      const [data, files] = await Promise.all([fetchAuthStatus(), fetchAuthFilesDetailed()])
      // Backend returns: { providers: [{id, authenticated, ...}] } or flat map
      const statusMap: Record<string, boolean> = {}
      if (Array.isArray(data.providers)) {
        for (const p of data.providers) {
          statusMap[p.id || p.name?.toLowerCase()] = p.authenticated || p.connected || false
        }
      } else if (data && typeof data === 'object') {
        // Flat map: { "gemini-cli": true, "claude": false, ... }
        for (const [k, v] of Object.entries(data)) {
          statusMap[k] = Boolean(v)
        }
      }
      setAuthStatus(statusMap)
      setAuthFiles(files)
    } catch (err) {
      console.error('Failed to fetch auth status:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [refreshKey])

  const handleConnect = (provider: string) => {
    setConnecting(provider)
  }

  const handleConnectSuccess = () => {
    setRefreshKey(k => k + 1)
  }

  const connectedCount = PROVIDERS.filter(p => authStatus[p.id]).length

  const providerHealth = PROVIDERS.reduce((acc, provider) => {
    const entries = authFiles.filter(file => normalizeProviderId(file.provider || file.type) === provider.id)
    const activeEntries = entries.filter(file => {
      const status = String(file.status || '').toLowerCase()
      return !file.disabled && !file.unavailable && status !== 'disabled'
    })
    const issueEntries = entries.filter(file => {
      const status = String(file.status || '').toLowerCase()
      return file.unavailable || status === 'error' || status === 'expired' || status === 'invalid'
    })
    const disabledEntries = entries.filter(file => file.disabled)
    const lastRefresh = entries
      .map(file => file.last_refresh || file.updated_at || file.modtime)
      .filter(Boolean)
      .map(dateStr => new Date(String(dateStr)).getTime())
      .filter(ts => !Number.isNaN(ts))
      .sort((a, b) => b - a)[0]

    acc[provider.id] = {
      total: entries.length,
      healthy: activeEntries.length,
      issues: issueEntries.length,
      disabled: disabledEntries.length,
      lastRefresh: lastRefresh ? new Date(lastRefresh).toLocaleString() : 'N/A',
    }
    return acc
  }, {} as Record<string, { total: number; healthy: number; issues: number; disabled: number; lastRefresh: string }>)

  const providersWithIssues = Object.values(providerHealth).filter(h => h.issues > 0).length
  const totalCredentials = Object.values(providerHealth).reduce((sum, h) => sum + h.total, 0)
  const disabledCredentials = Object.values(providerHealth).reduce((sum, h) => sum + h.disabled, 0)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Providers</h1>
          <p className="text-gray-400">
            Connect your AI providers via OAuth. 
            <span className="ml-2 text-emerald-400 font-medium">
              {connectedCount}/{PROVIDERS.length} connected
            </span>
          </p>
        </div>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-700/50 hover:border-gray-600 rounded-xl bg-gray-800/40 hover:bg-gray-800 transition-all"
        >
          <RefreshCw className={"w-4 h-4 " + (loading ? "animate-spin" : "")} />
          Refresh
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-gray-800/40 border border-gray-700/30 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && (
        <div className="rounded-2xl border border-gray-700/50 bg-gray-900/40 p-4 md:p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-gray-200">Provider Health Panel</h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p className="text-xs text-emerald-300/90">Connected Providers</p>
              <p className="text-xl font-semibold text-emerald-200 mt-1">{connectedCount}/{PROVIDERS.length}</p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs text-amber-300/90">Providers With Issues</p>
              <p className="text-xl font-semibold text-amber-200 mt-1">{providersWithIssues}</p>
            </div>
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
              <p className="text-xs text-blue-300/90">Total Credentials</p>
              <p className="text-xl font-semibold text-blue-200 mt-1">{totalCredentials}</p>
            </div>
            <div className="rounded-xl border border-gray-500/20 bg-gray-500/5 p-3">
              <p className="text-xs text-gray-300/90">Disabled Credentials</p>
              <p className="text-xl font-semibold text-gray-200 mt-1">{disabledCredentials}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {PROVIDERS.map(provider => {
              const health = providerHealth[provider.id] || { total: 0, healthy: 0, issues: 0, disabled: 0, lastRefresh: 'N/A' }
              return (
                <div key={provider.id + '-health'} className="rounded-xl border border-gray-700/40 bg-gray-800/30 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-200 font-medium truncate">{provider.name}</p>
                    {health.issues > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
                        <AlertTriangle className="w-3 h-3" />
                        Issues
                      </span>
                    ) : health.healthy > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Healthy
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                        <ShieldOff className="w-3 h-3" />
                        No creds
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] mb-2">
                    <div className="rounded-lg bg-gray-900/50 px-2 py-1">
                      <p className="text-gray-500">Healthy</p>
                      <p className="text-emerald-300 font-medium">{health.healthy}</p>
                    </div>
                    <div className="rounded-lg bg-gray-900/50 px-2 py-1">
                      <p className="text-gray-500">Issues</p>
                      <p className="text-amber-300 font-medium">{health.issues}</p>
                    </div>
                    <div className="rounded-lg bg-gray-900/50 px-2 py-1">
                      <p className="text-gray-500">Disabled</p>
                      <p className="text-gray-300 font-medium">{health.disabled}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <Database className="w-3 h-3" />
                    <span>Total creds: {health.total} · Last refresh: {health.lastRefresh}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Provider Cards */}
      {!loading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PROVIDERS.map(provider => {
            const isConnected = authStatus[provider.id] === true
            return (
              <div
                key={provider.id}
                className={"relative rounded-2xl border bg-gradient-to-br p-5 flex flex-col gap-4 transition-all hover:shadow-lg hover:shadow-black/20 " +
                  (isConnected
                    ? "border-emerald-500/30 hover:border-emerald-500/50 "
                    : "border-gray-700/50 hover:border-gray-600/60 ") +
                  provider.gradient}
              >
                {/* Provider Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{PROVIDER_STATUS_ICON[provider.id] || '🔌'}</span>
                    <div>
                      <h3 className="font-semibold text-gray-100 text-sm">{provider.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isConnected ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-xs text-emerald-400 font-medium">Connected</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-gray-500" />
                            <span className="text-xs text-gray-500">Not connected</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Auth type badge */}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-900/50 border border-gray-700/50 text-gray-400">
                    {provider.authType === 'api-key' ? (
                      <span className="flex items-center gap-1"><Key className="w-3 h-3" /> API Key</span>
                    ) : (
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> OAuth</span>
                    )}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-400 leading-relaxed flex-1">{provider.description}</p>

                {/* Actions */}
                <div className="flex gap-2">
                  {isConnected ? (
                    <button
                      onClick={() => handleConnect(provider.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-gray-200 border border-gray-700/50 hover:border-gray-600 rounded-xl bg-gray-900/30 hover:bg-gray-800 transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Re-authorize
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect(provider.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Connect via OAuth
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Info Banner */}
      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3">
        <div className="text-blue-400 mt-0.5">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-blue-300 mb-1">How Provider Connect works</p>
          <p className="text-xs text-blue-400/80 leading-relaxed">
            Clicking "Connect via OAuth" generates an authorization URL. Open it in your browser, complete the OAuth flow, 
            then click "I've already authorized" to finalize. Auth tokens are stored locally by the proxy server in 
            <code className="mx-1 px-1.5 py-0.5 bg-blue-900/30 rounded font-mono text-[11px]">~/.cli-proxy-api/</code>
            and used automatically for all model requests.
          </p>
        </div>
      </div>

      {/* OAuth Modal */}
      {connecting && (
        <OAuthConnectModal
          provider={connecting}
          providerName={PROVIDERS.find(p => p.id === connecting)?.name || connecting}
          onClose={() => setConnecting(null)}
          onSuccess={handleConnectSuccess}
        />
      )}
    </div>
  )
}
