export abstract class ChatApp implements ChatAppInterface {
  _appId: string = '';
  _status: ChatAppStatus = 'off';
  constructor(appId: string) {
    this._appId = appId;
  }
  appId(): string {
    return this._appId;
  }
  setStatus(status: ChatAppStatus) {
    this._status = status;
  }
  getStatus(): ChatAppStatus {
    return this._status;
  }
  abstract init(...args: any[]): void;
  abstract messageIsToThisBot(...args: any[]): boolean | Promise<boolean>;
  abstract sendMessage(...args: any[]): void | Promise<void>;
  abstract sendPrefixMessage(...args: any[]): void | Promise<void>;
  abstract sendSuffixMessage(...args: any[]): void | Promise<void>;
  abstract sendWelcomeMessage(...args: any[]): void | Promise<void>;
}