import { Save, ShieldCheck, Network, Loader2, Database, FileText, RotateCcw } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { fetchConfig, fetchLoggingToFile, fetchRuntimeInfo, resetDefaultSettings, type RuntimeInfo, updateLoggingToFile } from "../api/client"

export function Settings() {
  const navigate = useNavigate()
  const [config, setConfig] = useState<any>(null)
  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [loggingToFile, setLoggingToFile] = useState(false)
  const [savingLogging, setSavingLogging] = useState(false)
  const [loggingMessage, setLoggingMessage] = useState<string | null>(null)
  const [loggingError, setLoggingError] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  const [resetMessage, setResetMessage] = useState<string | null>(null)
  const [resetError, setResetError] = useState<string | null>(null)

  const loadSettings = async () => {
    const [configData, loggingEnabled, runtimeData] = await Promise.all([
      fetchConfig(),
      fetchLoggingToFile(),
      fetchRuntimeInfo(),
    ])

    setConfig(configData)
    setLoggingToFile(loggingEnabled)
    setRuntimeInfo(runtimeData)
  }

  useEffect(() => {
    loadSettings()
      .then(() => {
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const handleToggleLoggingToFile = async () => {
    if (savingLogging) return
    const nextValue = !loggingToFile
    setSavingLogging(true)
    setLoggingError(null)
    setLoggingMessage(null)

    try {
      await updateLoggingToFile(nextValue)
      setLoggingToFile(nextValue)
      setLoggingMessage(nextValue ? "Enabled log-to-file successfully." : "Disabled log-to-file successfully.")
    } catch (err: any) {
      setLoggingError(err?.message || "Failed to update logging-to-file.")
    } finally {
      setSavingLogging(false)
    }
  }

  const handleResetDefault = async () => {
    if (resetting) return
    const confirmed = window.confirm("Reset to default and clear all current auth/cache/log/usage data? This action cannot be undone.")
    if (!confirmed) return
    const token = window.prompt("Type RESET to confirm")
    if ((token || "").trim().toUpperCase() !== "RESET") return

    setResetting(true)
    setResetMessage(null)
    setResetError(null)

    try {
      await resetDefaultSettings()
      localStorage.removeItem('proxyapi_chat_history_v1')
      await loadSettings()
      setResetMessage("Reset completed successfully. Redirecting to Dashboard...")
      window.setTimeout(() => navigate("/"), 300)
    } catch (err: any) {
      setResetError(err?.message || "Reset failed.")
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
     return <div className="flex items-center justify-center p-20 text-emerald-500 animate-pulse"><Loader2 className="w-8 h-8 animate-spin" /></div>
  }

  const runtimePaths = runtimeInfo?.paths || {}
  const cacheInfo = runtimeInfo?.cache || {}
  const usageInfo = runtimeInfo?.usage_statistics || {}
  const runtimePathRows = [
    {
      label: "Config file",
      value: runtimePaths.config_file,
      hint: "Active config.yaml currently loaded by the server.",
    },
    {
      label: "Auth directory",
      value: runtimePaths.auth_dir,
      hint: "OAuth/API credential files are stored here.",
    },
    {
      label: "Log directory",
      value: runtimePaths.log_dir,
      hint: "Directory used for rotating application logs.",
    },
    {
      label: "main.log",
      value: runtimePaths.log_file,
      hint: loggingToFile
        ? "Current live log file because logging-to-file is enabled."
        : "This file path is used once logging-to-file is enabled. Right now logs go to stdout.",
    },
    {
      label: "Dashboard usage snapshot",
      value: runtimePaths.usage_stats_file,
      hint: usageInfo.enabled
        ? "Dashboard analytics are now restored from this snapshot after restart."
        : "Usage statistics are disabled, so this snapshot is not updated.",
    },
    {
      label: "AMP secrets source",
      value: runtimePaths.amp_secrets_file,
      hint: "AMP module reads fallback secrets from this file when no explicit key/env var is set.",
    },
    {
      label: "WRITABLE_PATH",
      value: runtimePaths.writable_path || "Not set",
      hint: "If present, logs and usage snapshot resolve under this writable base path.",
    },
  ]

  const cacheRows = [
    {
      label: "Signature cache",
      value: cacheInfo.signature_cache?.path || "Memory only",
      hint: `TTL ${Math.round((cacheInfo.signature_cache?.ttl_seconds || 0) / 60)} minutes. Cleared on server restart.`,
    },
    {
      label: "AMP secret cache",
      value: cacheInfo.amp_secret_cache?.path || "Memory + file source",
      hint: `In-memory cache with source file fallback. TTL ${Math.round((cacheInfo.amp_secret_cache?.ttl_seconds || 0) / 60)} minutes.`,
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Settings</h1>
        <p className="text-gray-400">Configure global proxy behaviors, network settings, and security.</p>
      </div>

      <div className="space-y-6">
        {/* Network Box */}
        <section className="p-6 rounded-2xl bg-gray-800/40 border border-gray-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 border-b border-gray-700/50 pb-4 mb-5">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Network className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-200">Network & Proxy</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Proxy Port</label>
              <input
                type="number"
                defaultValue={config?.port}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
              <p className="text-xs text-gray-500">The port CLIProxyAPI listens on.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Timeout (seconds)</label>
              <input
                type="number"
                defaultValue={config?.timeout || 300}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
              <p className="text-xs text-gray-500">Maximum request duration before abortion.</p>
            </div>
          </div>
        </section>

        {/* Security Box */}
        <section className="p-6 rounded-2xl bg-gray-800/40 border border-gray-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 border-b border-gray-700/50 pb-4 mb-5">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-200">Security & TLS</h2>
          </div>

          <div className="space-y-5">
            <label className="flex items-center justify-between p-4 rounded-xl border border-gray-700/50 bg-gray-900/30 cursor-pointer hover:bg-gray-800/50 transition-colors">
              <div>
                <span className="block text-sm font-medium text-gray-200">Enable TLS / HTTPS</span>
                <span className="block text-xs text-gray-500 mt-1">Serve API via HTTPS using auto-generated certs.</span>
              </div>
              <div className={"relative inline-flex h-6 w-11 items-center rounded-full " + (config?.tls?.enable ? 'bg-emerald-500' : 'bg-gray-600')}>
                 <span className={"inline-block h-4 w-4 transform rounded-full bg-white transition " + (config?.tls?.enable ? 'translate-x-6' : 'translate-x-1')} />
              </div>
            </label>

            <label className="flex items-center justify-between p-4 rounded-xl border border-gray-700/50 bg-gray-900/30 cursor-pointer hover:bg-gray-800/50 transition-colors">
              <div>
                <span className="block text-sm font-medium text-gray-200">Commercial Mode</span>
                <span className="block text-xs text-gray-500 mt-1">Disables Auto-Open UI and generic error messages.</span>
              </div>
              <div className={"relative inline-flex h-6 w-11 items-center rounded-full " + (config?.commercial_mode ? 'bg-emerald-500' : 'bg-gray-600')}>
                 <span className={"inline-block h-4 w-4 transform rounded-full bg-white transition " + (config?.commercial_mode ? 'translate-x-6' : 'translate-x-1')} />
              </div>
            </label>

            <button
              type="button"
              onClick={handleToggleLoggingToFile}
              disabled={savingLogging}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-700/50 bg-gray-900/30 hover:bg-gray-800/50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="text-left">
                <span className="block text-sm font-medium text-gray-200">Log to file (logging-to-file)</span>
                <span className="block text-xs text-gray-500 mt-1">Enable this so Logs page reads live entries from log files.</span>
              </div>
              <div className={"relative inline-flex h-6 w-11 items-center rounded-full " + (loggingToFile ? 'bg-emerald-500' : 'bg-gray-600')}>
                 <span className={"inline-block h-4 w-4 transform rounded-full bg-white transition " + (loggingToFile ? 'translate-x-6' : 'translate-x-1')} />
              </div>
            </button>

            {savingLogging && <p className="text-xs text-blue-400">Updating configuration...</p>}
            {!savingLogging && loggingMessage && <p className="text-xs text-emerald-400">{loggingMessage}</p>}
            {!savingLogging && loggingError && <p className="text-xs text-red-400">{loggingError}</p>}
          </div>
        </section>

        <section className="p-6 rounded-2xl bg-gray-800/40 border border-gray-700/50 backdrop-blur-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-700/50 pb-4">
            <div className="p-2 bg-violet-500/10 rounded-lg">
              <Database className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-200">Runtime Paths & Persistence</h2>
              <p className="text-xs text-gray-500 mt-1">Resolved filesystem paths from the running server, plus cache behavior.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-emerald-200">Dashboard history persistence</p>
                <p className="text-xs text-emerald-300/80 mt-1">
                  {usageInfo.enabled
                    ? `Enabled. Usage snapshots are restored from ${usageInfo.persistence_file || 'the configured persistence file'} after restart.`
                    : "Disabled. Turn on usage-statistics-enabled if you want Dashboard data to keep accumulating and be restored after restart."}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${usageInfo.enabled ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200' : 'border-amber-500/40 bg-amber-500/15 text-amber-200'}`}>
                {usageInfo.enabled ? 'Persisted' : 'Disabled'}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {runtimePathRows.map(item => (
              <div key={item.label} className="rounded-xl border border-gray-700/50 bg-gray-900/30 p-4">
                <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-200">
                  <FileText className="w-4 h-4 text-violet-300" />
                  {item.label}
                </div>
                <div className="rounded-lg bg-black/30 border border-gray-800 px-3 py-2 font-mono text-xs text-gray-200 break-all">
                  {item.value || 'Unavailable'}
                </div>
                <p className="text-xs text-gray-500 mt-2">{item.hint}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cacheRows.map(item => (
              <div key={item.label} className="rounded-xl border border-gray-700/50 bg-gray-900/30 p-4">
                <p className="text-sm font-medium text-gray-200 mb-2">{item.label}</p>
                <div className="rounded-lg bg-black/30 border border-gray-800 px-3 py-2 font-mono text-xs text-gray-200 break-all">{item.value}</div>
                <p className="text-xs text-gray-500 mt-2">{item.hint}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleResetDefault}
              disabled={resetting}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-60 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl transition-colors font-medium shadow-lg shadow-red-500/20"
            >
              {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              Reset to Default
            </button>
            <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl transition-colors font-medium shadow-lg shadow-emerald-500/20">
              <Save className="w-4 h-4" />
              Save Configurations
            </button>
          </div>
        </div>
        {resetMessage && <p className="text-xs text-emerald-400 text-right">{resetMessage}</p>}
        {resetError && <p className="text-xs text-red-400 text-right">{resetError}</p>}
      </div>
    </div>
  )
}
