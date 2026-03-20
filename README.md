# ProxyAPI.MAD

English | [Tiếng Việt](README_VN.md)

Admin dashboard + proxy backend for CLI AI tools (OpenAI/Gemini/Claude/Codex-compatible), optimized for local usage and self-managed multi-key/provider setups.

## 1) Overview

This repository has two main parts:

- `proxyapi_core/`: Backend Go (API proxy + Management API).
- `frontend/`: Admin dashboard (React + Vite + TypeScript).

Goal: clone, configure quickly, run locally, and manage providers/keys/logs/usage through the UI.

## 2) Requirements

- Windows/macOS/Linux
- Go `>= 1.26` (based on `proxyapi_core/go.mod`)
- Node.js `>= 18` (Node 20+ recommended)
- npm (or pnpm/yarn if you prefer equivalent commands)

## 3) Quick Start (Windows)

From the repository root, choose one mode:

```bat
run-dev.bat
```

or

```bat
run-real.bat
```

`run-dev.bat` will:

1. Check whether Go/Node are installed.
2. Install frontend dependencies if `node_modules` is missing.
3. Start backend at `http://localhost:8317`.
4. Start frontend dev server at `http://localhost:5173`.

`run-real.bat` will:

1. Check whether Go is installed.
2. Start backend only at `http://localhost:8317`.

## 4) Manual Setup (All OS)

### Step 1: Backend config

```bash
cd proxyapi_core
cp config.example.yaml config.yaml
```

Open `proxyapi_core/config.yaml` and set at least:

- `api-keys`: add keys for client requests via proxy.
- `remote-management.secret-key`: add a management key for `/v0/management/*` APIs.
- `usage-statistics-enabled: true` to enable usage statistics.

> Note: if `remote-management.secret-key` is empty, Management API is disabled (404).

### Step 2: Run backend

```bash
cd proxyapi_core
go run ./cmd/server
```

### Step 3: Run frontend

```bash
cd frontend
npm install
npm run dev
```

Open in browser:

- Backend/Management: `http://localhost:8317`
- Frontend dev: `http://localhost:5173`

## 5) Build Production Frontend

```bash
cd frontend
npm run build
```

Build output is in `frontend/dist/`.

## 6) Logs, Cache, Usage Persistence

- Backend logs are stored in the `logs/` directory (resolved from backend config).
- Usage stats are automatically persisted to `logs/usage-stats.json` (when `usage-statistics-enabled: true`).
- If dashboard data is missing after restart, check:
	1. `usage-statistics-enabled` is enabled.
	2. log directory write permissions allow creating/updating `usage-stats.json`.

## 7) Project Structure

```text
ProxyAPI.MAD/
├─ frontend/          # Dashboard UI
├─ proxyapi_core/     # Go backend proxy + management
├─ run-dev.bat        # Quick dev runner (Windows)
├─ run-real.bat       # Backend-only runner (Windows)
└─ README.md
```

## 8) Common Commands

```bash
# run backend
cd proxyapi_core && go run ./cmd/server

# run backend only (Windows helper)
run-real.bat

# run frontend dev
cd frontend && npm run dev

# build frontend
cd frontend && npm run build
```

## 9) Security Notes Before Publishing

- Do not commit a real `proxyapi_core/config.yaml` that contains secrets.
- Do not commit runtime directories: `logs/`, `auths/`, `temp/`, `conv/`.
- Commit only `config.example.yaml` and documentation.

## 10) Reference

This project is adapted and referenced from:

- https://github.com/router-for-me/CLIProxyAPI

## 11) License

This project is licensed under MIT. See `LICENSE`.