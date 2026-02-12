/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['<rootDir>/test/**/*.spec.ts', '<rootDir>/test/**/*.test.ts', '<rootDir>/test/**/*.e2e-spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json', useESM: true }]
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^@app/contracts$': '<rootDir>/../packages/contracts/src/index.ts',
    '^@app/canonicalization$': '<rootDir>/../packages/canonicalization/src/index.ts',
    '^@app/logic-engine$': '<rootDir>/../packages/logic-engine/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};
