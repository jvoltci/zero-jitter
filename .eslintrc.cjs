/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/strict',
    'prettier',
  ],
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
  },
  overrides: [
    {
      files: ['src/worker/**/*.ts'],
      rules: {
        'no-restricted-globals': [
          'error',
          { name: 'document', message: 'document is not available in Web Workers.' },
          { name: 'window', message: 'window is not available in Web Workers.' },
        ],
      },
    },
  ],
  ignorePatterns: ['dist/', 'node_modules/', '*.cjs'],
};
