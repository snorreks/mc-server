module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
  },
  extends: [
    'google',
    '@nuxtjs/eslint-config-typescript',
    'plugin:prettier/recommended',
    'plugin:nuxt/recommended',
  ],
  rules: {
    'no-console': 'off',
    'valid-jsdoc': [
      1,
      {
        requireParamType: false,
        requireReturnType: false,
      },
    ],
  },
};
