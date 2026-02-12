import { canonicalizeJson } from './canonicalize';
import { sha256HexNode } from './sha256-node';

export type PublishHashPayloadV1 = {
  hash_version: 'v1';
  _type: 'survey_publish';
  survey_id: string;
  slug: string;
  questions: unknown;
  rule_groups: unknown;
};

export function buildPublishHashPayloadV1(input: Omit<PublishHashPayloadV1, 'hash_version' | '_type'>): PublishHashPayloadV1 {
  return {
    hash_version: 'v1',
    _type: 'survey_publish',
    ...input
  };
}

export function computePublishHashNode(payload: PublishHashPayloadV1): string {
  const canonical = canonicalizeJson(payload);
  return sha256HexNode(canonical);
}
