import mitt from 'mitt';
import type { Emitter } from 'mitt';
import dayjs from 'dayjs';
import { writeFileContentAsJson, readFileContentAsJson } from '@/utils/fileEvents';
import { getFilePath } from '@/utils/fileEvents';
import { throttle } from 'lodash-es';

/** 全局事件总线（mitt），用于 ChatApp 与 AiCode 之间的松耦合通信。 */
const eventBus: Emitter<any> = mitt();
/** 会话「换班」策略对应的时间跨度（毫秒），与 `currentChatSessionChangeRate` 对齐。 */
const timeDurationEnum = {
  day: 7 * 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
}

/**
 * 为单个 bridge 配置注册事件：收到 IM 消息后串联「前缀 → AI 流式 → 后缀」，并按策略刷新会话。
 *
 * @param option 当前 bot 的配置（含 uuid、会话策略等）
 * @param aiCodeInstance 已构造的 AI 适配实例
 * @param chatAppInstance 已构造的 IM 适配实例
 */
export const eventBusListener = (
  option: ChatCodeBridgeOption,
  aiCodeInstance: AiCodeInterface,
  chatAppInstance: ChatAppInterface
) => {
  const { uuid, currentChatSessionCreatedAt, currentChatSessionChangeRate } = option;
  eventBus.on(`${uuid}:messageBridge`, async (msgContent: ChatApp2AiCodeMessageContent) => {
    const prefixResult = await chatAppInstance.sendPrefixMessage({
      option: msgContent,
      result: {
        text: '🤔 思考中...',
        status: 'thinking',
      },
    });
    /** 在会话已就绪或无需新建会话时执行：节流推送流式片段，完成时收尾并调用后缀逻辑。 */
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
    if (!currentChatSessionCreatedAt) {
      const sessionId = await aiCodeInstance.createChat();
      eventBus.emit(`${uuid}:setCurrentChatSession`, { sessionId, callback });
    } else {
      if (currentChatSessionChangeRate !== 'never') {
        const timeDuration = timeDurationEnum[currentChatSessionChangeRate];
        if (dayjs().diff(dayjs(currentChatSessionCreatedAt).startOf('day'), 'millisecond') > timeDuration) {
          const sessionId = await aiCodeInstance.createChat();
          eventBus.emit(`${uuid}:setCurrentChatSession`, { sessionId, callback });
        } else {
          await callback();
        }
      } else {
        await callback();
      }
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

  eventBus.on(`${uuid}:setCurrentChatSessionByUuid`, (content: { uuid: string, sessionId: string, callback?: (...args: any[]) => void }) => {
    const { uuid, sessionId, callback } = content;
    const userLocalChatCodeBridgeConfig = readFileContentAsJson(getFilePath('USER_LOCAL_CHAT_CODE_BRIDGE_CONFIG'));
    const index = userLocalChatCodeBridgeConfig.findIndex((item: ChatCodeBridgeOption) => item.uuid === uuid);
    userLocalChatCodeBridgeConfig[index] = {
      ...option,
      currentChatSession: sessionId,
      currentChatSessionCreatedAt: dayjs().valueOf(),
    };
    writeFileContentAsJson(getFilePath('USER_LOCAL_CHAT_CODE_BRIDGE_CONFIG'), userLocalChatCodeBridgeConfig);
    callback && callback(userLocalChatCodeBridgeConfig[index]);
  });
}

export default eventBus;