/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: true,
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  rules: {
    // Seguridad: prevenir eval() malicioso
    'no-eval': 'error',
    'no-implied-eval': 'error',
    // Seguridad: prevenir creación de funciones dinámicas
    'no-new-func': 'error',
    // TypeScript estricto: prohibir any explícito
    '@typescript-eslint/no-explicit-any': 'error',
    // TypeScript estricto: prohibir asignaciones inseguras
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/no-unsafe-argument': 'error',
    // Buenas prácticas
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['error', 'warn'] }],
  },
  ignorePatterns: ['dist/', '.next/', 'node_modules/', '*.config.js'],
};
