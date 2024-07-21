module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    "standard-with-typescript",
    "plugin:react/recommended",
    "plugin:@next/next/recommended",
    "prettier",
  ],
  overrides: [
    {
      env: {
        node: true,
      },
      files: [".eslintrc.{js,cjs}"],
      parserOptions: {
        sourceType: "script",
      },
    },
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["react"],
  rules: {
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/strict-boolean-expressions": "off",
    "react/prop-types": "off",
    "@typescript-eslint/no-misused-promises": "off",
    "@typescript-eslint/no-floating-promises": "off",
    "@typescript-eslint/promise-function-async": "off",
    "@typescript-eslint/no-confusing-void-expression": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/prefer-ts-expect-error": "off",
    "@typescript-eslint/prefer-nullish-coalescing": "off",
    "@typescript-eslint/restrict-template-expressions": "off",
    "@typescript-eslint/ban-types": "off",
  },
  settings: {
    react: {
      version: "detect",
    },
  },
  ignorePatterns: [
    "/.next",
    "/.contentlayer",
    "/.husky",
    "/supabase",
    "pnpm-lock.yaml",
    "postcss.config.js",
    "tailwind.config.js",
    "next.config.js",
    "next-env.d.ts",
    ".eslintrc.js",
    "contentlayer.config.js",
    "commitlint.config.js",
    "/app/components/select.tsx",
    "/app/components/hover-card.tsx",
    "/app/components/tooltip.tsx",
    "/react-email-starter",
    "/app/talent/designs/30-day-challenge",
  ],
};
