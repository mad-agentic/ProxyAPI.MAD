# ProxyAPI.MAD

English | [Tiếng Việt](README_VN.md)

Admin dashboard + API proxy backend for CLI AI tools (OpenAI/Gemini/Claude/Codex compatible), optimized for local and self-managed multi-provider usage.

## Overview

<p align="center">
  <img src="docs/assets/01-dashboard.png" width="32%" alt="Dashboard" />
  <img src="docs/assets/02-apikeys.png" width="32%" alt="API Keys" />
  <img src="docs/assets/03-providers.png" width="32%" alt="Providers" />
  <img src="docs/assets/04-chat.png" width="32%" alt="Chat Interface" />
  <img src="docs/assets/05-logs.png" width="32%" alt="Logs" />
  <img src="docs/assets/06-settings.png" width="32%" alt="Settings" />
</p>

This workspace is organized into 2 runtime parts:

- `frontend/`: React + Vite + TypeScript management UI
- `proxyapi_core/`: Go backend (proxy API + management API)

Use this README for full-system setup. Detailed usage and provider docs are in:

- Full usage guide (EN): [Docs/index.md](Docs/index.md)
- Full usage guide (VI): [Docs/index_VN.md](Docs/index_VN.md)
- Frontend guide: [frontend/README.md](frontend/README.md)
- Backend guide: [proxyapi_core/README.md](proxyapi_core/README.md)

## Requirements

- Windows/macOS/Linux
- Go `>= 1.26.0` (from `proxyapi_core/go.mod`)
- Node.js `>= 18` (Node 20+ recommended)
- npm `>= 9`
- Docker + Docker Compose (optional)

## Quick Start (Windows)

Run from repository root:

```bat
run-dev.bat
```

This starts:

- Backend: `http://localhost:8317`
- Frontend dev server: `http://localhost:5173`

Backend-only mode:

```bat
run-real.bat
```

## Manual Setup (All OS)

### 1) Backend config

```bash
cd proxyapi_core
cp config.example.yaml config.yaml
```

Update at minimum:

- `api-keys`: client keys to call proxy APIs
- `remote-management.secret-key`: required for `/v0/management/*`
- `usage-statistics-enabled: true`: enable usage charts in dashboard
- `logging-to-file: true`: recommended for log viewer in dashboard

### 2) Run backend

```bash
cd proxyapi_core
go run ./cmd/server
```

### 3) Run frontend

```bash
cd frontend
npm install
npm run dev
```

Access:

- Backend API + Management API: `http://localhost:8317`
- Frontend UI (dev): `http://localhost:5173`

## Usage (Quick, referenced from full docs)

### How it works

Your SDK/CLI sends requests to ProxyAPI.MAD (`/v1`), and the proxy handles auth + routing to providers.

```text
Tool/SDK -> ProxyAPI.MAD (:8317) -> OpenAI/Claude/Gemini/...
```

### Connect your SDK/tool

- Set base URL to `http://localhost:8317/v1`
- Use one key from `api-keys` in `config.yaml`
- Test with:

```bash
curl http://localhost:8317/v1/models -H "Authorization: Bearer my-personal-key"
```

### Provider login commands

| Provider | Command |
|----------|---------|
| Claude | `go run ./cmd/server -claude-login` |
| Gemini API key | configure `providers.gemini[].api-key` in `config.yaml` |
| Gemini CLI | `go run ./cmd/server -login` |
| Vertex AI | `go run ./cmd/server -vertex-import /path/to/service-account.json` |
| OpenAI | `go run ./cmd/server -openai-device-login` |
| Codex | `go run ./cmd/server -codex-device-login` |
| Kimi | `go run ./cmd/server -kimi-login` |
| Qwen | `go run ./cmd/server -qwen-login` |
| iFlow | `go run ./cmd/server -iflow-login` or `-iflow-cookie` |
| Antigravity | `go run ./cmd/server -antigravity-login` |

### Management API quick checks

```bash
curl http://localhost:8317/v0/management/runtime-info -H "Authorization: Bearer my-management-secret"
curl http://localhost:8317/v0/management/config -H "Authorization: Bearer my-management-secret"
curl http://localhost:8317/v0/management/usage -H "Authorization: Bearer my-management-secret"
```

For complete provider/model examples, alias setup, streaming, thinking mode, and CLI integrations, see [Docs/index.md](Docs/index.md).

## Docker Run (Frontend + Backend)

```bash
cp proxyapi_core/config.example.yaml proxyapi_core/config.yaml
# edit config.yaml first
docker compose up -d --build
```

Access:

- Frontend: `http://localhost:5173`
- Backend API + Management API: `http://localhost:8317`

Useful commands:

```bash
docker compose logs -f
docker compose down
```

## Build

Frontend production build:

```bash
cd frontend
npm run build
```

Backend tests (optional):

```bash
cd proxyapi_core
go test ./...
```

## Runtime Notes

- If `remote-management.secret-key` is empty, management endpoints return 404.
- If `usage-statistics-enabled` is false, dashboard usage widgets may appear empty.
- Usage persistence file is `logs/usage-stats.json`.
- Dashboard log viewer needs `logging-to-file: true`.

## Repository Structure

```text
ProxyAPI.MAD/
├─ Docs/                      # Full usage guides (EN/VI)
├─ frontend/                  # React dashboard
├─ proxyapi_core/             # Go backend
├─ docker-compose.yml         # Full stack compose
├─ run-dev.bat                # Windows quick dev run (frontend + backend)
├─ run-real.bat               # Windows backend-only run
├─ README.md                  # Overall guide (EN)
└─ README_VN.md               # Overall guide (VI)
```

## Security Checklist

- Do not commit real secrets in `proxyapi_core/config.yaml`.
- Keep runtime folders (`logs/`, `auths/`, temp/cache data) out of version control.
- Rotate `remote-management.secret-key` and API keys regularly.

## Reference

This project is adapted from:

- https://github.com/router-for-me/CLIProxyAPI

## License

MIT License. See [LICENSE](LICENSE).
