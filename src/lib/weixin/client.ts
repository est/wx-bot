export {
  getUpdates,
  sendMessage,
  getUploadUrl,
  getConfig,
  sendTyping,
  apiPostFetch,
  apiGetFetch,
  buildBaseInfo,
} from "@tencent-weixin/openclaw-weixin/dist/src/api/api.js";

export type {
  BaseInfo,
  WeixinMessage,
  MessageItem,
  CDNMedia,
  TextItem,
  ImageItem,
  VoiceItem,
  FileItem,
  VideoItem,
  GetUpdatesReq,
  GetUpdatesResp,
  SendMessageReq,
  GetUploadUrlReq,
  GetUploadUrlResp,
} from "./types";

export {
  MessageType,
  MessageItemType,
  MessageState,
  UploadMediaType,
} from "./types";
