/**
 * IM 侧适配基类：连接飞书/企微等平台，负责收消息、回消息与流式卡片更新。
 */
export abstract class ChatApp implements ChatAppInterface {
  /** 初始化 SDK 客户端、长连接与事件订阅。 */
  abstract init(...args: any[]): void;
  /** 判断事件/消息是否应由本机器人处理。 */
  abstract messageIsToThisBot(...args: any[]): boolean | Promise<boolean>;
  /** 发送一条普通回复消息（非流式卡片场景）。 */
  abstract sendMessage(...args: any[]): void | Promise<void>;
  /** 在 AI 开始生成前：如表情、占位卡片等，返回供后续流式更新使用的上下文。 */
  abstract sendPrefixMessage(...args: any[]): void | Promise<ChatApp2AiCodeMessageContent>;
  /** 在流式结束后：如更新卡片最终态、替换表情等。 */
  abstract sendSuffixMessage(...args: any[]): void | Promise<void>;
  /** 用户进入单聊等场景时的欢迎语。 */
  abstract sendWelcomeMessage(...args: any[]): void | Promise<void>;
  /** 推送流式生成中的内容片段（如卡片内 markdown 增量）。 */
  abstract sendStreamMessage(...args: any[]): any | Promise<any>;
}