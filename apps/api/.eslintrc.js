/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['@ecommerce/config/eslint'],
  parserOptions: {
    project: './tsconfig.json',
  },
};
