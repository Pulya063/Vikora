import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { ignores: ['dist/**', '.wrangler/**'] },
  { files: ['**/*.ts'], rules: { '@typescript-eslint/no-explicit-any': 'off', 'no-control-regex': 'off' } },
);
