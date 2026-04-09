export abstract class ChatApp implements ChatAppInterface {
  abstract init(...args: any[]): void;
  abstract messageIsToThisBot(...args: any[]): boolean | Promise<boolean>;
  abstract sendMessage(...args: any[]): void | Promise<void>;
  abstract sendPrefixMessage(...args: any[]): void | Promise<void>;
  abstract sendSuffixMessage(...args: any[]): void | Promise<void>;
  abstract sendWelcomeMessage(...args: any[]): void | Promise<void>;
  abstract sendStreamMessage(...args: any[]): any | Promise<any>;
}