import { expect, test } from '@playwright/test';

type RefundFixture = {
  id: string;
  status: string;
  requestedCents: number;
  approvedCents?: number | null;
  reason: string;
  buyer: { email: string };
  subOrder: { id: string; status: string };
};

async function mockAdminRefundRoutes(page: Parameters<typeof test>[0]['page']) {
  const backendBaseUrl = 'http://localhost:4000';
  let refunds: RefundFixture[] = [
    {
      id: 'refund-1',
      status: 'REQUESTED',
      requestedCents: 2599,
      approvedCents: null,
      reason: 'Damaged item',
      buyer: { email: 'buyer@example.com' },
      subOrder: { id: 'suborder-1', status: 'REFUND_REQUESTED' },
    },
  ];

  await page.route(`${backendBaseUrl}/auth/session`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: { id: 'admin-user', roles: ['ADMIN'] } }),
    });
  });

  await page.route(`${backendBaseUrl}/admin/refunds**`, async (route) => {
    const method = route.request().method();
    const url = route.request().url();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(refunds),
      });
      return;
    }

    if (method === 'POST' && url.endsWith('/approve')) {
      const payload = route.request().postDataJSON() as { approvedCents?: number };
      refunds = refunds.map((refund) =>
        refund.id === 'refund-1'
          ? {
              ...refund,
              status: 'APPROVED',
              approvedCents: payload.approvedCents ?? refund.requestedCents,
            }
          : refund,
      );
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(refunds[0]),
      });
      return;
    }

    if (method === 'POST' && url.endsWith('/reject')) {
      refunds = refunds.map((refund) =>
        refund.id === 'refund-1' ? { ...refund, status: 'REJECTED' } : refund,
      );
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(refunds[0]),
      });
      return;
    }

    if (method === 'POST' && url.endsWith('/force-refund')) {
      const payload = route.request().postDataJSON() as { approvedCents?: number };
      refunds = refunds.map((refund) =>
        refund.id === 'refund-1'
          ? {
              ...refund,
              status: 'REFUNDED',
              approvedCents: payload.approvedCents ?? refund.requestedCents,
            }
          : refund,
      );
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(refunds[0]),
      });
      return;
    }

    await route.abort();
  });
}

test('admin refunds page can approve, reject, and force refund', async ({ page }) => {
  await mockAdminRefundRoutes(page);

  await page.goto('/admin/refunds');
  await expect(page.locator('body')).toContainText(/Admin Refunds/i);
  await expect(page.locator('body')).toContainText(/buyer@example.com/i);

  await page.getByLabel('Approved Amount \(cents\)').fill('1200');
  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.locator('body')).toContainText('Approved refund refund-1.');
  await expect(page.locator('body')).toContainText(/APPROVED/i);

  await page.getByRole('button', { name: 'Reject' }).click();
  await expect(page.locator('body')).toContainText('Rejected refund refund-1.');
  await expect(page.locator('body')).toContainText(/REJECTED/i);

  await page.getByLabel('Approved Amount \(cents\)').fill('900');
  await page.getByRole('button', { name: 'Force Refund' }).click();
  await expect(page.locator('body')).toContainText('Force refunded refund-1.');
  await expect(page.locator('body')).toContainText(/REFUNDED/i);
  await expect(page.locator('body')).toContainText(/Approved: \$9/i);
});
