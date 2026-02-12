import argon2 from 'argon2';

import { prisma } from '../src/server/db/prisma';

async function main() {
  const passwordHash = await argon2.hash('password123', {
    type: argon2.argon2id,
  });

  const [admin, instructor, student] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        passwordHash,
        role: 'admin',
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'instructor@example.com' },
      update: {},
      create: {
        email: 'instructor@example.com',
        passwordHash,
        role: 'instructor',
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'student@example.com' },
      update: {},
      create: {
        email: 'student@example.com',
        passwordHash,
        role: 'student',
        isActive: true,
      },
    }),
  ]);

  const category = await prisma.courseCategory.upsert({
    where: { name: 'General' },
    update: { isActive: true },
    create: { name: 'General', isActive: true },
  });

  const tag = await prisma.tag.upsert({
    where: { name: 'GettingStarted' },
    update: { isActive: true },
    create: { name: 'GettingStarted', isActive: true },
  });

  const course = await prisma.course.upsert({
    where: { id: 'seed_course_1' },
    update: {},
    create: {
      id: 'seed_course_1',
      instructorId: instructor.id,
      categoryId: category.id,
      title: 'Welcome Course',
      description: 'Sample course for local development.',
      price: 1000,
      status: 'published',
      publishedAt: new Date(),
      courseTags: {
        create: [{ tagId: tag.id }],
      },
      sections: {
        create: [
          {
            title: 'Introduction',
            order: 1,
            lessons: {
              create: [
                {
                  title: 'Read Me',
                  order: 1,
                  contentType: 'text',
                  contentText:
                    'Hello! This is a seeded lesson. You can mark progress after purchasing.',
                },
              ],
            },
          },
        ],
      },
    },
    include: { sections: { include: { lessons: true } } },
  });

  await prisma.purchase.upsert({
    where: {
      userId_courseId: {
        userId: student.id,
        courseId: course.id,
      },
    },
    update: {},
    create: {
      userId: student.id,
      courseId: course.id,
    },
  });

  console.log('Seed complete:', {
    admin: admin.email,
    instructor: instructor.email,
    student: student.email,
    courseId: course.id,
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
