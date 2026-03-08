import type { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

type PrismaPluginOptions = {
  databaseUrl: string;
};

const prismaPluginInner: FastifyPluginAsync<PrismaPluginOptions> = async (app, opts) => {
  const prisma = new PrismaClient({
    datasources: {
      db: { url: opts.databaseUrl },
    },
  });

  app.decorate('prisma', prisma);
  app.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect();
  });
};

export const prismaPlugin = fp(prismaPluginInner, {
  name: 'prismaPlugin',
});
