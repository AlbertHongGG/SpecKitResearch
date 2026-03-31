import {
  PrismaClient,
  CategoryStatus,
  DisputeStatus,
  PaymentStatus,
  ProductStatus,
  RefundRequestStatus,
  SellerApplicationStatus,
  SettlementStatus,
  SubOrderStatus,
  UserRole,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'password';

const seedIds = {
  categories: ['seed-category-general', 'seed-category-electronics', 'seed-category-home'],
  products: [
    'seed-product-a',
    'seed-product-b',
    'seed-product-c',
    'seed-product-d',
    'seed-product-e',
  ],
  sellerApplications: ['seed-seller-app-1'],
  carts: ['seed-cart-buyer'],
  orders: [
    'seed-order-pending',
    'seed-order-paid',
    'seed-order-delivered',
    'seed-order-refund',
    'seed-order-failed',
  ],
  subOrders: [
    'seed-suborder-pending-seller-1',
    'seed-suborder-pending-seller-2',
    'seed-suborder-paid-seller-1',
    'seed-suborder-delivered-seller-1',
    'seed-suborder-refund-seller-2',
    'seed-suborder-failed-seller-1',
  ],
  payments: [
    'seed-payment-pending',
    'seed-payment-paid',
    'seed-payment-delivered',
    'seed-payment-refund',
    'seed-payment-failed',
  ],
  refundRequests: ['seed-refund-request-1'],
  settlements: ['seed-settlement-1', 'seed-settlement-2'],
  disputes: ['seed-dispute-1'],
};

async function upsertUser(params: { email: string; password: string; roles: UserRole[] }) {
  const passwordHash = await bcrypt.hash(params.password, 10);
  const user = await prisma.user.upsert({
    where: { email: params.email },
    update: { passwordHash },
    create: { email: params.email, passwordHash },
  });

  await prisma.userRoleAssignment.deleteMany({ where: { userId: user.id } });
  await prisma.userRoleAssignment.createMany({
    data: params.roles.map((role) => ({ userId: user.id, role })),
  });

  return user;
}

async function resetSeedFixtures() {
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { targetId: { in: seedIds.refundRequests } },
        { targetId: { in: seedIds.sellerApplications } },
        { targetId: { in: seedIds.orders } },
        { targetId: { in: seedIds.subOrders } },
        { targetId: { in: seedIds.payments } },
        { targetId: { in: seedIds.settlements } },
        { targetId: { in: seedIds.disputes } },
      ],
    },
  });

  await prisma.disputeCase.deleteMany({ where: { id: { in: seedIds.disputes } } });
  await prisma.refundRequest.deleteMany({ where: { id: { in: seedIds.refundRequests } } });
  await prisma.review.deleteMany({ where: { productId: 'seed-product-a' } });
  await prisma.settlement.deleteMany({ where: { id: { in: seedIds.settlements } } });
  await prisma.payment.deleteMany({ where: { id: { in: seedIds.payments } } });
  await prisma.subOrderItem.deleteMany({ where: { subOrderId: { in: seedIds.subOrders } } });
  await prisma.subOrder.deleteMany({ where: { id: { in: seedIds.subOrders } } });
  await prisma.order.deleteMany({ where: { id: { in: seedIds.orders } } });
  await prisma.cartItem.deleteMany({ where: { cartId: { in: seedIds.carts } } });
  await prisma.cart.deleteMany({ where: { id: { in: seedIds.carts } } });
  await prisma.sellerApplication.deleteMany({ where: { id: { in: seedIds.sellerApplications } } });
  await prisma.product.deleteMany({ where: { id: { in: seedIds.products } } });
  await prisma.category.deleteMany({ where: { id: { in: seedIds.categories } } });
}

async function upsertCategory(params: { id: string; name: string; status: CategoryStatus }) {
  return prisma.category.upsert({
    where: { id: params.id },
    update: { name: params.name, status: params.status },
    create: params,
  });
}

async function upsertProduct(params: {
  id: string;
  sellerId: string;
  categoryId: string;
  status: ProductStatus;
  name: string;
  description: string;
  priceCents: number;
  stock: number;
}) {
  return prisma.product.upsert({
    where: { id: params.id },
    update: {
      sellerId: params.sellerId,
      categoryId: params.categoryId,
      status: params.status,
      name: params.name,
      description: params.description,
      priceCents: params.priceCents,
      stock: params.stock,
    },
    create: params,
  });
}

async function createOrderFixtures(params: {
  buyerId: string;
  sellerId: string;
  sellerTwoId: string;
}) {
  const orderPending = await prisma.order.create({
    data: {
      id: 'seed-order-pending',
      buyerId: params.buyerId,
      status: 'CREATED',
      totalCents: 7197,
      subOrders: {
        create: [
          {
            id: 'seed-suborder-pending-seller-1',
            sellerId: params.sellerId,
            status: 'PENDING_PAYMENT',
            subtotalCents: 1999,
            items: {
              create: [
                {
                  productId: 'seed-product-a',
                  quantity: 1,
                  unitPriceCents: 1999,
                },
              ],
            },
          },
          {
            id: 'seed-suborder-pending-seller-2',
            sellerId: params.sellerTwoId,
            status: 'PENDING_PAYMENT',
            subtotalCents: 5198,
            items: {
              create: [
                {
                  productId: 'seed-product-d',
                  quantity: 2,
                  unitPriceCents: 2599,
                },
              ],
            },
          },
        ],
      },
      payments: {
        create: [
          {
            id: 'seed-payment-pending',
            status: PaymentStatus.PENDING,
            amountCents: 7197,
          },
        ],
      },
    },
    include: { subOrders: true, payments: true },
  });

  const paidOccurredAt = new Date('2026-03-08T09:30:00.000Z');
  const deliveredOccurredAt = new Date('2026-03-04T09:30:00.000Z');
  const refundOccurredAt = new Date('2026-03-06T11:15:00.000Z');
  const failedOccurredAt = new Date('2026-03-09T08:00:00.000Z');

  const orderPaid = await prisma.order.create({
    data: {
      id: 'seed-order-paid',
      buyerId: params.buyerId,
      status: 'PAID',
      totalCents: 4999,
      subOrders: {
        create: [
          {
            id: 'seed-suborder-paid-seller-1',
            sellerId: params.sellerId,
            status: SubOrderStatus.PAID,
            subtotalCents: 4999,
            items: {
              create: [
                {
                  productId: 'seed-product-b',
                  quantity: 1,
                  unitPriceCents: 4999,
                },
              ],
            },
          },
        ],
      },
      payments: {
        create: [
          {
            id: 'seed-payment-paid',
            status: PaymentStatus.SUCCEEDED,
            amountCents: 4999,
            transactionId: 'txn-seed-paid',
            occurredAt: paidOccurredAt,
          },
        ],
      },
    },
    include: { subOrders: true, payments: true },
  });

  const orderDelivered = await prisma.order.create({
    data: {
      id: 'seed-order-delivered',
      buyerId: params.buyerId,
      status: 'COMPLETED',
      totalCents: 1999,
      subOrders: {
        create: [
          {
            id: 'seed-suborder-delivered-seller-1',
            sellerId: params.sellerId,
            status: SubOrderStatus.DELIVERED,
            prevStatus: SubOrderStatus.SHIPPED,
            subtotalCents: 1999,
            items: {
              create: [
                {
                  productId: 'seed-product-a',
                  quantity: 1,
                  unitPriceCents: 1999,
                },
              ],
            },
          },
        ],
      },
      payments: {
        create: [
          {
            id: 'seed-payment-delivered',
            status: PaymentStatus.SUCCEEDED,
            amountCents: 1999,
            transactionId: 'txn-seed-delivered',
            occurredAt: deliveredOccurredAt,
          },
        ],
      },
    },
    include: { subOrders: true, payments: true },
  });

  const orderRefund = await prisma.order.create({
    data: {
      id: 'seed-order-refund',
      buyerId: params.buyerId,
      status: 'PARTIALLY_SHIPPED',
      totalCents: 2599,
      subOrders: {
        create: [
          {
            id: 'seed-suborder-refund-seller-2',
            sellerId: params.sellerTwoId,
            status: SubOrderStatus.REFUND_REQUESTED,
            prevStatus: SubOrderStatus.DELIVERED,
            subtotalCents: 2599,
            items: {
              create: [
                {
                  productId: 'seed-product-d',
                  quantity: 1,
                  unitPriceCents: 2599,
                },
              ],
            },
          },
        ],
      },
      payments: {
        create: [
          {
            id: 'seed-payment-refund',
            status: PaymentStatus.SUCCEEDED,
            amountCents: 2599,
            transactionId: 'txn-seed-refund',
            occurredAt: refundOccurredAt,
          },
        ],
      },
    },
    include: { subOrders: true, payments: true },
  });

  const orderFailed = await prisma.order.create({
    data: {
      id: 'seed-order-failed',
      buyerId: params.buyerId,
      status: 'CREATED',
      totalCents: 4999,
      subOrders: {
        create: [
          {
            id: 'seed-suborder-failed-seller-1',
            sellerId: params.sellerId,
            status: SubOrderStatus.PENDING_PAYMENT,
            subtotalCents: 4999,
            items: {
              create: [
                {
                  productId: 'seed-product-b',
                  quantity: 1,
                  unitPriceCents: 4999,
                },
              ],
            },
          },
        ],
      },
      payments: {
        create: [
          {
            id: 'seed-payment-failed',
            status: PaymentStatus.FAILED,
            amountCents: 4999,
            transactionId: 'txn-seed-failed',
            occurredAt: failedOccurredAt,
          },
        ],
      },
    },
    include: { subOrders: true, payments: true },
  });

  return {
    orderPending,
    orderPaid,
    orderDelivered,
    orderRefund,
    orderFailed,
  };
}

async function main() {
  await resetSeedFixtures();

  const admin = await upsertUser({
    email: 'admin@example.com',
    password: DEFAULT_PASSWORD,
    roles: [UserRole.ADMIN],
  });

  const seller = await upsertUser({
    email: 'seller@example.com',
    password: DEFAULT_PASSWORD,
    roles: [UserRole.SELLER],
  });

  const sellerTwo = await upsertUser({
    email: 'seller2@example.com',
    password: DEFAULT_PASSWORD,
    roles: [UserRole.SELLER],
  });

  const buyer = await upsertUser({
    email: 'buyer@example.com',
    password: DEFAULT_PASSWORD,
    roles: [UserRole.BUYER],
  });

  const generalCategory = await upsertCategory({
    id: 'seed-category-general',
    name: 'General',
    status: CategoryStatus.ACTIVE,
  });
  const electronicsCategory = await upsertCategory({
    id: 'seed-category-electronics',
    name: 'Electronics',
    status: CategoryStatus.ACTIVE,
  });
  const homeCategory = await upsertCategory({
    id: 'seed-category-home',
    name: 'Home',
    status: CategoryStatus.INACTIVE,
  });

  await upsertProduct({
    id: 'seed-product-a',
    sellerId: seller.id,
    categoryId: generalCategory.id,
    status: ProductStatus.ACTIVE,
    name: 'Sample Product A',
    description: 'A sample active product for catalog, cart, checkout, and review tests.',
    priceCents: 1999,
    stock: 10,
  });
  await upsertProduct({
    id: 'seed-product-b',
    sellerId: seller.id,
    categoryId: electronicsCategory.id,
    status: ProductStatus.ACTIVE,
    name: 'Sample Product B',
    description: 'An active product used for paid and failed payment scenarios.',
    priceCents: 4999,
    stock: 5,
  });
  await upsertProduct({
    id: 'seed-product-c',
    sellerId: seller.id,
    categoryId: electronicsCategory.id,
    status: ProductStatus.BANNED,
    name: 'Banned Product',
    description: 'Should not show in list/search, but direct URL shows unavailable.',
    priceCents: 9999,
    stock: 1,
  });
  await upsertProduct({
    id: 'seed-product-d',
    sellerId: sellerTwo.id,
    categoryId: generalCategory.id,
    status: ProductStatus.ACTIVE,
    name: 'Vendor 2 Product',
    description: 'Second seller product for multi-vendor checkout and refund flows.',
    priceCents: 2599,
    stock: 8,
  });
  await upsertProduct({
    id: 'seed-product-e',
    sellerId: sellerTwo.id,
    categoryId: homeCategory.id,
    status: ProductStatus.INACTIVE,
    name: 'Inactive Home Product',
    description: 'Used to verify inactive category/product visibility handling.',
    priceCents: 3599,
    stock: 3,
  });

  await prisma.sellerApplication.upsert({
    where: { id: 'seed-seller-app-1' },
    update: {
      userId: buyer.id,
      shopName: 'Buyer Shop',
      status: SellerApplicationStatus.SUBMITTED,
    },
    create: {
      id: 'seed-seller-app-1',
      userId: buyer.id,
      shopName: 'Buyer Shop',
      status: SellerApplicationStatus.SUBMITTED,
    },
  });

  const cart = await prisma.cart.upsert({
    where: { buyerId: buyer.id },
    update: {},
    create: {
      id: 'seed-cart-buyer',
      buyerId: buyer.id,
    },
  });

  await prisma.cartItem.upsert({
    where: {
      cartId_productId: {
        cartId: cart.id,
        productId: 'seed-product-a',
      },
    },
    update: { quantity: 2 },
    create: {
      cartId: cart.id,
      productId: 'seed-product-a',
      quantity: 2,
    },
  });
  await prisma.cartItem.upsert({
    where: {
      cartId_productId: {
        cartId: cart.id,
        productId: 'seed-product-d',
      },
    },
    update: { quantity: 1 },
    create: {
      cartId: cart.id,
      productId: 'seed-product-d',
      quantity: 1,
    },
  });

  const orders = await createOrderFixtures({
    buyerId: buyer.id,
    sellerId: seller.id,
    sellerTwoId: sellerTwo.id,
  });

  await prisma.refundRequest.create({
    data: {
      id: 'seed-refund-request-1',
      subOrderId: 'seed-suborder-refund-seller-2',
      buyerId: buyer.id,
      prevSubOrderStatus: SubOrderStatus.DELIVERED,
      status: RefundRequestStatus.REQUESTED,
      reason: 'Packaging arrived damaged during delivery.',
      requestedCents: 2599,
    },
  });

  await prisma.review.upsert({
    where: {
      productId_buyerId: {
        productId: 'seed-product-a',
        buyerId: buyer.id,
      },
    },
    update: {
      rating: 5,
      comment: 'Fast delivery and product matched the description.',
    },
    create: {
      productId: 'seed-product-a',
      buyerId: buyer.id,
      rating: 5,
      comment: 'Fast delivery and product matched the description.',
    },
  });

  await prisma.settlement.create({
    data: {
      id: 'seed-settlement-1',
      sellerId: seller.id,
      periodStart: new Date('2026-03-01T00:00:00.000Z'),
      periodEnd: new Date('2026-03-07T23:59:59.000Z'),
      grossCents: 6998,
      platformFeeCents: 700,
      netCents: 6298,
      status: SettlementStatus.PENDING,
    },
  });
  await prisma.settlement.create({
    data: {
      id: 'seed-settlement-2',
      sellerId: sellerTwo.id,
      periodStart: new Date('2026-03-01T00:00:00.000Z'),
      periodEnd: new Date('2026-03-07T23:59:59.000Z'),
      grossCents: 2599,
      platformFeeCents: 260,
      netCents: 2339,
      status: SettlementStatus.SETTLED,
    },
  });

  await prisma.disputeCase.create({
    data: {
      id: 'seed-dispute-1',
      orderId: orders.orderDelivered.id,
      buyerId: buyer.id,
      status: DisputeStatus.OPEN,
      resolutionNote: null,
    },
  });

  console.log({
    accounts: {
      admin: { email: admin.email, password: DEFAULT_PASSWORD },
      seller: { email: seller.email, password: DEFAULT_PASSWORD },
      seller2: { email: sellerTwo.email, password: DEFAULT_PASSWORD },
      buyer: { email: buyer.email, password: DEFAULT_PASSWORD },
    },
    urls: {
      frontend: 'http://localhost:5174',
      backend: 'http://localhost:4000',
    },
    fixtures: {
      cartBuyerId: buyer.id,
      pendingOrderId: orders.orderPending.id,
      paidOrderId: orders.orderPaid.id,
      deliveredOrderId: orders.orderDelivered.id,
      refundOrderId: orders.orderRefund.id,
      failedOrderId: orders.orderFailed.id,
      refundRequestId: 'seed-refund-request-1',
      settlementIds: seedIds.settlements,
      disputeId: 'seed-dispute-1',
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
