import antfu from '@antfu/eslint-config';

export default antfu({
  type: 'app',
  typescript: true,
  formatters: true,
  stylistic: {
    indent: 2,
    semi: true,
    quotes: 'single',
  },
  ignores: ['**/migrations/*'],
}, {
  rules: {
    'no-console': ['warn'],
    'antfu/no-top-level-await': ['off'],
    'node/prefer-global/process': ['off'],
    'node/no-process-env': ['error'],
    'perfectionist/sort-imports': [
      'error',
      {
        internalPattern: ['@/*'],
        groups: [
          ['type', 'internal-type'],
          ['builtin', 'external'],
          'internal',
          ['parent-type', 'sibling-type', 'index-type'],
          ['parent', 'sibling', 'index'],
          'object',
          'unknown',
        ],
      },
    ],
    'unicorn/filename-case': ['error', {
      case: 'snakeCase',
      ignore: ['README.md'],
    }],
    'no-use-before-define': ['off', { variables: false }],
  },
});
