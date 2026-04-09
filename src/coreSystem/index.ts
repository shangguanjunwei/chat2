import { readFileContentAsJson } from "@/utils/fileEvents";
import { getFilePath } from "@/utils/fileEvents";
import { selectAction } from '@/utils/selectAction';
import { inputAction } from '@/utils/inputAction';
import { merge, isEmpty } from 'lodash-es';
import chatCodeBridgeConfigTemplate from '@config/json/chat-code-bridge.template.json';
import chatAppOptions from '@config/json/support-chat-app.json';
import aiCodeBridgeOptions from '@config/json/support-ai-code-app.json';
import { v4 as uuidv4 } from 'uuid';
import { writeFileContentAsJson } from "@/utils/fileEvents";
import { FeishuChatApp } from '@/chatApp/feishu';
import { CursorAiCode } from '@/aiCode/cursor';

const reset = async () => {
  const userLocalChatCodeBridgeConfig = chatCodeBridgeConfigTemplate;

  const chatApp: ChatAppItemConfig = await selectAction(chatAppOptions, 'label');
  merge(userLocalChatCodeBridgeConfig, [{ uuid: uuidv4(), appBridge: chatApp.key }]);
  const chatAppConfig = await inputAction(chatApp.needConfigKeys, 'label', 'key');
  merge(userLocalChatCodeBridgeConfig, [{ appBotOption: chatAppConfig }]);

  const aiCodeBridge = await selectAction(aiCodeBridgeOptions, 'label');
  merge(userLocalChatCodeBridgeConfig, [{ aiCodeBridge: aiCodeBridge.key }]);

  const userLocalProjectConfigList = [{ key: 'chat-code-bridge', title: 'chat-code-bridge', workspace: process.cwd() }];
  const project = await selectAction(userLocalProjectConfigList, 'title');
  merge(userLocalChatCodeBridgeConfig, [{ currentProject: project }]);

  writeFileContentAsJson(getFilePath('USER_LOCAL_CHAT_CODE_BRIDGE_CONFIG'), userLocalChatCodeBridgeConfig);
  writeFileContentAsJson(getFilePath('USER_LOCAL_PROJECT_CONFIG_LIST'), userLocalProjectConfigList);
}

const itemStart = async (option: any) => {
  console.log('option', option);
}

export const startCoreSystem = async () => {
  let userLocalChatCodeBridgeConfig = readFileContentAsJson(getFilePath('USER_LOCAL_CHAT_CODE_BRIDGE_CONFIG'));
  if (isEmpty(userLocalChatCodeBridgeConfig)) reset();
  userLocalChatCodeBridgeConfig = readFileContentAsJson(getFilePath('USER_LOCAL_CHAT_CODE_BRIDGE_CONFIG'));
  userLocalChatCodeBridgeConfig.forEach(itemStart);
}