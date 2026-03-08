// Jest-only stub for the workspace package "@sb/db".
// This avoids ESM + .js extension resolution issues in Jest.

export class PrismaClient {
  // Minimal surface for PrismaService extension in unit tests.
}

class PrismaClientKnownRequestError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export const Prisma = {
  PrismaClientKnownRequestError,
};
