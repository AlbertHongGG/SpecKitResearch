import { canonicalizeJson } from './canonicalize';
import { sha256HexNode } from './sha256-node';

export type ResponseHashPayloadV1 = {
  hash_version: 'v1';
  _type: 'survey_response';
  survey_id: string;
  publish_hash: string;
  respondent_id: string | null;
  answers: Record<string, unknown>;
};

export function buildResponseHashPayloadV1(input: Omit<ResponseHashPayloadV1, 'hash_version' | '_type'>): ResponseHashPayloadV1 {
  return {
    hash_version: 'v1',
    _type: 'survey_response',
    ...input
  };
}

export function computeResponseHashNode(payload: ResponseHashPayloadV1): string {
  const canonical = canonicalizeJson(payload);
  return sha256HexNode(canonical);
}
