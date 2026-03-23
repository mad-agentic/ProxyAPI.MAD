# ProxyAPI.MAD

English | [Tiếng Việt](README_VN.md)

Admin dashboard + API proxy backend for CLI AI tools (OpenAI/Gemini/Claude/Codex compatible), optimized for local and self-managed multi-provider usage.

## Overview

This workspace is organized into 2 runtime parts:

- `frontend/`: React + Vite + TypeScript management UI
- `proxyapi_core/`: Go backend (proxy API + management API)

Use this README for full-system setup. Service-level details are in:

- Frontend guide: [`frontend/README.md`](frontend/README.md)
- Backend guide: [`proxyapi_core/README.md`](proxyapi_core/README.md)

## Requirements

- Windows/macOS/Linux
- Go `>= 1.26.0` (from `proxyapi_core/go.mod`)
- Node.js `>= 18` (Node 20+ recommended)
- npm `>= 9`
- Docker + Docker Compose (optional, for containerized run)

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

- `api-keys`: keys for client authentication to proxy APIs
- `remote-management.secret-key`: required for `/v0/management/*`
- `usage-statistics-enabled: true`: enable usage aggregation for dashboard charts
- `logging-to-file: true` (recommended when you need dashboard log viewer)

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

- If `remote-management.secret-key` is empty, management endpoints are disabled (404).
- If `usage-statistics-enabled` is false, dashboard usage widgets can appear empty.
- Usage persistence file is `logs/usage-stats.json` (resolved by backend runtime path logic).
- Log viewer needs file logging enabled (`logging-to-file: true`).

## Repository Structure

```text
ProxyAPI.MAD/
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
