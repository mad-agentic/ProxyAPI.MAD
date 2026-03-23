import { useState, useEffect, useMemo, useRef } from 'react'
import { Send, Bot, User, Loader2, MessageSquare, Zap, ChevronDown, Plus, Trash2 } from 'lucide-react'
import { CHAT_CONFIG_UPDATED_EVENT, fetchModels, sendChat, syncOpenAICompatibleModelsIfMissing } from '../api/client'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AgentPreset {
  id: string
  name: string
  systemPrompt: string
}

interface ChatConversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  model: string
  providerId: string
  agentId: string
  messages: Message[]
}

const HISTORY_STORAGE_KEY = 'proxyapi_chat_history_v1'
const FALLBACK_OPENAI_MODELS = ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4.1', 'gpt-4o']

const AGENTS: AgentPreset[] = [
  {
    id: 'default',
    name: 'Default Assistant',
    systemPrompt: 'You are a helpful AI assistant. Give concise, practical answers.',
  },
  {
    id: 'coder',
    name: 'Coding Agent',
    systemPrompt: 'You are a senior software engineer. Provide production-ready coding guidance with clear steps.',
  },
  {
    id: 'analyst',
    name: 'Data Analyst',
    systemPrompt: 'You are a data analyst. Focus on actionable insights, assumptions, and concise interpretation.',
  },
  {
    id: 'writer',
    name: 'Content Writer',
    systemPrompt: 'You are a writing assistant. Produce clear, polished, and audience-appropriate content.',
  },
]

function createNewConversation(defaultModel = ''): ChatConversation {
  const now = Date.now()
  const providerId = inferProviderFromModel(defaultModel)
  return {
    id: `chat-${now}-${Math.random().toString(36).slice(2, 8)}`,
    title: 'New chat',
    createdAt: now,
    updatedAt: now,
    model: defaultModel,
    providerId,
    agentId: 'default',
    messages: [],
  }
}

function inferProviderFromModel(model: string): string {
  const value = (model || '').toLowerCase()
  if (!value) return 'all'
  if (value.includes('claude')) return 'claude'
  if (value.includes('gemini')) return 'gemini'
  if (value.includes('gpt') || value.includes('openai')) return 'openai'
  if (value.includes('codex')) return 'codex'
  if (value.includes('qwen')) return 'qwen'
  if (value.includes('kimi')) return 'kimi'
  if (value.includes('iflow')) return 'iflow'
  if (value.includes('antigravity')) return 'antigravity'
  if (value.includes('deepseek')) return 'deepseek'
  if (value.includes('llama')) return 'llama'
  return 'other'
}

function getProviderLabel(providerId: string): string {
  const labels: Record<string, string> = {
    all: 'All Providers',
    claude: 'Claude',
    gemini: 'Gemini',
    openai: 'OpenAI/GPT',
    codex: 'Codex',
    qwen: 'Qwen',
    kimi: 'Kimi',
    iflow: 'iFlow',
    antigravity: 'Antigravity',
    deepseek: 'DeepSeek',
    llama: 'Llama',
    other: 'Other',
  }
  return labels[providerId] || providerId
}

function readFallbackModelsFromHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const unique = new Set<string>()
    for (const item of parsed) {
      const model = String(item?.model || '').trim()
      if (model) unique.add(model)
    }
    return Array.from(unique)
  } catch {
    return []
  }
}

export function Chat() {
  const [input, setInput] = useState('')
  const [models, setModels] = useState<string[]>([])
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingModels, setLoadingModels] = useState(true)
  const [modelsError, setModelsError] = useState('')
  const [modelsReloadToken, setModelsReloadToken] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activeConversation = useMemo(
    () => conversations.find(c => c.id === activeConversationId) || null,
    [conversations, activeConversationId]
  )
  const selectedModel = activeConversation?.model || ''
  const selectedAgentId = activeConversation?.agentId || 'default'

  const modelsByProvider = useMemo(() => {
    const grouped: Record<string, string[]> = {}
    for (const model of models) {
      const provider = inferProviderFromModel(model)
      if (!grouped[provider]) grouped[provider] = []
      grouped[provider].push(model)
    }
    Object.keys(grouped).forEach(provider => grouped[provider].sort((a, b) => a.localeCompare(b)))
    return grouped
  }, [models])

  const providerOptions = useMemo(() => {
    return Object.keys(modelsByProvider).sort((a, b) => getProviderLabel(a).localeCompare(getProviderLabel(b)))
  }, [modelsByProvider])

  const fallbackProvider = inferProviderFromModel(selectedModel)
  const selectedProviderIdRaw = activeConversation?.providerId || fallbackProvider
  const selectedProviderId = providerOptions.includes(selectedProviderIdRaw)
    ? selectedProviderIdRaw
    : (providerOptions[0] || 'other')
  const modelsInSelectedProvider = selectedProviderId === 'all'
    ? [...models].sort((a, b) => a.localeCompare(b))
    : (modelsByProvider[selectedProviderId] || [])

  const setActiveConversationPatch = (patch: Partial<ChatConversation>) => {
    if (!activeConversation) return
    setConversations(prev => prev.map(c => {
      if (c.id !== activeConversation.id) return c
      return { ...c, ...patch, updatedAt: Date.now() }
    }))
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return
      const hydrated = parsed
        .filter(Boolean)
        .map((c: any) => ({
          ...c,
          providerId: c?.providerId || inferProviderFromModel(c?.model || ''),
        })) as ChatConversation[]
      if (hydrated.length > 0) {
        setConversations(hydrated)
        setActiveConversationId(hydrated[0].id)
      }
    } catch (err) {
      console.error('Failed to load chat history:', err)
    }
  }, [])

  useEffect(() => {
    if (conversations.length === 0) return
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(conversations.slice(0, 50)))
  }, [conversations])

  useEffect(() => {
    let cancelled = false

    setLoadingModels(true)
    const loadModels = async () => {
      let ids = await fetchModels()
      if (ids.length === 0) {
        try {
          const recoveredCount = await syncOpenAICompatibleModelsIfMissing('openai')
          if (recoveredCount > 0) {
            ids = await fetchModels()
          }
        } catch (recoveryErr) {
          console.error('Failed to recover OpenAI-compatible models:', recoveryErr)
        }
      }

      if (ids.length === 0) {
        const fromHistory = readFallbackModelsFromHistory()
        if (fromHistory.length > 0) {
          ids = fromHistory
        } else {
          ids = [...FALLBACK_OPENAI_MODELS]
        }
      }

      return ids
    }

    loadModels()
      .then(ids => {
        if (cancelled) return
        setModels(ids)
        const firstModel = ids[0] || ''
        setConversations(prev => {
          if (prev.length === 0) {
            const created = createNewConversation(firstModel)
            setActiveConversationId(created.id)
            return [created]
          }
          return prev.map(c => {
            if (c.model && c.providerId) return c
            const resolvedModel = c.model || firstModel
            return {
              ...c,
              model: resolvedModel,
              providerId: c.providerId || inferProviderFromModel(resolvedModel),
            }
          })
        })
        const noModelsMessage = 'No models available. Add a provider model list or reconnect the provider API key.'
        setModelsError(ids.length === 0 ? noModelsMessage : '')
      })
      .catch(err => {
        if (cancelled) return
        const details = err?.message ? ` (${err.message})` : ''
        setModelsError(`Could not load models. Make sure a provider is connected${details}.`)
        console.error('Failed to fetch models:', err)
      })
      .finally(() => {
        if (cancelled) return
        setLoadingModels(false)
      })

    return () => {
      cancelled = true
    }
  }, [modelsReloadToken])

  useEffect(() => {
    const handleChatConfigUpdated = () => {
      setModelsReloadToken(value => value + 1)
    }

    window.addEventListener(CHAT_CONFIG_UPDATED_EVENT, handleChatConfigUpdated)
    return () => window.removeEventListener(CHAT_CONFIG_UPDATED_EVENT, handleChatConfigUpdated)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConversation?.messages, isLoading])

  useEffect(() => {
    if (!activeConversation || models.length === 0) return

    const providerId = activeConversation.providerId || inferProviderFromModel(activeConversation.model)
    const allowedModels = providerId === 'all'
      ? [...models].sort((a, b) => a.localeCompare(b))
      : (modelsByProvider[providerId] || [])

    if (allowedModels.length === 0) {
      const firstProvider = providerOptions[0]
      if (!firstProvider) return
      const firstModel = (modelsByProvider[firstProvider] || [])[0] || models[0] || ''
      if (firstModel) {
        setActiveConversationPatch({ providerId: firstProvider, model: firstModel })
      }
      return
    }

    if (!allowedModels.includes(activeConversation.model)) {
      setActiveConversationPatch({ model: allowedModels[0] || '' })
    }
  }, [activeConversationId, models, modelsByProvider, providerOptions])

  const startNewChat = () => {
    const newConversation = createNewConversation(models[0] || '')
    setConversations(prev => [newConversation, ...prev])
    setActiveConversationId(newConversation.id)
    setInput('')
  }

  const deleteConversation = (id: string) => {
    setConversations(prev => {
      const next = prev.filter(c => c.id !== id)
      if (next.length === 0) {
        const created = createNewConversation(models[0] || '')
        setActiveConversationId(created.id)
        return [created]
      }
      if (activeConversationId === id) {
        setActiveConversationId(next[0].id)
      }
      return next
    })
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || isLoading || !selectedModel || !activeConversation) return

    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const newMessages: Message[] = [...activeConversation.messages, { role: 'user', content: text }]
    const nextTitle = activeConversation.messages.length === 0
      ? text.slice(0, 42) + (text.length > 42 ? '…' : '')
      : activeConversation.title

    setActiveConversationPatch({ messages: newMessages, title: nextTitle })
    setIsLoading(true)

    try {
      const selectedAgent = AGENTS.find(agent => agent.id === selectedAgentId) || AGENTS[0]
      const requestMessages = [
        { role: 'system', content: selectedAgent.systemPrompt },
        ...newMessages,
      ]

      const reply = await sendChat(selectedModel, requestMessages)
      setActiveConversationPatch({ messages: [...newMessages, { role: 'assistant', content: reply }] })
    } catch (err: any) {
      setActiveConversationPatch({ messages: [...newMessages, {
        role: 'assistant',
        content: `**Error:** ${err?.message || String(err)}`
      }] })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const isDisabled = isLoading || models.length === 0 || !selectedModel || !activeConversation

  const handleProviderChange = (providerId: string) => {
    if (!activeConversation) return
    const providerModels = providerId === 'all'
      ? [...models].sort((a, b) => a.localeCompare(b))
      : (modelsByProvider[providerId] || [])
    const nextModel = providerModels.includes(activeConversation.model)
      ? activeConversation.model
      : (providerModels[0] || '')

    setActiveConversationPatch({ providerId, model: nextModel })
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] -mx-8 -mt-8 -mb-8">
      <aside className="w-72 border-r border-gray-800 bg-gray-900/80 backdrop-blur-sm p-4 flex flex-col gap-3">
        <button
          onClick={startNewChat}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New chat
        </button>

        <div className="text-xs text-gray-500 px-1">History</div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {conversations.map(conversation => {
            const active = conversation.id === activeConversationId
            return (
              <button
                key={conversation.id}
                onClick={() => setActiveConversationId(conversation.id)}
                className={
                  'w-full text-left rounded-xl border px-3 py-2.5 transition-colors group ' +
                  (active
                    ? 'bg-blue-500/15 border-blue-500/40'
                    : 'bg-gray-800/40 border-gray-700/50 hover:border-gray-600')
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-200 truncate">{conversation.title || 'New chat'}</p>
                    <p className="text-[11px] text-gray-500 truncate mt-1">{conversation.model || 'No model selected'}</p>
                  </div>
                  <span
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteConversation(conversation.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity"
                    role="button"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      <div className="flex flex-col flex-1">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-gray-200">Chat Playground</span>
          </div>

          {/* Provider + Model + Agent selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Agent:</span>
            <div className="relative">
              <select
                value={selectedAgentId}
                onChange={e => setActiveConversationPatch({ agentId: e.target.value })}
                disabled={!activeConversation}
                className="appearance-none pl-3 pr-8 py-1.5 text-xs text-gray-200 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
              >
                {AGENTS.map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {loadingModels ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-800 border border-gray-700">
                <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                <span className="text-xs text-gray-400">Loading...</span>
              </div>
            ) : models.length === 0 ? (
              <div className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                No models available
              </div>
            ) : (
              <>
                <span className="text-xs text-gray-500 ml-2">Provider:</span>
                <div className="relative">
                  <select
                    value={selectedProviderId}
                    onChange={e => handleProviderChange(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-1.5 text-xs text-gray-200 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                  >
                    {providerOptions.map(providerId => (
                      <option key={providerId} value={providerId}>{getProviderLabel(providerId)}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <span className="text-xs text-gray-500 ml-2">Model:</span>
                <div className="relative">
                  <select
                    value={selectedModel}
                    onChange={e => setActiveConversationPatch({ model: e.target.value, providerId: inferProviderFromModel(e.target.value) })}
                    className="appearance-none pl-3 pr-8 py-1.5 text-xs text-gray-200 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                  >
                    {modelsInSelectedProvider.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Empty State */}
          {(activeConversation?.messages.length || 0) === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Bot className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-200 mb-2">Chat Playground</h2>
                {modelsError ? (
                  <div className="space-y-2">
                    <p className="text-red-400 text-sm max-w-sm">{modelsError}</p>
                    <a
                      href="/providers"
                      className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <Zap className="w-4 h-4" />
                      Connect a Provider →
                    </a>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm max-w-sm">
                    {models.length > 0
                      ? 'Select an agent + model, then start chatting. Your history is auto-saved on this browser.'
                      : 'Loading available models...'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Message Bubbles */}
          {(activeConversation?.messages || []).map((msg, idx) => (
            <div
              key={idx}
              className={"flex gap-3 " + (msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 shrink-0 mt-1 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-blue-400" />
                </div>
              )}
              <div
                className={
                  "max-w-[78%] rounded-2xl px-4 py-3 text-sm break-words " +
                  (msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-800/80 text-gray-200 border border-gray-700/60 rounded-bl-sm')
                }
              >
                <pre className="whitespace-pre-wrap font-sans leading-relaxed">{msg.content}</pre>
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 shrink-0 mt-1 rounded-full bg-gray-700 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-gray-300" />
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 shrink-0 mt-1 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="bg-gray-800/80 border border-gray-700/60 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1.5 items-center">
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-800 bg-gray-900 px-6 py-4">
          <form onSubmit={handleSubmit} className="flex gap-3 items-end max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={isDisabled}
                placeholder={
                  models.length === 0
                    ? 'Connect a provider first to start chatting...'
                    : 'Type your message... (Enter to send, Shift+Enter for new line)'
                }
                rows={1}
                style={{ minHeight: '44px', maxHeight: '120px' }}
                className="w-full resize-none rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 pr-12 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isDisabled || !input.trim()}
              className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
          <p className="text-center text-xs text-gray-600 mt-2">
            Chat history is saved on this browser. Shift+Enter for new line.
          </p>
        </div>
      </div>
    </div>
  )
}
