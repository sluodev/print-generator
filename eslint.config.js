// ESLint 9 Flat Config。
// 仅启用 typescript-eslint 的"类型感知"推荐规则 + Prettier 关闭格式相关规则。
// import 排序由 Prettier / 人工维持；如需 import-order，未来可加 eslint-plugin-import-x。

import prettierConfig from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '.vite/**', 'pnpm-lock.yaml'],
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        // TS-ESLint 8 推荐方式：自动用最近的 tsconfig.json。
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // 题面生成里的回溯算法用了 number[][] / boolean[][] 等下标访问，
      // 在严格类型 + 显式断言下噪声较多；这里允许 non-null 断言。
      '@typescript-eslint/no-non-null-assertion': 'off',
      // setTimeout / setInterval 回调里的隐式 void 返回不视为问题。
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
  // .js 配置文件（eslint.config.js / vite.config.* 之外的纯 JS）：关闭类型感知规则，避免被 TS project 拒收。
  {
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  // Vitest 测试文件：放宽部分规则。
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    },
  },
  prettierConfig,
);
