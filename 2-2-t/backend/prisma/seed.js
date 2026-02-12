"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const node_crypto_1 = __importDefault(require("node:crypto"));
const prisma = new client_1.PrismaClient();
function hashPassword(password) {
    const salt = node_crypto_1.default.randomBytes(16);
    const derived = node_crypto_1.default.scryptSync(password, salt, 64);
    return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}
async function main() {
    const adminEmail = 'admin@example.com';
    const instructorEmail = 'instructor@example.com';
    const studentEmail = 'student@example.com';
    const [admin, instructor, student] = await Promise.all([
        prisma.user.upsert({
            where: { emailLower: adminEmail },
            update: {},
            create: {
                email: adminEmail,
                emailLower: adminEmail,
                passwordHash: hashPassword('password123'),
                role: client_1.UserRole.admin,
                isActive: true,
            },
        }),
        prisma.user.upsert({
            where: { emailLower: instructorEmail },
            update: {},
            create: {
                email: instructorEmail,
                emailLower: instructorEmail,
                passwordHash: hashPassword('password123'),
                role: client_1.UserRole.instructor,
                isActive: true,
            },
        }),
        prisma.user.upsert({
            where: { emailLower: studentEmail },
            update: {},
            create: {
                email: studentEmail,
                emailLower: studentEmail,
                passwordHash: hashPassword('password123'),
                role: client_1.UserRole.student,
                isActive: true,
            },
        }),
    ]);
    const category = await prisma.category.upsert({
        where: { name: '程式設計' },
        update: { isActive: true },
        create: { name: '程式設計', isActive: true },
    });
    const tag = await prisma.tag.upsert({
        where: { name: 'TypeScript' },
        update: { isActive: true },
        create: { name: 'TypeScript', isActive: true },
    });
    const course = await prisma.course.upsert({
        where: { id: 'seed-course-1' },
        update: {},
        create: {
            id: 'seed-course-1',
            instructorId: instructor.id,
            title: '入門 TypeScript（文字版）',
            description: '從 0 到 1 建立 TypeScript 基礎觀念。',
            price: 1000,
            coverImageUrl: null,
            status: client_1.CourseStatus.published,
            publishedAt: new Date(),
            categoryId: category.id,
            courseTags: {
                create: [{ tagId: tag.id }],
            },
            sections: {
                create: [
                    {
                        title: '第一章：環境與型別',
                        position: 1,
                        lessons: {
                            create: [
                                {
                                    title: 'Lesson 1：型別是什麼',
                                    position: 1,
                                    contentType: client_1.LessonContentType.text,
                                    contentText: '歡迎來到 TypeScript！',
                                },
                                {
                                    title: 'Lesson 2：基本型別',
                                    position: 2,
                                    contentType: client_1.LessonContentType.text,
                                    contentText: 'string/number/boolean... ',
                                },
                            ],
                        },
                    },
                ],
            },
        },
    });
    // Ensure courseTags exist for upsert course id case.
    await prisma.courseTag.upsert({
        where: { courseId_tagId: { courseId: course.id, tagId: tag.id } },
        update: {},
        create: { courseId: course.id, tagId: tag.id },
    });
    // Create a purchase for student to validate reader/progress quickly.
    await prisma.purchase.upsert({
        where: { userId_courseId: { userId: student.id, courseId: course.id } },
        update: {},
        create: { userId: student.id, courseId: course.id },
    });
    console.log('Seed completed:', { admin: admin.email, instructor: instructor.email, student: student.email, courseId: course.id });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map