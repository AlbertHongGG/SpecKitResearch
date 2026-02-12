import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/out/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/.vercel/**',
      '**/prisma/dev.db',
      '**/prisma/dev.db-journal',
      '**/*.db',
      '**/*.db-journal',
      '**/uploads/**',
    ],
  },
  ...compat.extends('next/core-web-vitals'),
];
