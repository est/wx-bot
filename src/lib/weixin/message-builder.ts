import type { MessageItem } from "@/lib/weixin/client";

type MediaRef = {
  encrypt_query_param?: string;
  aes_key?: string;
  encrypt_type?: number;
  full_url?: string;
  md5?: string;
  len?: number;
};

const MEDIA_TYPE_MAP: Record<string, number> = { image: 2, audio: 3, video: 5 };

/**
 * Build message items for a media upload result.
 * Includes optional text caption as a second item.
 */
export function buildMessageItems(
  field: string,
  mediaRef: MediaRef,
  fileName: string,
  fileSize: number,
  text?: string,
): MessageItem[] {
  const mediaType = MEDIA_TYPE_MAP[field] || 4;
  const items: MessageItem[] = [];

  if (mediaType === 2) {
    items.push({ type: 2, image_item: { media: mediaRef, mid_size: fileSize } });
  } else if (mediaType === 3) {
    items.push({ type: 3, voice_item: { media: mediaRef, playtime: 0 } });
  } else if (mediaType === 5) {
    items.push({ type: 5, video_item: { media: mediaRef } });
  } else {
    items.push({ type: 4, file_item: { media: mediaRef, file_name: fileName } });
  }

  if (text) {
    items.push({ type: 1, text_item: { text } });
  }

  return items;
}
