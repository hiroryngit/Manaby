// アプリ全体の配色・余白。app.json の adaptiveIcon backgroundColor (#E6F4FE) を基点にする。

export const colors = {
  brand: '#2563EB',
  brandSoft: '#E6F4FE',
  brandInk: '#1E3A8A',

  bg: '#F7F9FC',
  surface: '#FFFFFF',
  border: '#E2E8F0',

  text: '#0F172A',
  muted: '#64748B',
  faint: '#94A3B8',

  // ロール別のアクセント。仕様書のフローチャートの色分けに合わせる
  parent: '#10B981',
  tutor: '#3B82F6',
  system: '#8B5CF6',

  star: '#F59E0B',
  danger: '#DC2626',
  success: '#059669',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 6, md: 10, lg: 14, pill: 999 } as const;

export const font = {
  h1: { fontSize: 24, fontWeight: '700' },
  h2: { fontSize: 19, fontWeight: '700' },
  h3: { fontSize: 16, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  small: { fontSize: 13, fontWeight: '400' },
  tiny: { fontSize: 11, fontWeight: '500' },
} as const;

/** 理解度・集中度に応じた色。低いほど注意を引く */
export function levelColor(level: number) {
  if (level >= 4) return colors.success;
  if (level === 3) return colors.star;
  return colors.danger;
}
