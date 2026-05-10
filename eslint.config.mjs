import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'storybook-static/**',
      'src/.generated/**',
      'src/vendor/**',
      '*.cjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    plugins: {
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        performance: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        queueMicrotask: 'readonly',
        Worker: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        Event: 'readonly',
        MessageEvent: 'readonly',
        ErrorEvent: 'readonly',
        ResizeObserver: 'readonly',
        OffscreenCanvas: 'readonly',
        HTMLCanvasElement: 'readonly',
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        Node: 'readonly',
        CanvasRenderingContext2D: 'readonly',
        OffscreenCanvasRenderingContext2D: 'readonly',
        Intl: 'readonly',
        navigator: 'readonly',
        MediaQueryList: 'readonly',
        FrameRequestCallback: 'readonly',
        CanvasTextAlign: 'readonly',
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'no-restricted-properties': [
        'error',
        {
          object: 'React',
          property: 'dangerouslySetInnerHTML',
          message: 'dangerouslySetInnerHTML is banned in zero-jitter.',
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['src/worker/**/*.ts'],
    languageOptions: {
      globals: {
        self: 'readonly',
      },
    },
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'document', message: 'document is not available in Web Workers.' },
        { name: 'window', message: 'window is not available in Web Workers.' },
      ],
    },
  },
  {
    files: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
  prettier,
];
