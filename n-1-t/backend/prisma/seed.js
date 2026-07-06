"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const adminEmail = 'admin@example.com';
    const memberEmail = 'member@example.com';
    const adminPasswordHash = await bcrypt_1.default.hash('AdminPass123!', 12);
    const memberPasswordHash = await bcrypt_1.default.hash('MemberPass123!', 12);
    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
            name: 'Admin',
            passwordHash: adminPasswordHash,
            role: client_1.UserRole.ADMIN,
        },
        create: {
            email: adminEmail,
            name: 'Admin',
            passwordHash: adminPasswordHash,
            role: client_1.UserRole.ADMIN,
        },
    });
    const member = await prisma.user.upsert({
        where: { email: memberEmail },
        update: {
            name: 'Member',
            passwordHash: memberPasswordHash,
            role: client_1.UserRole.MEMBER,
        },
        create: {
            email: memberEmail,
            name: 'Member',
            passwordHash: memberPasswordHash,
            role: client_1.UserRole.MEMBER,
        },
    });
    const now = new Date();
    const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const inFourDays = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
    await prisma.activity.deleteMany({});
    await prisma.activity.create({
        data: {
            title: '公開活動 A',
            description: '活動 A 描述',
            date: inThreeDays,
            deadline: inTwoDays,
            location: '社辦',
            capacity: 2,
            status: client_1.ActivityStatus.PUBLISHED,
            registeredCount: 0,
            createdByUserId: admin.id,
        },
    });
    await prisma.activity.create({
        data: {
            title: '公開活動 B（額滿）',
            description: '活動 B 描述',
            date: inFourDays,
            deadline: inTwoDays,
            location: '教室',
            capacity: 1,
            status: client_1.ActivityStatus.FULL,
            registeredCount: 1,
            createdByUserId: admin.id,
        },
    });
    await prisma.activity.create({
        data: {
            title: '草稿活動（不可見）',
            description: '草稿活動描述',
            date: inFourDays,
            deadline: inTwoDays,
            location: '會議室',
            capacity: 5,
            status: client_1.ActivityStatus.DRAFT,
            registeredCount: 0,
            createdByUserId: admin.id,
        },
    });
    // eslint-disable-next-line no-console
    console.log('Seed complete:', { adminEmail, memberEmail });
    // eslint-disable-next-line no-console
    console.log('Passwords:', { admin: 'AdminPass123!', member: 'MemberPass123!' });
}
main()
    .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map