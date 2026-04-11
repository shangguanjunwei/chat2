import { addLog } from '@/utils/log';

export const logHandle = (appId: string) => {
  return {
    error: (args: any) => addLog(appId, JSON.stringify(args)),
    warn: (args: any) => addLog(appId, JSON.stringify(args)),
    info: (args: any) => addLog(appId, JSON.stringify(args)),
    debug: (args: any) => addLog(appId, JSON.stringify(args)),
    trace: (args: any) => addLog(appId, JSON.stringify(args)),
  };
};