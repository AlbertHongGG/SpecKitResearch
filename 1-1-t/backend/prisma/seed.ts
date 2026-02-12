import { PrismaClient, ActivityStatus, Role, AuditResult } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function upsertUser(params: {
  email: string;
  name: string;
  role: Role;
  password: string;
}) {
  const passwordHash = await bcrypt.hash(params.password, 10);

  return prisma.user.upsert({
    where: { email: params.email },
    update: {
      name: params.name,
      role: params.role,
      passwordHash,
    },
    create: {
      email: params.email,
      name: params.name,
      role: params.role,
      passwordHash,
    },
  });
}

async function main() {
  const admin = await upsertUser({
    email: 'admin@example.com',
    name: 'Admin',
    role: Role.admin,
    password: 'admin1234',
  });

  const member = await upsertUser({
    email: 'member@example.com',
    name: 'Member',
    role: Role.member,
    password: 'member1234',
  });

  const now = new Date();
  const inOneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const inTwoDays = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const inThreeDays = new Date(now.getTime() + 72 * 60 * 60 * 1000);

  const draft = await prisma.activity.create({
    data: {
      title: 'Draft Activity',
      description: 'A draft activity',
      location: 'Campus',
      capacity: 10,
      registeredCount: 0,
      status: ActivityStatus.draft,
      deadline: inOneDay,
      date: inTwoDays,
      createdByUserId: admin.id,
    },
  });

  const published = await prisma.activity.create({
    data: {
      title: 'Published Activity',
      description: 'A published activity',
      location: 'Auditorium',
      capacity: 2,
      registeredCount: 0,
      status: ActivityStatus.published,
      deadline: inOneDay,
      date: inTwoDays,
      createdByUserId: admin.id,
    },
  });

  const full = await prisma.activity.create({
    data: {
      title: 'Full Activity',
      description: 'A full activity',
      location: 'Gym',
      capacity: 1,
      registeredCount: 1,
      status: ActivityStatus.full,
      deadline: inOneDay,
      date: inThreeDays,
      createdByUserId: admin.id,
    },
  });

  const closed = await prisma.activity.create({
    data: {
      title: 'Closed Activity',
      description: 'Registration closed',
      location: 'Library',
      capacity: 10,
      registeredCount: 0,
      status: ActivityStatus.closed,
      deadline: inOneDay,
      date: inTwoDays,
      createdByUserId: admin.id,
    },
  });

  const archived = await prisma.activity.create({
    data: {
      title: 'Archived Activity',
      description: 'Archived',
      location: 'Online',
      capacity: 10,
      registeredCount: 0,
      status: ActivityStatus.archived,
      deadline: inOneDay,
      date: inTwoDays,
      createdByUserId: admin.id,
    },
  });

  await prisma.auditEvent.create({
    data: {
      actorUserId: admin.id,
      action: 'seed',
      targetType: 'system',
      targetId: 'seed',
      result: AuditResult.success,
      metadata: {
        adminId: admin.id,
        memberId: member.id,
        activityIds: {
          draft: draft.id,
          published: published.id,
          full: full.id,
          closed: closed.id,
          archived: archived.id,
        },
      },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
