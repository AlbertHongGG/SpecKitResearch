import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testTimeout: 20000,
  maxWorkers: 1,
  testMatch: ['<rootDir>/(src|test)/**/*.test.ts', '<rootDir>/(src|test)/**/*.spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  globalSetup: '<rootDir>/test/jest-global-setup.ts',
};

export default config;
