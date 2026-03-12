# Jira Lite Observability Contract

## Checklist

- Every HTTP request must emit a request identifier through the request-context middleware.
- Every structured log line must include a stable event name and timestamp.
- Authentication, authorization, workflow, archive, and audit-sensitive writes must produce audit log entries.
- Read-only rejections must preserve the request id in the API response body for correlation.
- Performance smoke checks must cover issue list reads and audit query reads before release.

## Log Field Contract

Application logs and audit-adjacent operational logs should contain these fields whenever applicable:

| Field | Required | Description |
|-------|----------|-------------|
| `timestamp` | Yes | ISO-8601 event time |
| `level` | Yes | Log severity |
| `message` | Yes | Human-readable event summary |
| `requestId` | Yes | Correlation id assigned per request |
| `context` | Yes | Nest logger context or module name |
| `actorUserId` | Conditional | Present for authenticated actor-driven events |
| `actorEmail` | Conditional | Present for audit-relevant actions |
| `organizationId` | Conditional | Present when org scope is known |
| `projectId` | Conditional | Present when project scope is known |
| `action` | Conditional | Audit-style action label such as `issue_updated` |
| `entityType` | Conditional | Resource category tied to the action |
| `entityId` | Conditional | Resource identifier tied to the action |
| `durationMs` | Recommended | Request or operation duration |

## Release Review

- Verify `GET /api/health` returns a request id.
- Verify login, invite, workflow update, archive, and suspension flows emit audit entries.
- Verify `ORG_SUSPENDED`, `PROJECT_ARCHIVED`, `CONFLICT`, and `CSRF_TOKEN_INVALID` responses are traceable through request ids and logs.
- Verify production alerting watches repeated auth failures and sustained audit query latency regressions.
