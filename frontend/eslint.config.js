import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // ── TypeScript ────────────────────────────────────────────────────────
      // Large legacy codebase uses `any` extensively; a full annotation pass
      // is out of scope. Downgrade to warn so CI is not blocked.
      '@typescript-eslint/no-explicit-any': 'warn',

      // Unused vars: warn instead of error; TS compiler already catches these.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],

      // ── React Hooks — keep the two classic rules as errors ────────────────
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // ── React Hooks v7 React-Compiler rules ───────────────────────────────
      // These were introduced in eslint-plugin-react-hooks v5/v7 and flag
      // many patterns in an existing codebase that haven't been migrated to
      // the React Compiler model. Downgrade to warn until a compiler migration
      // is planned.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/set-state-in-render': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/globals': 'warn',
      'react-hooks/gating': 'warn',
      'react-hooks/error-boundaries': 'warn',
      'react-hooks/config': 'off',
      'react-hooks/incompatible-library': 'warn',
      'react-hooks/unsupported-syntax': 'warn',

      // ── React Refresh: HMR-only concern, not a production bug ─────────────
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // ── General JS ────────────────────────────────────────────────────────
      'no-useless-assignment': 'warn',
      'prefer-const': 'warn',
    },
  },
])
