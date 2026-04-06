import * as Lark from '@larksuiteoapi/node-sdk';
import { sendMessageReaction } from './send-message/sendMessageReaction.js';
import { sendMessageToCursor } from '../../aiCode/cursor/index.js';
import { sendTextMessage } from './send-message/sendTextMessage.js';
import { writeLog } from '../../../utils/writeLog.js';

export const startFeishuMessageListener = async (bridge) => {
  const { appId, appSecret, domain } = bridge;

  const isForThisBot = (data) => {
    const { chat_type, mentions = [] } = data.message;
    if (chat_type === 'p2p') return true;
    if (chat_type === 'group') {
      return mentions.some((m) => m.bot_info.app_id === appId);
    }
    return false;
  };

  const getFormattedData = (data) => {
    const { chat_type, chat_id, content, message_id } = data.message;
    if (chat_type === 'group') {
      const { mentions = [] } = data.message;
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
  new Lark.WSClient({
    appId,
    appSecret,
    domain
  }).start({
    eventDispatcher: new Lark.EventDispatcher({}).register({
      'im.message.receive_v1': async (data) => {
        if (!isForThisBot(data)) return;
        writeLog("监听到消息", JSON.stringify(data));
        const options = getFormattedData(data);
        if (!options?.content?.text) return;
        await sendMessageReaction(client, {
          messageId: options.message_id,
          emojiType: 'Typing',
        });
        const result = await sendMessageToCursor(options.content.text);
        const params = {
          messageId: options.message_id,
          receiveId: options.chat_id,
          receiveIdType: 'chat_id',
          text: result.text || '',
        }
        await sendTextMessage(client, params);
        writeLog("本地发送消息", JSON.stringify(params));
      },
      'im.message.reaction.created_v1': async (data) => {
        // writeLog("收到消息表情回复", JSON.stringify(data));
      },
      'im.message.message_read_v1': async (data) => {
        // writeLog("收到消息已读", JSON.stringify(data));
      },
      'im.message.reaction.deleted_v1': async (data) => {
        // writeLog("收到消息表情回复删除", JSON.stringify(data));
      },
    }),
  });
};
