# ProxyAPI.MAD — Usage Guide

---

## How It Works

ProxyAPI.MAD acts as a local proxy between your AI tools and the actual provider APIs. You point your SDK or CLI tool at the proxy instead of the provider directly — the proxy handles authentication, provider routing, and usage tracking.

```
Your App / CLI Tool
        │
        ▼ POST /v1/chat/completions
        │ Authorization: Bearer <your-api-key>
ProxyAPI.MAD  (:8317)
        │
        ├─▶ OpenAI / Codex
        ├─▶ Claude / Anthropic
        ├─▶ Gemini / Vertex AI
        ├─▶ Kimi / Qwen / iFlow
        └─▶ ...
```

---

## Step 1: Start the Proxy

```bash
cd proxyapi_core
go run ./cmd/server
```

The proxy listens on `http://localhost:8317` by default.

---

## Step 2: Set Your API Key

In `proxyapi_core/config.yaml`, add at least one client key — this is the key **your app** uses to authenticate with the proxy (not the upstream provider key):

```yaml
api-keys:
  - my-personal-key

remote-management:
  secret-key: "my-management-secret"
```

---

## Step 3: Connect Your App

Replace the provider's base URL with the proxy URL in your SDK or tool:

### OpenAI Python SDK

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8317/v1",
    api_key="my-personal-key",
)

response = client.chat.completions.create(
    model="claude-sonnet-4-5-20250929",
    messages=[{"role": "user", "content": "Hello!"}],
)
print(response.choices[0].message.content)
```

### OpenAI Node.js SDK

```javascript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://localhost:8317/v1",
  apiKey: "my-personal-key",
});

const response = await client.chat.completions.create({
  model: "gemini-2.5-flash",
  messages: [{ role: "user", content: "Hello!" }],
});
console.log(response.choices[0].message.content);
```

### curl

```bash
curl http://localhost:8317/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer my-personal-key" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### List Available Models

```bash
curl http://localhost:8317/v1/models \
  -H "Authorization: Bearer my-personal-key"
```

---

## Provider Setup

Each provider requires separate authentication. Run the login commands below once — credentials are stored in the `auths/` directory and auto-refreshed.

---

### Claude / Anthropic

OAuth login (PKCE flow, browser-based):

```bash
go run ./cmd/server -claude-login
```

Follow the browser prompt. After login, Claude models become available immediately.

**Available models:**

| Model | Description |
|-------|-------------|
| `claude-opus-4-6` | Most capable, slower |
| `claude-opus-4-5-20251101` | Opus 4.5 stable |
| `claude-sonnet-4-5-20250929` | Balanced speed & quality |
| `claude-haiku-4-5-20251001` | Fastest Claude model |

> Credentials refresh automatically ~4 hours before expiry.

---

### Gemini (via API Key)

Add your Gemini API key directly to `config.yaml` — no login command needed:

```yaml
providers:
  gemini:
    - api-key: "AIzaSy..."
```

**Available models:**

| Model | Description |
|-------|-------------|
| `gemini-2.5-pro` | Most capable Gemini model |
| `gemini-2.5-flash` | Fast, cost-effective |
| `gemini-2.5-flash-lite` | Lightweight, high throughput |
| `gemini-3-pro-preview` | Next-gen preview |

---

### Gemini CLI (OAuth)

Browser-based Google OAuth login:

```bash
go run ./cmd/server -login
# optionally with project ID:
go run ./cmd/server -login -project_id "my-gcp-project"
```

---

### Vertex AI (Service Account)

Import a Google Cloud service account JSON file:

```bash
go run ./cmd/server -vertex-import /path/to/service-account.json
```

The service account must have Vertex AI API permissions. Available models are the same Gemini model names listed above.

---

### OpenAI / Codex

Device code flow — no browser redirect needed:

```bash
# Standard OpenAI device login
go run ./cmd/server -openai-device-login

# Codex device login
go run ./cmd/server -codex-device-login
```

A device code and verification URL will be printed. Enter the code at the URL. Token refreshes automatically.

**Example models:** `gpt-5`, `gpt-5-codex`, `gpt-5-medium`

---

### Kimi (Moonshot AI)

Device code OAuth flow:

```bash
go run ./cmd/server -kimi-login
```

A user code and verification URI are displayed. Visit the URL, enter the code, and login.

**Available models:** `kimi-k2`, `kimi-k2.5`, `kimi-k2-thinking`

---

### Qwen (Alibaba Cloud)

Device flow OAuth:

```bash
go run ./cmd/server -qwen-login
```

**Example models:** `qwen3.5-plus`, `qwen3-coder-plus`

---

### iFlow

Two authentication methods available:

```bash
# OAuth browser flow
go run ./cmd/server -iflow-login

# Direct cookie import
go run ./cmd/server -iflow-cookie
```

**Example models:** `glm-4.7`, `glm-4.0`, `tstars2.0`

---

### Antigravity (Google internal)

OAuth flow:

```bash
go run ./cmd/server -antigravity-login
```

To list available models:

```bash
go run ./cmd/fetch_antigravity_models
```

---

## Model Aliases

Define shorter aliases for long model names in `config.yaml`:

```yaml
oauth-model-alias:
  - alias: "sonnet"
    model: "claude-sonnet-4-5-20250929"
  - alias: "flash"
    model: "gemini-2.5-flash"
  - alias: "kimi"
    model: "kimi-k2.5"
```

Then use the alias in your API calls:

```bash
curl http://localhost:8317/v1/chat/completions \
  -H "Authorization: Bearer my-personal-key" \
  -d '{"model": "sonnet", "messages": [...]}'
```

---

## Streaming

All providers support streaming via the standard `stream: true` parameter:

```python
stream = client.chat.completions.create(
    model="gemini-2.5-flash",
    messages=[{"role": "user", "content": "Write a poem"}],
    stream=True,
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="", flush=True)
```

---

## Extended Thinking

For models that support thinking (Claude, Gemini):

```python
response = client.chat.completions.create(
    model="claude-sonnet-4-5-20250929",
    messages=[{"role": "user", "content": "Solve this step by step..."}],
    extra_body={"thinking": {"type": "enabled", "budget_tokens": 8000}},
)
```

---

## Management API

All management endpoints require your `secret-key` as a Bearer token:

```bash
# Runtime info (resolved paths, version)
curl http://localhost:8317/v0/management/runtime-info \
  -H "Authorization: Bearer my-management-secret"

# Current config
curl http://localhost:8317/v0/management/config \
  -H "Authorization: Bearer my-management-secret"

# Usage statistics
curl http://localhost:8317/v0/management/usage \
  -H "Authorization: Bearer my-management-secret"
```

### Get OAuth Login URLs (via API)

```bash
# Claude
curl http://localhost:8317/v0/management/anthropic-auth-url \
  -H "Authorization: Bearer my-management-secret"

# Codex
curl http://localhost:8317/v0/management/codex-auth-url \
  -H "Authorization: Bearer my-management-secret"

# Gemini CLI
curl http://localhost:8317/v0/management/gemini-cli-auth-url \
  -H "Authorization: Bearer my-management-secret"
```

### Import Vertex Service Account

```bash
curl -X POST http://localhost:8317/v0/management/vertex/import \
  -H "Authorization: Bearer my-management-secret" \
  -H "Content-Type: application/json" \
  -d @service-account.json
```

---

## CLI Tool Integration Examples

### Aider

```bash
aider --openai-api-base http://localhost:8317/v1 \
      --openai-api-key my-personal-key \
      --model claude-sonnet-4-5-20250929
```

### Continue.dev (`~/.continue/config.json`)

```json
{
  "models": [
    {
      "title": "Claude via Proxy",
      "provider": "openai",
      "model": "claude-sonnet-4-5-20250929",
      "apiBase": "http://localhost:8317/v1",
      "apiKey": "my-personal-key"
    },
    {
      "title": "Gemini Flash via Proxy",
      "provider": "openai",
      "model": "gemini-2.5-flash",
      "apiBase": "http://localhost:8317/v1",
      "apiKey": "my-personal-key"
    }
  ]
}
```

### Environment Variables

Most tools respect these standard env vars:

```bash
export OPENAI_API_KEY="my-personal-key"
export OPENAI_BASE_URL="http://localhost:8317/v1"
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `401 Unauthorized` | API key mismatch | Check `api-keys` in `config.yaml` |
| `404` on management endpoints | `secret-key` not set | Set `remote-management.secret-key` |
| Model not found | Provider not authenticated | Run the login command for that provider |
| Dashboard charts empty | Usage stats disabled | Set `usage-statistics-enabled: true` |
| Log viewer empty | File logging disabled | Set `logging-to-file: true` |
| OAuth login fails | Token expired | Re-run the provider login command |
| Port already in use | Port 8317 occupied | Change `port:` in `config.yaml` |

---

## SDK Documentation

For building custom integrations on top of the proxy:

| Document | Description |
|----------|-------------|
| [SDK Access](../proxyapi_core/docs/sdk-access.md) | How to access the proxy SDK |
| [SDK Usage](../proxyapi_core/docs/sdk-usage.md) | Getting started guide |
| [SDK Advanced](../proxyapi_core/docs/sdk-advanced.md) | Advanced SDK patterns |
| [SDK Watcher](../proxyapi_core/docs/sdk-watcher.md) | SDK watcher module |
