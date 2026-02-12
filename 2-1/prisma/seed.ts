import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function hashPassword(password: string) {
  // Simple PBKDF2 for seed; app uses same primitive.
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 120_000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: hashPassword('password123'),
      role: 'admin',
      isActive: true,
    },
  });

  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@example.com' },
    update: {},
    create: {
      email: 'instructor@example.com',
      passwordHash: hashPassword('password123'),
      role: 'instructor',
      isActive: true,
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@example.com' },
    update: {},
    create: {
      email: 'student@example.com',
      passwordHash: hashPassword('password123'),
      role: 'student',
      isActive: true,
    },
  });

  const cat = await prisma.courseCategory.upsert({
    where: { name: '程式設計' },
    update: { isActive: true },
    create: { name: '程式設計', isActive: true },
  });

  const tag1 = await prisma.tag.upsert({
    where: { name: '入門' },
    update: { isActive: true },
    create: { name: '入門', isActive: true },
  });

  const tag2 = await prisma.tag.upsert({
    where: { name: 'TypeScript' },
    update: { isActive: true },
    create: { name: 'TypeScript', isActive: true },
  });

  // Seed a published course with 2 sections and 3 lessons.
  const course = await prisma.course.upsert({
    where: { id: 'seed-course-001' },
    update: {},
    create: {
      id: 'seed-course-001',
      instructorId: instructor.id,
      categoryId: cat.id,
      title: 'TypeScript 文字課：從 0 到 1',
      description: '以文字/圖片/PDF 形式帶你熟悉 TypeScript 基礎。',
      price: 499,
      status: 'published',
      publishedAt: new Date(),
      tags: {
        create: [{ tagId: tag1.id }, { tagId: tag2.id }],
      },
      sections: {
        create: [
          {
            title: '第一章：基礎概念',
            order: 1,
            lessons: {
              create: [
                {
                  title: '歡迎',
                  order: 1,
                  contentType: 'text',
                  contentText: '歡迎來到課程！這是一個內容型平台示範。',
                },
                {
                  title: '型別系統簡介',
                  order: 2,
                  contentType: 'text',
                  contentText: 'TypeScript 的型別系統讓你更安全地寫 JS。',
                },
              ],
            },
          },
          {
            title: '第二章：實作',
            order: 2,
            lessons: {
              create: [
                {
                  title: '第一個練習',
                  order: 1,
                  contentType: 'text',
                  contentText: '請嘗試為函式加上型別註記。',
                },
              ],
            },
          },
        ],
      },
    },
  });

  // Auto-purchase for student to demo My Courses.
  await prisma.purchase.upsert({
    where: { userId_courseId: { userId: student.id, courseId: course.id } },
    update: {},
    create: { userId: student.id, courseId: course.id },
  });

  // Example public file asset placeholder (no actual file needed to run)
  await prisma.fileAsset.upsert({
    where: { id: 'seed-public-file-001' },
    update: {},
    create: {
      id: 'seed-public-file-001',
      visibility: 'public',
      storagePath: 'placeholder.txt',
      mimeType: 'text/plain',
      originalName: 'placeholder.txt',
      sizeBytes: 0,
      courseId: course.id,
    },
  });

  console.log('Seeded users:', { admin: admin.email, instructor: instructor.email, student: student.email });
  console.log('Seeded course:', { id: course.id, title: course.title });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
