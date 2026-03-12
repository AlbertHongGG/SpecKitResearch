# Data Model: API Platform & Key Management System

本文件萃取 spec 的資料實體、欄位、關聯與驗證規則，供後續 schema 與契約設計使用。

## Entities

### User
- **Fields**:
  - id: uuid (PK)
  - email: string (unique, case-insensitive)
  - password_hash: string
  - role: enum(`developer`,`admin`)
  - status: enum(`active`,`disabled`)
  - created_at: datetime
  - last_login_at: datetime?
- **Validation**:
  - email 必須唯一且不分大小寫視為同一帳號
  - status=disabled 不可登入，且既有 session 必須失效

### UserSession
- **Fields**:
  - id: uuid (PK)
  - user_id: uuid (FK -> User.id)
  - created_at: datetime
  - expires_at: datetime
  - revoked_at: datetime?
  - last_seen_at: datetime?
- **Validation**:
  - revoked_at 設定後視為失效
  - expires_at 到期視為失效

### ApiService
- **Fields**:
  - id: uuid (PK)
  - name: string (unique)
  - description: string
  - status: enum(`active`,`disabled`)
  - created_at: datetime
- **Validation**:
  - name 唯一

### ApiEndpoint
- **Fields**:
  - id: uuid (PK)
  - service_id: uuid (FK -> ApiService.id)
  - method: enum(`GET`,`POST`,`PUT`,`PATCH`,`DELETE`)
  - path: string
  - description: string?
  - status: enum(`active`,`disabled`)
- **Validation**:
  - (service_id, method, path) 唯一

### ApiScope
- **Fields**:
  - id: uuid (PK)
  - name: string (unique, e.g., `user:read`)
  - description: string
  - created_at: datetime
- **Validation**:
  - name 唯一且可讀

### ApiScopeRule
- **Fields**:
  - id: uuid (PK)
  - scope_id: uuid (FK -> ApiScope.id)
  - endpoint_id: uuid (FK -> ApiEndpoint.id)
  - effect: enum(`allow`)
- **Validation**:
  - scope_id + endpoint_id 不得重複

### ApiKey
- **Fields**:
  - id: uuid (PK)
  - user_id: uuid (FK -> User.id)
  - name: string
  - hash: string (API key hash)
  - status: enum(`active`,`revoked`,`blocked`)
  - expires_at: datetime?
  - rate_limit_per_minute: int?
  - rate_limit_per_hour: int?
  - created_at: datetime
  - revoked_at: datetime?
  - last_used_at: datetime?
  - replaced_by_key_id: uuid? (FK -> ApiKey.id)
- **Validation**:
  - hash 僅存 hash，原文不得持久化
  - status=active 才能更新設定
  - expires_at 過期後視為無效

### ApiKeyScope
- **Fields**:
  - api_key_id: uuid (FK -> ApiKey.id)
  - scope_id: uuid (FK -> ApiScope.id)
- **Validation**:
  - (api_key_id, scope_id) 唯一

### ApiUsageLog
- **Fields**:
  - id: uuid (PK)
  - api_key_id: uuid
  - endpoint_id: uuid? (可為空)
  - http_method: string
  - path: string
  - status_code: int
  - response_time_ms: int
  - timestamp: datetime
- **Validation**:
  - 寫入為非同步，允許最終一致

### AuditLog
- **Fields**:
  - id: uuid (PK)
  - actor_user_id: uuid? (FK -> User.id)
  - actor_role: enum(`developer`,`admin`,`system`)
  - action: string
  - target_type: string
  - target_id: uuid?
  - metadata_json: text?
  - created_at: datetime
- **Validation**:
  - 敏感操作必須寫入 audit；寫入失敗則操作失敗

### BlockedIp (Optional)
- **Fields**:
  - id: uuid (PK)
  - ip_or_cidr: string
  - reason: string
  - status: enum(`active`,`inactive`)
  - created_at: datetime

### RateLimitBucket (實作層概念)
- **Fields**:
  - id: string (composite key: api_key_id + endpoint_id + window + start_ts)
  - api_key_id: uuid
  - endpoint_id: uuid?
  - window: enum(`minute`,`hour`)
  - start_ts: datetime
  - count: int
  - updated_at: datetime
- **Validation**:
  - 原子更新；過期可清理

## Relationships

- User 1:N ApiKey
- User 1:N UserSession
- ApiService 1:N ApiEndpoint
- ApiScope 1:N ApiScopeRule
- ApiEndpoint 1:N ApiScopeRule
- ApiKey M:N ApiScope (via ApiKeyScope)
- ApiKey 1:N ApiUsageLog
- User 1:N AuditLog

## State Transitions (摘要)

- User.status: active → disabled（Admin 操作）後，login/session/key 皆必須失效。
- ApiKey.status: active → revoked/blocked（Developer/Admin）後立即失效。
- ApiKey.replaced_by_key_id：rotation 設定時更新，不影響既有 usage log。
