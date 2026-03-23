# ProxyAPI.MAD Frontend (`frontend`)

React + Vite dashboard for managing ProxyAPI.MAD backend:

- Provider/account status
- API key management
- Logs and usage views
- Runtime settings and diagnostics

For full-system setup, see [`../README.md`](../README.md).

## Requirements

- Node.js `>= 18` (Node 20+ recommended)
- npm `>= 9`

## Install

```bash
npm install
```

## Run (Development)

```bash
npm run dev
```

Default URL:

- `http://localhost:5173`

Backend must be running and reachable (default `http://localhost:8317`).

## Build

```bash
npm run build
```

Build output:

- `dist/`

## Preview Production Build

```bash
npm run preview
```

## Scripts

- `npm run dev`: start Vite dev server
- `npm run build`: TypeScript build + Vite production build
- `npm run lint`: run ESLint
- `npm run preview`: preview built app

## Docker

The Docker image is defined in `frontend/Dockerfile`.

When running root-level `docker-compose.yml`, frontend is served at:

- `http://localhost:5173`

## Notes

- API client config is in `src/api/client.ts`.
- If dashboard panels appear empty, verify backend config:
  - `remote-management.secret-key` is set
  - `usage-statistics-enabled: true`
  - `logging-to-file: true` for log viewer

## License

MIT License. See [`../LICENSE`](../LICENSE).
