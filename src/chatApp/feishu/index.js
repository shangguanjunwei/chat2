import * as Lark from '@larksuiteoapi/node-sdk';
import { readCofig } from '../../../utils/readCofig.js';
import { sendMessageReaction } from './send-message/sendMessageReaction.js';
import { sendMessageToCursor } from '../../aiCode/cursor/index.js';
import { sendTextMessage } from './send-message/sendTextMessage.js';

const config = readCofig();

/** 近期已处理过的 message_id，避免平台重试/重复推送导致同一条消息跑两次 Agent */
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

const isFeishuMessageForThisBot = (data) => {
  const { chat_type, mentions = [] } = data.message;
  if (chat_type === 'p2p') return true;
  if (chat_type === 'group') {
    if (mentions.some(mention => mention.bot_info.app_id === config.chatApp.feishu.appId)) {
      return true;
    }
  }
  return false;
}

const getFormattedData = (data) => {
  const {
    chat_type,
    chat_id,
    content,
    message_id,
    mentions = []
  } = data.message;
  if (chat_type === 'group') {
    if (mentions.some(mention => mention.bot_info.app_id === config.chatApp.feishu.appId)) {
      let { text } = JSON.parse(content);
      for (const mention of mentions) {
        text = text.replace(`${mention.key}`, '');
      }
      return {
        chat_type,
        chat_id,
        content: { text: text.trim() },
        message_id,
      }
    }
  } else if (chat_type === 'p2p') {
    return {
      chat_type,
      chat_id,
      content: JSON.parse(content),
      message_id,
    }
  }
  return null;
}

export const startFeishuMessageListener = async (bridge) => {
  const { appId, appSecret, domain } = bridge;
  const client = new Lark.Client({ appId, appSecret, domain });
  const wsClient = new Lark.WSClient({ appId, appSecret, domain });
  wsClient.start({
    eventDispatcher: new Lark.EventDispatcher({}).register({
      'im.message.receive_v1': async (data) => {
        if (!isFeishuMessageForThisBot(data)) return;
        const options = getFormattedData(data);
        if (!options?.content?.text) return;
        await sendMessageReaction(client, {
          messageId: options.message_id,
          emojiType: 'THUMBSUP',
        });
        const result = await sendMessageToCursor(options.content.text);
        sendTextMessage(client, {
          receiveId: options.chat_id,
          receiveIdType: 'chat_id',
          text: result.text || '',
        });
      },
      'im.message.message_read_v1': async (data) => {
        // console.log(JSON.stringify(data, null, 2))
      },
      'im.message.reaction.created_v1': async (data) => {
        // console.log(JSON.stringify(data, null, 2))
      },
      'im.message.reaction.deleted_v1': async (data) => {
        // console.log(JSON.stringify(data, null, 2))
      }
    })
  })
}