# ProxyAPI.MAD

[English](README.md) | Tiếng Việt

Dashboard quản trị + backend proxy API cho CLI AI tools (OpenAI/Gemini/Claude/Codex compatible), tối ưu cho môi trường tự host và tự quản lý nhiều provider.

## Tổng quan

<p align="center">
  <img src="docs/assets/01-dashboard.png" width="32%" alt="Dashboard" />
  <img src="docs/assets/02-apikeys.png" width="32%" alt="API Keys" />
  <img src="docs/assets/03-providers.png" width="32%" alt="Providers" />
  <img src="docs/assets/04-chat.png" width="32%" alt="Chat Interface" />
  <img src="docs/assets/05-logs.png" width="32%" alt="Logs" />
  <img src="docs/assets/06-settings.png" width="32%" alt="Settings" />
</p>

Workspace gồm 2 khối runtime chính:

- `frontend/`: UI quản trị bằng React + Vite + TypeScript
- `proxyapi_core/`: Backend Go (proxy API + management API)

README này hướng dẫn chạy toàn hệ thống. Tài liệu chi tiết và đầy đủ hơn:

- Hướng dẫn sử dụng đầy đủ (EN): [Docs/index.md](Docs/index.md)
- Hướng dẫn sử dụng đầy đủ (VI): [Docs/index_VN.md](Docs/index_VN.md)
- Frontend: [frontend/README.md](frontend/README.md)
- Backend: [proxyapi_core/README.md](proxyapi_core/README.md)

## Yêu cầu môi trường

- Windows/macOS/Linux
- Go `>= 1.26.0` (theo `proxyapi_core/go.mod`)
- Node.js `>= 18` (khuyến nghị Node 20+)
- npm `>= 9`
- Docker + Docker Compose (tuỳ chọn)

## Chạy nhanh trên Windows

Tại thư mục gốc repo:

```bat
run-dev.bat
```

Script sẽ chạy:

- Backend: `http://localhost:8317`
- Frontend dev: `http://localhost:5173`

Chỉ chạy backend:

```bat
run-real.bat
```

## Cài đặt thủ công (mọi hệ điều hành)

### 1) Cấu hình backend

```bash
cd proxyapi_core
cp config.example.yaml config.yaml
```

Cập nhật tối thiểu:

- `api-keys`: key cho client gọi qua proxy
- `remote-management.secret-key`: bắt buộc để dùng `/v0/management/*`
- `usage-statistics-enabled: true`: bật thống kê usage cho dashboard
- `logging-to-file: true`: khuyến nghị nếu cần xem log trong dashboard

### 2) Chạy backend

```bash
cd proxyapi_core
go run ./cmd/server
```

### 3) Chạy frontend

```bash
cd frontend
npm install
npm run dev
```

Truy cập:

- Backend API + Management API: `http://localhost:8317`
- Frontend UI (dev): `http://localhost:5173`

## Cách dùng nhanh (tham khảo từ tài liệu đầy đủ)

### Cách hoạt động

SDK/CLI của bạn gọi vào ProxyAPI.MAD (`/v1`), proxy sẽ xử lý xác thực và định tuyến đến provider tương ứng.

```text
Tool/SDK -> ProxyAPI.MAD (:8317) -> OpenAI/Claude/Gemini/...
```

### Kết nối app/tool

- Đặt base URL thành `http://localhost:8317/v1`
- Dùng một key trong `api-keys` của `config.yaml`
- Test nhanh:

```bash
curl http://localhost:8317/v1/models -H "Authorization: Bearer my-personal-key"
```

### Lệnh xác thực provider

| Provider | Lệnh |
|----------|------|
| Claude | `go run ./cmd/server -claude-login` |
| Gemini API key | cấu hình `providers.gemini[].api-key` trong `config.yaml` |
| Gemini CLI | `go run ./cmd/server -login` |
| Vertex AI | `go run ./cmd/server -vertex-import /path/to/service-account.json` |
| OpenAI | `go run ./cmd/server -openai-device-login` |
| Codex | `go run ./cmd/server -codex-device-login` |
| Kimi | `go run ./cmd/server -kimi-login` |
| Qwen | `go run ./cmd/server -qwen-login` |
| iFlow | `go run ./cmd/server -iflow-login` hoặc `-iflow-cookie` |
| Antigravity | `go run ./cmd/server -antigravity-login` |

### Kiểm tra nhanh Management API

```bash
curl http://localhost:8317/v0/management/runtime-info -H "Authorization: Bearer my-management-secret"
curl http://localhost:8317/v0/management/config -H "Authorization: Bearer my-management-secret"
curl http://localhost:8317/v0/management/usage -H "Authorization: Bearer my-management-secret"
```

Ví dụ đầy đủ (model aliases, streaming, thinking, CLI integrations...) xem tại [Docs/index_VN.md](Docs/index_VN.md).

## Chạy bằng Docker (Frontend + Backend)

```bash
cp proxyapi_core/config.example.yaml proxyapi_core/config.yaml
# chỉnh config.yaml trước
docker compose up -d --build
```

Truy cập:

- Frontend: `http://localhost:5173`
- Backend API + Management API: `http://localhost:8317`

Lệnh hữu ích:

```bash
docker compose logs -f
docker compose down
```

## Build

Build frontend production:

```bash
cd frontend
npm run build
```

Chạy test backend (tuỳ chọn):

```bash
cd proxyapi_core
go test ./...
```

## Lưu ý runtime

- Nếu `remote-management.secret-key` rỗng thì endpoint management sẽ trả 404.
- Nếu `usage-statistics-enabled` là `false`, widget usage trên dashboard có thể trống.
- File persist usage là `logs/usage-stats.json`.
- Muốn xem log trong dashboard cần bật `logging-to-file: true`.

## Cấu trúc repo

```text
ProxyAPI.MAD/
├─ Docs/                      # Hướng dẫn sử dụng đầy đủ (EN/VI)
├─ frontend/                  # React dashboard
├─ proxyapi_core/             # Go backend
├─ docker-compose.yml         # Compose chạy full stack
├─ run-dev.bat                # Chạy nhanh Windows (frontend + backend)
├─ run-real.bat               # Chạy Windows backend-only
├─ README.md                  # Tài liệu tổng thể (EN)
└─ README_VN.md               # Tài liệu tổng thể (VI)
```

## Checklist bảo mật

- Không commit `proxyapi_core/config.yaml` thật có chứa secrets.
- Không commit thư mục runtime (`logs/`, `auths/`, temp/cache data).
- Nên xoay vòng `remote-management.secret-key` và API key định kỳ.

## Tham chiếu

Dự án tham khảo từ:

- https://github.com/router-for-me/CLIProxyAPI

## License

MIT License. Xem [LICENSE](LICENSE).
