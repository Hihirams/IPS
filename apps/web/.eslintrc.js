/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: [require.resolve('@ecommerce/config/eslint')],
  parserOptions: {
    project: './tsconfig.json',
  },
};
