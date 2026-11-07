import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    name: "procurematesu/global-ignores",
    ignores: [
      ".next/**",
      ".next-dev/**",
      "**/next-env.d.ts",
      "dist/**",
      "node_modules/**",
      "scripts/**",
      "data/**",
    ],
  },
  {
    name: "procurematesu/typescript-overrides",
    files: ["**/*.{ts,tsx,mts,cts}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    name: "procurematesu/shared-overrides",
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    rules: {
      "react/no-unescaped-entities": "off",
      "prefer-const": "off",
    },
  },
];

export default eslintConfig;
