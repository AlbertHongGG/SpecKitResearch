# Backend (NestJS + Prisma + SQLite)

Implements the Leave Management API defined in `specs/001-leave-management/contracts/openapi.yaml`.

## Requirements

- Node.js LTS
- pnpm

## Setup

```bash
pnpm install
cp .env.example .env
```

## Database

```bash
# after Prisma is added
pnpm prisma migrate dev
pnpm prisma db seed
```

## Run

```bash
pnpm start:dev
```

The server should listen on `http://localhost:3000`.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
