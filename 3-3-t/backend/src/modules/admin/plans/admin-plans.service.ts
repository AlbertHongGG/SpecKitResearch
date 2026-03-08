import { Injectable } from '@nestjs/common';
import { PlansRepository } from '../../plans/plans.repository';

@Injectable()
export class AdminPlansService {
  constructor(private readonly plansRepository: PlansRepository) {}

  list() {
    return this.plansRepository.list(true);
  }

  create(input: any) {
    return this.plansRepository.create(input);
  }

  async toggle(id: string, isActive: boolean) {
    return this.plansRepository.update(id, { isActive });
  }
}
