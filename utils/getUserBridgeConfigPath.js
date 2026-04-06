import { join } from 'node:path';
import { homedir } from 'node:os';

/** 用户目录下运行时配置文件绝对路径。 */
export const getUserBridgeConfigPath = () =>
  join(homedir(), '.chat-code-bridge', 'chat-code-bridge.json');
