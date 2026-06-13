declare module "@tencent-weixin/openclaw-weixin/dist/src/cdn/pic-decrypt.js" {
  export function downloadAndDecryptBuffer(
    encryptedQueryParam: string,
    aesKeyBase64: string,
    cdnBaseUrl: string,
    label: string,
    fullUrl?: string,
  ): Promise<Buffer>;

  export function downloadPlainCdnBuffer(
    encryptedQueryParam: string,
    cdnBaseUrl: string,
    label: string,
    fullUrl?: string,
  ): Promise<Buffer>;
}
