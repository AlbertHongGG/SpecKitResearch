# Research Notes

## Session store

- Cookie-based session with HttpOnly cookie.
- Server session persistence in Prisma `Session` table.

## SQLite transaction strategy

- Critical write paths (checkout and payment callback) use Prisma transaction.
- Stock update uses conditional decrement (`updateMany`) to prevent oversell.
- Callback idempotency claim by transaction id to avoid duplicate side effects.

## XSS strategy for reviews

- Review comments are sanitized on write to avoid script execution in UI rendering.
- UI always renders comment as text rather than raw HTML.
