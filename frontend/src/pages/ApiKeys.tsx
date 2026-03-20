import { Plus, Copy, Trash2, KeyRound, Loader2, Check, Link2, AlertTriangle, RefreshCw } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import {
  addApiKey,
  addProviderApiKey,
  deleteApiKey,
  deleteProviderApiKey,
  fetchApiKeys,
  fetchProviderApiKeys,
  getBridgeEndpoint,
  type ProviderApiKeyEntry,
  type ProviderKeyChannel,
} from "../api/client"

interface ProviderCardInfo {
  id: ProviderKeyChannel
  name: string
  description: string
  gradient: string
}

function maskKey(value: string): string {
  if (value.length <= 12) return value
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

export function ApiKeys() {
  const [bridgeKeys, setBridgeKeys] = useState<string[]>([])
  const [loadingBridge, setLoadingBridge] = useState(true)
  const [bridgeError, setBridgeError] = useState<string | null>(null)
  const [copiedBridgeIndex, setCopiedBridgeIndex] = useState<number | null>(null)
  const [copiedEndpoint, setCopiedEndpoint] = useState(false)
  const [proxyRunning, setProxyRunning] = useState(true)

  const [newBridgeKeyInput, setNewBridgeKeyInput] = useState("")
  const [creatingBridge, setCreatingBridge] = useState(false)

  const [activeProvider, setActiveProvider] = useState<ProviderKeyChannel>('gemini')
  const [providerKeysByChannel, setProviderKeysByChannel] = useState<Record<ProviderKeyChannel, ProviderApiKeyEntry[]>>({
    gemini: [],
    claude: [],
    codex: [],
    openai: [],
    vertex: [],
  })
  const [loadingProvider, setLoadingProvider] = useState(false)
  const [providerError, setProviderError] = useState<string | null>(null)
  const [newProviderKeyInput, setNewProviderKeyInput] = useState("")
  const [providerWorking, setProviderWorking] = useState(false)
  const [copiedProviderIndex, setCopiedProviderIndex] = useState<number | null>(null)

  const PROVIDER_TABS: ProviderCardInfo[] = [
    { id: 'gemini', name: 'Gemini API', description: 'Connect Gemini models via direct API key.', gradient: 'from-blue-500/10 to-indigo-500/10' },
    { id: 'claude', name: 'Claude API', description: 'Connect Anthropic Claude models via API key.', gradient: 'from-orange-500/10 to-amber-500/10' },
    { id: 'codex', name: 'Codex API', description: 'Connect Codex and GPT coding models via API key.', gradient: 'from-emerald-500/10 to-teal-500/10' },
    { id: 'openai', name: 'OpenAI API', description: 'Connect OpenAI-compatible models via API key.', gradient: 'from-gray-500/10 to-slate-500/10' },
    { id: 'vertex', name: 'Vertex API', description: 'Connect Vertex-compatible providers with API key.', gradient: 'from-sky-500/10 to-blue-500/10' },
  ]

  const [deletingBridgeIndex, setDeletingBridgeIndex] = useState<number | null>(null)
  const [deletingProviderIndex, setDeletingProviderIndex] = useState<number | null>(null)

  const bridgeEndpoint = useMemo(() => getBridgeEndpoint(), [])

  const loadBridgeKeys = async () => {
    setLoadingBridge(true)
    setBridgeError(null)
    try {
      const list = await fetchApiKeys()
      setBridgeKeys(list)
      setProxyRunning(true)
    } catch (err: any) {
      setBridgeError(err?.message || "Failed to load bridge API keys")
      setProxyRunning(false)
    } finally {
      setLoadingBridge(false)
    }
  }

  const loadProviderKeys = async (provider: ProviderKeyChannel) => {
    setLoadingProvider(true)
    setProviderError(null)
    try {
      const list = await fetchProviderApiKeys(provider)
      setProviderKeysByChannel((prev) => ({ ...prev, [provider]: list }))
    } catch (err: any) {
      setProviderError(err?.message || `Failed to load ${provider} API keys`)
      setProviderKeysByChannel((prev) => ({ ...prev, [provider]: [] }))
    } finally {
      setLoadingProvider(false)
    }
  }

  const loadAllProviderKeys = async () => {
    setLoadingProvider(true)
    setProviderError(null)
    try {
      const entries = await Promise.all(PROVIDER_TABS.map(async (provider) => [provider.id, await fetchProviderApiKeys(provider.id)] as const))
      const nextState = { gemini: [], claude: [], codex: [], openai: [], vertex: [] } as Record<ProviderKeyChannel, ProviderApiKeyEntry[]>
      for (const [providerId, list] of entries) nextState[providerId] = list
      setProviderKeysByChannel(nextState)
    } catch (err: any) {
      setProviderError(err?.message || 'Failed to load provider API keys')
    } finally {
      setLoadingProvider(false)
    }
  }

  useEffect(() => {
    loadBridgeKeys()
  }, [])

  useEffect(() => {
    loadAllProviderKeys()
  }, [])

  const providerKeys = providerKeysByChannel[activeProvider] || []

  const handleCopy = async (text: string, mode: 'bridge' | 'provider' | 'endpoint', index?: number) => {
    try {
      await navigator.clipboard.writeText(text)
      if (mode === 'endpoint') {
        setCopiedEndpoint(true)
        setTimeout(() => setCopiedEndpoint(false), 1500)
        return
      }

      if (typeof index === "number") {
        if (mode === 'bridge') {
          setCopiedBridgeIndex(index)
          setTimeout(() => setCopiedBridgeIndex(null), 1500)
        } else {
          setCopiedProviderIndex(index)
          setTimeout(() => setCopiedProviderIndex(null), 1500)
        }
      }
    } catch {}
  }

  const handleCreateBridgeKey = async () => {
    const value = newBridgeKeyInput.trim()
    if (!value || creatingBridge) return

    setCreatingBridge(true)
    setBridgeError(null)
    try {
      await addApiKey(value)
      setNewBridgeKeyInput("")
      await loadBridgeKeys()
    } catch (err: any) {
      setBridgeError(err?.message || "Failed to create bridge API key")
    } finally {
      setCreatingBridge(false)
    }
  }

  const handleDeleteBridgeKey = async (index: number) => {
    if (deletingBridgeIndex !== null) return
    setDeletingBridgeIndex(index)
    setBridgeError(null)
    try {
      await deleteApiKey(index)
      await loadBridgeKeys()
    } catch (err: any) {
      setBridgeError(err?.message || "Failed to delete bridge API key")
    } finally {
      setDeletingBridgeIndex(null)
    }
  }

  const handleCreateProviderKey = async () => {
    const value = newProviderKeyInput.trim()
    if (!value || providerWorking) return
    setProviderWorking(true)
    setProviderError(null)
    try {
      await addProviderApiKey(activeProvider, value)
      setNewProviderKeyInput("")
      await loadProviderKeys(activeProvider)
    } catch (err: any) {
      setProviderError(err?.message || `Failed to add ${activeProvider} API key`)
    } finally {
      setProviderWorking(false)
    }
  }

  const handleDeleteProviderKey = async (index: number) => {
    if (deletingProviderIndex !== null) return
    setDeletingProviderIndex(index)
    setProviderError(null)
    try {
      await deleteProviderApiKey(activeProvider, index)
      await loadProviderKeys(activeProvider)
    } catch (err: any) {
      setProviderError(err?.message || `Failed to delete ${activeProvider} API key`)
    } finally {
      setDeletingProviderIndex(null)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Bridge</h1>
          <p className="text-gray-400">Bridge endpoint + incoming bridge API keys + external provider keys.</p>
        </div>
        <button
          onClick={() => {
            loadBridgeKeys()
            loadAllProviderKeys()
          }}
          disabled={loadingBridge || loadingProvider}
          className="flex items-center gap-2 bg-gray-700/70 hover:bg-gray-700 text-white px-4 py-2 rounded-xl transition-colors font-medium disabled:opacity-60"
        >
          <RefreshCw className={"w-4 h-4 " + (loadingBridge || loadingProvider ? "animate-spin" : "")} />
          Refresh
        </button>
      </div>

      {!proxyRunning && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-center gap-3 text-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Proxy not running</p>
            <p className="text-xs text-amber-300/90">Start proxy server to manage Bridge and provider API keys via Management API.</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-blue-300">
          <Link2 className="w-4 h-4" />
          <span className="text-sm">Bridge Endpoint:</span>
          <code className="px-2 py-1 rounded bg-blue-900/30 text-xs font-mono">{bridgeEndpoint}</code>
        </div>
        <button
          onClick={() => handleCopy(bridgeEndpoint, 'endpoint')}
          className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
        >
          {copiedEndpoint ? "Copied" : "Copy Endpoint"}
        </button>
      </div>

      <div className="rounded-2xl bg-gray-800/40 border border-gray-700/50 backdrop-blur-sm p-4">
        <p className="text-xs text-gray-400 mb-2">Create new Bridge API key (for client requests to this proxy)</p>
        <div className="flex items-center gap-2">
          <input
            value={newBridgeKeyInput}
            onChange={(e) => setNewBridgeKeyInput(e.target.value)}
            placeholder="Enter API key (e.g. sk-proxy-xxxx)"
            className="flex-1 rounded-xl border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleCreateBridgeKey}
            disabled={creatingBridge || !newBridgeKeyInput.trim()}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl transition-colors font-medium disabled:opacity-60"
          >
            {creatingBridge ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add key
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-gray-800/40 border border-gray-700/50 backdrop-blur-sm overflow-hidden">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-gray-800/80 text-gray-400 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-medium">#</th>
              <th className="px-6 py-4 font-medium">Bridge Key</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {loadingBridge && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                  Loading bridge keys...
                </td>
              </tr>
            )}

            {bridgeError && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-red-400">Error: {bridgeError}</td>
              </tr>
            )}

            {!loadingBridge && !bridgeError && bridgeKeys.map((key, i) => {
              const isDeleting = deletingBridgeIndex === i
              return (
                <tr key={i} className="hover:bg-gray-700/20 transition-colors">
                  <td className="px-6 py-4 text-gray-500">{i + 1}</td>
                  <td className="px-6 py-4 font-mono text-gray-300">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-emerald-400/70 shrink-0" />
                      <span className="truncate max-w-[320px]" title={key}>{maskKey(key)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-400/10 text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleCopy(key, 'bridge', i)}
                      className="p-1.5 text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                      title="Copy Key"
                    >
                      {copiedBridgeIndex === i ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDeleteBridgeKey(i)}
                      disabled={isDeleting}
                      className="p-1.5 text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 rounded-lg transition-colors disabled:opacity-60"
                      title="Delete Key"
                    >
                      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              )
            })}

            {!loadingBridge && !bridgeError && bridgeKeys.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  No bridge key found. Add one above to start bridging external clients.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl bg-gray-800/40 border border-gray-700/50 backdrop-blur-sm p-4 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Connect External Provider API Keys</h2>
          <p className="text-xs text-gray-400 mt-1">Same concept as Providers, but this side connects upstream models using API keys instead of OAuth.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PROVIDER_TABS.map(provider => {
            const list = providerKeysByChannel[provider.id] || []
            const connected = list.length > 0
            return (
              <div
                key={provider.id}
                className={"relative rounded-2xl border bg-gradient-to-br p-5 flex flex-col gap-4 transition-all hover:shadow-lg hover:shadow-black/20 " +
                  (connected ? 'border-emerald-500/30 hover:border-emerald-500/50 ' : 'border-gray-700/50 hover:border-gray-600/60 ') +
                  provider.gradient}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-100 text-sm">{provider.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      {connected ? (
                        <span className="text-xs text-emerald-400 font-medium">Connected</span>
                      ) : (
                        <span className="text-xs text-gray-500">No API key</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-900/50 border border-gray-700/50 text-gray-400">API Key</span>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed flex-1">{provider.description}</p>

                <div className="rounded-xl border border-gray-700/40 bg-gray-900/30 px-3 py-2">
                  <p className="text-[11px] text-gray-500">Configured keys</p>
                  <p className="text-lg font-semibold text-gray-100 mt-0.5">{list.length}</p>
                </div>

                <button
                  onClick={() => setActiveProvider(provider.id)}
                  className={"flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-colors " + (activeProvider === provider.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-900/40 border border-gray-700/50 text-gray-300 hover:text-white hover:bg-gray-800')}
                >
                  {connected ? 'Manage API Keys' : 'Connect via API Key'}
                </button>
              </div>
            )
          })}
        </div>

        <div className="rounded-xl border border-gray-700/50 bg-gray-900/30 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold text-gray-100">{PROVIDER_TABS.find(item => item.id === activeProvider)?.name}</h3>
              <p className="text-xs text-gray-500">Manage real upstream API keys for this provider.</p>
            </div>
            <span className="text-xs text-gray-400">{providerKeys.length} key(s)</span>
          </div>

          <div className="flex items-center gap-2">
          <input
            value={newProviderKeyInput}
            onChange={(e) => setNewProviderKeyInput(e.target.value)}
            placeholder={`Add ${activeProvider} API key`}
            className="flex-1 rounded-xl border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleCreateProviderKey}
            disabled={providerWorking || !newProviderKeyInput.trim()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-colors font-medium disabled:opacity-60"
          >
            {providerWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </div>

        {providerError && <p className="text-sm text-red-400">{providerError}</p>}

        <div className="rounded-xl border border-gray-700/60 overflow-hidden">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-800/80 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Provider API Key</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {loadingProvider && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-400">Loading provider keys...</td>
                </tr>
              )}

              {!loadingProvider && providerKeys.map((item, index) => {
                const deleting = deletingProviderIndex === index
                return (
                  <tr key={`${activeProvider}-${index}`} className="hover:bg-gray-700/20 transition-colors">
                    <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                    <td className="px-4 py-3 font-mono text-gray-300">
                      <span title={item.apiKey}>{maskKey(item.apiKey)}</span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleCopy(item.apiKey, 'provider', index)}
                        className="p-1.5 text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Copy Key"
                      >
                        {copiedProviderIndex === index ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteProviderKey(index)}
                        disabled={deleting}
                        className="p-1.5 text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 rounded-lg transition-colors disabled:opacity-60"
                        title="Delete Key"
                      >
                        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                )
              })}

              {!loadingProvider && providerKeys.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-500">No {activeProvider} key configured.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </div>
  )
}
