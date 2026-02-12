import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createTestDb } from '../helpers/test-db';
import { createTestApp } from '../helpers/test-app';
import { registerUser, loginUser } from '../helpers/test-auth';

describe('US3 integration: attachment download access', () => {
  it('purchased user can download; other user gets 403', async () => {
    const db = await createTestDb();
    const { app, http } = await createTestApp();

    try {
      const instructor = await registerUser({
        http,
        prisma: db.prisma,
        email: 'inst6@example.com',
        password: 'password123',
        role: 'instructor',
      });
      const student = await registerUser({
        http,
        prisma: db.prisma,
        email: 's6@example.com',
        password: 'password123',
        role: 'student',
      });
      const other = await registerUser({
        http,
        prisma: db.prisma,
        email: 's6b@example.com',
        password: 'password123',
        role: 'student',
      });

      const course = await db.prisma.course.create({
        data: {
          instructorId: instructor.id,
          title: 'Published',
          description: 'desc',
          price: 100,
          status: 'published',
          publishedAt: new Date(),
          sections: {
            create: [
              {
                title: 'S',
                position: 1,
                lessons: {
                  create: [{ title: 'L', position: 1, contentType: 'text', contentText: 'Hello' }],
                },
              },
            ],
          },
        },
        include: { sections: { include: { lessons: true } } },
      });

      const lesson = course.sections[0]!.lessons[0]!;

      fs.mkdirSync(db.uploadsDir, { recursive: true });
      const fileBytes = Buffer.from('hello attachment');
      const sha256 = crypto.createHash('sha256').update(fileBytes).digest('hex');
      const storageKey = 'a/hello.txt';
      const fullPath = path.join(db.uploadsDir, storageKey);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, fileBytes);

      const attachment = await db.prisma.attachment.create({
        data: {
          lessonId: lesson.id,
          originalFilename: 'hello.txt',
          mimeType: 'text/plain',
          sizeBytes: fileBytes.length,
          sha256,
          storageProvider: 'LOCAL',
          storageKey,
        },
      });

      expect(process.env.UPLOADS_DIR).toBe(db.uploadsDir);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(await db.prisma.attachment.findUnique({ where: { id: attachment.id } })).not.toBeNull();

      const { cookie } = await loginUser({ http, email: student.email, password: 'password123' });
      await http.post(`/courses/${encodeURIComponent(course.id)}/purchase`).set('cookie', cookie).expect(200);

      const ok = await http
        .get(`/attachments/${encodeURIComponent(attachment.id)}/download`)
        .set('cookie', cookie)
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        });
      if (ok.status !== 200) {
        throw new Error(
          `download failed: status=${ok.status} body=${JSON.stringify(ok.body)} text=${typeof ok.text === 'string' ? ok.text : ''}`,
        );
      }
      expect(Buffer.isBuffer(ok.body)).toBe(true);

      const { cookie: otherCookie } = await loginUser({ http, email: other.email, password: 'password123' });
      await http
        .get(`/attachments/${encodeURIComponent(attachment.id)}/download`)
        .set('cookie', otherCookie)
        .expect(403);
    } finally {
      await app.close();
      await db.cleanup();
    }
  });
});
