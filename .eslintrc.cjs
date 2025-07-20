module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    worker: true,
    serviceworker: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/jsx-runtime',
  ],
  ignorePatterns: [
    'dist',
    '.eslintrc.cjs',
    'node_modules',
    '.wrangler',
    'infrastructure',
    'migrations',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['react-refresh', '@typescript-eslint', 'react', 'react-hooks'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/ban-ts-comment': 'warn',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  overrides: [
    {
      // Worker files - restrict browser globals
      files: ['src/**/*.ts'],
      excludedFiles: ['src/**/*.test.ts'],
      env: {
        browser: false,
        worker: true,
        serviceworker: true,
      },
      rules: {
        'no-restricted-globals': ['error', 'window', 'document'],
      },
    },
    {
      // SPA files - allow browser globals
      files: ['spa/**/*.ts', 'spa/**/*.tsx'],
      env: {
        browser: true,
        worker: false,
        serviceworker: false,
      },
      rules: {
        'no-restricted-globals': 'off',
      },
    },
    {
      // Test files - more lenient rules
      files: ['**/*.test.ts', '**/*.test.tsx'],
      env: {
        jest: true,
        node: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};
