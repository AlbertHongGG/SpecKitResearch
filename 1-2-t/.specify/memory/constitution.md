# Leave Management System Constitution

## Core Principles

### I. Spec-First & Contract-First

- Features MUST be driven by a written feature spec and an explicit API/data contract.
- Contracts MUST define success responses and error semantics (401/403/404/409/422 where applicable).
- If a requirement is unknown, it MUST be recorded as NEEDS CLARIFICATION and resolved before implementation.

### II. Server-Enforced Security & Scope

- All authorization MUST be enforced server-side.
- UI may hide actions, but MUST NOT be treated as a security boundary.
- Sensitive data MUST be minimized in responses and never leaked via error messages.

### III. Consistency via Transactions (Non-Negotiable)

- State transitions that affect balances (submit/cancel/approve/reject) MUST be atomic.
- Ledger entries and balance aggregates MUST remain consistent under retries and concurrency.
- Irreversible decisions (approved/rejected) MUST be enforced by the service.

### IV. Test Strategy

- High-risk business invariants (state machine, conflicts, quota/reservation) MUST be covered by automated tests.
- API contract behavior and authorization boundaries SHOULD be covered by integration tests.

### V. Observability & Operability

- Key actions MUST be logged with actor, target, timestamps, and decision metadata.
- Errors MUST be diagnosable using request identifiers and structured logs.

## Additional Constraints

- Prefer simple, explicit designs over unnecessary abstractions.
- Keep the number of moving parts minimal for MVP; design extension points (holidays, half-day, external file storage) without implementing them prematurely.

## Development Workflow & Quality Gates

- Gate A (Spec): feature spec is complete, with no unresolved NEEDS CLARIFICATION.
- Gate B (Design): data model + contracts are produced before coding.
- Gate C (Security): all endpoints have authentication + authorization enforcement.
- Gate D (Consistency): submit/approve/reject/cancel operations are transactional and idempotent under retries.

## Governance

- This constitution supersedes local conventions for the project.
- Changes require documentation of impact, migration plan (if needed), and review.

**Version**: 1.0.0 | **Ratified**: 2026-01-31 | **Last Amended**: 2026-01-31
