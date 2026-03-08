'use strict';

const prismaClient = require('@prisma/client');

let prisma;
function getPrisma() {
  if (!prisma) {
    prisma = new prismaClient.PrismaClient();
  }
  return prisma;
}

module.exports = {
  ...prismaClient,
  getPrisma,
};
