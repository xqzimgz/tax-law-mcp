/**
 * NTAサイトから通達ページをフェッチするクライアント
 * Shift_JIS → UTF-8 変換対応
 */

import { tsutatsuTocCache, tsutatsuPageCache } from './cache.js';

const NTA_BASE = 'https://www.nta.go.jp';

/**
 * NTAページを取得し、エンコーディングを変換
 */
export async function fetchNtaPage(
  path: string,
  encoding: 'shift_jis' | 'utf-8' = 'shift_jis'
): Promise<string> {
  const url = path.startsWith('http') ? path : `${NTA_BASE}${path}`;

  // ページキャッシュ
  const cached = tsutatsuPageCache.get(url);
  if (cached) return cached;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`NTAページ取得エラー: ${res.status} ${res.statusText} (${url})`);
  }

  let html: string;
  if (encoding === 'shift_jis') {
    const buf = await res.arrayBuffer();
    const decoder = new TextDecoder('shift_jis');
    html = decoder.decode(buf);
  } else {
    html = await res.text();
  }

  tsutatsuPageCache.set(url, html);
  return html;
}

/**
 * 通達TOCページを取得（長めのキャッシュ）
 */
export async function fetchTsutatsuToc(
  tocPath: string,
  encoding: 'shift_jis' | 'utf-8' = 'shift_jis'
): Promise<string> {
  const url = `${NTA_BASE}${tocPath}`;

  // TOCキャッシュ（24時間）
  const cached = tsutatsuTocCache.get(url);
  if (cached) return cached;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`通達目次取得エラー: ${res.status} ${res.statusText} (${url})`);
  }

  let html: string;
  if (encoding === 'shift_jis') {
    const buf = await res.arrayBuffer();
    const decoder = new TextDecoder('shift_jis');
    html = decoder.decode(buf);
  } else {
    html = await res.text();
  }

  tsutatsuTocCache.set(url, html);
  return html;
}

/**
 * NTAページの完全URLを生成
 */
export function getNtaUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${NTA_BASE}${path}`;
}
