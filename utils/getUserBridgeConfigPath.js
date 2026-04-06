import { join } from 'node:path';
import { homedir } from 'node:os';

/** `~/.chat-code-bridge/chat-code-bridge.json` */
export const getUserBridgeConfigPath = () =>
  join(homedir(), '.chat-code-bridge', 'chat-code-bridge.json');
