import { addLog } from '@/utils/log';

/**
 * 构造飞书 SDK 所需的 `logger` 对象：各级别日志统一写入本地 `addLog`。
 *
 * @param appId 用于区分日志文件的应用 id
 */
export const logHandle = (appId: string) => {
  return {
    error: (args: any) => addLog(appId, JSON.stringify('System:' + args)),
    warn: (args: any) => addLog(appId, JSON.stringify('System:' + args)),
    info: (args: any) => addLog(appId, JSON.stringify('System:' + args)),
    debug: (args: any) => addLog(appId, JSON.stringify('System:' + args)),
    trace: (args: any) => addLog(appId, JSON.stringify('System:' + args)),
  };
};