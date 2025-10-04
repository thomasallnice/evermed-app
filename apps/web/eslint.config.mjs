// Web app ESLint config: consume shared config
import shared from "@evermed/config/eslint.config.mjs";
export default [
  {
    ignores: ['.next/**', 'node_modules/**']
  },
  ...shared
];

