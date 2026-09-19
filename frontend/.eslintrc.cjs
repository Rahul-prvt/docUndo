// ESLint configuration
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    // The API layer is intentionally schema-less today; TypeScript still
    // validates component contracts and builds while backend schemas evolve.
    '@typescript-eslint/no-explicit-any': 'off',
    // Shared fixture/helper modules export components alongside constants.
    'react-refresh/only-export-components': 'off',
    'react-hooks/exhaustive-deps': 'off',
  },
}
