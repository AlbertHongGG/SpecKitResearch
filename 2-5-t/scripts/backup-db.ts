import fs from "node:fs";
import path from "node:path";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function parseSqliteFilePath(databaseUrl: string) {
  // Prisma SQLite URLs look like: file:./dev.db or file:/abs/path.db
  if (!databaseUrl.startsWith("file:")) {
    throw new Error("Only sqlite file: URLs are supported");
  }
  const rawPath = databaseUrl.slice("file:".length);
  if (!rawPath) throw new Error("Invalid DATABASE_URL");

  // For relative paths, resolve from cwd.
  return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
}

async function main() {
  const databaseUrl = requireEnv("DATABASE_URL");
  const sourcePath = parseSqliteFilePath(databaseUrl);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`DB file not found: ${sourcePath}`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${sourcePath}.${timestamp}.bak`;

  fs.copyFileSync(sourcePath, backupPath);
  process.stdout.write(`${backupPath}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
