import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ManagerScopeService {
    constructor(private readonly prisma: PrismaService) { }

    async canManage(managerId: string, employeeId: string): Promise<boolean> {
        if (managerId === employeeId) return false;

        const [manager, employee] = await Promise.all([
            this.prisma.user.findUnique({ where: { id: managerId } }),
            this.prisma.user.findUnique({ where: { id: employeeId } }),
        ]);

        if (!manager || !employee) return false;

        return manager.departmentId === employee.departmentId && employee.managerId === manager.id;
    }

    async assertCanManage(managerId: string, employeeId: string) {
        const ok = await this.canManage(managerId, employeeId);
        if (!ok) {
            throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not allowed' });
        }
    }
}
