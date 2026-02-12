import fs from "node:fs";
import path from "node:path";

export type E2eSeed = {
  credentials?: {
    password: string;
    adminEmail: string;
    modEmail: string;
    userEmail: string;
  };
  board: { id: string };
  inactiveBoard: { id: string };
  threads: {
    published: { id: string };
    hidden: { id: string };
    locked?: { id: string };
    inactivePublished?: { id: string };
  };
};

export function readSeed(): E2eSeed {
  const repoRoot = process.cwd();
  const seedFile = path.join(repoRoot, ".playwright", "seed.json");
  const raw = fs.readFileSync(seedFile, "utf8");
  return JSON.parse(raw) as E2eSeed;
}
