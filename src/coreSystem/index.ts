import { selectAction } from '@/utils/selectAction';
import { inputAction } from '@/utils/inputAction';
import { merge, isEmpty } from 'lodash-es';
import chatCodeBridgeConfigTemplate from '@config/json/chat-code-bridge.template.json';
import chatAppOptions from '@config/json/support-chat-app.json';
import aiCodeBridgeOptions from '@config/json/support-ai-code-app.json';
import { v4 as uuidv4 } from 'uuid';
import {
  writeFileContentAsJson,
  createDirectory,
  readFileContentAsJson,
  getFilePath,
} from '@/utils/fileEvents';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { FeishuChatApp } from '@/chatApp/feishu';
import { WecomChatApp } from '@/chatApp/wecom';
import { LarkChatApp } from '@/chatApp/lark';
import { CursorAiCode } from '@/aiCode/cursor';
import { eventBusListener } from '@/eventBus/index';
import { multiSelectAction } from '@/utils/multiSelectAction';
import { ClaudeAiCode } from '@/aiCode/claude';
import { IlinkChatApp } from '@/chatApp/ilink';

/** 首次向导：交互式收集 IM、AI、工程路径等并写入用户本地 JSON 配置。 */
const reset = async () => {
  const userLocalChatCodeBridgeConfig: ChatCodeBridgeOption[] = chatCodeBridgeConfigTemplate as unknown as ChatCodeBridgeOption[];
  merge(userLocalChatCodeBridgeConfig, [{ label: 'default', currentChatSessionChangeRate: 'day', loggerLevel: 0 }]);

  const chatApp: ChatAppItemConfig = await selectAction(chatAppOptions, 'label');
  merge(userLocalChatCodeBridgeConfig, [{ uuid: uuidv4(), appBridge: chatApp.key }]);
  const chatAppConfig = await inputAction(chatApp.needConfigKeys, 'label', 'key');
  merge(userLocalChatCodeBridgeConfig, [{ appBotOption: chatAppConfig }]);

  const aiCodeBridge = await selectAction(aiCodeBridgeOptions, 'label');
  merge(userLocalChatCodeBridgeConfig, [{ aiCodeBridge: aiCodeBridge.key }]);

  const defaultWorkspace = createDirectory('default-workspace');
  const userLocalProjectConfigList = [{ key: 'default-workspace', title: 'default-workspace', workspace: defaultWorkspace }];
  const project = await selectAction(userLocalProjectConfigList, 'title');
  merge(userLocalChatCodeBridgeConfig, [{ currentProject: project }]);

  writeFileContentAsJson(getFilePath('USER_LOCAL_CHAT_CODE_BRIDGE_CONFIG'), userLocalChatCodeBridgeConfig);
  writeFileContentAsJson(getFilePath('USER_LOCAL_PROJECT_CONFIG_LIST'), userLocalProjectConfigList);
}

/**
 * 根据配置实例化 AI 与 ChatApp，并挂上对应 `uuid` 的事件监听。
 *
 * @param option 单条 bridge 配置
 */
const itemStart = async (option: ChatCodeBridgeOption) => {
  const { appBridge, aiCodeBridge } = option;
  let aiCodeInstance: AiCodeInterface
  switch (aiCodeBridge) {
    case 'cursor':
      aiCodeInstance = new CursorAiCode(option);
      break;
    case 'claude':
      aiCodeInstance = new ClaudeAiCode(option);
      break;
    default:
      break;
  }
  let chatAppInstance: ChatAppInterface;
  switch (appBridge) {
    case 'feishu':
      chatAppInstance = new FeishuChatApp(option) as unknown as ChatAppInterface;
      break;
    case 'lark':
      chatAppInstance = new LarkChatApp(option) as unknown as ChatAppInterface;
      break;
    case 'wecom':
      chatAppInstance = new WecomChatApp(option) as unknown as ChatAppInterface;
      break;
    case 'ilink':
      chatAppInstance = new IlinkChatApp(option) as unknown as ChatAppInterface;
      break;
    default:
      break;
  }
  eventBusListener(
    option,
    aiCodeInstance!,
    chatAppInstance!
  );
}

/**
 * 前台：读取配置；若无则向导；若多条则多选。返回本次要启动的 bridge 列表。
 */
export async function prepareBridgeOptions(): Promise<ChatCodeBridgeOption[]> {
  let userLocalChatCodeBridgeConfig: ChatCodeBridgeOption[] = readFileContentAsJson(getFilePath('USER_LOCAL_CHAT_CODE_BRIDGE_CONFIG'));
  if (isEmpty(userLocalChatCodeBridgeConfig)) await reset();
  userLocalChatCodeBridgeConfig = readFileContentAsJson(getFilePath('USER_LOCAL_CHAT_CODE_BRIDGE_CONFIG'));
  let readyStartBotList: ChatCodeBridgeOption[] = [];
  if (userLocalChatCodeBridgeConfig.length !== 1) {
    readyStartBotList = await multiSelectAction<ChatCodeBridgeOption>(userLocalChatCodeBridgeConfig);
  }
  return readyStartBotList;
}

/** 将选中的 bridge 写入用户目录，供子进程读取。 */
export function persistDaemonTargets(options: ChatCodeBridgeOption[]): void {
  writeFileContentAsJson(getFilePath('USER_LOCAL_DAEMON_TARGETS'), options);
}

/**
 * 子进程内执行：读 daemon-targets（或完整配置）、写 PID、拉起 IM/AI。
 * 由 CLI 通过环境变量 `CHAT_CODE_BRIDGE_CHILD=1` 触发子进程。
 */
export async function runDaemonServices(): Promise<void> {
  const targetsPath = getFilePath('USER_LOCAL_DAEMON_TARGETS');
  let list: ChatCodeBridgeOption[] | null = readFileContentAsJson(targetsPath);
  if (!list || !Array.isArray(list) || list.length === 0) {
    list = readFileContentAsJson(getFilePath('USER_LOCAL_CHAT_CODE_BRIDGE_CONFIG'));
  }
  if (!list || !Array.isArray(list) || list.length === 0) {
    console.error('无可用配置，请先运行 chat-code-bridge 完成向导。');
    process.exit(1);
  }
  const pidPath = getFilePath('USER_LOCAL_DAEMON_PID');
  mkdirSync(dirname(pidPath), { recursive: true });
  writeFileSync(pidPath, `${process.pid}\n`);
  list.forEach(itemStart);
}
