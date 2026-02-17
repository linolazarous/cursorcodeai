// packages/config/eslint.config.js
import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import prettierConfig from "eslint-config-prettier";

export default [
  js.configs.recommended,

  // Next.js recommended rules
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },

  // React + React Hooks
  {
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",           // Not needed with React 17+
      "react/prop-types": "off",                   // Using TypeScript / Zod instead
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },

  // Prettier (disable conflicting rules)
  prettierConfig,

  // Custom rules for CursorCode AI
  {
    rules: {
      // Code quality
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],

      // Import order & cleanliness
      "import/order": "off", // You can enable if you install eslint-plugin-import

      // React-specific
      "react-hooks/exhaustive-deps": "warn",
      "react/jsx-curly-brace-presence": ["warn", { props: "never", children: "never" }],

      // Performance & best practices
      "no-restricted-syntax": [
        "error",
        {
          selector: "ForInStatement",
          message: "for..in loops should be avoided in favor of Object.keys or Object.entries",
        },
      ],
    },
  },

  // Ignore patterns
  {
    ignores: [
      "**/.next/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/*.config.js",
      "**/out/**",
    ],
  },
];
