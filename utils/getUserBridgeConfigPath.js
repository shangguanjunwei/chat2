import { join } from 'node:path';
import { homedir } from 'node:os';

/** 用户主目录下运行时配置文件路径：~/.chat-code-bridge/chat-code-bridge.json */
export const getUserBridgeConfigPath = () =>
  join(homedir(), '.chat-code-bridge', 'chat-code-bridge.json');