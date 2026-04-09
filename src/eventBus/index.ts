import mitt from 'mitt';
import type { Emitter } from 'mitt';
import dayjs from 'dayjs';
import { writeFileContentAsJson, readFileContentAsJson } from '@/utils/fileEvents';
import { getFilePath } from '@/utils/fileEvents';
import { throttle } from 'lodash-es';

const eventBus: Emitter<any> = mitt();

export const eventBusListener = (
  option: ChatCodeBridgeOption,
  aiCodeInstance: AiCodeInterface,
  chatAppInstance: ChatAppInterface
) => {
  const { uuid, currentChatSession, currentChatSessionCreatedAt } = option;
  eventBus.on(`${uuid}:messageBridge`, async (msgContent: ChatApp2AiCodeMessageContent) => {
    const prefixResult = await chatAppInstance.sendPrefixMessage({
      option: msgContent,
      result: {
        text: '正在生成内容...',
        status: 'thinking',
      },
    });
    const callback = async () => {
      const fn = throttle((result: StreamPrintFnParams) => {
        chatAppInstance.sendStreamMessage({
          option: { ...msgContent, ...prefixResult },
          result,
        });
        if (result.status === 'completed') {
          chatAppInstance.sendSuffixMessage({
            option: { ...msgContent, ...prefixResult },
            result,
          });
        }
      }, 200);
      await aiCodeInstance.chatByStream(msgContent.text, fn);
    };

    if (!currentChatSessionCreatedAt || dayjs().isAfter(dayjs(currentChatSessionCreatedAt).endOf('day'))) {
      const sessionId = await aiCodeInstance.createChat();
      eventBus.emit(`${uuid}:setCurrentChatSession`, { sessionId, callback });
    } else {
      await callback();
    }

    // aiCodeInstance.chatByStream(message, (content: any) => {
    //   console.log('chatApp.content', content);
    // });
    // chatAppInstance.sendSuffixMessage();
  });
  eventBus.on(`${uuid}:setCurrentChatSession`, (content: { sessionId: string, callback: () => void }) => {
    const { sessionId, callback } = content;
    const userLocalChatCodeBridgeConfig = readFileContentAsJson(getFilePath('USER_LOCAL_CHAT_CODE_BRIDGE_CONFIG'));
    const index = userLocalChatCodeBridgeConfig.findIndex((item: ChatCodeBridgeOption) => item.uuid === uuid);
    userLocalChatCodeBridgeConfig[index] = {
      ...option,
      currentChatSession: sessionId,
      currentChatSessionCreatedAt: dayjs().valueOf(),
    };
    writeFileContentAsJson(getFilePath('USER_LOCAL_CHAT_CODE_BRIDGE_CONFIG'), userLocalChatCodeBridgeConfig);
    callback();
  });
}

export default eventBus;