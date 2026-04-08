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

type ChatAppStatus = 'on' | 'off';
interface ChatAppInterface {
  _appId: string;
  _status: ChatAppStatus;
  appId(): string;
  setStatus(status: ChatAppStatus): void;
  getStatus(): ChatAppStatus;
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