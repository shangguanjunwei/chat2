import AiBot, { generateReqId, WSClient, WsFrame } from '@wecom/aibot-node-sdk';
import { ChatApp } from '@/model/chatApp';
import eventBus from '@/eventBus/index';
import { addLog } from '@/utils/log';

/** 企业微信 AI 机器人 ChatApp：WebSocket 收消息并以流式接口回复。 */
export class WecomChatApp extends ChatApp {
  option: ChatCodeBridgeOption;
  wsClient: WSClient | null = null;
  constructor(option: ChatCodeBridgeOption) {
    super();
    this.option = option;
    this.init(option);
  }
  /** 建立 WS 连接，监听文本消息与进入会话事件，并注册 SIGINT 优雅退出。 */
  init(data: ChatCodeBridgeOption) {
    this.wsClient = new AiBot.WSClient({
      ...data.appBotOption as any,
    }).connect()
      .on('authenticated', () => {
        addLog(this.option.appBotOption.botId as string, '🔐 认证成功');
      })
      .on('message.text', (frame: WsFrame) => {
        if (!this.messageIsToThisBot(frame)) return;
        const streamId = generateReqId('stream');
        addLog(this.option.appBotOption.botId as string, `Q：${frame?.body?.text?.content}`);
        eventBus.emit(`${data.uuid}:messageBridge`, {
          text: frame?.body?.text?.content,
          msgid: frame?.body?.msgid,
          aibotid: frame?.body?.aibotid,
          streamId,
          frame,
        });
      })
      .on('event.enter_chat', (frame) => {
        this.sendWelcomeMessage(frame);
      });

    process.on('SIGINT', () => {
      this.wsClient!.disconnect();
      process.exit(0);
    });
  }
  /** 仅处理发往当前 `botId` 的消息帧。 */
  messageIsToThisBot(data: any): boolean {
    return data.body.aibotid === this.option.appBotOption.botId;
  }
  /** 向单聊或群聊发送一条 markdown 回复。 */
  async sendMessage(data: AiCode2ChatAppResponseContent) {
    const { body: { from: { userid }, chatid = '', chattype } } = data.option.frame;
    const id = chattype === 'group' ? chatid : userid;
    this.wsClient!.sendMessage(id, {
      msgtype: 'markdown',
      markdown: { content: data.result.text },
    });
  }
  /** 流式开始：以非最终块推送首段内容（`finish=false`）。 */
  async sendPrefixMessage(data: AiCode2ChatAppResponseContent) {
    this.wsClient!.replyStream(data.option.frame, data.option.streamId, data.result.text, false);
    return data.option;
  }
  /** 流式结束：写日志并以最终块结束流（`finish=true`）。 */
  async sendSuffixMessage(data: AiCode2ChatAppResponseContent) {
    addLog(this.option.appBotOption.botId as string, `A：${data.result.text}`);
    this.wsClient!.replyStream(data.option.frame, data.option.streamId, data.result.text, true);
  }
  /** 进入会话时推送欢迎语文本。 */
  sendWelcomeMessage(frame: WsFrame) {
    this.wsClient!.replyWelcome(frame, {
      msgtype: 'text',
      text: { content: '元气满满的一天～\n您好！我是智能助手，有什么可以帮您的吗？' },
    });
  }
  /** 流式过程中持续推送片段（非最终块）。 */
  async sendStreamMessage(data: AiCode2ChatAppResponseContent) {
    this.wsClient!.replyStream(data.option.frame, data.option.streamId, data.result.text, false);
  }
}