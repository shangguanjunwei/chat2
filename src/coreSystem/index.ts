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
} from "@/utils/fileEvents";
import { FeishuChatApp } from '@/chatApp/feishu';
import { WecomChatApp } from '@/chatApp/wecom';
import { LarkChatApp } from '@/chatApp/lark';
import { CursorAiCode } from '@/aiCode/cursor';
import { eventBusListener } from '@/eventBus';
import { multiSelectAction } from '@/utils/multiSelectAction';

const reset = async () => {
  const userLocalChatCodeBridgeConfig: ChatCodeBridgeOption[] = chatCodeBridgeConfigTemplate;
  merge(userLocalChatCodeBridgeConfig, [{ label: 'default' }]);

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

const itemStart = async (option: ChatCodeBridgeOption) => {
  const { appBridge, aiCodeBridge } = option;
  let aiCodeInstance: AiCodeInterface
  switch (aiCodeBridge) {
    case 'cursor':
      aiCodeInstance = new CursorAiCode(option);
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
    default:
      break;
  }
  eventBusListener(
    option,
    aiCodeInstance!,
    chatAppInstance!
  );
}

export const startCoreSystem = async () => {
  let userLocalChatCodeBridgeConfig: ChatCodeBridgeOption[] = readFileContentAsJson(getFilePath('USER_LOCAL_CHAT_CODE_BRIDGE_CONFIG'));
  if (isEmpty(userLocalChatCodeBridgeConfig)) await reset();
  userLocalChatCodeBridgeConfig = readFileContentAsJson(getFilePath('USER_LOCAL_CHAT_CODE_BRIDGE_CONFIG'));
  let readyStartBotList: ChatCodeBridgeOption[] = userLocalChatCodeBridgeConfig;
  if (userLocalChatCodeBridgeConfig.length !== 1) {
    readyStartBotList = await multiSelectAction<ChatCodeBridgeOption>(userLocalChatCodeBridgeConfig);
  }
  readyStartBotList.forEach(itemStart);
}
