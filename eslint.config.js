import { getDefaultConfig } from 'eslint-config-universe';

export default [
  ...getDefaultConfig({
    typescript: true,
    react: { version: '18.2' }
  }),
  {
    rules: {
      'import/no-default-export': 'off'
    }
  }
];
