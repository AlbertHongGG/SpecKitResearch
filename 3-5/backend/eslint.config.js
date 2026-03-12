import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url));

export default [
    {
        ignores: ['dist/**', 'node_modules/**', 'prisma/migrations/**', 'eslint.config.js', 'prettier.config.cjs'],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    prettier,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir,
            },
        },
        rules: {
            'no-console': 'off',
        },
    },
];
