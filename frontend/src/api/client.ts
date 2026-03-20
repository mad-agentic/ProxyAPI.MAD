/**
 * API Client for interacting with CLIProxyAPI Management Endpoints
 */

const BASE_URL = "/v0/management"

const RUNTIME_API_BASE =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE) ||
  (typeof window !== 'undefined' && window.location.port === '5173' ? 'http://localhost:8317' : '')

function withApiBase(path: string): string {
  if (!path) return path
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${String(RUNTIME_API_BASE || '').replace(/\/$/, '')}${path}`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API Keys & Config
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function fetchApiKeys(): Promise<string[]> {
  const res = await fetch(withApiBase(BASE_URL + "/api-keys"))
  if (!res.ok) throw new Error("Failed to fetch API keys")
  const data = await res.json()
  return Array.isArray(data?.["api-keys"]) ? data["api-keys"] : []
}

export async function addApiKey(value: string): Promise<void> {
  const key = value.trim()
  if (!key) throw new Error("API key is required")

  const res = await fetch(withApiBase(BASE_URL + "/api-keys"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ old: "__append__", new: key }),
  })
  if (!res.ok) {
    const err = (await res.text()).trim()
    throw new Error(err || "Failed to add API key")
  }
}

export async function updateApiKey(index: number, value: string): Promise<void> {
  const key = value.trim()
  if (!key) throw new Error("API key is required")

  const res = await fetch(withApiBase(BASE_URL + "/api-keys"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ index, value: key }),
  })
  if (!res.ok) {
    const err = (await res.text()).trim()
    throw new Error(err || "Failed to update API key")
  }
}

export async function deleteApiKey(index: number): Promise<void> {
  const res = await fetch(withApiBase(BASE_URL + `/api-keys?index=${index}`), {
    method: "DELETE",
  })
  if (!res.ok) {
    const err = (await res.text()).trim()
    throw new Error(err || "Failed to delete API key")
  }
}

export function getBridgeEndpoint(): string {
  const base = String(RUNTIME_API_BASE || "").replace(/\/$/, "")
  return base ? `${base}/v1` : `${window.location.origin}/v1`
}

export type ProviderKeyChannel = 'gemini' | 'claude' | 'codex' | 'openai' | 'vertex'

export interface ProviderApiKeyEntry {
  apiKey: string
  baseUrl?: string
}

const providerChannelEndpoint: Record<Exclude<ProviderKeyChannel, 'openai'>, string> = {
  gemini: '/gemini-api-key',
  claude: '/claude-api-key',
  codex: '/codex-api-key',
  vertex: '/vertex-api-key',
}

async function fetchJson(path: string): Promise<any> {
  const res = await fetch(withApiBase(BASE_URL + path))
  if (!res.ok) {
    const err = (await res.text()).trim()
    throw new Error(err || `Request failed: ${path}`)
  }
  return res.json()
}

async function putJson(path: string, body: any): Promise<void> {
  const res = await fetch(withApiBase(BASE_URL + path), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = (await res.text()).trim()
    throw new Error(err || `Failed to update ${path}`)
  }
}

async function fetchRawProviderEntries(channel: Exclude<ProviderKeyChannel, 'openai'>): Promise<any[]> {
  const endpoint = providerChannelEndpoint[channel]
  const data = await fetchJson(endpoint)
  const responseKey = `${channel}-api-key`
  return Array.isArray(data?.[responseKey]) ? data[responseKey] : []
}

async function fetchRawOpenAICompatibilityEntries(): Promise<any[]> {
  const data = await fetchJson('/openai-compatibility')
  return Array.isArray(data?.['openai-compatibility']) ? data['openai-compatibility'] : []
}

export async function fetchProviderApiKeys(channel: ProviderKeyChannel): Promise<ProviderApiKeyEntry[]> {
  if (channel === 'openai') {
    const entries = await fetchRawOpenAICompatibilityEntries()
    const openAIEntry = entries.find((entry: any) => String(entry?.name || '').toLowerCase() === 'openai') || entries[0]
    const apiKeyEntries = Array.isArray(openAIEntry?.['api-key-entries']) ? openAIEntry['api-key-entries'] : []
    return apiKeyEntries
      .map((entry: any) => ({
        apiKey: String(entry?.['api-key'] || '').trim(),
        baseUrl: String(openAIEntry?.['base-url'] || '').trim(),
      }))
      .filter(entry => entry.apiKey)
  }

  const entries = await fetchRawProviderEntries(channel)
  return entries
    .map((entry: any) => ({
      apiKey: String(entry?.['api-key'] || '').trim(),
      baseUrl: String(entry?.['base-url'] || '').trim(),
    }))
    .filter(entry => entry.apiKey)
}

export async function addProviderApiKey(channel: ProviderKeyChannel, apiKeyValue: string): Promise<void> {
  const apiKey = apiKeyValue.trim()
  if (!apiKey) throw new Error('API key is required')

  if (channel === 'openai') {
    const entries = await fetchRawOpenAICompatibilityEntries()
    const targetIndex = entries.findIndex((entry: any) => String(entry?.name || '').toLowerCase() === 'openai')

    if (targetIndex === -1) {
      entries.push({
        name: 'openai',
        'base-url': 'https://api.openai.com/v1',
        'api-key-entries': [{ 'api-key': apiKey }],
      })
    } else {
      const current = entries[targetIndex]
      const keyEntries = Array.isArray(current?.['api-key-entries']) ? [...current['api-key-entries']] : []
      if (!keyEntries.some((entry: any) => String(entry?.['api-key'] || '').trim() === apiKey)) {
        keyEntries.push({ 'api-key': apiKey })
      }
      entries[targetIndex] = { ...current, 'api-key-entries': keyEntries }
    }

    await putJson('/openai-compatibility', entries)
    return
  }

  const endpoint = providerChannelEndpoint[channel]
  const currentEntries = await fetchRawProviderEntries(channel)
  if (currentEntries.some((entry: any) => String(entry?.['api-key'] || '').trim() === apiKey)) return

  const newEntry: any = { 'api-key': apiKey }
  if (channel === 'claude') newEntry['base-url'] = 'https://api.anthropic.com'
  if (channel === 'codex') newEntry['base-url'] = 'https://api.openai.com/v1'

  await putJson(endpoint, [...currentEntries, newEntry])
}

export async function deleteProviderApiKey(channel: ProviderKeyChannel, index: number): Promise<void> {
  if (index < 0) return

  if (channel === 'openai') {
    const entries = await fetchRawOpenAICompatibilityEntries()
    const targetIndex = entries.findIndex((entry: any) => String(entry?.name || '').toLowerCase() === 'openai')
    if (targetIndex === -1) return

    const current = entries[targetIndex]
    const keyEntries = Array.isArray(current?.['api-key-entries']) ? [...current['api-key-entries']] : []
    if (index >= keyEntries.length) return
    keyEntries.splice(index, 1)

    if (keyEntries.length === 0) {
      entries.splice(targetIndex, 1)
    } else {
      entries[targetIndex] = { ...current, 'api-key-entries': keyEntries }
    }

    await putJson('/openai-compatibility', entries)
    return
  }

  const endpoint = providerChannelEndpoint[channel]
  const currentEntries = await fetchRawProviderEntries(channel)
  if (index >= currentEntries.length) return
  currentEntries.splice(index, 1)
  await putJson(endpoint, currentEntries)
}

export async function fetchUsage(): Promise<any> {
  const res = await fetch(withApiBase(BASE_URL + "/usage"))
  if (!res.ok) throw new Error("Failed to fetch usage statistics")
  return res.json()
}

export async function exportUsage(): Promise<any> {
  const res = await fetch(withApiBase(BASE_URL + "/usage/export"))
  if (!res.ok) throw new Error("Failed to export usage statistics")
  return res.json()
}

export async function importUsage(payload: any): Promise<any> {
  const res = await fetch(withApiBase(BASE_URL + "/usage/import"), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = (await res.text()).trim()
    throw new Error(err || 'Failed to import usage statistics')
  }
  return res.json()
}

export async function fetchLogs(): Promise<any> {
  const res = await fetch(withApiBase(BASE_URL + "/logs"))
  if (!res.ok) throw new Error("Failed to fetch request logs")
  return res.json()
}

export async function clearLogs(): Promise<any> {
  const res = await fetch(withApiBase(BASE_URL + "/logs"), {
    method: 'DELETE',
  })
  if (!res.ok) {
    const err = (await res.text()).trim()
    throw new Error(err || 'Failed to clear logs')
  }
  return res.json()
}

export async function fetchConfig(): Promise<any> {
  const res = await fetch(withApiBase(BASE_URL + "/config"))
  if (!res.ok) throw new Error("Failed to fetch configuration JSON")
  return res.json()
}

export interface RuntimeInfo {
  paths?: {
    config_file?: string
    auth_dir?: string
    log_dir?: string
    log_file?: string
    usage_stats_file?: string
    amp_secrets_file?: string
    writable_path?: string
  }
  cache?: {
    signature_cache?: {
      type?: string
      path?: string | null
      ttl_seconds?: number
    }
    amp_secret_cache?: {
      type?: string
      path?: string | null
      ttl_seconds?: number
    }
  }
  usage_statistics?: {
    enabled?: boolean
    persisted?: boolean
    persistence_file?: string
  }
}

export async function fetchRuntimeInfo(): Promise<RuntimeInfo> {
  const res = await fetch(withApiBase(BASE_URL + "/runtime-info"))
  if (!res.ok) throw new Error("Failed to fetch runtime information")
  return res.json()
}

export interface AuthFileEntry {
  id?: string
  name?: string
  type?: string
  provider?: string
  label?: string
  status?: string
  status_message?: string
  disabled?: boolean
  unavailable?: boolean
  runtime_only?: boolean
  source?: string
  email?: string
  account?: string
  account_type?: string
  last_refresh?: string
  modtime?: string
  updated_at?: string
}

export async function fetchAuthFilesDetailed(): Promise<AuthFileEntry[]> {
  const res = await fetch(withApiBase(BASE_URL + "/auth-files"))
  if (!res.ok) throw new Error("Failed to fetch auth files")
  const data = await res.json()
  return Array.isArray(data?.files) ? data.files : []
}

export async function fetchLoggingToFile(): Promise<boolean> {
  const res = await fetch(withApiBase(BASE_URL + "/logging-to-file"))
  if (!res.ok) throw new Error("Failed to fetch logging-to-file config")
  const data = await res.json()
  return Boolean(data?.["logging-to-file"])
}

export async function updateLoggingToFile(enabled: boolean): Promise<void> {
  const res = await fetch(withApiBase(BASE_URL + "/logging-to-file"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: enabled }),
  })
  if (!res.ok) {
    const err = (await res.text()).trim()
    throw new Error(err || "Failed to update logging-to-file config")
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Auth Status
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function normalizeProviderId(raw: string): string {
  const key = raw.trim().toLowerCase()
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

export async function fetchAuthStatus(state?: string): Promise<any> {
  const normalizedState = state?.trim()

  if (normalizedState) {
    const res = await fetch(withApiBase(BASE_URL + "/get-auth-status?state=" + encodeURIComponent(normalizedState)))
    if (!res.ok) throw new Error("Failed to fetch OAuth state status")
    return res.json()
  }

  const res = await fetch(withApiBase(BASE_URL + "/auth-files"))
  if (!res.ok) throw new Error("Failed to fetch auth files")

  const data = await res.json()
  const files = Array.isArray(data?.files) ? data.files : []
  const providerStatusMap: Record<string, boolean> = {}

  for (const file of files) {
    const providerRaw = String(file?.provider || file?.type || '').trim()
    if (!providerRaw) continue

    const providerId = normalizeProviderId(providerRaw)
    const disabled = file?.disabled === true
    const unavailable = file?.unavailable === true
    const status = String(file?.status || '').toLowerCase().trim()
    const active = !disabled && !unavailable && status !== 'disabled'

    if (active) {
      providerStatusMap[providerId] = true
    }
  }

  return providerStatusMap
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OAuth Connect
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const oauthEndpoints: Record<string, string> = {
  "gemini-cli": "/gemini-cli-auth-url",
  claude: "/anthropic-auth-url",
  codex: "/codex-auth-url",
  antigravity: "/antigravity-auth-url",
  qwen: "/qwen-auth-url",
  kimi: "/kimi-auth-url",
  iflow: "/iflow-auth-url",
}

export async function fetchOAuthUrl(provider: string): Promise<any> {
  const endpoint = oauthEndpoints[provider]
  if (!endpoint) throw new Error(`Unknown provider: ${provider}`)
  // ?is_webui=true tells the Go backend to start a local callback forwarder
  try {
    const res = await fetch(withApiBase(BASE_URL + endpoint + '?is_webui=true'))
    if (!res.ok) {
      const raw = (await res.text()).trim()
      throw new Error(raw || `Failed to get OAuth URL for ${provider} (HTTP ${res.status})`)
    }
    return res.json()
  } catch (err: any) {
    if (err?.name === 'TypeError') {
      throw new Error('Cannot reach backend server. Please ensure proxyapi_core is running on localhost:8317')
    }
    throw err
  }
}

export async function postOAuthCallbackWithUrl(provider: string, callbackUrl: string): Promise<any> {
  const body = { provider, redirect_url: callbackUrl }
  const res = await fetch(withApiBase(BASE_URL + '/oauth-callback'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || 'OAuth callback failed')
  }
  return res.json()
}

export async function postOAuthCallback(provider: string, code?: string): Promise<any> {
  const body: any = { provider }
  if (code) body.code = code
  const res = await fetch(withApiBase(BASE_URL + "/oauth-callback"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || "OAuth callback failed")
  }
  return res.json()
}

export async function deleteAuthFile(name: string): Promise<void> {
  const res = await fetch(withApiBase(BASE_URL + `/auth-files?name=${encodeURIComponent(name)}`), {
    method: 'DELETE',
  })
  if (!res.ok) {
    const err = (await res.text()).trim()
    throw new Error(err || 'Failed to delete auth file')
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Models & Chat
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function fetchModels(): Promise<string[]> {
  const apiKey = await getFirstApiKey()
  const res = await fetch(withApiBase("/v1/models"), {
    headers: { Authorization: "Bearer " + apiKey },
  })
  if (!res.ok) {
    const details = (await res.text()).trim()
    throw new Error(details || `Failed to fetch models (HTTP ${res.status})`)
  }
  const data = await res.json()
  return (data.data || []).map((m: any) => m.id as string)
}

export async function sendChat(
  model: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  const apiKey = await getFirstApiKey()
  const res = await fetch(withApiBase("/v1/chat/completions"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    },
    body: JSON.stringify({ model, messages, stream: false }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`HTTP ${res.status}: ${errText}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ""
}

// Cache local API key for /v1 requests
let _cachedApiKey = ""
async function getFirstApiKey(): Promise<string> {
  if (_cachedApiKey) return _cachedApiKey
  try {
    const keys = await fetchApiKeys()
    _cachedApiKey = keys[0] || "proxyapi-test"
  } catch {
    _cachedApiKey = "proxyapi-test"
  }
  return _cachedApiKey
}
