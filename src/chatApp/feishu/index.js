import * as Lark from '@larksuiteoapi/node-sdk';
import { sendMessageReaction } from './send-message/sendMessageReaction.js';
import { sendMessageToCursor } from '../../aiCode/cursor/index.js';
import { sendTextMessage } from './send-message/sendTextMessage.js';

/** 去重 message_id，减轻平台重试导致的重复 Agent 调用 */
const processedMessageIds = new Set();
const PROCESSED_ID_MAX = 500;

function consumeMessageIdOnce(messageId) {
  if (!messageId || processedMessageIds.has(messageId)) return false;
  processedMessageIds.add(messageId);
  if (processedMessageIds.size > PROCESSED_ID_MAX) {
    const oldest = processedMessageIds.values().next().value;
    processedMessageIds.delete(oldest);
  }
  return true;
}

export const startFeishuMessageListener = async (bridge) => {
  const { appId, appSecret, domain } = bridge;
  const botAppId = appId;

  const isForThisBot = (data) => {
    const { chat_type, mentions = [] } = data.message;
    if (chat_type === 'p2p') return true;
    if (chat_type === 'group') {
      return mentions.some((m) => m.bot_info.app_id === botAppId);
    }
    return false;
  };

  const getFormattedData = (data) => {
    const {
      chat_type,
      chat_id,
      content,
      message_id,
      mentions = [],
    } = data.message;
    if (chat_type === 'group') {
      if (!mentions.some((m) => m.bot_info.app_id === botAppId)) return null;
      let { text } = JSON.parse(content);
      for (const mention of mentions) {
        text = text.replace(`${mention.key}`, '');
      }
      return {
        chat_type,
        chat_id,
        content: { text: text.trim() },
        message_id,
      };
    }
    if (chat_type === 'p2p') {
      return {
        chat_type,
        chat_id,
        content: JSON.parse(content),
        message_id,
      };
    }
    return null;
  };

  const client = new Lark.Client({ appId, appSecret, domain });
  const wsClient = new Lark.WSClient({ appId, appSecret, domain });
  wsClient.start({
    eventDispatcher: new Lark.EventDispatcher({}).register({
      'im.message.receive_v1': async (data) => {
        if (!isForThisBot(data)) return;
        const options = getFormattedData(data);
        if (!options?.content?.text) return;
        if (!consumeMessageIdOnce(options.message_id)) return;

        await sendMessageReaction(client, {
          messageId: options.message_id,
          emojiType: 'THUMBSUP',
        });
        const result = await sendMessageToCursor(options.content.text);
        await sendTextMessage(client, {
          receiveId: options.chat_id,
          receiveIdType: 'chat_id',
          text: result.text || '',
        });
      },
    }),
  });
};
