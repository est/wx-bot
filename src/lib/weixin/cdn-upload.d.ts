declare module "@tencent-weixin/openclaw-weixin/dist/src/cdn/cdn-upload.js" {
  export function uploadBufferToCdn(params: {
    buf: Buffer;
    uploadFullUrl?: string;
    uploadParam?: string;
    filekey: string;
    cdnBaseUrl: string;
    label: string;
    aeskey: Buffer;
  }): Promise<{ downloadParam: string }>;
}
