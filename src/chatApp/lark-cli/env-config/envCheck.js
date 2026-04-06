import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import readlinePromises from 'node:readline/promises';

/**
 * @typedef {{ appId: string, appSecret: string, domain: string }} BridgeEnvKeyNames
 * 环境变量名（与飞书 / Lark 应用配置对应）
 */

const ORDER = /** @type {(keyof BridgeEnvKeyNames)[]} */ ([
  'appId',
  'appSecret',
  'domain',
]);

const DOMAIN_QUESTION_SUFFIX =
  '（飞书示例 https://open.feishu.cn，国际版 https://open.larksuite.com）';

/** 项目根目录下的 shell 脚本，供终端 `source` 写入当前 shell 的环境变量 */
export const BRIDGE_ENV_SHELL_FILENAME = '.lark-bridge-env.sh';

/**
 * Bash 单引号字面值转义（用于生成 `export NAME='...'`）。
 * @param {string} str
 */
const shSingleQuoted = (str) => `'${str.replace(/'/g, `'\\''`)}'`;

/**
 * 从 process.env 读取三项（继承自当前终端 / 启动命令已 export 的变量）。
 * @param {BridgeEnvKeyNames} envKeyNames
 * @returns {{ appId: string, appSecret: string, domain: string }}
 */
const readAllFromEnv = (envKeyNames) => ({
  appId: process.env[envKeyNames.appId]?.trim() ?? '',
  appSecret: process.env[envKeyNames.appSecret]?.trim() ?? '',
  domain: process.env[envKeyNames.domain]?.trim() ?? '',
});

/**
 * @param {{ appId: string, appSecret: string, domain: string }} values
 */
const isAllPresent = (values) =>
  Boolean(values.appId && values.appSecret && values.domain);

/**
 * 生成 export 脚本并写入磁盘，再通过命令行 `chmod 600` 收紧权限（不修改 process.env）。
 * @param {BridgeEnvKeyNames} envKeyNames
 * @param {{ appId: string, appSecret: string, domain: string }} values
 * @param {string} [cwd]
 */
const persistEnvViaShellScript = (envKeyNames, values, cwd = process.cwd()) => {
  const absPath = join(cwd, BRIDGE_ENV_SHELL_FILENAME);
  const body = [
    '# 由 lark-code-bridge 生成，勿提交仓库。',
    '# 在终端加载到当前 shell 环境变量：  source ./.lark-bridge-env.sh',
    `export ${envKeyNames.appId}=${shSingleQuoted(values.appId)}`,
    `export ${envKeyNames.appSecret}=${shSingleQuoted(values.appSecret)}`,
    `export ${envKeyNames.domain}=${shSingleQuoted(values.domain)}`,
    '',
  ].join('\n');

  writeFileSync(absPath, body, { encoding: 'utf8', mode: 0o600 });

  if (process.platform !== 'win32') {
    spawnSync('chmod', ['600', absPath], { stdio: 'ignore', shell: false });
  }

  return absPath;
};

/**
 * 1. 先判断当前进程继承的环境变量（process.env）中是否三项都已存在；
 * 2. 若都存在，直接返回；
 * 3. 若有缺失，依次让用户在终端输入补全；
 * 4. 输入全部完成后，写入可被 `source` 的 shell 脚本，并用 `chmod` 设置权限，最后返回配置对象（本进程不写入 process.env）。
 *
 * @param {BridgeEnvKeyNames} envKeyNames
 * @param {{ stdin?: import('node:stream').Readable, stdout?: import('node:stream').Writable, cwd?: string }} [io]
 * @returns {Promise<{ appId: string, appSecret: string, domain: string }>}
 */
export const ensureBridgeEnvVars = async (envKeyNames, io = {}) => {
  const input = io.stdin ?? process.stdin;
  const output = io.stdout ?? process.stdout;
  const cwd = io.cwd ?? process.cwd();

  const fromEnv = readAllFromEnv(envKeyNames);
  if (isAllPresent(fromEnv)) {
    return {
      appId: fromEnv.appId,
      appSecret: fromEnv.appSecret,
      domain: fromEnv.domain,
    };
  }

  const merged = { ...fromEnv };

  const rl = readlinePromises.createInterface({ input, output });
  try {
    for (const field of ORDER) {
      if (merged[field]) continue;
      const name = envKeyNames[field];
      const suffix = field === 'domain' ? ` ${DOMAIN_QUESTION_SUFFIX}` : '';
      const line = (await rl.question(`请输入 ${name}:${suffix} `)).trim();
      if (!line) {
        throw new Error(`环境变量 ${name} 不能为空`);
      }
      merged[field] = line;
    }
  } finally {
    rl.close();
  }

  if (!isAllPresent(merged)) {
    throw new Error('appId、appSecret、domain 均需非空');
  }

  const scriptPath = persistEnvViaShellScript(envKeyNames, merged, cwd);
  output.write(
    `\n已生成 shell 环境脚本（请用终端加载）：\n  source ${BRIDGE_ENV_SHELL_FILENAME}\n` +
    `绝对路径：${scriptPath}\n\n`,
  );

  return {
    appId: merged.appId,
    appSecret: merged.appSecret,
    domain: merged.domain,
  };
};
