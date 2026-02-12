# Logging & Observability (Backend)

This project uses a lightweight logging approach that aims to keep **production debugging practical** while staying simple for local development.

## Request ID

- Every incoming request gets a `x-request-id`:
  - If the client sends `x-request-id`, the server preserves it.
  - Otherwise the server generates a UUID.
- The server echoes it back in the response header (`x-request-id`).
- On errors, the JSON error body includes `error.request_id`.

Implementation:
- Request ID middleware: `src/common/request/request-id.middleware.ts`
- Error response wiring: `src/common/errors/http-exception.filter.ts`

## What we log

Controllers log key events at the API boundary (examples):

- Auth: login, logout
- Tickets: create, list, detail, message create, status change, assignee change
- Admin: dashboard queries, user create/update, assignment changes

Recommended log fields (when available):

- `request_id` (correlate with client)
- `actor_id`, `role`
- `ticket_id` / `user_id`
- operation-specific fields (e.g. `from_status`, `to_status`, `expected_status`)

## Where logs are emitted

- `AppLogger` is a small wrapper around Nest's `ConsoleLogger`:
  - `src/common/logging/logger.service.ts`
  - Use `logger.withContext(ControllerName).log('event.name', { ...fields })`

## Checklist

- [ ] Include `actor_id` and `role` on protected operations
- [ ] Include identifiers (ticket/user/session) for write operations
- [ ] Keep logs free of secrets (passwords, refresh tokens)
- [ ] Ensure errors include `error.request_id` for support/debugging
- [ ] Keep transactions short; log conflict outcomes (409) for triage
