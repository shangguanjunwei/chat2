export abstract class AiCode implements AiCodeInterface {
  abstract createChat(): void | Promise<any>;
  abstract chatByStream(...args: any[]): void | Promise<any>;
  abstract chatByText(...args: any[]): void | Promise<any>;
}
