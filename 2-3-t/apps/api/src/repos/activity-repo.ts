type ActivityLogPrismaClient = {
  activityLog: {
    create: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any>;
  };
};

export type ActivityInsert = {
  projectId: string;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  timestamp?: Date;
  metadata?: unknown | null;
};

export async function insertActivity(
  prisma: ActivityLogPrismaClient,
  activity: ActivityInsert
) {
  const metadata = activity.metadata === undefined ? undefined : activity.metadata;

  return prisma.activityLog.create({
    data: {
      projectId: activity.projectId,
      actorId: activity.actorId,
      entityType: activity.entityType,
      entityId: activity.entityId,
      action: activity.action,
      timestamp: activity.timestamp ?? new Date(),
      metadata,
    },
  });
}

export async function listRecentActivities(prisma: ActivityLogPrismaClient, projectId: string, limit = 50) {
  return prisma.activityLog.findMany({
    where: { projectId },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
}
