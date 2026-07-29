// 共通部品 ——《朱と罫》
//
// 面は影ではなく罫で分ける。彩度の高い色は朱だけで、朱は書き込みの印にしか使わない。
// 各画面で色を直に書かず、必ずここか theme のトークンを経由させる。

import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { HAIRLINE, colors, font, pencilInk, radius, shadow, space } from '../theme';
import { StarIcon } from './icons';

/* ------------------------------------------------------------------ 面 */

/**
 * 紙。輪郭はヘアラインの罫で、影は持たない。
 * lift は画面内で最も強い1枚だけに使う（保護者ダッシュボードの「今日やること」）。
 * mark を立てると左に朱の傍線が入る。Annotation と同じ意味を持つので、
 * 講師・AI が書いたものにだけ使う。
 */
export function Card({
  children,
  style,
  onPress,
  lift = false,
  mark = false,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  lift?: boolean;
  mark?: boolean;
}) {
  const inner = (
    // overflow は朱の傍線を角丸で切るためだけに立てる。
    // iOS では同じ View に overflow:hidden があると影が切れるので lift には付けない。
    <View
      style={[s.card, lift ? [s.cardLift, shadow.lift] : s.cardRuled, mark && s.clip, style]}
    >
      {mark && <View style={s.cardMark} />}
      {children}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => pressed && { opacity: 0.7 }}
      accessibilityRole="button"
    >
      {inner}
    </Pressable>
  );
}

/** 罫。区切りが必要なだけの場所に置く */
export function Rule({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[s.rule, style]} />;
}

/* ------------------------------------------------ 署名要素：朱書き（傍線） */

/**
 * 朱書き。講師と AI が書いたものの左に立つ朱の傍線。
 *
 * これはアプリの装飾ではなく「誰かがこの子について書いた」ことの印なので、
 * システムの都合（強調したい、目立たせたい）で使ってはいけない。
 * 使う先: AI分析ノート本文 / 生徒へのメッセージ / 指導方針 / 苦手単元。
 */
export function Annotation({
  label,
  children,
  style,
}: {
  label?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[s.annotation, style]}>
      <View style={s.annotationRule} />
      <View style={{ flex: 1 }}>
        {label && <Text style={s.annotationLabel}>{label}</Text>}
        {children}
      </View>
    </View>
  );
}

/**
 * AI が返す本文の組み。**見出し** の行だけ朱のラベルに起こし、
 * 残りは本文として流す。読み物なので行間は本文トークンのまま広く取る。
 */
export function NoteBody({ text }: { text: string }) {
  const lines = text.split('\n').filter((l) => l.trim());
  return (
    <View>
      {lines.map((line, i) => {
        const heading = line.match(/^\*\*(.+?)\*\*$/);
        if (heading) {
          return (
            <Text key={i} style={[s.noteHeading, i > 0 && { marginTop: space.lg }]}>
              {heading[1]}
            </Text>
          );
        }
        return (
          <Text key={i} style={s.noteText}>
            {line.replace(/\*\*/g, '')}
          </Text>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------ 見出しと帯 */

/** 見出し罫。ラベルの右に罫が走り、ノートの章区切りとして機能する */
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionLabel}>{children}</Text>
      <View style={s.sectionRule} />
      {action}
    </View>
  );
}

/** 画面上部の名乗り。ここだけ明朝を大きく使う */
export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={s.screenHeader}>
      <Text style={s.screenTitle}>{title}</Text>
      {subtitle && <Text style={s.screenSubtitle}>{subtitle}</Text>}
    </View>
  );
}

/* -------------------------------------------------------------- 印と札 */

export type Tone = 'neutral' | 'ao' | 'shu' | 'done';

/** 検印。丸い錠剤ではなく、角の立った札にする */
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return (
    <View style={[s.badge, badgeSurface[tone]]}>
      <Text style={[s.badgeText, { color: badgeInk[tone] }]}>{label}</Text>
    </View>
  );
}

const badgeSurface: Record<Tone, ViewStyle> = {
  neutral: { backgroundColor: colors.sheet, borderColor: colors.ruleDeep },
  ao: { backgroundColor: colors.aoWash, borderColor: colors.aoWash },
  shu: { backgroundColor: colors.shuWash, borderColor: colors.shu },
  done: { backgroundColor: colors.paper, borderColor: colors.rule },
};

const badgeInk: Record<Tone, string> = {
  neutral: colors.sumiMid,
  ao: colors.ao,
  shu: colors.shu,
  done: colors.sumiFaint,
};

/** 選択札。教科・難易度・苦手単元の選択に使う */
export function Chip({
  label,
  active,
  onPress,
  tone = 'ao',
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  tone?: 'ao' | 'shu';
}) {
  const on = tone === 'shu' ? s.chipOnShu : s.chipOnAo;
  const onText = tone === 'shu' ? { color: colors.shu } : { color: colors.ao };
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[s.chip, active ? on : s.chipOff]}
    >
      <Text style={[s.chipText, active ? onText : { color: colors.sumiMid }]}>{label}</Text>
    </Pressable>
  );
}

/** 星。評価は記録された値なので鉛筆の層（藍）で描く。朱は使わない */
export function Stars({
  value,
  max = 5,
  size = 18,
  onChange,
}: {
  value: number;
  max?: number;
  size?: number;
  onChange?: (v: number) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: size > 24 ? space.sm : 2 }}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
        const star = (
          <StarIcon size={size} filled={n <= value} color={n <= value ? colors.ao : colors.ruleDeep} />
        );
        return onChange ? (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`${n}点`}
          >
            {star}
          </Pressable>
        ) : (
          <View key={n}>{star}</View>
        );
      })}
    </View>
  );
}

/** 名簿の顔写真枠。丸ではなく角の立った枠にして、名簿の見え方に寄せる */
export function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  return (
    <View style={[s.avatar, { width: size, height: size }]}>
      <Text style={[s.avatarText, { fontSize: size * 0.42, lineHeight: size * 0.52 }]}>
        {name.slice(0, 1)}
      </Text>
    </View>
  );
}

/**
 * 理解度の目盛り。濃さで水準を示すので、色が見えない環境でも数値と長さで読める。
 * 2以下は朱の印を添えて、講師が手を入れるべき単元だと分かるようにする。
 */
export function LevelBar({ level, max = 5 }: { level: number; max?: number }) {
  return (
    <View style={s.barTrack}>
      <View
        style={[s.barFill, { width: `${(level / max) * 100}%`, backgroundColor: pencilInk(level) }]}
      />
    </View>
  );
}

/* ------------------------------------------------------------ 操作と入力 */

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  /** mark は「書き込む」操作にだけ使う（講師の記録入力・確定） */
  variant?: 'primary' | 'secondary' | 'ghost' | 'mark';
  size?: 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
}) {
  const off = disabled || loading;
  const fg =
    variant === 'primary' || variant === 'mark'
      ? colors.onSumi
      : variant === 'secondary'
        ? colors.sumi
        : colors.sumiMid;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off }}
      style={({ pressed }) => [
        s.btn,
        size === 'lg' && s.btnLg,
        variant === 'primary' && { backgroundColor: colors.sumi },
        variant === 'mark' && { backgroundColor: colors.shu },
        variant === 'secondary' && s.btnSecondary,
        variant === 'ghost' && s.btnGhost,
        off && { opacity: 0.4 },
        pressed && !off && { opacity: 0.8 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <Text style={[s.btnText, { color: fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

/**
 * 記入欄。1行の入力は箱ではなく下の罫だけにする（記入用紙の書き方に合わせる）。
 * 複数行は書く面積が要るので罫で囲う。
 */
export function Input({
  value,
  onChangeText,
  placeholder,
  multiline = false,
  minHeight,
  style,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  minHeight?: number;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.sumiFaint}
      multiline={multiline}
      style={[
        s.input,
        multiline ? s.inputBox : s.inputLine,
        minHeight != null && { minHeight },
        style,
      ]}
    />
  );
}

/** 紙のインデックスに寄せた切り替え。丸いスイッチにはしない */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={s.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[s.segment, active && s.segmentActive]}
          >
            <Text style={[s.segmentText, active && s.segmentTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------ 状態の表示 */

export function Loading({ label = '読み込み中…' }: { label?: string }) {
  return (
    <View style={s.center}>
      <ActivityIndicator color={colors.sumiMid} />
      <Text style={s.centerText}>{label}</Text>
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={s.center}>
      <Text style={s.errorText}>{message}</Text>
      {onRetry && (
        <View style={{ marginTop: space.lg, minWidth: 180 }}>
          <Button title="再読み込み" onPress={onRetry} variant="secondary" />
        </View>
      )}
    </View>
  );
}

/**
 * 空の状態。次にできることが1つでもあるなら action を渡す。
 * 逆に、利用者にできることが本当に無い場合（講師が1人も登録されていない等）は
 * 渡さない — 押しても何も進まないボタンを置く方が不親切になる。
 */
export function Empty({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <View style={s.center}>
      <Text style={s.centerText}>{message}</Text>
      {action && <View style={{ marginTop: space.md, minWidth: 180 }}>{action}</View>}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}

/* -------------------------------------------------------------------- */

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.sheet,
    borderRadius: radius.md,
    padding: space.lg,
  },
  clip: { overflow: 'hidden' },
  cardRuled: { borderWidth: HAIRLINE, borderColor: colors.rule },
  cardLift: { borderRadius: radius.lg, padding: space.xl },
  cardMark: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.shu },

  rule: { height: HAIRLINE, backgroundColor: colors.rule },

  annotation: { flexDirection: 'row', gap: space.md },
  annotationRule: { width: 3, borderRadius: radius.xs, backgroundColor: colors.shu },
  annotationLabel: { ...font.label, color: colors.shu, marginBottom: space.sm },

  noteHeading: { ...font.h3, color: colors.shu, marginBottom: space.xs },
  noteText: { ...font.body, color: colors.sumi },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.xl,
    marginBottom: space.md,
  },
  sectionLabel: { ...font.label, color: colors.sumiMid },
  sectionRule: { flex: 1, height: HAIRLINE, backgroundColor: colors.ruleDeep },

  screenHeader: { paddingTop: space.sm, paddingBottom: space.md },
  screenTitle: { ...font.h1, color: colors.sumi },
  screenSubtitle: { ...font.small, color: colors.sumiMid, marginTop: space.xs },

  badge: {
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.xs,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: font.label,

  chip: {
    minHeight: 40, // 選択操作なのでタップ領域を確保する
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  chipOff: { backgroundColor: colors.sheet, borderColor: colors.rule },
  chipOnAo: { backgroundColor: colors.aoWash, borderColor: colors.ao },
  chipOnShu: { backgroundColor: colors.shuWash, borderColor: colors.shu },
  chipText: font.small,

  avatar: {
    borderRadius: radius.sm,
    backgroundColor: colors.aoWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: font.h1.fontFamily, color: colors.ao },

  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.rule,
    borderRadius: radius.xs,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: radius.xs },

  btn: {
    minHeight: 48, // タップ領域 44pt 以上（非機能要件）
    paddingHorizontal: space.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLg: { minHeight: 56 },
  btnSecondary: { backgroundColor: colors.sheet, borderWidth: 1, borderColor: colors.sumi },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.rule },
  btnText: font.h3,

  input: {
    ...font.body,
    color: colors.sumi,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  inputLine: {
    minHeight: 48,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.ruleDeep,
  },
  inputBox: {
    minHeight: 96,
    padding: space.md,
    backgroundColor: colors.sheet,
    borderWidth: HAIRLINE,
    borderColor: colors.ruleDeep,
    borderRadius: radius.md,
    textAlignVertical: 'top',
  },

  segmented: { flexDirection: 'row', borderBottomWidth: HAIRLINE, borderBottomColor: colors.ruleDeep },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  segmentActive: { borderBottomColor: colors.sumi },
  segmentText: { ...font.h3, color: colors.sumiFaint },
  segmentTextActive: { color: colors.sumi },

  center: {
    paddingVertical: space.huge,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  centerText: { ...font.body, color: colors.sumiFaint, textAlign: 'center' },
  errorText: { ...font.body, color: colors.shu, textAlign: 'center' },
});
