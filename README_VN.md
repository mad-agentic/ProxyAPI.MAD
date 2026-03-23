# ProxyAPI.MAD

[English](README.md) | Tiếng Việt

Dashboard quản trị + backend proxy API cho CLI AI tools (OpenAI/Gemini/Claude/Codex compatible), tối ưu cho môi trường tự host và tự quản lý nhiều provider.

## Tổng quan

Workspace gồm 2 khối runtime chính:

- `frontend/`: UI quản trị bằng React + Vite + TypeScript
- `proxyapi_core/`: Backend Go (proxy API + management API)

README này hướng dẫn chạy toàn hệ thống. Tài liệu chi tiết từng phần:

- Frontend: [`frontend/README.md`](frontend/README.md)
- Backend: [`proxyapi_core/README.md`](proxyapi_core/README.md)

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
- `logging-to-file: true` (khuyến nghị nếu cần xem log trong dashboard)

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
- File persist usage là `logs/usage-stats.json` (được backend resolve theo runtime path).
- Muốn xem log trong dashboard cần bật `logging-to-file: true`.

## Cấu trúc repo

```text
ProxyAPI.MAD/
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