import { PrismaClient, Role } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function upsertUser(params: {
  email: string
  password: string
  role: Role
  isActive?: boolean
}) {
  const passwordHash = await bcrypt.hash(params.password, 12)
  return prisma.user.upsert({
    where: { email: params.email },
    update: {
      passwordHash,
      role: params.role,
      isActive: params.isActive ?? true,
    },
    create: {
      email: params.email,
      passwordHash,
      role: params.role,
      isActive: params.isActive ?? true,
    },
  })
}

async function main() {
  await upsertUser({
    email: 'admin@example.com',
    password: 'Admin1234!',
    role: Role.Admin,
  })

  await upsertUser({
    email: 'agent@example.com',
    password: 'Agent1234!',
    role: Role.Agent,
  })

  await upsertUser({
    email: 'customer@example.com',
    password: 'Customer1234!',
    role: Role.Customer,
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
