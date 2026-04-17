# @amoayun/chat-code-bridge

**官网**：[https://www.commontalk.cn](https://www.commontalk.cn)

**接入渠道：** **飞书**（**Lark** 国际版）、**企业微信**、**微信**

**接入平台：** **Cursor Agent CLI**（`agent`）｜**Claude AI Code**（`claude`）

在以上 IM 中收发消息，并将会话对接到本机对应终端，用 IM 驱动本地开发工作流。

【⚠️】**1.0.1** 与 **1.0.2 / 1.0.3 / 1.0.4 / 1.0.5 / 1.0.6** 及后续版本的本地配置不兼容；从 1.0.1 升级至上述任一版本前，请先删除用户主目录下的 `~/.chat-code-bridge` 后再启动。详见 [7. 版本记录](#7-版本记录)。

## 目录

- [1. 环境要求](#1-环境要求)
- [2. 安装](#2-安装)
- [3. 命令说明](#3-命令说明)
- [4. 项目配置文件（自动生成，无需处理）](#4-项目配置文件自动生成无需处理)
- [5. 渠道配置字段](#5-渠道配置字段)
  - 5.1 飞书 / Lark（国际版）
  - 5.2 企业微信
  - 5.3 微信
- [6. 拓展](#6-拓展)
  - 6.1 飞书
  - 6.2 企业微信
- [7. 版本记录](#7-版本记录)
- [8. 许可证](#8-许可证)

## 1. 环境要求

>
> | 依赖                 | 说明                                                                                                                                                                                                                                                                                                                                                           |
> | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
> | **Node.js**        | `>= 22`                                                                                                                                                                                                                                                                                                                                                      |
> | **Vibe Coding 工具** | 本项目支持 **Cursor Agent** 和 **Claude AI Code**。终端需可执行 `cursor agent`（[安装](https://cursor.com/docs/cli/installation)）或 `claude`（[安装](https://docs.anthropic.com/en/docs/claude-code)），二选一即可。                                                                                                                                                                     |
> | **IM 开放平台机器人**     | 已创建应用/机器人 - 飞书：[创建应用](https://open.feishu.cn/document/home/develop-a-bot-in-5-minutes/create-an-app)、[机器人快速入门](https://open.feishu.cn/document/develop-robots/quick-start) **【⚠️需：①开启长连接订阅 ②添加「用户进入与机器人的会话」+「接收消息事件」】**｜企业微信：[智能机器人教程](https://developer.work.weixin.qq.com/tutorial/robot)、[开始开发](https://developer.work.weixin.qq.com/document/path/96713) |
>

## 2. 安装

> 推荐**全局安装**（CLI 工具，通过 `bin` 暴露 `chat-code-bridge` 命令）：
>
> ```bash
> npm install -g @amoayun/chat-code-bridge
> ```
>
> 也可使用 `npx`（无需全局安装，每次拉取最新版本执行）：
>
> ```bash
> npx @amoayun/chat-code-bridge
> ```

## 3. 命令说明

>
> | 命令                                            | 作用                                |
> | --------------------------------------------- | --------------------------------- |
> | `chat-code-bridge` 或 `chat-code-bridge start` | 交互选择配置后，在**后台**启动服务               |
> | `chat-code-bridge stop`                       | 停止后台服务（根据 PID 文件向进程请求正常退出）        |
> | `chat-code-bridge reload`                     | 若已有实例则先停止并等待退出，再重新走启动流程（适合改配置后重启） |
> | `chat-code-bridge -h` / `--help`              | 显示帮助                              |
>

## 4. 项目配置文件（自动生成，无需处理）

> 路径均相对于 `**~`**（用户主目录），与当前 shell 的工作目录无关。
>
> 【⚠️】如果要配置多对多，需要用户在这里修改配置文件
>
>
> | 路径                                          | 说明                                                                                                                                                                                                              |
> | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | `~/.chat-code-bridge/chat-code-bridge.json` | 主配置，类型为 `ChatCodeBridgeOption[]`                                                                                                                                                                                |
> | `~/.chat-code-bridge/default-workspace/`    | **默认工作区目录**：首次向导时在用户目录下自动创建（路径为 `~/.chat-code-bridge/default-workspace`）。`project-config-list.json` 中默认条目 `default-workspace` 的 `workspace` 指向该目录绝对路径；主配置 `currentProject` 选中该项时，`agent` 在此目录下工作，可在配置中改为真实项目路径。 |
> | `~/.chat-code-bridge/log/`                  | 日志目录                                                                                                                                                                                                            |
>
>
> 日志可按需删除 `log` 下较早的内容以节省磁盘空间。
>
> 类型参考（与实现字段以仓库内类型为准）：
>
> ```ts
> type Item = Record<string, any>;
>
> type ProjectItem = {
>   key: string;
>   title: string;
>   workspace: string;
> } & Item;
>
> interface ChatCodeBridgeOption {
>   uuid: string; // 唯一id
>   label: string; // 配置名
>   appBridge: string; // chatApp
>   aiCodeBridge: string; // vibe coding
>   currentProject: ProjectItem; // workspace
>   appBotOption: Item; // 机器人配置
>   loggerLevel: Lark.LoggerLevel; // 日志级别 数字 0:fatal 1:error 2:warn 3:info 4:debug 5:trace
>   currentChatSession: string; // 会话 sessionid（禁止人工手动创建）
>   currentChatSessionCreatedAt: number; // 会话创建时间
>   currentChatSessionChangeRate: 'day' | 'week' | 'month' | 'year' | 'never'; // 多久新建一个会话 默认 day
> }
> ```

## 5. 渠道配置字段

> ### 5.1 飞书 / Lark（国际版）
>
> > - **appId**：应用 App ID
> > - **appSecret**：应用 Secret
> >
> > 【⚠️】飞书开放平台控制台配置要点：
> >
> > 1. 在**「事件与回调」→「事件配置」**和**「回调配置」**中分别开启订阅，订阅方式选择**「使用长连接接收事件」**
> > 2. 在事件配置中需添加两个事件：**「用户进入与机器人的会话」和「接收消息事件」**
> >
> > 飞书开放平台：[https://open.feishu.cn](https://open.feishu.cn)
>
> ### 5.2 企业微信
>
> > - **botId**：机器人 ID  
> > - **secret**：机器人 Secret
> >
> > 请在各平台控制台为应用开启**即时消息**等所需权限，并完成长连接 / 回调等与文档一致的配置。
>
> ### 5.3 微信
>
> > 与飞书、企业微信不同，**无需**在开放平台预先填写 App ID、Secret 等字段。启动本工具并按向导选择微信渠道后，在终端根据提示**扫码登录**即可完成接入。

## 6. 拓展

> 以下能力与**本工具相互独立**，可按需在终端扩展日历、文档、消息等场景。
>
> 说明：企微侧可通过自动化调用飞书 CLI，飞书侧也可调用企微 CLI，**IM 平台与 CLI 工具可以交叉组合**，不受「机器人在哪个 App」单一绑定限制（具体以各平台开放能力与你的部署为准）。
>
> ### 6.1 飞书
>
> > 总览：[feishu-cli.com](https://feishu-cli.com/zh/)
> >
> > ```bash
> > npm install -g @larksuite/cli
> > npx skills add larksuite/cli -y -g
> > ```
> >
> > - Skill 说明：[https://feishu-cli.com/zh/feishu-cli-ai-agent-skills.html](https://feishu-cli.com/zh/feishu-cli-ai-agent-skills.html)  
> > - 仓库：[https://github.com/larksuite/cli](https://github.com/larksuite/cli)
>
> ### 6.2 企业微信
>
> > 说明与准入见：[企业微信帮助中心相关说明](https://open.work.weixin.qq.com/help2/pc/21676)（CLI 能力可能对组织规模有要求，以官方为准）。
> >
> > ```bash
> > npm install -g @wecom/cli
> > npx skills add WeComTeam/wecom-cli -y -g
> > ```
> >
> > 若已在 Cursor 中为 Agent 开启 **Shell** 等权限，也可通过 IM 把上述安装步骤交给 Agent 执行（请注意环境与安全策略）。

## 7. 版本记录

> **版本兼容性（1.0.1 → 1.0.2 及之后）**  
> **1.0.1** 与 **1.0.2 / 1.0.3 / 1.0.4 / 1.0.5 / 1.0.6** 及后续版本的本地配置格式与约定不兼容。从 1.0.1 升级到其中任一版本时，请先**停止**正在运行的服务，再删除用户主目录下的 `**~/.chat-code-bridge`** 整个目录（或至少移走其中配置后再启动），然后重新安装/运行目标版本并按向导完成配置。未清理旧目录直接启动新版本可能导致异常。
>
>
> | 版本        | 发布日期       | 说明                                                                        |
> | --------- | ---------- | ------------------------------------------------------------------------- |
> | **1.0.6** | 2026-04-17 | 新增支持接入微信；**与 1.0.1 本地配置不兼容**，从 1.0.1 升级须按上文清理 `~/.chat-code-bridge`。      |
> | **1.0.5** | 2026-04-14 | Windows 兼容性支持；**与 1.0.1 本地配置不兼容**，从 1.0.1 升级须按上文清理 `~/.chat-code-bridge`。 |
> | **1.0.4** | 2026-04-13 | 解决了一些已知问题；**与 1.0.1 本地配置不兼容**，升级须按上文清理 `~/.chat-code-bridge`。             |
> | **1.0.3** | 2026-04-12 | 解决了一些已知问题；**与 1.0.1 本地配置不兼容**，升级须按上文清理 `~/.chat-code-bridge`。             |
> | **1.0.2** | 2026-04-12 | 解决了一些已知问题；**与 1.0.1 本地配置不兼容**，升级须按上文清理 `~/.chat-code-bridge`。             |
> | **1.0.1** | 2026-04-10 | 第一版工具试试水                                                                  |
>

## 8. 许可证

> **个人可免费使用；禁止商业用途。** 权利保留、免责等完整条款见 [LICENSE.txt](./LICENSE.txt)。

