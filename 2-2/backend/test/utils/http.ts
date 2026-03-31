import request from 'supertest'
import type { INestApplication } from '@nestjs/common'

export function api(app: INestApplication) {
  const server = app.getHttpServer()

  return {
    get: (path: string) => request(server).get(path),
    post: (path: string) => request(server).post(path),
    patch: (path: string) => request(server).patch(path),

    asBearer: (token: string) => ({
      get: (path: string) => request(server).get(path).set('Authorization', `Bearer ${token}`),
      post: (path: string) => request(server).post(path).set('Authorization', `Bearer ${token}`),
      patch: (path: string) => request(server).patch(path).set('Authorization', `Bearer ${token}`),
    }),
  }
}
