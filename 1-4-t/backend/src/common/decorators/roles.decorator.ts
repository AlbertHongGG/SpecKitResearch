import { SetMetadata } from '@nestjs/common'
import { ROLES_KEY } from '../guards/roles.guard'

export function Roles(...roles: Array<'Customer' | 'Agent' | 'Admin'>) {
  return SetMetadata(ROLES_KEY, roles)
}
