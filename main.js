import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { applyTreeNode } from './utils/applyTreeNode.js';
import { selectAppBridge } from './src/chatApp/index.js';
import { startFeishuMessageListener } from './src/chatApp/feishu/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, 'config', 'chat-code-bridge.json');



const main = async () => {
  const raw = readFileSync(CONFIG_PATH, 'utf8');
  const root = /** @type {TreeNode} */ (JSON.parse(raw));
  applyTreeNode(homedir(), root);
  const bridge = await selectAppBridge();
  console.log(JSON.stringify(bridge, null, 2));
  startFeishuMessageListener(bridge);
};

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
