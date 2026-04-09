import { ChatApp } from '@/model/chatApp';
import * as Lark from '@larksuiteoapi/node-sdk';
import dayjs from 'dayjs';
import {
  getFormattedData,
  getStreamingCardJson
} from '@/chatApp/feishu/utils/formatMessage';
import eventBus from '@/eventBus';

const headerTitleEnum = {
  thinking: '思考中...',
  processing: '生成中...',
  completed: '完成',
}
export class FeishuChatApp extends ChatApp {
  client: Lark.Client | null = null;
  wsClient: Lark.WSClient | null = null;
  currentMessageId: string = '';
  currentChatId: string = '';
  currentReactionId: string = '';
  option: ChatCodeBridgeOption;

  constructor(option: ChatCodeBridgeOption) {
    super();
    this.option = option;
    this.init(option);
  }
  init(data: ChatCodeBridgeOption): void {
    const { appBotOption } = data;
    this.client = new Lark.Client({
      ...appBotOption as any,
      appType: Lark.AppType.SelfBuild,
    });
    this.wsClient = new Lark.WSClient({
      ...appBotOption as any,
      // loggerLevel: Lark.LoggerLevel.debug,
    });
    this.wsClient.start({
      eventDispatcher: new Lark.EventDispatcher({}).register({
        'im.message.receive_v1': async (data) => {
          if (!this.messageIsToThisBot(data)) return;
          const options = getFormattedData(data);
          if (!options?.content?.text) return;
          eventBus.emit(`${this.option.uuid}:messageBridge`, {
            text: options.content.text,
            chat_id: data.message.chat_id,
            message_id: data.message.message_id,
          });
        },
        'im.chat.access_event.bot_p2p_chat_entered_v1': async (data) => {
          this.sendWelcomeMessage(data);
        },
      }),
    });
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
  async sendStreamMessage(data: AiCode2ChatAppResponseContent) {
    await this.client!.im.message.patch({
      path: { message_id: data.option.stream_card_message_id },
      data: { content: getStreamingCardJson(data.result) }
    });
  }
  sendMessage(data: AiCode2ChatAppResponseContent) {
    this.client!.im.v1.message.reply({
      path: { message_id: data.option.message_id },
      data: {
        msg_type: 'post',
        content: JSON.stringify({
          zh_cn: { content: [[{ tag: 'md', text: data.result.text }]] },
        }),
      },
    });
  }
  messageIsToThisBot(data: any) {
    const { chat_type, mentions = [] } = data.message;
    if (chat_type === 'p2p') return true;
    if (chat_type === 'group') {
      return mentions.some((m: any) => m.bot_info.app_id === this.option.appBotOption.app_id);
    }
    return false;
  }
  async sendPrefixMessage(data: AiCode2ChatAppResponseContent) {
    const result_1 = await this.client!.im.v1.messageReaction.create({
      path: { message_id: data.option.message_id },
      data: { reaction_type: { emoji_type: 'Typing' } },
    })
    const result_2 = await this.client!.im.message.create({
      params: { receive_id_type: 'chat_id' },
      data: {
        receive_id: data.option.chat_id,
        msg_type: 'interactive',
        content: getStreamingCardJson(data.result)
      }
    });
    return {
      ...data.option,
      reaction_id: result_1.data?.reaction_id,
      stream_card_message_id: result_2.data?.message_id,
    }
  }
  sendSuffixMessage(data: AiCode2ChatAppResponseContent) {
    this.client!.im.v1.messageReaction.delete({
      path: {
        message_id: data.option.message_id,
        reaction_id: data.option.reaction_id,
      }
    });
  }
}