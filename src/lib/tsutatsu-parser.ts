/**
 * 通達HTMLの解析
 * - TOCページからリンク構造を抽出
 * - 個別ページから特定の通達エントリを抽出
 */

import type { TsutatsuTocLink, TsutatsuEntry } from './types.js';

/**
 * TOCページのHTMLからリンク一覧を抽出
 */
export function parseTocLinks(html: string): TsutatsuTocLink[] {
  const links: TsutatsuTocLink[] = [];
  // <a href="...">テキスト</a> を抽出
  const linkRegex = /<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const text = stripHtml(match[2]).trim();

    // 通達ページへのリンクのみ（/law/tsutatsu/ を含む）
    if (!href.includes('/law/tsutatsu/')) continue;
    if (!text) continue;

    // テキストから条文番号プレフィックスを推測
    const articlePrefix = extractArticlePrefix(text);

    links.push({ text, href: href.split('#')[0], articlePrefix });
  }

  // 重複除去（同じhrefのものは最初だけ）
  const seen = new Set<string>();
  return links.filter(link => {
    if (seen.has(link.href)) return false;
    seen.add(link.href);
    return true;
  });
}

/**
 * 通達番号から該当ページURLを特定する
 *
 * 例: "33-6" → プレフィックス "33" → "法第33条" のリンクを探す
 */
export function findPageForNumber(
  tocLinks: TsutatsuTocLink[],
  tsutatsuNumber: string
): string | null {
  // 通達番号のプレフィックスを取得
  // "33-6" → "33", "2-1-1" → "2", "33-6の2" → "33"
  const prefix = tsutatsuNumber.split(/[-−–ー－]/)[0].replace(/の.*$/, '').trim();

  // 完全一致で検索
  for (const link of tocLinks) {
    if (link.articlePrefix === prefix) {
      return link.href;
    }
  }

  // テキスト内で "第{prefix}条" を含むリンクを検索
  const articlePattern = new RegExp(`第${escapeRegex(prefix)}条`);
  for (const link of tocLinks) {
    if (articlePattern.test(link.text)) {
      return link.href;
    }
  }

  // フォールバック: プレフィックスの数値でリンクテキスト内の数字を検索
  const prefixNum = parseInt(prefix, 10);
  if (!isNaN(prefixNum)) {
    for (const link of tocLinks) {
      const nums = link.text.match(/第(\d+)条/);
      if (nums && parseInt(nums[1], 10) === prefixNum) {
        return link.href;
      }
    }
  }

  return null;
}

/**
 * 通達番号のページがTOCから見つからない場合に候補ページを返す
 *
 * NTAサイトのTOCは2種類のリンクがある:
 * 1. 条文ベース: "法第33条《...》関係" → prefix=33
 * 2. テーマベース: "〔収入金額〕" → prefix=undefined
 *
 * テーマベースのリンクにも通達が含まれるため、両方を候補にする。
 * 条文ベースの近い番号を優先し、次にテーマベースのリンクを返す。
 */
export function getCandidatePages(
  tocLinks: TsutatsuTocLink[],
  tsutatsuNumber: string
): string[] {
  const prefix = tsutatsuNumber.split(/[-−–ー－]/)[0].replace(/の.*$/, '').trim();
  const prefixNum = parseInt(prefix, 10);

  const candidates: string[] = [];
  const seen = new Set<string>();

  // 1. 条文番号ベースの近いページ
  if (!isNaN(prefixNum)) {
    for (const link of tocLinks) {
      if (link.articlePrefix) {
        const linkNum = parseInt(link.articlePrefix, 10);
        if (!isNaN(linkNum) && Math.abs(linkNum - prefixNum) <= 5) {
          if (!seen.has(link.href)) {
            candidates.push(link.href);
            seen.add(link.href);
          }
        }
      }
    }
  }

  // 2. テーマベースのリンク（prefixなし）も候補に追加
  for (const link of tocLinks) {
    if (!link.articlePrefix && link.href.includes('/law/tsutatsu/') && !link.href.endsWith('menu.htm')) {
      if (!seen.has(link.href)) {
        candidates.push(link.href);
        seen.add(link.href);
      }
    }
  }

  return candidates;
}

/**
 * 通達ページのHTMLから特定の通達エントリを抽出する
 *
 * NTAサイトでは通達番号が2パターンのHTMLで記述される:
 * 1. <strong>36－1</strong>（1タグ）
 * 2. <strong>36</strong><strong>－15</strong>（分割タグ）
 * 両方に対応するため、strongタグをまたいだマッチングを行う
 */
export function extractTsutatsuEntry(
  html: string,
  number: string,
  pageUrl: string
): TsutatsuEntry | null {
  // ダッシュの表記揺れに対応: -, −(U+2212), –(U+2013), ー(長音), -(U+FF0D), -(U+FF0D全角)
  const normalizedNumber = number
    .replace(/[-−–ー－]/g, '[\\-−–ー－]');

  // パターン1: 1つのstrongタグ内に完結
  const pattern1 = new RegExp(
    `<strong>\\s*${normalizedNumber}(の\\d+)?\\s*</strong>`,
    'i'
  );

  // パターン2: strongタグをまたぐ（<strong>36</strong><strong>－15</strong>）
  // 番号のプレフィックスとサフィックスに分割
  const dashParts = number.split(/[-−–ー－]/);
  let pattern2: RegExp | null = null;
  if (dashParts.length >= 2) {
    const prefix = dashParts[0].trim();
    const suffix = dashParts.slice(1).join('[\\-−–ー－]');
    pattern2 = new RegExp(
      `<strong>\\s*${prefix}\\s*</strong>\\s*<strong>\\s*[\\-−–ー－]\\s*${suffix}(の\\d+)?\\s*</strong>`,
      'i'
    );
  }

  let match = pattern1.exec(html);
  if (!match && pattern2) {
    match = pattern2.exec(html);
  }

  if (!match) return null;

  const startIdx = match.index;

  // このエントリの見出し（直前の<h2>を探す）
  const caption = findPrecedingCaption(html, startIdx);

  // エントリの範囲を特定
  const entryText = extractEntryText(html, startIdx);

  return {
    number,
    caption,
    body: entryText,
    url: pageUrl,
  };
}

/**
 * TOC構造を人間が読みやすいテキストに変換
 */
export function formatTocAsText(
  tocLinks: TsutatsuTocLink[],
  sectionFilter?: string
): string {
  let links = tocLinks;

  if (sectionFilter) {
    const filter = sectionFilter.toLowerCase();
    links = tocLinks.filter(
      link => link.text.toLowerCase().includes(filter) ||
              (link.articlePrefix && link.articlePrefix === sectionFilter.replace(/[^0-9]/g, ''))
    );
  }

  if (links.length === 0) {
    return sectionFilter
      ? `"${sectionFilter}" に一致するセクションが見つかりませんでした。`
      : '目次が取得できませんでした。';
  }

  return links.map(link => `- ${link.text}`).join('\n');
}

// --- 内部ヘルパー ---

/** HTMLタグを除去 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&emsp;/g, '　')
    .replace(/&ensp;/g, ' ')
    .replace(/&thinsp;/g, '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&quot;/g, '"');
}

/** テキストから条文番号プレフィックスを抽出 */
function extractArticlePrefix(text: string): string | undefined {
  // "法第33条《...》関係" → "33"
  const match = text.match(/第(\d+)条/);
  if (match) return match[1];

  // "第3号から" → "3"
  const numMatch = text.match(/第(\d+)号/);
  if (numMatch) return numMatch[1];

  return undefined;
}

/** 正規表現のエスケープ */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 直前の<h2>見出しを探す */
function findPrecedingCaption(html: string, startIdx: number): string {
  // startIdxより前の最後の<h2>...</h2>を探す
  const before = html.substring(0, startIdx);
  const h2Matches = [...before.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)];
  if (h2Matches.length === 0) return '';
  const lastH2 = h2Matches[h2Matches.length - 1];
  return stripHtml(lastH2[1]).trim();
}

/** エントリのテキスト本文を抽出 */
function extractEntryText(html: string, startIdx: number): string {
  // 開始位置から先のHTMLを取得
  const remaining = html.substring(startIdx);

  // 次の通達エントリの開始 or <h2> を見つける
  // 通達エントリは <strong>数字</strong> パターン
  const nextEntryPattern = /(?:<strong>\s*\d+[-−–]\d+|<h2[\s>])/i;
  // 最初のマッチをスキップ（自身）して、2番目以降を探す
  const afterSelf = remaining.substring(remaining.indexOf('</strong>') + '</strong>'.length);
  const nextMatch = nextEntryPattern.exec(afterSelf);

  let endIdx: number;
  if (nextMatch) {
    endIdx = remaining.indexOf('</strong>') + '</strong>'.length + nextMatch.index;
  } else {
    // ページ末尾まで（ただしフッター等は除外）
    const footerIdx = remaining.indexOf('id="footer"');
    endIdx = footerIdx > 0 ? footerIdx : remaining.length;
  }

  const entryHtml = remaining.substring(0, endIdx);

  // HTMLをテキストに変換
  let text = entryHtml;
  // <br> → 改行
  text = text.replace(/<br\s*\/?>/gi, '\n');
  // <p> → 改行
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<p[^>]*>/gi, '');
  // HTMLタグ除去
  text = stripHtml(text);
  // 連続空行を整理
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}
