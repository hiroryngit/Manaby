// デザイントークン。
//
// 方針: 保護者が毎日開く教育サービスとして「落ち着き」と「温かさ」を両立させる。
// 汎用的な SaaS 青は避け、抑えた藍色を主色に、star/強調は温かい琥珀色を使う。
// 背景も冷たいグレーではなく、わずかに暖色寄りのオフホワイトにする。

import { Platform } from 'react-native';

export const colors = {
  // 主色: 彩度を落とした藍。強すぎず、長時間見ても疲れない
  brand: '#3B4EA0',
  brandDeep: '#2A3A7C',
  brandSoft: '#EEF1FB',
  brandInk: '#22306B',

  // 強調: 温かい琥珀。星評価と「今日やること」に使う
  accent: '#E8A33D',
  accentSoft: '#FDF3E2',

  // 面
  bg: '#FAF8F5',       // 暖色寄りのオフホワイト
  surface: '#FFFFFF',
  border: '#E9E3DA',   // 背景に合わせた暖色寄りの罫線
  borderStrong: '#D9D1C5',

  // 文字
  ink: '#1A2434',
  muted: '#5B6779',
  faint: '#9AA3B0',

  // 状態
  success: '#2E7D5B',
  successSoft: '#E6F4EC',
  warn: '#B4741A',
  warnSoft: '#FDF3E2',
  danger: '#C2453D',
  dangerSoft: '#FCEDEC',

  // ロール別アクセント（講師画面の識別に使う）
  tutor: '#2F6F8F',
  tutorSoft: '#E8F2F7',
} as const;

/** 4の倍数で刻む。役割が変わるところで段を上げる */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  huge: 48,
} as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;

/**
 * タイポスケール。
 * 見出しと本文の差を大きく取り、階層が一目で分かるようにする。
 * 日本語は字面が大きいので行間を広めに確保する。
 */
export const font = {
  display: { fontSize: 28, fontWeight: '700', lineHeight: 36 },
  h1: { fontSize: 22, fontWeight: '700', lineHeight: 30 },
  h2: { fontSize: 18, fontWeight: '700', lineHeight: 26 },
  h3: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 24 },
  small: { fontSize: 13, fontWeight: '400', lineHeight: 20 },
  caption: { fontSize: 11, fontWeight: '600', lineHeight: 16, letterSpacing: 0.4 },
} as const;

/**
 * 影。境界線だけだと全体が平坦に見えるため、面の浮き方で階層を作る。
 * iOS と Android で指定が異なるので Platform.select でまとめる。
 */
export const shadow = {
  card: Platform.select({
    ios: {
      shadowColor: '#2A2118',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    },
    android: { elevation: 1 },
    default: { boxShadow: '0 1px 3px rgba(42,33,24,0.06)' },
  }),
  raised: Platform.select({
    ios: {
      shadowColor: '#2A2118',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
    },
    android: { elevation: 4 },
    default: { boxShadow: '0 4px 10px rgba(42,33,24,0.10)' },
  }),
  bar: Platform.select({
    ios: {
      shadowColor: '#2A2118',
      shadowOffset: { width: 0, height: -1 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
    },
    android: { elevation: 8 },
    default: { boxShadow: '0 -1px 6px rgba(42,33,24,0.05)' },
  }),
} as const;

/** 理解度・集中度に応じた色。低いほど注意を引く */
export function levelColor(level: number) {
  if (level >= 4) return colors.success;
  if (level === 3) return colors.warn;
  return colors.danger;
}
