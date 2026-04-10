/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 允许中文等语言的 subject，不强制英文大小写规则
    'subject-case': [0],
  },
};
