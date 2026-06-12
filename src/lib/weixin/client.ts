export {
  getUpdates,
  sendMessage,
  getUploadUrl,
  getConfig,
  sendTyping,
  apiPostFetch,
  apiGetFetch,
} from "@tencent-weixin/openclaw-weixin/src/api/api";

export type {
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
  BaseInfo,
} from "@tencent-weixin/openclaw-weixin/src/api/types";

export {
  MessageType,
  MessageItemType,
  MessageState,
  UploadMediaType,
} from "@tencent-weixin/openclaw-weixin/src/api/types";
