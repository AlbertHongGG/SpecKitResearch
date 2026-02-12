# Rollback / Mitigation Playbook（只讀模式）

> 本文件對應 `tasks.md` Phase 6 的回滾策略：在出現嚴重一致性/安全性問題時，先保留資料與稽核軌跡、停止寫入，再進行修復。

## Goal

- 保留所有 Document/ReviewTask/ApprovalRecord/AuditLog 歷史
- 停止新增寫入，避免資料進一步失真
- 提供可驗證的復原步驟

## Steps

1. Enable read-only mode
   - Set backend config flag: `READ_ONLY_MODE=true`
   - Verify all write routes return a clear error (expected: HTTP 409 `Conflict` with message "Read-only mode enabled")

2. Preserve database + attachments
   - Copy SQLite db file
   - Copy `backend/storage/attachments/`

3. Collect diagnostics
   - Export recent AuditLog entries for the incident window
   - Record requestId(s) for failed operations

4. Fix forward
   - Apply migration/hotfix
   - Re-run manual validation checklist

## Verification

- Users can still view documents they have access to
- Reviewers can still view assigned tasks (read-only)
- No route allows writes while in read-only mode
