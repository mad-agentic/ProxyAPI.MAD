# ProxyAPI.MAD — Hướng dẫn sử dụng

---

## Cách hoạt động

ProxyAPI.MAD đóng vai trò như một proxy cục bộ giữa công cụ AI của bạn và API của nhà cung cấp thực tế. Bạn trỏ SDK hoặc CLI tool vào proxy thay vì gọi trực tiếp đến nhà cung cấp — proxy sẽ xử lý xác thực, định tuyến đến đúng nhà cung cấp, và theo dõi usage.

```
App / CLI Tool của bạn
        │
        ▼ POST /v1/chat/completions
        │ Authorization: Bearer <api-key-của-bạn>
ProxyAPI.MAD  (:8317)
        │
        ├─▶ OpenAI / Codex
        ├─▶ Claude / Anthropic
        ├─▶ Gemini / Vertex AI
        ├─▶ Kimi / Qwen / iFlow
        └─▶ ...
```

---

## Bước 1: Khởi động proxy

```bash
cd proxyapi_core
go run ./cmd/server
```

Proxy lắng nghe tại `http://localhost:8317` theo mặc định.

---

## Bước 2: Đặt API key

Trong `proxyapi_core/config.yaml`, thêm ít nhất một client key — đây là key **app của bạn** dùng để xác thực với proxy (không phải key của nhà cung cấp upstream):

```yaml
api-keys:
  - my-personal-key

remote-management:
  secret-key: "my-management-secret"
```

---

## Bước 3: Kết nối app của bạn

Thay thế base URL của nhà cung cấp bằng URL của proxy trong SDK hoặc công cụ:

### OpenAI Python SDK

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8317/v1",
    api_key="my-personal-key",
)

response = client.chat.completions.create(
    model="claude-sonnet-4-5-20250929",
    messages=[{"role": "user", "content": "Xin chào!"}],
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
  messages: [{ role: "user", content: "Xin chào!" }],
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
    "messages": [{"role": "user", "content": "Xin chao!"}]
  }'
```

### Liệt kê model khả dụng

```bash
curl http://localhost:8317/v1/models \
  -H "Authorization: Bearer my-personal-key"
```

---

## Thiết lập nhà cung cấp

Mỗi nhà cung cấp cần xác thực riêng. Chạy lệnh đăng nhập bên dưới một lần — thông tin xác thực được lưu vào thư mục `auths/` và tự động làm mới.

---

### Claude / Anthropic

Đăng nhập OAuth (PKCE flow, qua trình duyệt):

```bash
go run ./cmd/server -claude-login
```

Làm theo hướng dẫn trên trình duyệt. Sau khi đăng nhập, model Claude khả dụng ngay lập tức.

**Model khả dụng:**

| Model | Mô tả |
|-------|-------|
| `claude-opus-4-6` | Mạnh nhất, chậm hơn |
| `claude-opus-4-5-20251101` | Opus 4.5 ổn định |
| `claude-sonnet-4-5-20250929` | Cân bằng tốc độ và chất lượng |
| `claude-haiku-4-5-20251001` | Claude nhanh nhất |

> Thông tin xác thực tự động làm mới ~4 giờ trước khi hết hạn.

---

### Gemini (qua API Key)

Thêm Gemini API key trực tiếp vào `config.yaml` — không cần lệnh đăng nhập:

```yaml
providers:
  gemini:
    - api-key: "AIzaSy..."
```

**Model khả dụng:**

| Model | Mô tả |
|-------|-------|
| `gemini-2.5-pro` | Mạnh nhất |
| `gemini-2.5-flash` | Nhanh, tiết kiệm |
| `gemini-2.5-flash-lite` | Nhẹ nhàng, throughput cao |
| `gemini-3-pro-preview` | Preview thế hệ mới |

---

### Gemini CLI (OAuth)

Đăng nhập Google OAuth qua trình duyệt:

```bash
go run ./cmd/server -login
# hoặc với project ID:
go run ./cmd/server -login -project_id "my-gcp-project"
```

---

### Vertex AI (Service Account)

Import file JSON service account của Google Cloud:

```bash
go run ./cmd/server -vertex-import /path/to/service-account.json
```

Service account phải có quyền Vertex AI API. Model khả dụng giống danh sách Gemini ở trên.

---

### OpenAI / Codex

Device code flow — không cần redirect trình duyệt:

```bash
# OpenAI device login
go run ./cmd/server -openai-device-login

# Codex device login
go run ./cmd/server -codex-device-login
```

Một device code và URL xác minh sẽ được in ra. Nhập code tại URL đó. Token tự động làm mới.

**Ví dụ model:** `gpt-5`, `gpt-5-codex`, `gpt-5-medium`

---

### Kimi (Moonshot AI)

Device code OAuth flow:

```bash
go run ./cmd/server -kimi-login
```

User code và URI xác minh sẽ hiển thị. Truy cập URL, nhập code và đăng nhập.

**Model khả dụng:** `kimi-k2`, `kimi-k2.5`, `kimi-k2-thinking`

---

### Qwen (Alibaba Cloud)

Device flow OAuth:

```bash
go run ./cmd/server -qwen-login
```

**Ví dụ model:** `qwen3.5-plus`, `qwen3-coder-plus`

---

### iFlow

Hai phương thức xác thực:

```bash
# OAuth qua trình duyệt
go run ./cmd/server -iflow-login

# Import cookie trực tiếp
go run ./cmd/server -iflow-cookie
```

**Ví dụ model:** `glm-4.7`, `glm-4.0`, `tstars2.0`

---

### Antigravity (nội bộ Google)

OAuth flow:

```bash
go run ./cmd/server -antigravity-login
```

Để liệt kê model khả dụng:

```bash
go run ./cmd/fetch_antigravity_models
```

---

## Đặt bí danh (Alias) cho model

Định nghĩa bí danh ngắn hơn cho tên model dài trong `config.yaml`:

```yaml
oauth-model-alias:
  - alias: "sonnet"
    model: "claude-sonnet-4-5-20250929"
  - alias: "flash"
    model: "gemini-2.5-flash"
  - alias: "kimi"
    model: "kimi-k2.5"
```

Sau đó dùng alias trong lời gọi API:

```bash
curl http://localhost:8317/v1/chat/completions \
  -H "Authorization: Bearer my-personal-key" \
  -d '{"model": "sonnet", "messages": [...]}'
```

---

## Streaming

Tất cả nhà cung cấp đều hỗ trợ streaming qua tham số `stream: true`:

```python
stream = client.chat.completions.create(
    model="gemini-2.5-flash",
    messages=[{"role": "user", "content": "Viết một bài thơ"}],
    stream=True,
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="", flush=True)
```

---

## Extended Thinking

Với model hỗ trợ thinking (Claude, Gemini):

```python
response = client.chat.completions.create(
    model="claude-sonnet-4-5-20250929",
    messages=[{"role": "user", "content": "Giải quyết từng bước..."}],
    extra_body={"thinking": {"type": "enabled", "budget_tokens": 8000}},
)
```

---

## Management API

Tất cả endpoint quản lý yêu cầu `secret-key` của bạn dưới dạng Bearer token:

```bash
# Runtime info (đường dẫn đã resolve, phiên bản)
curl http://localhost:8317/v0/management/runtime-info \
  -H "Authorization: Bearer my-management-secret"

# Cấu hình hiện tại
curl http://localhost:8317/v0/management/config \
  -H "Authorization: Bearer my-management-secret"

# Thống kê usage
curl http://localhost:8317/v0/management/usage \
  -H "Authorization: Bearer my-management-secret"
```

### Lấy URL đăng nhập OAuth (qua API)

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

## Tích hợp với công cụ CLI

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
      "title": "Claude qua Proxy",
      "provider": "openai",
      "model": "claude-sonnet-4-5-20250929",
      "apiBase": "http://localhost:8317/v1",
      "apiKey": "my-personal-key"
    },
    {
      "title": "Gemini Flash qua Proxy",
      "provider": "openai",
      "model": "gemini-2.5-flash",
      "apiBase": "http://localhost:8317/v1",
      "apiKey": "my-personal-key"
    }
  ]
}
```

### Biến môi trường

Hầu hết các công cụ nhận các biến môi trường chuẩn sau:

```bash
export OPENAI_API_KEY="my-personal-key"
export OPENAI_BASE_URL="http://localhost:8317/v1"
```

---

## Xử lý sự cố

| Vấn đề | Nguyên nhân | Cách xử lý |
|--------|-------------|-----------|
| `401 Unauthorized` | API key không khớp | Kiểm tra `api-keys` trong `config.yaml` |
| `404` ở endpoint management | Chưa đặt `secret-key` | Đặt `remote-management.secret-key` |
| Không tìm thấy model | Nhà cung cấp chưa xác thực | Chạy lệnh đăng nhập cho nhà cung cấp đó |
| Dashboard biểu đồ trống | Usage stats bị tắt | Đặt `usage-statistics-enabled: true` |
| Log viewer trống | File logging bị tắt | Đặt `logging-to-file: true` |
| OAuth login thất bại | Token hết hạn | Chạy lại lệnh đăng nhập của nhà cung cấp |
| Cổng đang được sử dụng | Cổng 8317 bị chiếm | Đổi `port:` trong `config.yaml` |

---

## Tài liệu SDK

Để xây dựng tích hợp tùy chỉnh:

| Tài liệu | Mô tả |
|---------|-------|
| [SDK Access](../proxyapi_core/docs/sdk-access.md) | Cách truy cập proxy SDK |
| [SDK Usage](../proxyapi_core/docs/sdk-usage.md) | Hướng dẫn bắt đầu |
| [SDK Advanced](../proxyapi_core/docs/sdk-advanced.md) | Các mẫu SDK nâng cao |
| [SDK Watcher](../proxyapi_core/docs/sdk-watcher.md) | Module SDK watcher |
