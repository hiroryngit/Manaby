// デザイントークン ——《朱と罫》
//
// 題材から引く。このプロダクトの中心にある成果物の名前は「AI分析ノート」であり、
// 講師がやっているのは授業の添削記録である。だから UI の比喩はノートにする。
//
// 層は3つしかない:
//   紙 … 罫線で区切られた面。影で浮かせない。
//   鉛筆（藍）… 記録された数値。理解度・集中度・評価。
//   朱 … 講師と AI の書き込み。「誰かがこの子について書いた」ことの印。
//
// 朱は署名要素なので、装飾として使わない。使う場所は Annotation / 要注意の単元 /
// 未入力・未着手の督促 / 講師側のタブだけに限る（講師＝書き込む側）。
//
// ダークテーマは持たない。画面が静的 StyleSheet 前提で組まれているため、
// 動的テーマ化は別の作業として切り出す。

import { Platform, StyleSheet } from 'react-native';

export const colors = {
  // 紙 —— 面。暖色クリーム（#F4F1EA 系）でも冷たい灰でもなく、わずかに緑を含む紙白
  paper: '#F4F6F2',
  sheet: '#FFFFFF',

  // 罫 —— 面を分けるのは影ではなく線
  rule: '#DCE1D9',
  ruleDeep: '#C2C9BE',

  // 墨 —— 文字と主要操作。ブランド色は青ではなく墨にする
  sumi: '#171F1B',
  sumiMid: '#4F5A53',
  sumiFaint: '#67706A', // 紙の上で 4.7:1。旧 faint(#9AA3B0) は 2.6:1 で落ちていた
  onSumi: '#F4F6F2',

  // 藍 —— 記録された数値の層。AI（人工知能）と紛れないよう ao と呼ぶ
  ao: '#2B4C63',
  aoMid: '#547E93',
  aoWash: '#E9EFF2',

  // 朱 —— 書き込みの層。ここ以外に彩度の高い色は置かない
  shu: '#C8402A',
  shuWash: '#FBEDE9',
} as const;

/** 罫線ピッチ。8pt を基準にし、役割が変わるところで段を上げる */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  huge: 48,
} as const;

/** 罫の太さ。分割線はヘアライン、輪郭のある要素は 1pt */
export const HAIRLINE = StyleSheet.hairlineWidth;

/**
 * 角丸。ノートと記入用紙は角が立っている。
 * 旧トークン（8/12/16/20）から大幅に落とし、面が「浮いた板」ではなく「紙」に見えるようにする。
 */
export const radius = { xs: 2, sm: 3, md: 5, lg: 7 } as const;

/**
 * 書体。3つの役割に割る。
 * 明朝 … 見出し。教科書と通知表の書体で、この領域では借り物ではない。
 *        ただし小さいと潰れるので 18pt 以上に限り、太らせない（和文明朝の bold は濁る）。
 * ゴシック … 本文。長時間読む側の負担を優先する。
 * 等幅 … 日付・件数・点数。桁が揃うことに意味がある値だけ。
 */
const family = {
  mincho: Platform.select({
    ios: 'Hiragino Mincho ProN',
    android: 'serif',
    default: "'Hiragino Mincho ProN','Yu Mincho',YuMincho,'Noto Serif JP',serif",
  }),
  gothic: Platform.select({
    ios: 'Hiragino Sans',
    android: 'sans-serif',
    default: "'Hiragino Sans','Yu Gothic',YuGothic,'Noto Sans JP',system-ui,sans-serif",
  }),
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: "ui-monospace,SFMono-Regular,Menlo,'Roboto Mono',monospace",
  }),
} as const;

/** 日本語は字面が大きく、欧文より広い行間を必要とする。本文は 1.8 倍を確保する */
export const font = {
  display: {
    fontFamily: family.mincho,
    fontSize: 27,
    fontWeight: '400',
    lineHeight: 40,
    letterSpacing: 0.5,
  },
  h1: {
    fontFamily: family.mincho,
    fontSize: 21,
    fontWeight: '400',
    lineHeight: 32,
    letterSpacing: 0.4,
  },
  h2: { fontFamily: family.gothic, fontSize: 17, fontWeight: '700', lineHeight: 26 },
  h3: { fontFamily: family.gothic, fontSize: 15, fontWeight: '700', lineHeight: 23 },
  body: { fontFamily: family.gothic, fontSize: 15, fontWeight: '400', lineHeight: 27 },
  small: { fontFamily: family.gothic, fontSize: 13, fontWeight: '400', lineHeight: 22 },
  /** 見出し罫と検印のラベル。和文は字間を空けるとラベルとして読める */
  label: {
    fontFamily: family.gothic,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    letterSpacing: 1.1,
  },
  /** タブ。ラベルは4文字前後なので字間は詰める */
  tab: { fontFamily: family.gothic, fontSize: 10.5, fontWeight: '600', lineHeight: 14 },
  num: { fontFamily: family.mono, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  numLg: { fontFamily: family.mono, fontSize: 22, fontWeight: '600', lineHeight: 26 },
} as const;

/**
 * 影は原則使わない。面は罫で分ける。
 * 唯一浮かせるのは「今日やること」— 起動直後にそこだけ見えればいい、という受け入れ基準そのもの。
 */
export const shadow = {
  lift: Platform.select({
    ios: {
      shadowColor: '#0E1512',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: { elevation: 3 },
    default: { boxShadow: '0 2px 8px rgba(14,21,18,0.08)' },
  }),
  bar: Platform.select({
    ios: {
      shadowColor: '#0E1512',
      shadowOffset: { width: 0, height: -1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
    },
    android: { elevation: 6 },
    default: { boxShadow: '0 -1px 4px rgba(14,21,18,0.04)' },
  }),
} as const;

/**
 * 鉛筆の濃さ。理解度は「線の濃さ」で示し、色だけに判別を負わせない。
 * 1（薄い）→ 5（濃い）。バーとレーダーチャートで使う。
 */
const pencil = ['#C2C9BE', '#9CB1BC', '#7B9AAB', '#4E7791', '#2B4C63'] as const;

export function pencilInk(level: number) {
  return pencil[Math.min(pencil.length - 1, Math.max(0, Math.round(level) - 1))];
}

/**
 * 理解度・集中度の文字色。
 * 2以下は講師が手を入れるべき値なので朱で立てる。3は判断保留なので墨のまま。
 */
export function levelColor(level: number) {
  if (level <= 2) return colors.shu;
  if (level === 3) return colors.sumiMid;
  return colors.ao;
}

/** 朱を立てるべき水準か。バッジ・傍線・チャートで共通の判定にする */
export function needsAttention(level: number) {
  return level <= 2;
}
