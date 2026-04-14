interface IlinkBotGetBotQrcodeResponse {
  qrcode: string;
  qrcode_img_content: string;
  ret: number;
}

interface IlinkBotGetQrcodeStatusResponse {
  baseurl: string;
  bot_token: string;
  ilink_bot_id: string;
  ilink_user_id: string;
}