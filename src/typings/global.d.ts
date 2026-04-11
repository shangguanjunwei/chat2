/**
 * 全局类型声明（ambient）：供 `src` 内模块共享；不在此文件使用 `import`/`export`，避免破坏全局注入方式。
 */
type TreeNode = {
  type: 'dir' | 'file';
  name: string;
  children?: TreeNode[];
  content?: unknown;
};

type Item = Record<string, any>;

type ChatAppItemConfig = {
  key: string;
  label: string;
  needConfigKeys: Item[];
};

type ProjectItem = {
  key: string;
  title: string;
  workspace: string;
} & Item;

interface ChatAppInterface {
  init(): void;
  messageIsToThisBot(...args: any[]): boolean | Promise<boolean>;
  sendPrefixMessage(...args: any[]): void | Promise<ChatApp2AiCodeMessageContent>;
  sendSuffixMessage(...args: any[]): void | Promise<void>;
  sendMessage(...args: any[]): void | Promise<void>;
  sendStreamMessage(...args: any[]): void | Promise<void>;
}

interface LarkClient {
  appId: string;
  appSecret: string;
  domain: string;
  loggerLevel?: Lark.LoggerLevel;
  logger?: Lark.Logger;
}

interface AiCodeInterface {
  createChat(): void | Promise<any>;
  chatByStream(...args: any[]): void | Promise<any>;
  chatByText(...args: any[]): void | Promise<any>;
}

interface StreamJsonLine {
  type?: string;
  subtype?: string;
  model?: string;
  duration_ms?: number;
  message?: {
    content?: Array<{ text?: string }>;
  };
  tool_call?: {
    writeToolCall?: {
      args?: { path?: string };
      result?: { success?: { linesCreated?: number; fileSize?: number } };
    };
    readToolCall?: {
      args?: { path?: string };
      result?: { success?: { totalLines?: number } };
    };
  };
}

interface ChatCodeBridgeOption {
  uuid: string;
  label: string;
  appBridge: string;
  aiCodeBridge: string;
  currentProject: ProjectItem;
  appBotOption: Item;
  loggerLevel: Lark.LoggerLevel;
  currentChatSession: string;
  currentChatSessionCreatedAt: number;
  currentChatSessionChangeRate: 'day' | 'week' | 'month' | 'year' | 'never';
}

interface StreamPrintFnParams {
  text: string;
  status: 'thinking' | 'processing' | 'completed';
}

interface ChatApp2AiCodeMessageContent {
  chat_id: string;
  message_id: string;
  text?: string;
  [key: string]: any;
}

interface AiCode2ChatAppResponseContent {
  option: ChatApp2AiCodeMessageContent;
  result: StreamPrintFnParams;
}

interface PackageJson {
  version: string;
  name: string;
  author: string;
  homepage: string;
  dependencies: Record<string, string>;
}
