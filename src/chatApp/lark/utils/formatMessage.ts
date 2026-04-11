export const getFormattedData = (data: any) => {
  const { chat_type, chat_id, message_id, mentions = [] } = data.message;
  const content = JSON.parse(data.message.content);
  if (chat_type === 'group') {
    let { text } = content;
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
      content: content,
      message_id,
    };
  }
  return null;
};

// 流式卡片消息
export const getStreamingCardJson = (data: StreamPrintFnParams) => {
  return JSON.stringify({
    "schema": "2.0", // 卡片 JSON 结构的版本。默认为 1.0。要使用 JSON 2.0 结构，必须显示声明 2.0。
    "config": {
      "streaming_mode": data.status !== 'completed', // 卡片是否处于流式更新模式，默认值为 false。
      "streaming_config": {}, // 流式更新配置。详情参考下文。
      "enable_forward": true, // 是否支持转发卡片。默认值为 true。
      "update_multi": true, // 是否为共享卡片。默认值为 true，JSON 2.0 暂时仅支持设为 true，即更新卡片的内容对所有收到这张卡片的人员可见。
      "width_mode": "fill", // 卡片宽度模式。支持 "compact"（紧凑宽度 400px）模式 或 "fill"（撑满聊天窗口宽度）模式。默认不填时的宽度为 600px。
      "enable_forward_interaction": false, // 转发的卡片是否仍然支持回传交互。默认值 false。
    },
    "header": {
      "title": {
        // 卡片主标题。必填。要为标题配置多语言，参考配置卡片多语言文档。
        "tag": "lark_md", // 文本类型的标签。可选值：plain_text 和 lark_md。
        "content": data.status === 'completed' ? '完成' : data.status === 'thinking' ? '思考中...' : '生成中...', // 标题内容。
      },
      "template": "indigo", // 标题主题样式颜色。支持 "blue"|"wathet"|"turquoise"|"green"|"yellow"|"orange"|"red"|"carmine"|"violet"|"purple"|"indigo"|"grey"|"default"。默认值 default。
      "padding": "6px 12px 6px 12px" // 标题组件的内边距。JSON 2.0 新增属性。默认值 "12px"，支持范围 [0,99]px。    
    },
    "body": { // 卡片正文。
      // JSON 2.0 新增布局类属性，用于控制子元素排列：
      "direction": "vertical", // 正文或容器内组件的排列方向。可选值："vertical"（垂直排列）、"horizontal"（水平排列）。默认为 "vertical"。
      "padding": "8px 12px 12px 12px", // 正文或容器内组件的内边距，支持范围 [0,99]px。    
      "horizontal_spacing": "small", // 正文或容器内组件的水平间距，可选值："small"(4px)、"medium"(8px)、"large"(12px)、"extra_large"(16px)或[0,99]px。
      "horizontal_align": "left", // 正文或容器内组件的水平对齐方式，可选值："left"、"center"、"right"。默认值为 "left"。
      "vertical_spacing": "medium", // 正文或容器内组件的垂直间距，可选值："small"(4px)、"medium"(8px)、"large"(12px)、"extra_large"(16px)或[0,99]px。
      "vertical_align": "center", // 正文或容器内组件的垂直对齐方式，可选值："top"、"center"、"bottom"，默认值为 "top"。
      "elements": [ // 在此传入各个组件的 JSON 数据，组件将按数组顺序纵向流式排列。
        {
          "tag": "markdown", // 组件的标签。
          "element_id": "custom_id",
          "content": data.text
        }
      ]
    }
  });
};