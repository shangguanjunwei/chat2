<!-- 用于 lark-cli docs +create / +update 的 Lark-flavored Markdown 正文（勿与 --title 重复一级标题） -->

<callout emoji="📌" background-color="light-blue" border-color="blue">
本文档描述 <strong>chat-code-bridge</strong> 仓库的定位、目录结构、启动方式与「飞书消息 → Cursor Agent → 回写飞书」数据流。技术栈：Node.js（ES Module）、<code>@larksuiteoapi/node-sdk</code>。
</callout>

## 项目定位

**chat-code-bridge** 在飞书（Lark）即时消息与本地 **Cursor Agent CLI**（可执行名默认 `agent`）之间建桥：用户通过单聊或群聊 @ 机器人发文本，本进程经 WebSocket 收事件，调用本机 Agent 生成回复，再以文本消息发回同一会话。

---

## 仓库与运行

| 项 | 说明 |
| --- | --- |
| 包管理 | `npm`，`"type": "module"` |
| 入口 | `main.js` |
| 开发启动 | `npm run dev`（即 `node main.js`） |
| 依赖 | `@larksuiteoapi/node-sdk` |

---

## 目录结构（摘要）

| 路径 | 用途 |
| --- | --- |
| `main.js` | 读 `config/chat-code-bridge.json`，`applyTreeNode` 展开到用户目录，`selectAppBridge`，`startFeishuMessageListener` |
| `config/chat-code-bridge.json` | 桥接配置树（如 `~/.chat-code-bridge/` 下缺省文件） |
| `config/chat-options.json` | 可选桥接列表与菜单字段 |
| `utils/` | `applyTreeNode`、`readCofig` / `writeConfig`、日志等 |
| `src/chatApp/index.js` | `selectAppBridge`：选桥接、读/写用户配置 |
| `src/chatApp/feishu/` | 飞书监听与消息发送**实现** |
| `src/chatApp/lark/` | 与 feishu 同逻辑再导出，便于命名空间引用 |
| `src/chatApp/feishu/send-message/` | 文本、卡片、消息表情 |
| `src/aiCode/cursor/index.js` | `sendMessageToCursor`：调用本机 `agent` CLI |

---

## 启动与配置流程

1. `main.js` 读取 `config/chat-code-bridge.json`，用 `applyTreeNode(homedir(), …)` 把配置树中的占位展开为实际路径（例如在用户家目录创建 `.chat-code-bridge` 及默认 `chat-code-bridge.json`）。
2. `selectAppBridge()` 读取 `config/chat-options.json`，展示可选桥接；凭证优先来自 `~/.chat-code-bridge/chat-code-bridge.json`（`readCofig`），缺失则交互输入并 `writeConfig` 写回。
3. 将得到的 `bridge`（含 `appId` / `appSecret` / `domain`）交给 `startFeishuMessageListener(bridge)`。

---

## 运行时数据流（与当前代码一致）

### 飞书侧

- 使用 `WSClient` 订阅 `im.message.receive_v1`。
- **单聊（p2p）**：处理发往机器人的消息。
- **群聊**：仅当消息中 **@ 了本应用**（`mentions` 中含当前 `appId`）时处理。
- 解析文本与 `chat_id`、`message_id`；无文本则忽略。
- 对原消息添加表情 **`Typing`**（输入中），再异步调用 `sendMessageToCursor`。

> **说明**：仓库内 `README.md` 若仍描述「`message_id` 内存去重」，请以当前 `src/chatApp/feishu/index.js` 为准；近期提交已移除该去重逻辑。

### Cursor / Agent 侧（`src/aiCode/cursor/index.js`）

- 会话文件：`~/.chat-code-bridge/chat-code-bridge-session.json`，记录当前 **工作区** 与 **Agent chat id**。
- 工作区：当前为 `process.cwd()`（运行 `node main.js` 时的目录）。
- 首次：`agent create-chat` 得到 `chatId` 并写入会话文件。
- 后续：对同一工作区使用 `agent --print --trust --workspace <dir> --resume <chatId> --output-format text <用户文本>`。
- 将返回文本通过 `sendTextMessage` 发到原 `chat_id`。

### 发送能力（`send-message/`）

| 模块 | 能力 |
| --- | --- |
| `sendTextMessage` | 文本消息 `im.v1.message.create` |
| `sendInteractiveCardMessage` | 可交互卡片（自定义 `content` 或简易 `defaultCard`） |
| `sendMessageReaction` | 对指定消息添加表情回复 |

调用方需自行构造已配置 `appId` / `appSecret` / `domain` 的 `Client`。

---

## 运维与扩展注意

- 事件回调注释要求 **约 3 秒内** 有响应，否则易触发平台重试；当前实现为异步链路，若 Agent 过慢需结合业务评估超时与重试策略。
- 生产环境请妥善保管 `appSecret`，勿提交到版本库；用户配置落在 `~/.chat-code-bridge/`。

---

## 版本与文档

- **package.json** 版本：`1.0.0`
- 本文档整理日期：2026-04-07
- 若仓库内 `README.md` 与源码不一致，**以源码为准**。
