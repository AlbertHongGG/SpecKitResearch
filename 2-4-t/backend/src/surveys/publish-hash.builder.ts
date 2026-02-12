import { Injectable } from '@nestjs/common';
import { buildPublishHashPayloadV1, computePublishHashNode } from '@app/canonicalization';

@Injectable()
export class PublishHashBuilder {
  computeFromSurveyStructure(input: {
    survey_id: string;
    slug: string;
    questions: Array<{
      id: string;
      order: number;
      type: string;
      required: boolean;
      title: string;
      description: string | null;
      options: Array<{ id: string; order: number; value: string; label: string }>;
    }>;
    rule_groups: Array<{
      id: string;
      target_question_id: string;
      action: string;
      mode: string;
      order: number;
      rules: Array<{
        id: string;
        source_question_id: string;
        operator: string;
        value: unknown;
        order: number;
      }>;
    }>;
  }): string {
    const payload = buildPublishHashPayloadV1({
      survey_id: input.survey_id,
      slug: input.slug,
      questions: input.questions,
      rule_groups: input.rule_groups
    });

    return computePublishHashNode(payload);
  }
}
