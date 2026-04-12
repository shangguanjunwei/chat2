/**
 * AI 侧适配基类：与 Cursor `agent` CLI 等对接，提供会话创建与流式/文本对话能力。
 */
export abstract class AiCode implements AiCodeInterface {
  /** 创建或恢复与当前工程 workspace 关联的聊天会话，返回会话 id。 */
  abstract createChat(): void | Promise<any>;
  /** 按流式协议消费 `agent` 输出，并通过回调向 IM 侧推送状态与片段。 */
  abstract chatByStream(...args: any[]): void | Promise<any>;
  /** 非流式、一次性文本对话（若实现）。 */
  abstract chatByText(...args: any[]): void | Promise<any>;
  /** 获取最新配置信息 */
  abstract getLatestOption(): any | Promise<any>;
}
