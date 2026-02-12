import { flowRepository } from '../repositories/flowRepository.js';

export const flowQueryService = {
  listActiveTemplates() {
    return flowRepository.listActiveTemplates();
  },
};
