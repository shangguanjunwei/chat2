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
  const { uuid, currentChatSessionCreatedAt } = option;
  eventBus.on(`${uuid}:messageBridge`, async (msgContent: ChatApp2AiCodeMessageContent) => {
    const prefixResult = await chatAppInstance.sendPrefixMessage({
      option: msgContent,
      result: {
        text: '🤔 思考中...',
        status: 'thinking',
      },
    });
    const callback = async () => {
      let sequence = 1;
      const throttledStream = throttle(
        (result: StreamPrintFnParams) => {
          chatAppInstance.sendStreamMessage({
            option: {
              ...msgContent,
              ...prefixResult,
              sequence
            },
            result,
          });
        },
        80,
        {
          leading: true,
          trailing: true, // 即使开了也没关系，后面会 cancel 掉
        }
      );
      const fn = (result: StreamPrintFnParams) => {
        if (result.status === 'completed') {
          // ❗关键：直接取消所有 pending 的 throttle（包括 trailing）
          throttledStream.cancel();
          chatAppInstance.sendSuffixMessage({
            option: {
              ...msgContent,
              ...prefixResult,
              sequence,
            },
            result,
          });
          return;
        }
        // 普通流走 throttle
        throttledStream(result);
        sequence++;
      };
      await aiCodeInstance.chatByStream(msgContent.text, fn);
    };
    if (!currentChatSessionCreatedAt || dayjs().isAfter(dayjs(currentChatSessionCreatedAt).endOf('day'))) {
      const sessionId = await aiCodeInstance.createChat();
      eventBus.emit(`${uuid}:setCurrentChatSession`, { sessionId, callback });
    } else {
      await callback();
    }
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