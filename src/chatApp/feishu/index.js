import * as Lark from '@larksuiteoapi/node-sdk';
import { readCofig } from '../../../utils/readCofig.js';
import { sendMessageReaction } from './send-message/sendMessageReaction.js';

const config = readCofig();

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
      content,
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
        sendMessageReaction(client, {
          messageId: options.message_id,
          emojiType: 'THUMBSUP'
        })
      },
      'im.message.reaction.created_v1': async (data) => {
        console.log(JSON.stringify(data, null, 2))
      }
    })
  })
}