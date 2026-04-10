# @amoayun/chat-code-bridge

在飞书（Lark）或企业微信里收发消息，并把对话桥接到本机的 **Cursor Agent CLI**（`agent`），用聊天驱动本地开发工作流。

## 1. 环境要求

> - **Node.js**：版本 `>= 22`（与 `package.json` 中 `engines` 一致）。安装与说明见 [Node.js 下载与安装](https://nodejs.org/en/download)、[官方入门文档](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs)。
> - **Cursor Agent CLI**：终端中可执行命令 `agent`（本工具会调用 `agent create-chat`、`agent -p ...` 等）。安装与说明见 [Cursor CLI 安装文档](https://cursor.com/docs/cli/installation)。
> - **IM 侧（飞书 / Lark / 企业微信）**：已在对应平台创建机器人或自建应用，并准备好 **App ID / Secret** 等凭证（字段说明见第 5 节）。各平台可参考：  
>   - 飞书： [创建应用（5 分钟上手）](https://open.feishu.cn/document/home/develop-a-bot-in-5-minutes/create-an-app)、[机器人开发快速入门](https://open.feishu.cn/document/develop-robots/quick-start)  
>   - 企业微信： [智能机器人教程](https://developer.work.weixin.qq.com/tutorial/robot)、[开始开发](https://developer.work.weixin.qq.com/document/path/96713)

## 2. 安装

> 当前仅支持**全局安装**（不推荐作为项目依赖安装到 `node_modules`）。
>
> ```bash
> npm install -g @amoayun/chat-code-bridge
> ```
>
> 全局安装后，在终端执行：
>
> ```bash
> chat-code-bridge
> ```

## 3. 使用方法

> 1. 在终端执行全局命令 `chat-code-bridge`。
> 2. **首次运行**若用户目录下还没有配置文件，会进入交互式向导，依次选择：
>   - **聊天应用**：飞书、Lark（国际版）或企业微信；
>   - **机器人凭证**：按提示填写（字段名见第 5 节）；
>   - **AI 代码桥**：当前支持 **Cursor**；
>   - **当前项目**：向导会列出本地项目配置，首次一般为当前工作区对应的项。
> 3. 配置写入完成后，进程会保持运行，通过 IM 与 `agent` 建立会话并处理消息。
>
> 之后再次启动时，会读取已有配置并直接拉起桥接，无需重复填写（除非删除配置文件）。

## 4. 配置文件位置

> 配置保存在**用户主目录**下（与当前在哪个文件夹执行命令无关，⚠️修改完配置文件后需要重新启动）：
>
>
> | 文件                                             | 说明                                                                                        |
> | ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
> | `~/.chat-code-bridge/chat-code-bridge.json`    | 桥接主配置（渠道、凭证、当前项目、`uuid` 等）。**类型：`ChatCodeBridgeOption[]`**（数组元素为 `ChatCodeBridgeOption`）。 |
> | `~/.chat-code-bridge/project-config-list.json` | 本地可选项目列表。**类型：`ProjectItem[]`**（数组元素为 `ProjectItem`）。                                     |
>

```ts
type Item = Record<string, unknown>;

type ProjectItem = {
  key: string;
  title: string;
  workspace: string;
} & Item;

interface ChatCodeBridgeOption {
  uuid: string;
  appBridge: string;
  aiCodeBridge: string;
  currentProject: ProjectItem;
  appBotOption: Item;
  currentChatSession: string;
  currentChatSessionCreatedAt?: number;
}
```

> 如需**完全重新向导配置**，可备份后删除 `chat-code-bridge.json`（或清空其内容），下次启动会再次进入初始化流程。

## 5. 各渠道需填写的配置

> ### 飞书 / Lark（国际版）
>
> - **appId**：应用 App ID  
> - **appSecret**：应用 Secret  
> - **domain**：开放平台 API 根地址，例如飞书 `https://open.feishu.cn`、Lark 国际版 `https://open.larksuite.com`
>
> 飞书开放平台首页：[https://open.feishu.cn](https://open.feishu.cn)  
>
> ### 企业微信
>
> - **botId**：机器人 ID  
> - **secret**：机器人 Secret
>
> 此外，还请在各开放平台控制台为机器人开启**即时消息**等相关权限，并完成与本机长连接/Webhook 要求相符的应用配置（以各平台文档为准）。

## 6. Cursor 与本地工作区

> 桥接会为当前选中的 `**currentProject.workspace`** 目录调用 `agent`，请确保：
>
> - 该目录即你希望 Agent 操作的真实项目根目录；
> - 本机已正确安装 Cursor Agent CLI，`agent` 在 `PATH` 中可用。

## 7. 拓展（可选）

以下能力与本桥接工具**相互独立**，可按需选用。

【⚠️】企微机器人可以控制飞书cli来操作飞书，飞书机器人也可以控制企微cli 进行操作企微，不受平台限制！！

如果你的cursor 的 permissions 配置了 Shell 权限，下面的事可以直接语音转文字，发给机器人让机器人安装！

### 1. 飞书能力

在终端中直接使用飞书开放平台能力：安装官方 **Lark / 飞书 CLI**，再安装配套的 **AI Agent Skills**，便于在命令行或 AI 助手中编排日历、文档、消息等场景。总览见 [https://feishu-cli.com/zh/](https://feishu-cli.com/zh/)。

```bash
# 飞书 CLI（Lark CLI）：全局安装 @larksuite/cli，命令名为 lark-cli
npm install -g @larksuite/cli

# 飞书的 CLI Skill：为 Cursor、Claude Code 等安装配套 Skill；安装后建议重启 AI 开发工具
npx skills add larksuite/cli -y -g

# 文档与源码
# Skill 参考：https://feishu-cli.com/zh/feishu-cli-ai-agent-skills.html
# 仓库：https://github.com/larksuite/cli
```

### 2. 企业微信能力

在终端中直接使用企业微信开放平台能力：安装官方 **WeCom / 企业微信 CLI**，再安装配套的 **AI Agent Skills**，便于在命令行或 AI 助手中编排日历、文档、消息等场景。总览见 [https://open.work.weixin.qq.com/help2/pc/21676](https://open.work.weixin.qq.com/help2/pc/21676)。（企业微信CLI目前优先对≤10人企业开放使用）

```bash
# 企业微信 CLI（WeCom CLI）：全局安装 @wecom/cli，命令名为 wecom-cli
npm install -g @wecom/cli

# 企业微信的 CLI Skill：为 Cursor、Claude Code 等安装配套 Skill；安装后建议重启 AI 开发工具
npx skills add WeComTeam/wecom-cli -y -g

# 文档与源码
# Skill 参考：https://open.work.weixin.qq.com/help2/pc/21676
```

### 3.更多能力等你探索...

## 8. 版本说明

>
> | 当前版本      | 发布日期           | 说明                                                                                                                                           |
> | --------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
> | **1.0.0** | **2026-04-10** | 将 **飞书 / Lark / 企业微信** 即时消息与本地 **Cursor Agent CLI**（`agent`）对接：支持首次启动向导配置机器人凭证与本地工作区；长连接接收会话消息并驱动 `agent` 流式对话，把 IM 中的提问转为对指定代码仓库的 Agent 任务。 |
>

## 9. 开发提交规范

> 参与本仓库开发时，请遵循 [CONTRIBUTING.md](./CONTRIBUTING.md) 中的 **Conventional Commits** 约定；提交说明会在本地经 **commitlint** 校验。

## 10. 许可证

> 专有软件，保留所有权利。详见 [LICENSE.txt](./LICENSE.txt)。

