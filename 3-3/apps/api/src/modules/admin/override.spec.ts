import { AdminOverridesController } from './admin-overrides.controller';
import { setContext } from '../../common/request-context';

function makeReq(ctx: any) {
  const req: any = {};
  setContext(req, ctx);
  return req;
}

describe('admin overrides', () => {
  it('Expired override is irreversible', async () => {
    const prisma: any = {
      organization: { findUnique: jest.fn().mockResolvedValue({ id: 'org1', name: 'Org' }) },
      adminOverride: {
        findFirst: jest
          .fn()
          // expiredEver check
          .mockResolvedValueOnce({ id: 'ov-exp' }),
      },
    };

    const audit: any = { writeAuditLog: jest.fn().mockResolvedValue(undefined) };

    const controller = new AdminOverridesController(prisma, audit);

    const req = makeReq({ requestId: 'r1', user: { id: 'u1', email: 'a@b.com', isPlatformAdmin: true } });

    await expect(controller.force(req, { organizationId: 'org1', forcedStatus: 'NONE', reason: 'test' })).rejects.toMatchObject({
      status: 409,
      errorCode: 'CONFLICT',
    });
  });
});
