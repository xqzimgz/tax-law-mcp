/**
 * HTML テキスト処理ユーティリティ（共通）
 */

/**
 * HTML タグを除去してエンティティをデコード（インライン用）
 */
export function stripTags(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&emsp;/g, '\u3000')
    .replace(/&ensp;/g, ' ')
    .replace(/&thinsp;/g, '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

/**
 * HTML タグを除去してエンティティをデコード（ブロック要素を改行に変換）
 * 裁決事例全文など、ブロック構造を保持する必要がある場合に使用
 */
export function stripHtmlBlock(html: string): string {
  return stripTags(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
  )
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
