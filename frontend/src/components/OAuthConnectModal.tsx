import { useState } from 'react'
import { X, ExternalLink, Copy, Check, Loader2, ShieldCheck, Link2 } from 'lucide-react'
import { fetchAuthStatus, fetchOAuthUrl, postOAuthCallbackWithUrl } from '../api/client'

interface OAuthConnectModalProps {
  provider: string
  providerName: string
  onClose: () => void
  onSuccess: () => void
}

const PROVIDER_ICONS: Record<string, string> = {
  'gemini-cli': '🔵',
  claude: '🟠',
  codex: '🟢',
  antigravity: '🌟',
  qwen: '🟣',
  kimi: '🤖',
  iflow: '🔷',
}

type Step = 'idle' | 'loading-url' | 'show-url' | 'paste-callback' | 'verifying' | 'success' | 'error'

export function OAuthConnectModal({ provider, providerName, onClose, onSuccess }: OAuthConnectModalProps) {
  const [step, setStep] = useState<Step>('idle')
  const [authUrl, setAuthUrl] = useState('')
  const [oauthState, setOauthState] = useState('')
  const [pastedUrl, setPastedUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleStartOAuth = async () => {
    setStep('loading-url')
    setErrorMsg('')
    try {
      const data: any = await fetchOAuthUrl(provider)
      setAuthUrl(data.url || data.auth_url || data.authorization_url || '')
      setOauthState(String(data.state || '').trim())
      setStep('show-url')
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to get authorization URL')
      setStep('error')
    }
  }

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(authUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const handleOpenBrowser = () => {
    window.open(authUrl, '_blank')
  }

  const handleAlreadyAuthorized = async () => {
    if (!oauthState) {
      setErrorMsg('Missing OAuth state. Please retry from "Get Authorization URL" or paste callback URL.')
      setStep('error')
      return
    }

    setStep('verifying')
    try {
      const maxAttempts = 30
      let completed = false

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const statusData: any = await fetchAuthStatus(oauthState)
        const status = String(statusData?.status || '').toLowerCase().trim()

        if (status === 'ok') {
          completed = true
          break
        }

        if (status === 'error') {
          throw new Error(statusData?.error || 'OAuth authorization failed')
        }

        await sleep(1000)
      }

      if (!completed) {
        throw new Error('Still waiting for callback. Please paste callback URL if redirect failed.')
      }

      setStep('success')
      setTimeout(() => { onSuccess(); onClose() }, 1500)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Verification failed')
      setStep('error')
    }
  }

  const handlePasteCallback = async () => {
    const url = pastedUrl.trim()
    if (!url) return
    setStep('verifying')
    setErrorMsg('')
    try {
      await postOAuthCallbackWithUrl(provider, url)
      setStep('success')
      setTimeout(() => { onSuccess(); onClose() }, 1500)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to process callback URL')
      setStep('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{PROVIDER_ICONS[provider] || '🔌'}</span>
            <div>
              <h3 className="font-semibold text-gray-100">Connect {providerName}</h3>
              <p className="text-xs text-gray-400">Authorize via OAuth</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* IDLE: Initial State */}
          {step === 'idle' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-3xl">
                {PROVIDER_ICONS[provider] || '🔌'}
              </div>
              <div>
                <p className="text-gray-300 text-sm">
                  Connect your <span className="text-white font-medium">{providerName}</span> account via Google OAuth.
                </p>
              </div>
              <button
                onClick={handleStartOAuth}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Get Authorization URL
              </button>
              {/* Shortcut: paste existing callback URL */}
              <button
                onClick={() => setStep('paste-callback')}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-700 rounded-xl transition-colors"
              >
                <Link2 className="w-3.5 h-3.5" />
                Already have a callback URL? Paste it here
              </button>
            </div>
          )}

          {/* LOADING URL */}
          {step === 'loading-url' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-gray-400 text-sm">Generating authorization URL...</p>
            </div>
          )}

          {/* SHOW URL: Authorization URL */}
          {step === 'show-url' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Authorization URL
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800/50 px-3 py-2.5">
                  <span className="flex-1 truncate font-mono text-xs text-gray-300">
                    {authUrl.length > 60 ? authUrl.slice(0, 60) + '...' : authUrl}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Copy URL"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border border-gray-700 text-gray-300 hover:bg-gray-800 rounded-xl text-sm transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy URL'}
                </button>
                <button
                  onClick={handleOpenBrowser}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Browser
                </button>
              </div>

              {/* Step-by-step instructions */}
              <div className="rounded-xl bg-gray-800/50 border border-gray-700/50 p-3 space-y-2">
                <p className="text-xs font-medium text-gray-400">After opening the URL:</p>
                <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
                  <li>Sign in with your Google account</li>
                  <li>After authorization, browser will redirect to <code className="text-blue-400">localhost:51121</code></li>
                  <li>If that page shows an error – copy that full URL and use "Paste callback URL" below</li>
                  <li>Or click "I've authorized ✓" if the redirect was successful</li>
                </ol>
              </div>

              <div className="border-t border-gray-800 pt-4 space-y-2">
                <button
                  onClick={handleAlreadyAuthorized}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600/20 border border-emerald-600/40 text-emerald-400 hover:bg-emerald-600/30 rounded-xl text-sm font-medium transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                  I've authorized ✓ (redirect was successful)
                </button>
                <button
                  onClick={() => setStep('paste-callback')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-xl text-sm transition-colors"
                >
                  <Link2 className="w-4 h-4" />
                  Paste callback URL (if localhost:51121 failed)
                </button>
              </div>
            </div>
          )}

          {/* PASTE CALLBACK URL */}
          {step === 'paste-callback' && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-300 mb-1">Paste the full callback URL</p>
                <p className="text-xs text-gray-500 mb-3">
                  After Google redirects you, copy the URL from your browser's address bar. It can be either:
                  <br />• <code className="text-blue-400">http://localhost:51121/oauth-callback?state=...&code=...</code>
                  <br />• <code className="text-blue-400">http://127.0.0.1:8317/{"{provider}"}/callback?state=...&code=...</code>
                </p>
                <textarea
                  value={pastedUrl}
                  onChange={e => setPastedUrl(e.target.value)}
                  placeholder="Paste the full callback URL here..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-xs text-gray-300 font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep(authUrl ? 'show-url' : 'idle')}
                  className="flex-1 px-4 py-2.5 border border-gray-700 text-gray-400 hover:bg-gray-800 rounded-xl text-sm transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handlePasteCallback}
                  disabled={!pastedUrl.trim()}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  Submit Callback
                </button>
              </div>
            </div>
          )}

          {/* VERIFYING */}
          {step === 'verifying' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-gray-400 text-sm">Verifying and exchanging token...</p>
              <p className="text-xs text-gray-500">This may take 10-30 seconds</p>
            </div>
          )}

          {/* SUCCESS */}
          {step === 'success' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <Check className="w-7 h-7 text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-gray-200 font-medium">Connected!</p>
                <p className="text-gray-400 text-sm">{providerName} has been authorized successfully.</p>
              </div>
            </div>
          )}

          {/* ERROR */}
          {step === 'error' && (
            <div className="space-y-4">
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-red-400 text-sm">{errorMsg}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setStep('idle'); setErrorMsg(''); setPastedUrl('') }}
                  className="flex-1 px-4 py-2.5 border border-gray-700 text-gray-300 hover:bg-gray-800 rounded-xl text-sm transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded-xl text-sm transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer – Cancel */}
        {(step === 'idle' || step === 'show-url') && (
          <div className="px-5 pb-5">
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 text-sm text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
