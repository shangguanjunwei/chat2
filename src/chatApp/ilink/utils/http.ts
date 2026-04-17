import axios from "axios";

const http = axios.create({
  baseURL: 'https://ilinkai.weixin.qq.com',
  timeout: 30 * 1000,
});

http.interceptors.request.use((config: any) => {
  const headers = {
    ...config.headers,
    'Content-Type': 'application/json',
    AuthorizationType: 'ilink_bot_token',
    "X-WECHAT-UIN": Buffer.from(Math.floor(Math.random() * 2 ** 32).toString()).toString('base64'),
  };
  const result = {
    ...config,
    headers,
  }
  // console.log("\n========================================");
  // console.log("请求头配置", result.headers);
  // console.log("请求参数", result.data);
  // console.log("----------------------------");
  return result;
}, (error) => {
  return Promise.reject(error);
});

http.interceptors.response.use((response) => {
  // console.log("响应数据", response.data);
  // console.log("========================================\n");
  return response;
}, (error) => {
  return Promise.reject(error);
});

export const post = (url: string, data: any = {}, config: any = {}) => http.post(url, data, config);
export const get = (url: string, query: any = {}, config: any = {}) => http.get(url, { params: query, ...config });