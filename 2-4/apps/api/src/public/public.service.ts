import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async loadPublishedSurveyBySlug(slug: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        is_anonymous: true,
        status: true,
        publish_hash: true,
      },
    });

    if (!survey) return null;
    if (survey.status !== 'Published') return null;
    if (!survey.publish_hash) return null;

    const publish = await this.prisma.surveyPublish.findUnique({
      where: { publish_hash: survey.publish_hash },
      select: { publish_hash: true, schema_json: true },
    });

    if (!publish) return null;

    const schema = publish.schema_json as unknown as {
      questions?: unknown[];
      options?: unknown[];
      rule_groups?: unknown[];
    };
    return {
      survey: {
        id: survey.id,
        slug: survey.slug,
        title: survey.title,
        description: survey.description ?? null,
        is_anonymous: survey.is_anonymous,
        status: survey.status,
      },
      publish_hash: publish.publish_hash,
      questions: schema.questions ?? [],
      options: schema.options ?? [],
      rule_groups: schema.rule_groups ?? [],
    };
  }
}
