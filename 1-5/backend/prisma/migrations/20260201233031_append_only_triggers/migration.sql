-- Enforce append-only semantics for audit/approval history.

CREATE TRIGGER IF NOT EXISTS trg_auditlog_no_update
BEFORE UPDATE ON "AuditLog"
BEGIN
	SELECT RAISE(ABORT, 'AuditLog is append-only: UPDATE is not allowed');
END;

CREATE TRIGGER IF NOT EXISTS trg_auditlog_no_delete
BEFORE DELETE ON "AuditLog"
BEGIN
	SELECT RAISE(ABORT, 'AuditLog is append-only: DELETE is not allowed');
END;

CREATE TRIGGER IF NOT EXISTS trg_approvalrecord_no_update
BEFORE UPDATE ON "ApprovalRecord"
BEGIN
	SELECT RAISE(ABORT, 'ApprovalRecord is append-only: UPDATE is not allowed');
END;

CREATE TRIGGER IF NOT EXISTS trg_approvalrecord_no_delete
BEFORE DELETE ON "ApprovalRecord"
BEGIN
	SELECT RAISE(ABORT, 'ApprovalRecord is append-only: DELETE is not allowed');
END;