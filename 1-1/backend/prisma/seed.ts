import bcrypt from 'bcrypt'
import { ActivityStatus, PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = 'admin@example.com'
  const memberEmail = 'member@example.com'
  const member2Email = 'member2@example.com'

  const adminPasswordHash = await bcrypt.hash('admin1234', 10)
  const memberPasswordHash = await bcrypt.hash('member1234', 10)

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: 'Admin',
      passwordHash: adminPasswordHash,
      role: Role.admin,
    },
    create: {
      name: 'Admin',
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: Role.admin,
    },
  })

  const member = await prisma.user.upsert({
    where: { email: memberEmail },
    update: {
      name: 'Member',
      passwordHash: memberPasswordHash,
      role: Role.member,
    },
    create: {
      name: 'Member',
      email: memberEmail,
      passwordHash: memberPasswordHash,
      role: Role.member,
    },
  })

  const member2 = await prisma.user.upsert({
    where: { email: member2Email },
    update: {
      name: 'Member 2',
      passwordHash: memberPasswordHash,
      role: Role.member,
    },
    create: {
      name: 'Member 2',
      email: member2Email,
      passwordHash: memberPasswordHash,
      role: Role.member,
    },
  })

  const now = new Date()
  const oneDayMs = 24 * 60 * 60 * 1000

  const activityDraftId = 'seed-activity-draft'
  const activityPublishedId = 'seed-activity-published'
  const activityFullId = 'seed-activity-full'
  const activityClosedId = 'seed-activity-closed'
  const activityArchivedId = 'seed-activity-archived'

  await prisma.activity.upsert({
    where: { id: activityDraftId },
    update: {
      title: '（Seed）草稿活動',
      description: '這是一個草稿活動（僅 admin 可見/可發布）。',
      date: new Date(now.getTime() + 14 * oneDayMs),
      deadline: new Date(now.getTime() + 13 * oneDayMs),
      location: '社辦',
      capacity: 10,
      remainingSlots: 10,
      status: ActivityStatus.draft,
      createdById: admin.id,
    },
    create: {
      id: activityDraftId,
      title: '（Seed）草稿活動',
      description: '這是一個草稿活動（僅 admin 可見/可發布）。',
      date: new Date(now.getTime() + 14 * oneDayMs),
      deadline: new Date(now.getTime() + 13 * oneDayMs),
      location: '社辦',
      capacity: 10,
      remainingSlots: 10,
      status: ActivityStatus.draft,
      createdById: admin.id,
    },
  })

  await prisma.activity.upsert({
    where: { id: activityPublishedId },
    update: {
      title: '（Seed）已發布活動',
      description: '公開列表可見；member 可報名/取消。',
      date: new Date(now.getTime() + 7 * oneDayMs),
      deadline: new Date(now.getTime() + 6 * oneDayMs),
      location: '活動中心',
      capacity: 5,
      remainingSlots: 4,
      status: ActivityStatus.published,
      createdById: admin.id,
    },
    create: {
      id: activityPublishedId,
      title: '（Seed）已發布活動',
      description: '公開列表可見；member 可報名/取消。',
      date: new Date(now.getTime() + 7 * oneDayMs),
      deadline: new Date(now.getTime() + 6 * oneDayMs),
      location: '活動中心',
      capacity: 5,
      remainingSlots: 4,
      status: ActivityStatus.published,
      createdById: admin.id,
    },
  })

  await prisma.activity.upsert({
    where: { id: activityFullId },
    update: {
      title: '（Seed）額滿活動',
      description: '額滿狀態由系統管理；僅用於 demo 顯示。',
      date: new Date(now.getTime() + 10 * oneDayMs),
      deadline: new Date(now.getTime() + 9 * oneDayMs),
      location: '操場',
      capacity: 2,
      remainingSlots: 0,
      status: ActivityStatus.full,
      createdById: admin.id,
    },
    create: {
      id: activityFullId,
      title: '（Seed）額滿活動',
      description: '額滿狀態由系統管理；僅用於 demo 顯示。',
      date: new Date(now.getTime() + 10 * oneDayMs),
      deadline: new Date(now.getTime() + 9 * oneDayMs),
      location: '操場',
      capacity: 2,
      remainingSlots: 0,
      status: ActivityStatus.full,
      createdById: admin.id,
    },
  })

  await prisma.activity.upsert({
    where: { id: activityClosedId },
    update: {
      title: '（Seed）已關閉活動',
      description: '已關閉，不可再報名。',
      date: new Date(now.getTime() + 3 * oneDayMs),
      deadline: new Date(now.getTime() + 2 * oneDayMs),
      location: '教室 A',
      capacity: 20,
      remainingSlots: 20,
      status: ActivityStatus.closed,
      createdById: admin.id,
    },
    create: {
      id: activityClosedId,
      title: '（Seed）已關閉活動',
      description: '已關閉，不可再報名。',
      date: new Date(now.getTime() + 3 * oneDayMs),
      deadline: new Date(now.getTime() + 2 * oneDayMs),
      location: '教室 A',
      capacity: 20,
      remainingSlots: 20,
      status: ActivityStatus.closed,
      createdById: admin.id,
    },
  })

  await prisma.activity.upsert({
    where: { id: activityArchivedId },
    update: {
      title: '（Seed）已下架活動',
      description: '已下架（archived），公開列表不應出現。',
      date: new Date(now.getTime() - 7 * oneDayMs),
      deadline: new Date(now.getTime() - 8 * oneDayMs),
      location: '線上',
      capacity: 30,
      remainingSlots: 30,
      status: ActivityStatus.archived,
      createdById: admin.id,
    },
    create: {
      id: activityArchivedId,
      title: '（Seed）已下架活動',
      description: '已下架（archived），公開列表不應出現。',
      date: new Date(now.getTime() - 7 * oneDayMs),
      deadline: new Date(now.getTime() - 8 * oneDayMs),
      location: '線上',
      capacity: 30,
      remainingSlots: 30,
      status: ActivityStatus.archived,
      createdById: admin.id,
    },
  })

  // Demo registrations (for My Activities + roster/export)
  await prisma.registration.upsert({
    where: { userId_activityId: { userId: member.id, activityId: activityPublishedId } },
    update: { canceledAt: null },
    create: {
      userId: member.id,
      activityId: activityPublishedId,
    },
  })

  await prisma.registration.upsert({
    where: { userId_activityId: { userId: member.id, activityId: activityFullId } },
    update: { canceledAt: null },
    create: {
      userId: member.id,
      activityId: activityFullId,
    },
  })

  await prisma.registration.upsert({
    where: { userId_activityId: { userId: member2.id, activityId: activityFullId } },
    update: { canceledAt: null },
    create: {
      userId: member2.id,
      activityId: activityFullId,
    },
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
