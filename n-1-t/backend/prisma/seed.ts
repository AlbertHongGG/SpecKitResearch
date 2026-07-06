import 'dotenv/config';

import bcrypt from 'bcrypt';
import { PrismaClient, ActivityStatus, UserRole } from '@prisma/client';

const prisma = new PrismaClient();
const defaultPassword = 'password1234';

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function setTime(d: Date, hour = 12, minute = 0) {
  const copy = new Date(d);
  copy.setHours(hour, minute, 0, 0);
  return copy;
}

async function main() {
  const adminEmail = 'admin@example.com';
  const memberEmail = 'member@example.com';

  const adminPasswordHash = await bcrypt.hash(defaultPassword, 12);
  const memberPasswordHash = await bcrypt.hash(defaultPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: 'Admin',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
    create: {
      email: adminEmail,
      name: 'Admin',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
  });

  const member = await prisma.user.upsert({
    where: { email: memberEmail },
    update: {
      name: 'Member',
      passwordHash: memberPasswordHash,
      role: UserRole.MEMBER,
    },
    create: {
      email: memberEmail,
      name: 'Member',
      passwordHash: memberPasswordHash,
      role: UserRole.MEMBER,
    },
  });

  // Clean slate for predictable local testing.
  // Note: Registration has FK RESTRICT to Activity, so delete registrations first.
  await prisma.registration.deleteMany({});
  await prisma.activity.deleteMany({});

  const upcomingSoonDate = setTime(daysFromNow(3), 10);
  const upcomingSoonDeadline = setTime(daysFromNow(2), 10);
  const upcomingLaterDate = setTime(daysFromNow(7), 19);
  const upcomingLaterDeadline = setTime(daysFromNow(6), 19);

  const pastDate = setTime(daysFromNow(-7), 14);
  const pastDeadline = setTime(daysFromNow(-8), 14);

  const activityA = await prisma.activity.create({
    data: {
      title: '公開活動 A',
      description: '活動 A 描述（公開、可報名）',
      date: upcomingSoonDate,
      deadline: upcomingSoonDeadline,
      location: '社辦',
      capacity: 2,
      status: ActivityStatus.PUBLISHED,
      registeredCount: 0,
      createdByUserId: admin.id,
    },
  });

  const activityB = await prisma.activity.create({
    data: {
      title: '公開活動 B（額滿）',
      description: '活動 B 描述（額滿狀態 FULL）',
      date: upcomingSoonDate,
      deadline: upcomingSoonDeadline,
      location: '教室',
      capacity: 1,
      status: ActivityStatus.FULL,
      registeredCount: 1,
      createdByUserId: admin.id,
    },
  });

  const activityC = await prisma.activity.create({
    data: {
      title: '公開活動 C（已有人報名）',
      description: '活動 C 描述（公開、已有 1 人報名）',
      date: upcomingLaterDate,
      deadline: upcomingLaterDeadline,
      location: '大禮堂',
      capacity: 3,
      status: ActivityStatus.PUBLISHED,
      registeredCount: 1,
      createdByUserId: admin.id,
    },
  });

  const draftActivity = await prisma.activity.create({
    data: {
      title: '草稿活動（不可見）',
      description: '草稿活動描述（後台可見，公開列表不可見）',
      date: upcomingLaterDate,
      deadline: upcomingSoonDeadline,
      location: '會議室',
      capacity: 5,
      status: ActivityStatus.DRAFT,
      registeredCount: 0,
      createdByUserId: admin.id,
    },
  });

  const closedActivity = await prisma.activity.create({
    data: {
      title: '已截止活動（CLOSED）',
      description: '截止後的活動（用來測試不可再報名/狀態顯示）',
      date: upcomingLaterDate,
      deadline: pastDeadline,
      location: '戶外',
      capacity: 10,
      status: ActivityStatus.CLOSED,
      registeredCount: 0,
      createdByUserId: admin.id,
    },
  });

  const archivedActivity = await prisma.activity.create({
    data: {
      title: '已結束活動（ARCHIVED）',
      description: '過去活動（用來測試歷史資料與狀態顯示）',
      date: pastDate,
      deadline: pastDeadline,
      location: '舊社辦',
      capacity: 20,
      status: ActivityStatus.ARCHIVED,
      registeredCount: 0,
      createdByUserId: admin.id,
    },
  });

  // Seed registrations so UI flows have something to show.
  // Keep registeredCount consistent with non-canceled registrations.
  await prisma.registration.create({
    data: {
      userId: member.id,
      activityId: activityB.id,
    },
  });

  await prisma.registration.create({
    data: {
      userId: member.id,
      activityId: activityC.id,
    },
  });

  // Ensure counts match seeded registrations.
  await prisma.activity.update({ where: { id: activityB.id }, data: { registeredCount: 1 } });
  await prisma.activity.update({ where: { id: activityC.id }, data: { registeredCount: 1 } });
  await prisma.activity.update({ where: { id: activityA.id }, data: { registeredCount: 0 } });
  await prisma.activity.update({ where: { id: draftActivity.id }, data: { registeredCount: 0 } });
  await prisma.activity.update({ where: { id: closedActivity.id }, data: { registeredCount: 0 } });
  await prisma.activity.update({ where: { id: archivedActivity.id }, data: { registeredCount: 0 } });

  // eslint-disable-next-line no-console
  console.log('Seed complete:', {
    adminEmail,
    memberEmail,
    activities: 6,
    registrations: 2,
  });
  // eslint-disable-next-line no-console
  console.log('Passwords:', { admin: defaultPassword, member: defaultPassword });
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
