import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerGetLawTool } from './tools/get-law.js';
import { registerSearchLawTool } from './tools/search-law.js';
import { registerGetTsutatsuTool } from './tools/get-tsutatsu.js';
import { registerListTsutatsuTool } from './tools/list-tsutatsu.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'tax-law-mcp',
    version: '0.1.0',
  });

  // 法令ツール（e-Gov API v2）
  registerGetLawTool(server);       // get_law: 条文取得
  registerSearchLawTool(server);    // search_law: 法令キーワード検索

  // 通達ツール（NTAスクレイピング）
  registerGetTsutatsuTool(server);  // get_tsutatsu: 通達取得
  registerListTsutatsuTool(server); // list_tsutatsu: 通達目次表示

  return server;
}
