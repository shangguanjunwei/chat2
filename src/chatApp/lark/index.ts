import { ChatApp } from '@/model/chatApp';
import * as Lark from '@larksuiteoapi/node-sdk';
import dayjs from 'dayjs';
import {
  getFormattedData,
} from '@/chatApp/feishu/utils/formatMessage';
import { createCardEntity } from './utils/CardEvents';
import eventBus from '@/eventBus';
import { addLog } from '@/utils/log';
import { getStreamingCardJson } from './utils/formatMessage';

/** Lark 国际版 ChatApp：逻辑与飞书国内版类似，SDK 默认域名不同。 */
export class LarkChatApp extends ChatApp {
  client: Lark.Client | null = null;
  wsClient: Lark.WSClient | null = null;
  option: ChatCodeBridgeOption;

  constructor(option: ChatCodeBridgeOption) {
    super();
    this.option = option;
    this.init(option);
  }
  /** 初始化 Client 与 WSClient，注册消息与进入单聊事件。 */
  init(data: ChatCodeBridgeOption): void {
    const { appBotOption } = data;
    this.client = new Lark.Client({
      ...appBotOption as any,
      // loggerLevel: Lark.LoggerLevel.warn,
      // logger: {
      //   error: () => {
      //     console.log('error', arguments);
      //   },
      //   warn: () => {
      //     console.log('warn', arguments);
      //   },
      //   info: () => {
      //     console.log('info', arguments);
      //   },
      //   debug: () => {
      //     console.log('debug', arguments);
      //   },
      //   trace: () => {
      //     console.log('trace', arguments);
      //   },
      // },
      disableTokenCache: false,
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
          addLog(this.option.appBotOption.appId as string, `Q：${options.content.text}`);
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
  /** 用户当日首次进入单聊时发送欢迎卡片（按消息时间做简单去重）。 */
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
  /** 更新流式卡片中指定元素的正文内容（按 sequence 排序）。 */
  async sendStreamMessage(data: AiCode2ChatAppResponseContent) {
    await this.client!.cardkit.v1.cardElement.content({
      path: {
        card_id: data.option.prefixResult.card_id,
        element_id: data.option.prefixResult.element_id,
      },
      data: {
        content: data.result.text,
        sequence: data.option.sequence,
      },
    })
  }
  /** 以富文本 post 形式回复一条 markdown（非流式卡片场景）。 */
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
  /** 单聊全收；群聊仅当消息 @ 到本机器人时处理。 */
  messageIsToThisBot(data: any) {
    const { chat_type, mentions = [] } = data.message;
    if (chat_type === 'p2p') return true;
    if (chat_type === 'group') {
      return mentions.some((m: any) => m.bot_info.app_id === this.option.appBotOption.appId);
    }
    return false;
  }
  /** 思考中表情 + 创建卡片实体 + 会话内发出交互式卡片，返回后续流式更新所需的 ids。 */
  async sendPrefixMessage(data: AiCode2ChatAppResponseContent) {
    const result_1 = await this.client!.im.v1.messageReaction.create({
      path: { message_id: data.option.message_id },
      data: { reaction_type: { emoji_type: 'OnIt' } },
    })
    const card_id = await createCardEntity(this.client!, data.result);
    await this.client!.im.message.create({
      params: { receive_id_type: 'chat_id' },
      data: {
        receive_id: data.option.chat_id,
        msg_type: 'interactive',
        content: JSON.stringify({
          type: 'card',
          data: { card_id: card_id }
        }),
      },
    });

    return {
      ...data.option,
      prefixResult: {
        reaction_id: result_1.data?.reaction_id,
        card_id: card_id,
        element_id: "custom_id",
      }
    }
  }
  /** 流式结束：最终更新卡片、写日志、移除思考表情并打上完成类表情。 */
  async sendSuffixMessage(data: AiCode2ChatAppResponseContent) {
    await this.client!.cardkit.v1.card.update({
      data: {
        card: {
          type: "card_json",
          data: getStreamingCardJson(data.result),
        },
        sequence: data.option.sequence,
      },
      path: {
        card_id: data.option.prefixResult.card_id
      }
    })
    addLog(this.option.appBotOption.appId as string, `A：${data.result.text}`);
    this.client!.im.v1.messageReaction.delete({
      path: {
        message_id: data.option.message_id,
        reaction_id: data.option.prefixResult.reaction_id,
      }
    });
    this.client!.im.v1.messageReaction.create({
      path: { message_id: data.option.message_id },
      data: { reaction_type: { emoji_type: 'DONE' } },
    })
  }
}