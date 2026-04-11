/**
 * 与 `getFilePath` 配合：约定用户目录下配置文件相对路径；键名以 `USER_LOCAL_` 开头表示相对用户主目录。
 */
export enum FilePathEnum {
  // 用户本地文件必须以 USER_LOCAL_ 开头
  // 用户本地项目配置列表的文件地址
  USER_LOCAL_PROJECT_CONFIG_LIST = '.chat-code-bridge/project-config-list.json',
  // 用户本地聊天应用配置文件
  USER_LOCAL_CHAT_CODE_BRIDGE_CONFIG = '.chat-code-bridge/chat-code-bridge.json',
}

