declare module "@tencent-weixin/openclaw-weixin/dist/src/api/api.js" {
  export function getUpdates(
    params: import("./types").GetUpdatesReq &
      import("./types").WeixinApiOptions & { abortSignal?: AbortSignal }
  ): Promise<import("./types").GetUpdatesResp>;

  export function sendMessage(
    params: import("./types").WeixinApiOptions & {
      body: import("./types").SendMessageReq;
    }
  ): Promise<void>;

  export function getUploadUrl(
    params: import("./types").GetUploadUrlReq & import("./types").WeixinApiOptions
  ): Promise<import("./types").GetUploadUrlResp>;

  export function getConfig(
    params: import("./types").WeixinApiOptions & {
      ilinkUserId: string;
      contextToken?: string;
    }
  ): Promise<import("./types").GetConfigResp>;

  export function sendTyping(
    params: import("./types").WeixinApiOptions & {
      body: import("./types").SendTypingReq;
    }
  ): Promise<void>;

  export function apiPostFetch(params: {
    baseUrl: string;
    endpoint: string;
    body: string;
    token?: string;
    timeoutMs?: number;
    label: string;
    abortSignal?: AbortSignal;
  }): Promise<string>;

  export function apiGetFetch(params: {
    baseUrl: string;
    endpoint: string;
    timeoutMs?: number;
    label: string;
  }): Promise<string>;

  export function notifyStart(
    params: import("./types").WeixinApiOptions
  ): Promise<unknown>;

  export function buildBaseInfo(): import("./types").BaseInfo;
}
