/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    es2022: true,
  },
  ignorePatterns: ['node_modules/', 'dist/', 'build/', 'coverage/'],
};
