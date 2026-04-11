import { getStreamingCardJson } from './formatMessage';
import * as Lark from '@larksuiteoapi/node-sdk';

/**
 * 调用 CardKit 创建卡片实体，返回 `card_id` 供后续发消息与流式更新引用。
 */
export const createCardEntity = async (client: Lark.Client, result: StreamPrintFnParams) => {
  try {
    const response = await client.cardkit.v1.card.create({
      data: {
        type: "card_json",
        data: getStreamingCardJson(result),
      },
    });
    if (response.code !== 0) {
      throw new Error(`创建卡片实体失败: ${response.msg}`);
    }
    const cardId = response.data?.card_id;
    return cardId;
  } catch (error: any) {
    console.error("ERROR: 创建卡片实体时发生错误:", error.message);
    throw error;
  }
}