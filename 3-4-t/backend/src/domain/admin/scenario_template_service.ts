import type { PrismaClient } from '@prisma/client';

export type ScenarioTemplateUpsertInput = {
  type: string;
  default_delay_sec: number;
  default_error_code: string | null;
  default_error_message: string | null;
  enabled: boolean;
};

export class ScenarioTemplateService {
  constructor(private prisma: PrismaClient) {}

  async list() {
    return this.prisma.simulationScenarioTemplate.findMany({
      orderBy: [{ type: 'asc' }],
    });
  }

  async upsert(input: ScenarioTemplateUpsertInput) {
    const existing = await this.prisma.simulationScenarioTemplate.findFirst({
      where: { type: input.type },
      orderBy: { created_at: 'asc' },
    });

    if (existing) {
      return this.prisma.simulationScenarioTemplate.update({
        where: { id: existing.id },
        data: {
          default_delay_sec: input.default_delay_sec,
          default_error_code: input.default_error_code,
          default_error_message: input.default_error_message,
          enabled: input.enabled,
        },
      });
    }

    return this.prisma.simulationScenarioTemplate.create({
      data: {
        type: input.type,
        default_delay_sec: input.default_delay_sec,
        default_error_code: input.default_error_code,
        default_error_message: input.default_error_message,
        enabled: input.enabled,
      },
    });
  }
}
