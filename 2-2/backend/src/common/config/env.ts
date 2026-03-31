import 'dotenv/config'

import { validateEnv } from './validate'

export const env = validateEnv(process.env)
