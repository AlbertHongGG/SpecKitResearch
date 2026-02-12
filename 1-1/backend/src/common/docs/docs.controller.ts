import { Controller, Get, Res } from '@nestjs/common'
import type { Response } from 'express'
import { join } from 'path'

@Controller('docs')
export class DocsController {
  @Get('openapi.yaml')
  getOpenApi(@Res() res: Response) {
    const filePath = join(process.cwd(), 'public', 'openapi.yaml')
    res.type('text/yaml').sendFile(filePath)
  }
}
