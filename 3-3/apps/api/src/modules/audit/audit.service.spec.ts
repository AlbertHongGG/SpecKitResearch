import { AuditService } from './audit.service';

describe('audit service', () => {
  it('writes audit log with expected fields', async () => {
    const prisma: any = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'a1' }),
      },
    };

    const svc = new AuditService(prisma);

    await svc.writeAuditLog({
      actorUserId: 'u1',
      actorRoleContext: 'ORG_ADMIN',
      organizationId: 'org1',
      action: 'test.action',
      targetType: 'Subscription',
      targetId: 's1',
      payload: { hello: 'world' },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorUserId: 'u1',
        actorRoleContext: 'ORG_ADMIN',
        organizationId: 'org1',
        action: 'test.action',
        targetType: 'Subscription',
        targetId: 's1',
        payload: { hello: 'world' },
      },
    });
  });
});
