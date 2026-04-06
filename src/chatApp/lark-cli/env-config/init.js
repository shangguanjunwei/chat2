import { selectBridge } from '../../index.js';
import { ensureBridgeEnvVars } from './envCheck.js';

export { BRIDGE_OPTIONS, selectBridge } from '../../index.js';

/** @typedef {{ key: string, label: string, env: { appId: string, appSecret: string, domain: string } }} BridgeDefinition */

/**
 * 初始化：选择桥接工具并确保凭证就绪（环境变量已存在则直接用；否则交互输入并生成 `.lark-bridge-env.sh`）。
 *
 * @param {{ stdin?: import('node:stream').Readable, stdout?: import('node:stream').Writable, cwd?: string }} [io]
 * @returns {Promise<{ bridge: BridgeDefinition, appId: string, appSecret: string, domain: string }>}
 */
export const initBridgeConfiguration = async (io) => {
  const bridge = await selectBridge();
  const { appId, appSecret, domain } = await ensureBridgeEnvVars(bridge.env, io);
  return { bridge, appId, appSecret, domain };
};
