import { describe, it, expect } from 'vitest';
import { AuthController } from '../../src/modules/auth/auth.controller.js';

const prisma = {
  user: {
    findUnique: async ({ where: { email } }: any) => {
      if (email === 'existing@example.com') {
        return { id: 'u1', email, passwordHash: 'hash', role: 'student', isActive: true };
      }
      return null;
    },
    create: async ({ data }: any) => ({ id: 'u2', ...data }),
  },
} as any;

const sessions = {
  createSession: async () => ({ id: 's1' }),
} as any;

describe('AuthController', () => {
  it('registers a new user', async () => {
    const controller = new AuthController(prisma, sessions);
    const result = await controller.register({ email: 'new@example.com', password: 'password123' });
    expect(result).toEqual({ message: 'Registered. Please login.' });
  });
});
