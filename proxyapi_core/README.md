# ProxyAPI.MAD Backend (`proxyapi_core`)

Go backend for ProxyAPI.MAD, responsible for:

- OpenAI-compatible proxy endpoints for CLI AI tools
- Management API used by the frontend dashboard
- Auth/provider routing, usage tracking, and runtime logs

For full-stack setup, see root guide: [`../README.md`](../README.md).

## Requirements

- Go `>= 1.26.0`
- Access to provider credentials or OAuth flows (depending on your setup)

## Configure

```bash
cp config.example.yaml config.yaml
```

Minimum required fields in `config.yaml`:

- `api-keys`: keys accepted by proxy API requests
- `remote-management.secret-key`: key required by management endpoints

Recommended for dashboard experience:

- `usage-statistics-enabled: true`
- `logging-to-file: true`

Important behavior:

- Empty `remote-management.secret-key` disables `/v0/management/*` (404)
- With `usage-statistics-enabled: false`, usage graphs can be empty

## Run

```bash
go run ./cmd/server
```

Default address from config:

- `http://localhost:8317`

## Build and Test

Build server binary:

```bash
go build ./cmd/server
```

Run all tests:

```bash
go test ./...
```

## Docker (inside `proxyapi_core`)

```bash
docker compose up -d --build
docker compose logs -f
docker compose down
```

Or use root-level compose for full stack (`frontend` + `backend`).

## Runtime Data

- Config: `config.yaml`
- Logs: resolved `logs/` directory
- Usage persistence: `logs/usage-stats.json`
- Auth/runtime artifacts: `auths/` and related runtime directories

## API Notes

- Proxy endpoints are OpenAI-compatible (`/v1/...`)
- Management endpoints are under `/v0/management/...`
- Management API requires valid management secret key

## SDK and Docs

- `docs/sdk-usage.md`
- `docs/sdk-advanced.md`
- `docs/sdk-access.md`
- `docs/sdk-watcher.md`

## Security

- Do not commit real `config.yaml` with secrets
- Restrict management access (`remote-management.allow-remote: false`) unless needed
- Rotate keys periodically

## License

MIT License. See [`../LICENSE`](../LICENSE).