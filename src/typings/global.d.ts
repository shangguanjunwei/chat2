type TreeNode = {
  type: 'dir' | 'file';
  name: string;
  children?: TreeNode[];
  content?: unknown;
};

type Item = Record<string, unknown>;

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
  sendPrefixMessage(...args: any[]): void | Promise<void>;
  sendSuffixMessage(...args: any[]): void | Promise<void>;
  sendMessage(...args: any[]): void | Promise<void>;
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