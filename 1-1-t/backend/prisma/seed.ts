import {
  PrismaClient,
  ActivityStatus,
  Role,
  AuditResult,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = 'password1234';

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
    password: DEFAULT_PASSWORD,
  });

  const member = await upsertUser({
    email: 'member@example.com',
    name: 'Member',
    role: Role.member,
    password: DEFAULT_PASSWORD,
  });

  await prisma.registration.deleteMany({});
  await prisma.activity.deleteMany({});
  await prisma.auditEvent.deleteMany({
    where: {
      action: 'seed',
      targetType: 'system',
      targetId: 'seed',
    },
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

  const publishedCampusTalk = await prisma.activity.create({
    data: {
      title: 'Campus Tech Talk',
      description: 'Guest sharing session about cloud and AI.',
      location: 'Lecture Hall A',
      capacity: 80,
      registeredCount: 0,
      status: ActivityStatus.published,
      deadline: inOneDay,
      date: inThreeDays,
      createdByUserId: admin.id,
    },
  });

  const publishedWorkshop = await prisma.activity.create({
    data: {
      title: 'Design Thinking Workshop',
      description: 'Hands-on workshop for product discovery.',
      location: 'Innovation Lab',
      capacity: 30,
      registeredCount: 0,
      status: ActivityStatus.published,
      deadline: inOneDay,
      date: inThreeDays,
      createdByUserId: admin.id,
    },
  });

  const publishedNetworking = await prisma.activity.create({
    data: {
      title: 'Startup Networking Night',
      description: 'Meet founders, PMs, and engineers.',
      location: 'Student Center',
      capacity: 120,
      registeredCount: 0,
      status: ActivityStatus.published,
      deadline: inTwoDays,
      date: inThreeDays,
      createdByUserId: admin.id,
    },
  });

  const draftHackathon = await prisma.activity.create({
    data: {
      title: 'Hackathon 2026',
      description: 'Draft plan for annual hackathon.',
      location: 'Main Building',
      capacity: 200,
      registeredCount: 0,
      status: ActivityStatus.draft,
      deadline: inTwoDays,
      date: inThreeDays,
      createdByUserId: admin.id,
    },
  });

  const closedEnglishCorner = await prisma.activity.create({
    data: {
      title: 'English Conversation Corner',
      description: 'Weekly English speaking practice.',
      location: 'Library Room 2',
      capacity: 25,
      registeredCount: 0,
      status: ActivityStatus.closed,
      deadline: inOneDay,
      date: inTwoDays,
      createdByUserId: admin.id,
    },
  });

  const archivedPhotoWalk = await prisma.activity.create({
    data: {
      title: 'City Photo Walk',
      description: 'Archived event for browsing history.',
      location: 'Downtown',
      capacity: 40,
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
          publishedCampusTalk: publishedCampusTalk.id,
          publishedWorkshop: publishedWorkshop.id,
          publishedNetworking: publishedNetworking.id,
          draftHackathon: draftHackathon.id,
          closedEnglishCorner: closedEnglishCorner.id,
          archivedPhotoWalk: archivedPhotoWalk.id,
        },
      },
    },
  });

  console.log('Seed complete');
  console.log('admin@example.com / password1234');
  console.log('member@example.com / password1234');
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
