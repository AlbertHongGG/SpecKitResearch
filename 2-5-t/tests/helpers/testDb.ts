import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

export type TestDb = {
  prisma: PrismaClient;
  cleanup: () => Promise<void>;
  pushSchema: () => void;
  url: string;
  filePath: string;
};

export async function createTestDb(): Promise<TestDb> {
  const filePath = path.join(os.tmpdir(), `forum-test-${Date.now()}-${Math.random()}.db`);
  const url = `file:${filePath}`;

  const prisma = new PrismaClient({
    datasources: {
      db: { url },
    },
    log: [],
  });

  const cleanup = async () => {
    await prisma.$disconnect();
    try {
      fs.unlinkSync(filePath);
    } catch {
      // ignore
    }
  };

  const pushSchema = () => {
    execFileSync(
      "npx",
      ["prisma", "db", "push", "--skip-generate"],
      {
        cwd: process.cwd(),
        stdio: "ignore",
        env: {
          ...process.env,
          DATABASE_URL: url,
        },
      },
    );
  };

  return { prisma, cleanup, pushSchema, url, filePath };
}
