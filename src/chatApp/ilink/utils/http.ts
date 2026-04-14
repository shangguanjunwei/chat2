import axios from "axios";

const http = axios.create({
  baseURL: 'https://ilinkai.weixin.qq.com',
  timeout: 30 * 1000,
});

http.interceptors.request.use((config: any) => {
  const headers = {
    'Content-Type': 'application/json',
    ...config.headers,
  };
  return {
    ...config,
    headers,
  };
}, (error) => {
  return Promise.reject(error);
});

http.interceptors.response.use((response) => {
  return response;
}, (error) => {
  return Promise.reject(error);
});

export const post = (url: string, data: any = {}, config: any = {}) => http.post(url, data, config);
export const get = (url: string, query: any = {}, config: any = {}) => http.get(url, { params: query, ...config });