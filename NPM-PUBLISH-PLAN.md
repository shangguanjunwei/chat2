# NPM 包发布与命令行简称方案

本文说明如何将本仓库发布为可安装的 NPM 包，并在安装后提供**短命令**在终端使用。当前工程已具备大部分基础设施，以下按「现状 → 需改项 → 发布流程 → 验证」组织。

---

## 一、目标

| 目标 | 说明 |
|------|------|
| `npm install` 后可执行 | 用户全局或项目内安装后，能通过配置的 `bin` 名称调用 CLI。 |
| 命令行简称 | 除长名外，提供短别名（例如 `ccb`），减少输入。 |
| 可维护 | 构建产物单一入口、发布前自动构建、发布包体积可控。 |

---

## 二、现状（已具备）

1. **`package.json`**
   - `"type": "module"`，与 ESM 产物一致。
   - `"main": "dist/cli.js"`，CLI 入口与构建输出一致。
   - `"bin": { "chat-code-bridge": "dist/cli.js" }`，安装后会有 `chat-code-bridge` 命令（指向同一文件）。
   - `"prepublishOnly": "npm run build"`，发布前会执行 `tsup` 构建。
   - `"files": ["dist", "README.md", "LICENSE.txt"]`，发布时只带上必要文件（依赖由 NPM 在安装时解析，不打进包里）。
2. **`tsup.config.ts`**
   - 入口为 `bin/cli.ts`，输出 `dist/cli.js`。
   - `banner` 含 `#!/usr/bin/env node`，全局安装后可直接执行。
   - `external` 为 `dependencies`，不把第三方打进 bundle，符合常见 CLI 包做法。
3. **运行时配置**：`@config` 下 JSON/TS 通过构建别名打进 bundle，**一般无需**再把 `config/` 目录单独列入 `files`（除非后续改为运行时读磁盘上的配置文件，再另议）。

---

## 三、需要修改的项

### 1. 关闭「禁止发布」

当前存在 `"private": true`，NPM **不会**接受发布。二选一：

- 若要公开发布：删除 `"private": true`，或改为 `"private": false`。
- 若仅内网/registry：同样需按你们 registry 要求去掉或调整 `private`，并配置 `.npmrc` 指向私有源。

### 2. 增加命令行简称（短名）

NPM 的 `bin` 支持**多个键指向同一文件**。在 `package.json` 的 `bin` 中增加短名即可，例如：

```json
"bin": {
  "chat-code-bridge": "dist/cli.js",
  "ccb": "dist/cli.js"
}
```

说明：

- 短名建议 **2～4 个字母**，且先在 [npm 上搜索](https://www.npmjs.com/) 是否已被占用；若冲突可换 `ccbridge`、`chat-bridge` 等。
- 全局安装后，用户可同时使用 `chat-code-bridge` 与 `ccb`（示例短名为 `ccb`，可按产品命名替换）。
- **无需**复制 `dist/cli.js` 或改 `tsup` 多入口，一个可执行文件多名字是标准做法。

### 3. 恢复或补充 `README.md`

`files` 字段包含 `README.md`，且 NPM 包页会展示它。若仓库根目录没有 `README.md`，应恢复或新建，避免发布报错或包页为空。内容建议包含：用途、安装方式、全局/本地用法、环境变量或配置文件说明、`engines` 要求（Node ≥22）。

### 4. （可选）包名与作用域

- 若 `chat-code-bridge` 在 NPM 已被占用，需改名，例如 `@你的作用域/chat-code-bridge`，并在 `package.json` 的 `name` 字段使用带 scope 的名称。
- 改名后不影响 `bin` 里的命令名；`bin` 的 key 可与 `name` 不同。

### 5. （可选）`exports` 与程序化引用

若未来希望别人 `import` 本包 API（而不仅是跑 CLI），可增设 `exports` 指向单独打好的库入口；当前 `main` 指向 CLI 对「仅命令行使用」足够。此为扩展项，非本次必需。

### 6. （可选）`.npmignore` 与发布内容

已用 `files` 白名单时，通常**不需要** `.npmignore`。若仍担心误传文件，可显式检查：

```bash
npm pack --dry-run
```

确认仅包含 `dist/`、`README.md`、`LICENSE.txt` 及 `package.json` 中声明内容。

---

## 四、发布与安装流程（给维护者）

1. 登录 NPM：`npm login`（或配置 CI 的 token）。
2. 版本号：按语义化版本修改 `package.json` 的 `version`，或使用 `npm version patch|minor|major`。
3. 本地验证构建：`npm run build`，确认 `dist/cli.js` 存在且首行 shebang 正确。
4. 干跑打包：`npm pack --dry-run`，检查文件列表。
5. 发布：`npm publish`（公开包）；作用域包且需公开时：`npm publish --access public`。

---

## 五、用户侧使用方式（安装后）

### 全局安装（推荐需要随处敲命令时）

```bash
npm install -g chat-code-bridge
# 或指定 registry / scope 时按你们实际包名调整
```

安装成功后，在 PATH 正常的前提下可直接执行：

- 长名：`chat-code-bridge`
- 短名：若已配置 `ccb`，则 `ccb`（示例）

### 项目本地安装（推荐与项目绑定版本）

```bash
npm install chat-code-bridge
```

在 `package.json` 的 `scripts` 中调用，例如：

```json
"scripts": {
  "bridge": "ccb"
}
```

执行 `npm run bridge`；或使用 `npx ccb` / `npx chat-code-bridge` 无需写 scripts。

---

## 六、验证清单（发布前）

- [ ] 已去掉 `private: true`（或按私有 registry 规则配置）。
- [ ] `bin` 中长名、短名均指向 `dist/cli.js`，且短名未与 NPM 上已有包冲突（按需检索）。
- [ ] 根目录存在 `README.md`。
- [ ] `npm run build` 成功，`node dist/cli.js` 能正常启动（或等价行为）。
- [ ] `npm pack --dry-run` 文件列表符合预期。
- [ ] （可选）在干净目录 `npm install -g ./path/to/chat-code-bridge-1.0.0.tgz` 试装，验证 `ccb` / `chat-code-bridge` 均可执行。

---

## 七、小结

| 动作 | 说明 |
|------|------|
| 必改 | 取消 `private`；保证有 `README.md`。 |
| 简称 | 在 `bin` 中增加第二项指向同一 `dist/cli.js`。 |
| 已有 | ESM、`tsup` 构建、shebang、`prepublishOnly`、`files` 白名单。 |

按上表修改后，即可在满足 Node 版本要求的环境下，通过全局或本地安装使用长/短命令行名称调用本工具。
