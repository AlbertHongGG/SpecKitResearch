export type SessionRecord = {
  id: string;
  userId: string;
  createdAt: Date;
  lastSeenAt: Date | null;
  expiresAt: Date;
  revokedAt: Date | null;
};

export interface SessionRepo {
  create(args: { userId: string; ttlDays: number }): Promise<SessionRecord>;
  findActiveById(sessionId: string): Promise<SessionRecord | null>;
  revoke(sessionId: string): Promise<void>;
}
