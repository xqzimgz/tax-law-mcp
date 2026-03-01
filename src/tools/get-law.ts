import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchLawData, getEgovUrl } from '../lib/egov-client.js';
import { extractArticle, extractToc } from '../lib/egov-parser.js';

export function registerGetLawTool(server: McpServer) {
  server.tool(
    'get_law',
    '日本の法令から特定の条文を取得する。e-Gov法令API v2を使用。略称にも対応（所法→所得税法、措法→租税特別措置法 等）。',
    {
      law_name: z.string().describe(
        '法令名または略称。例: "所得税法", "法人税法", "租税特別措置法", "所法", "措法", "所得税法施行令", "所令"'
      ),
      article: z.string().describe(
        '条文番号。例: "33", "33の2", "57の3", "第33条"'
      ),
      paragraph: z.number().optional().describe(
        '項番号（省略時は条文全体）。例: 1, 2'
      ),
      item: z.number().optional().describe(
        '号番号（省略時は項全体）。例: 1, 2'
      ),
      format: z.enum(['markdown', 'toc']).optional().describe(
        '出力形式。"markdown"=条文全文（デフォルト）, "toc"=目次のみ（トークン節約）'
      ),
    },
    async (args) => {
      try {
        const { data, lawId, lawTitle } = await fetchLawData(args.law_name);
        const egovUrl = getEgovUrl(lawId);

        if (args.format === 'toc') {
          const toc = extractToc(data);
          return {
            content: [{
              type: 'text' as const,
              text: `# ${lawTitle} — 目次\n\n${toc}\n\n---\n出典：e-Gov法令検索（デジタル庁）\nURL: ${egovUrl}`,
            }],
          };
        }

        const result = extractArticle(data, args.article, args.paragraph, args.item);

        if (!result) {
          const articleDesc = `第${args.article}条`;
          const paraDesc = args.paragraph ? `第${args.paragraph}項` : '';
          const itemDesc = args.item ? `第${args.item}号` : '';
          return {
            content: [{
              type: 'text' as const,
              text: `${lawTitle} ${articleDesc}${paraDesc}${itemDesc} が見つかりませんでした。\n\n条文番号を確認してください。"33の2" の場合は article: "33の2" と指定します。\n\nURL: ${egovUrl}`,
            }],
            isError: true,
          };
        }

        const articleDisplay = args.article.replace(/_/g, 'の');
        const paraDisplay = args.paragraph ? `第${args.paragraph}項` : '';
        const itemDisplay = args.item ? `第${args.item}号` : '';

        return {
          content: [{
            type: 'text' as const,
            text: `# ${lawTitle} 第${articleDisplay}条${paraDisplay}${itemDisplay}\n${result.articleCaption ? `（${result.articleCaption}）\n` : ''}\n${result.text}\n\n---\n出典：e-Gov法令検索（デジタル庁）\nURL: ${egovUrl}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `エラー: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );
}
