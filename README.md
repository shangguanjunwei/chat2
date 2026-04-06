# chat-code-bridge

飞书（Lark）与代码侧能力桥接的 Node 项目：使用 `@larksuiteoapi/node-sdk` 处理即时消息等场景。

---

## 目录结构说明

```
chat-code-bridge2/
├── main.js                 # 应用入口：创建 Lark Client / WSClient，订阅消息并回复（开发时可 `npm run dev`）
├── main copy 2.js          # main.js 的副本/备份，便于本地对照或实验（非正式入口）
├── package.json            # 项目元数据与脚本（ES Module：`"type": "module"`）
├── package-lock.json       # 依赖锁定文件
├── .gitignore              # Git 忽略规则
├── .vscode/                # VS Code / Cursor 工作区设置（编辑器相关，不参与业务逻辑）
│   └── settings.json
├── src/
│   ├── chatApp/            # 与「聊天应用 / 飞书 IM」相关的业务与封装
│   │   └── lark-cli/       # 基于飞书开放能力（lark-cli 命名空间下）的模块聚合
│   │       ├── index.js    # 预留入口（可在此统一导出子模块）
│   │       └── send-message/   # 发送消息相关封装
│   │           ├── sendTextMessage.js           # 发送文本消息
│   │           ├── sendInteractiveCardMessage.js # 发送可交互卡片消息
│   │           └── sendMessageReaction.js       # 对指定消息添加表情回复
│   └── aiCode/             # 与「AI 写代码 / Cursor」等相关的扩展目录
│       └── cursor-cli/     # Cursor CLI 侧封装占位
│           └── index.js    # 预留入口
└── node_modules/           # npm 依赖（勿提交业务说明到此目录；以 package.json 为准）
```

### 各目录用途摘要

| 路径 | 用途 |
| --- | --- |
| 项目根目录 | 入口脚本、包配置、说明文档 |
| `src/chatApp/` | 飞书聊天侧功能（IM、机器人行为等） |
| `src/chatApp/lark-cli/` | 飞书 OpenAPI/SDK 封装的归类目录 |
| `src/chatApp/lark-cli/send-message/` | 发消息、消息表情等原子能力封装 |
| `src/aiCode/` | 与 AI 编程工具链相关的代码（与 chatApp 解耦） |
| `src/aiCode/cursor-cli/` | Cursor CLI 相关扩展（当前为占位） |
| `.vscode/` | 编辑器配置，可按个人习惯调整 |

---

## 功能说明

### 消息发送（`src/chatApp/lark-cli/send-message/`）

基于 `@larksuiteoapi/node-sdk` 的 `Client`，将常用 IM 能力封装为异步箭头函数；**调用方自行创建并传入已配置 `appId` / `appSecret`（及 `domain` 等）的 `Client`**，模块内不写密钥。

| 模块 | 导出 | 能力简述 |
| --- | --- | --- |
| `sendTextMessage.js` | `sendTextMessage` | 发送 **文本** 消息：`im.v1.message.create`，`msg_type: text`，`content` 为 `JSON.stringify({ text })`。参数：`receiveId`、`receiveIdType`（默认 `chat_id`）、`text`。 |
| `sendInteractiveCardMessage.js` | `sendInteractiveCardMessage` | 发送 **可交互卡片**：`msg_type: interactive`。支持两种方式二选一：`content`（完整卡片 JSON 字符串或可 `JSON.stringify` 的对象），或 `defaultCard: { title, content }`（内部使用 `Lark.messageCard.defaultCard` 生成简易蓝头 Markdown 卡片）。 |
| `sendMessageReaction.js` | `sendMessageReaction` | 给 **指定消息** 添加 **表情回复**：`im.v1.messageReaction.create`。参数：`messageId`、`emojiType`（飞书预置表情标识，如 `THUMBSUP`、`Get` 等）。需具备相应 `im:message` 表情写权限。 |

---

## 新增记录

> 约定：每次合并或发布有意义的功能时，在**表格顶部**追加一行（最新的在最上面），便于快速了解项目演进。

| 日期 | 说明 |
| --- | --- |
| 2026-04-06 | `README.md` 补充「功能说明」：三个发送相关模块的用途、接口要点；目录树同步 `sendInteractiveCardMessage.js`。 |
| 2026-04-06 | 新增 `sendInteractiveCardMessage.js`：发送 `interactive` 卡片（自定义 `content` 或 `defaultCard`）。 |
| 2026-04-06 | 新增根目录 `README.md`：目录结构说明与「新增记录」模板。 |
| 2026-04-06 | 新增 `src/chatApp/lark-cli/send-message/`：`sendTextMessage.js`（文本消息）、`sendMessageReaction.js`（消息表情回复）；导出为异步箭头函数。 |
