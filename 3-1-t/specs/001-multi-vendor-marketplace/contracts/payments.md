# Payments API Contract

- GET /payments/:id
- POST /payments/:id/retry
- POST /payments/callback

Callback is idempotent by `(orderId, transactionId)`.
