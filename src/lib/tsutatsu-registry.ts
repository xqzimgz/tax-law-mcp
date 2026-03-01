/**
 * 通達名 → TOCページURL のマッピング
 * NTAサイトの構造を手動マッピング
 */

import type { TsutatsuRegistryEntry } from './types.js';

export const TSUTATSU_REGISTRY: Record<string, TsutatsuRegistryEntry> = {
  '所得税基本通達': {
    tocPath: '/law/tsutatsu/kihon/shotoku/01.htm',
    encoding: 'shift_jis',
    baseUrl: 'https://www.nta.go.jp',
  },
  '法人税基本通達': {
    tocPath: '/law/tsutatsu/kihon/hojin/01.htm',
    encoding: 'shift_jis',
    baseUrl: 'https://www.nta.go.jp',
  },
  '消費税法基本通達': {
    tocPath: '/law/tsutatsu/kihon/shohi/01.htm',
    encoding: 'shift_jis',
    baseUrl: 'https://www.nta.go.jp',
  },
  '相続税法基本通達': {
    tocPath: '/law/tsutatsu/kihon/sisan/sozoku2/01.htm',
    encoding: 'shift_jis',
    baseUrl: 'https://www.nta.go.jp',
  },
  '財産評価基本通達': {
    tocPath: '/law/tsutatsu/kihon/sisan/hyoka_new/01.htm',
    encoding: 'shift_jis',
    baseUrl: 'https://www.nta.go.jp',
  },
  '連結納税基本通達': {
    tocPath: '/law/tsutatsu/kihon/renketsu/01.htm',
    encoding: 'shift_jis',
    baseUrl: 'https://www.nta.go.jp',
  },
};

/** 通達略称 → 正式名称 */
export const TSUTATSU_ALIAS: Record<string, string> = {
  '所基通': '所得税基本通達',
  '法基通': '法人税基本通達',
  '消基通': '消費税法基本通達',
  '相基通': '相続税法基本通達',
  '評基通': '財産評価基本通達',
  '所得税通達': '所得税基本通達',
  '法人税通達': '法人税基本通達',
  '消費税通達': '消費税法基本通達',
  '相続税通達': '相続税法基本通達',
  '財産評価通達': '財産評価基本通達',
};

/**
 * 通達名を正規化し、レジストリエントリを返す
 */
export function resolveTsutatsuName(input: string): {
  name: string;
  entry: TsutatsuRegistryEntry | null;
} {
  const alias = TSUTATSU_ALIAS[input];
  const name = alias ?? input;
  const entry = TSUTATSU_REGISTRY[name] ?? null;
  return { name, entry };
}

/**
 * 対応通達名の一覧
 */
export function listSupportedTsutatsu(): string[] {
  return Object.keys(TSUTATSU_REGISTRY);
}
