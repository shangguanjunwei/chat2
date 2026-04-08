import { ChatApp } from '@/model/chatApp';
import * as Lark from '@larksuiteoapi/node-sdk';
import dayjs from 'dayjs';
import { getFormattedData } from '@/chatApp/feishu/utils/formatMessage';

export class FeishuChatApp extends ChatApp {
  client: Lark.Client | null = null;
  wsClient: Lark.WSClient | null = null;
  currentMessageId: string = '';
  currentChatId: string = '';
  currentReactionId: string = '';

  constructor(appId: string, appSecret: string, domain: string) {
    super(appId);
    this.init({
      appId,
      appSecret,
      domain,
    });
  }
  init(data: LarkClient): void {
    this.client = new Lark.Client({
      ...data,
      appType: Lark.AppType.SelfBuild,
    });
    this.wsClient = new Lark.WSClient({
      ...data,
      // loggerLevel: Lark.LoggerLevel.debug,
    });
    this.wsClient.start({
      eventDispatcher: new Lark.EventDispatcher({}).register({
        'im.message.receive_v1': async (data) => {
          if (!this.messageIsToThisBot(data)) return;
          const options = getFormattedData(data);
          if (!options?.content?.text) return;
          this.currentChatId = data.message.chat_id;
          this.currentMessageId = data.message.message_id;
          this.sendPrefixMessage(data);
          // 将收到的消息发送给 AI code 工具
          this.sendMessage('**99999**')
        },
        'im.chat.access_event.bot_p2p_chat_entered_v1': async (data) => {
          this.sendWelcomeMessage(data);
        },
        'im.message.reaction.created_v1': async () => { },
        'im.message.message_read_v1': async () => { },
        'im.message.reaction.deleted_v1': async () => { },
      }),
    });
    this.setStatus('on');
  }
  sendWelcomeMessage(data: any) {
    const { last_message_create_time, chat_id } = data;
    if (dayjs().startOf('day').isBefore(dayjs(Number(last_message_create_time)))) return;
    this.client!.im.v1.message.create({
      params: { receive_id_type: "chat_id" },
      data: {
        receive_id: chat_id,
        content: Lark.messageCard.defaultCard({
          title: '哈哈哈',
          content: '又是元气满满的一天~'
        }),
        msg_type: 'interactive'
      }
    });
  }
  sendMessage(message: string) {
    this.client!.im.v1.message.reply({
      path: { message_id: this.currentMessageId },
      data: {
        msg_type: 'post',
        content: JSON.stringify({
          zh_cn: { content: [[{ tag: 'md', text: message }]] },
        }),
      },
    });
  }
  messageIsToThisBot(data: any) {
    const { chat_type, mentions = [] } = data.message;
    if (chat_type === 'p2p') return true;
    if (chat_type === 'group') {
      return mentions.some((m: any) => m.bot_info.app_id === this.appId);
    }
    return false;
  }
  async sendPrefixMessage(data: any) {
    const { message: { message_id } } = data;
    const reaction = await this.client!.im.v1.messageReaction.create({
      path: { message_id: message_id },
      data: {
        reaction_type: { emoji_type: 'Typing' },
      },
    })
    this.currentReactionId = reaction?.data?.reaction_id || '';
  }
  sendSuffixMessage() {
    this.client!.im.v1.messageReaction.delete({
      path: {
        message_id: this.currentMessageId,
        reaction_id: this.currentReactionId,
      }
    });
  }
}