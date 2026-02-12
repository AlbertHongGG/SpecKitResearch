import { userRepository } from '../repositories/userRepository.js';

export const adminUserService = {
  async listUsersByRole(role: 'User' | 'Reviewer' | 'Admin') {
    return userRepository.listByRole(role);
  },
};
