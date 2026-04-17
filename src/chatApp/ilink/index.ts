import { ChatApp } from '@/model/chatApp';
import eventBus from '@/eventBus/index';
import { addLog } from '@/utils/log';
import { get as getHttp, post as postHttp } from './utils/http';
import { AxiosResponse } from 'axios';
import qrcode from 'qrcode-terminal';
import { readFileContentAsJson, getFilePath, writeFileContentAsJson } from '@/utils/fileEvents';
import { isEmpty } from 'lodash-es';

export class IlinkChatApp extends ChatApp {
  option: ChatCodeBridgeOption;
  private post: (url: string, data?: Item, config?: Item) => Promise<AxiosResponse<any>>
    = (url, data = {}, config = {}) => {
      const headers = { ...config.headers };
      const option2 = this.getOption();
      // X-WECHAT-UIN 为 uint32 经过 base64 编码
      if (option2.appBotOption?.bot_token) {
        headers.Authorization = `Bearer ${option2.appBotOption.bot_token}`;
      }
      return postHttp(url, data, { ...config, headers });
    };
  private get: (url: string, query?: Item, config?: Item) => Promise<AxiosResponse<any>>
    = (url, query = {}, config = {}) => {
      const headers = { ...config.headers };
      const option2 = this.getOption();
      if (option2.appBotOption?.bot_token) {
        headers.Authorization = `Bearer ${option2.appBotOption.bot_token}`;
      }
      return getHttp(url, query, { ...config, headers });
    };

  constructor(option: ChatCodeBridgeOption) {
    super();
    this.option = option;
    this.init();
  }

  getOption(): ChatCodeBridgeOption {
    if (isEmpty(this.option.appBotOption)) {
      const userLocalChatCodeBridgeConfig = readFileContentAsJson(getFilePath('USER_LOCAL_CHAT_CODE_BRIDGE_CONFIG'));
      this.option = userLocalChatCodeBridgeConfig.find((item: ChatCodeBridgeOption) => item.uuid === this.option.uuid);
      return this.option;
    } else {
      return this.option;
    }
  }

  init() {
    if (isEmpty(this.option.appBotOption)) {
      this.initIlink();
    } else {
      this.pullLoop();
    }
  }

  get_updates_buf: string = '';

  private pullLoop = async (): Promise<void> => {
    const fn = async () => {
      try {
        // 参考文档：https://github.com/hao-ji-xing/openclaw-weixin/blob/main/weixin-bot-api.md
        const res = await this.post('/ilink/bot/getupdates', {
          get_updates_buf: this.get_updates_buf,
          base_info: { channel_version: '1.0.2' }
        });
        this.get_updates_buf = res.data.get_updates_buf;
        if (isEmpty(res.data.msgs) || res.data.msgs[0].message_type !== 1 || res.data.msgs[0].message_state !== 2) {
          return fn();
        };
        const msg = res.data.msgs[0];
        addLog(this.option.appBotOption.ilink_bot_id as string, `Q：${msg.item_list[0].text_item.text}`);
        eventBus.emit(`${this.option.uuid}:messageBridge`, {
          text: msg.item_list[0].text_item.text,
          seq: msg.seq,
          from_user_id: msg.from_user_id,
          to_user_id: msg.to_user_id,
          client_id: msg.client_id,
          message_id: msg.message_id,
          session_id: msg.session_id,
          group_id: msg.group_id,
          context_token: msg.context_token,
        });
        fn();
      } catch (error: any) {
        console.log(error.message);
        process.exit(1);
      }
    };
    fn();
  };

  private async initIlink(): Promise<void> {
    try {
      const res: AxiosResponse<IlinkBotGetBotQrcodeResponse> = await this.post('/ilink/bot/get_bot_qrcode?bot_type=3');
      this.openBrowser(res.data.qrcode_img_content as string);
      const fn = async () => {
        const res2 = await this.get(`/ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(res.data.qrcode)}`);
        const status = res2.data.status;
        if (status === 'wait' || status === 'scaned') {
          await fn();
          return;
        }
        if (status === 'expired') throw (new Error('iLink 二维码已过期'));
        if (status === 'confirmed') {
          const { baseurl, bot_token, ilink_bot_id, ilink_user_id } = res2.data;
          const userLocalChatCodeBridgeConfig = readFileContentAsJson(getFilePath('USER_LOCAL_CHAT_CODE_BRIDGE_CONFIG'));
          userLocalChatCodeBridgeConfig.forEach((item: ChatCodeBridgeOption) => {
            if (item.uuid === this.option.uuid) item.appBotOption = { baseurl, bot_token, ilink_bot_id, ilink_user_id };
          });
          writeFileContentAsJson(getFilePath('USER_LOCAL_CHAT_CODE_BRIDGE_CONFIG'), userLocalChatCodeBridgeConfig);
          this.pullLoop();
          return;
        }
        throw (new Error('iLink 二维码状态未知'));
      }
      await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`提示：${msg}，程序退出`);
      process.exit(1);
    }
  }

  messageIsToThisBot(): boolean {
    return true;
  }

  sendMessage() { }

  sendTyping(data: AiCode2ChatAppResponseContent) {
    this.post('/ilink/bot/getconfig', { ilink_user_id: data.option.from_user_id })
      .then((res: any) => {
        this.post('ilink/bot/sendtyping', {
          ilink_user_id: data.option.from_user_id,
          typing_ticket: res.data.typing_ticket,
          status: data.result.status === 'completed' ? 2 : 1
        });
      }).catch(() => { })
  }

  async sendPrefixMessage(data: AiCode2ChatAppResponseContent) {
    this.sendTyping(data);
    return data.option;
  }

  async sendSuffixMessage(data: AiCode2ChatAppResponseContent) {
    this.sendTyping(data);
    if (data.result.status !== 'completed') return;
    await this.post('/ilink/bot/sendmessage', {
      get_updates_buf: this.get_updates_buf,
      base_info: { channel_version: '1.0.2' },
      msg: {
        seq: data.option.seq,
        from_user_id: data.option.to_user_id,
        to_user_id: data.option.from_user_id,
        client_id: data.option.client_id,
        message_id: data.option.message_id,
        session_id: data.option.session_id,
        group_id: data.option.group_id,
        message_type: 2, // BOT 发出
        message_state: 2, // FINISH（完整消息）
        context_token: data.option.context_token, // ← 必填！
        item_list: [{
          type: 1,
          text_item: { text: data.result.text }
        }]
      },
    }).catch((error: any) => {
      console.error(`提示：${error.message}，程序退出`);
      process.exit(1);
    }).finally(() => {
      addLog(this.option.appBotOption.ilink_bot_id as string, `A：${data.result.text}`);
    })
  }

  sendWelcomeMessage() { }

  async sendStreamMessage() { }

  // 打开浏览器
  openBrowser(url: string) {
    // if (process.platform === 'win32') {
    //   spawn('cmd', ['/c', 'start', '', url])
    // } else if (process.platform === 'darwin') {
    //   spawn('open', [url])
    // } else {
    //   spawn('xdg-open', [url])
    // }
    qrcode.generate(url, { small: true });
  }
}
