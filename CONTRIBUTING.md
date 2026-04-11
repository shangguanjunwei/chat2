# 参与贡献与 Git 提交规范

本仓库使用 [Conventional Commits](https://www.conventionalcommits.org/) 风格，并通过 **commitlint** 在 `git commit` 时校验说明格式。

## 提交信息格式

```
<type>(<scope>): <subject>
```

| 部分 | 必填 | 说明 |
|------|------|------|
| type | 是 | 见下表 |
| scope | 否 | 模块或目录，如 `cli`、`bridge`、`deps` |
| subject | 是 | 一句话说明改动；祈使句、**句末不加句号** |

### type 取值

| type | 含义 |
|------|------|
| feat | 新功能 |
| fix | 修 bug |
| docs | 仅文档 |
| style | 格式、空格等（不改逻辑） |
| refactor | 重构 |
| perf | 性能优化 |
| test | 测试 |
| build | 构建、CI |
| chore | 杂项（依赖、脚本、配置等） |
| revert | 回滚某次提交 |

### 多行正文与页脚

与第一行 **空一行** 后可写正文。页脚可写 `Closes #123`、`BREAKING CHANGE: 说明`，或在 type 后加 `!` 表示破坏性变更。

### 示例

```
feat(cli): 支持从环境变量读取工作区路径
```

```
fix(bridge): 修复长连接断开后未自动重连
```

```
chore(deps): 将 TypeScript 升级到 6.x
```

## 路径与文件名大小写

本仓库要求 **Git 区分文件与目录名的大小写**（避免 `Foo.ts` 与 `foo.ts` 被当成同一路径）。

克隆或新建本地仓库后，在本仓库根目录执行一次（仅作用于当前仓库）：

```bash
git config core.ignorecase false
```

可用 `git config --get core.ignorecase` 确认，期望输出为 `false`。

说明：在 macOS 默认**大小写不敏感**磁盘上，仍可能出现系统层限制；若需严格区分同名不同大小写文件，建议使用大小写敏感卷或 Linux 环境。

## 本地校验（提交时自动执行）

安装依赖后，**Husky** 会在 `commit-msg` 阶段运行 **commitlint**。不符合格式的提交会被拒绝。

手动校验最近一次提交说明：

```bash
echo "feat(cli): 示例" | npx commitlint
```

## 提交模板（可选）

首次克隆后在本仓库根目录执行一次：

```bash
git config commit.template "$(git rev-parse --show-toplevel)/.gitmessage"
```

之后使用 `git commit`（不加 `-m`）会打开编辑器并载入模板提示；以 `#` 开头的行在保存后会被忽略。

仅对本仓库生效。全局默认请使用 `git config --global commit.template ...`。
