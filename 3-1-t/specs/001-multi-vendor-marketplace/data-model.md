# Data Model

## Core entities

- User / UserRoleAssignment
- Session
- Category / Product
- Cart / CartItem
- Order / SubOrder / SubOrderItem
- Payment
- RefundRequest
- Review
- SellerApplication
- Settlement
- DisputeCase
- AuditLog

## Key relationships

- A buyer has one cart and many orders.
- An order contains many suborders grouped by seller.
- A suborder contains many suborder items and refund requests.
- Payment is linked to an order and supports callback idempotency by `(orderId, transactionId)`.

## State models

- `SubOrderStatus`: PENDING_PAYMENT → PAID → SHIPPED → DELIVERED → REFUND_REQUESTED → REFUNDED
- `OrderStatus` is aggregated from payment + suborder statuses.

## Notes

See `prisma/schema.prisma` for final field-level constraints.
