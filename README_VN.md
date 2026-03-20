# ProxyAPI.MAD

[English](README.md) | Tiếng Việt

Giao diện quản trị + backend proxy cho CLI AI tools (OpenAI/Gemini/Claude/Codex-compatible), tối ưu cho chạy local và tự quản lý nhiều key/provider.

## 1) Tổng quan

Repo này gồm 2 phần chính:

- `proxyapi_core/`: Backend Go (API proxy + Management API).
- `frontend/`: Dashboard quản trị (React + Vite + TypeScript).

Mục tiêu: clone về, cấu hình nhanh, chạy local để quản lý provider/key/log/usage qua UI.

## 2) Yêu cầu môi trường

- Windows/macOS/Linux
- Go `>= 1.26` (theo `proxyapi_core/go.mod`)
- Node.js `>= 18` (khuyến nghị Node 20+)
- npm (hoặc pnpm/yarn nếu bạn tự quy đổi lệnh)

## 3) Cài đặt nhanh (Windows)

Tại thư mục gốc repo, chọn một trong hai cách chạy:

```bat
run-dev.bat
```

hoặc

```bat
run-real.bat
```

`run-dev.bat` sẽ:

1. Kiểm tra Go/Node đã cài.
2. Cài dependencies frontend nếu chưa có `node_modules`.
3. Chạy backend tại `http://localhost:8317`.
4. Chạy frontend dev tại `http://localhost:5173`.

`run-real.bat` sẽ:

1. Kiểm tra Go đã cài.
2. Chỉ chạy backend tại `http://localhost:8317`.

## 4) Cài đặt thủ công (mọi hệ điều hành)

### Bước 1: Backend config

```bash
cd proxyapi_core
cp config.example.yaml config.yaml
```

Mở `proxyapi_core/config.yaml` và chỉnh tối thiểu:

- `api-keys`: thêm key dùng cho client gọi qua proxy.
- `remote-management.secret-key`: thêm key quản trị để dùng API `/v0/management/*`.
- `usage-statistics-enabled: true` để bật thống kê usage.

> Lưu ý: nếu để `remote-management.secret-key` rỗng thì Management API sẽ bị tắt (404).

### Bước 2: Chạy backend

```bash
cd proxyapi_core
go run ./cmd/server
```

### Bước 3: Chạy frontend

```bash
cd frontend
npm install
npm run dev
```

Mở trình duyệt:

- Backend/Management: `http://localhost:8317`
- Frontend dev: `http://localhost:5173`

## 5) Build production frontend

```bash
cd frontend
npm run build
```

Build output ở `frontend/dist/`.

## 6) Log, cache, usage persistence

- Log backend nằm trong thư mục `logs/` (do backend resolve từ config).
- Usage stats được persist tự động vào file `logs/usage-stats.json` (nếu `usage-statistics-enabled: true`).
- Nếu bạn restart server mà Dashboard không còn dữ liệu cũ, kiểm tra:
	1. `usage-statistics-enabled` đã bật chưa.
	2. Quyền ghi thư mục log có cho phép tạo/cập nhật `usage-stats.json` không.

## 7) Cấu trúc thư mục

```text
ProxyAPI.MAD/
├─ frontend/          # Dashboard UI
├─ proxyapi_core/     # Go backend proxy + management
├─ run-dev.bat        # Script chạy dev nhanh (Windows)
├─ run-real.bat       # Script chạy backend-only (Windows)
└─ README.md
```

## 8) Các lệnh thường dùng

```bash
# chạy backend
cd proxyapi_core && go run ./cmd/server

# chạy nhanh backend-only (Windows helper)
run-real.bat

# chạy frontend dev
cd frontend && npm run dev

# build frontend
cd frontend && npm run build
```

## 9) Lưu ý bảo mật trước khi public

- Không commit `proxyapi_core/config.yaml` thật chứa key.
- Không commit thư mục runtime: `logs/`, `auths/`, `temp/`, `conv/`.
- Chỉ commit `config.example.yaml` và tài liệu hướng dẫn.

## 10) Reference

This project is adapted and referenced from:

- https://github.com/router-for-me/CLIProxyAPI

## 11) License

This project is licensed under MIT. See `LICENSE`.