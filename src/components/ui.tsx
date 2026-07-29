import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, font, radius, shadow, space } from '../theme';
import { StarIcon } from './icons';

/**
 * カード。境界線ではなく影で面を持ち上げ、背景から分離させる。
 * emphasis で強調度を変え、画面内の主従を表現する。
 */
export function Card({
  children,
  style,
  onPress,
  emphasis = 'normal',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  emphasis?: 'normal' | 'raised' | 'flat';
}) {
  const inner = (
    <View
      style={[
        s.card,
        emphasis === 'raised' && [s.cardRaised, shadow.raised],
        emphasis === 'normal' && shadow.card,
        emphasis === 'flat' && s.cardFlat,
        style,
      ]}
    >
      {children}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => pressed && { opacity: 0.85, transform: [{ scale: 0.995 }] }}
    >
      {inner}
    </Pressable>
  );
}

/** セクション見出し。本文より小さく、字間を空けてラベルとして機能させる */
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionTitle}>{children}</Text>
      {action}
    </View>
  );
}

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'brand' | 'warn' | 'success' | 'danger' | 'accent';
}) {
  const palette = {
    neutral: [colors.bg, colors.muted],
    brand: [colors.brandSoft, colors.brandInk],
    warn: [colors.warnSoft, colors.warn],
    success: [colors.successSoft, colors.success],
    danger: [colors.dangerSoft, colors.danger],
    accent: [colors.accentSoft, colors.warn],
  }[tone];
  return (
    <View style={[s.badge, { backgroundColor: palette[0] }]}>
      <Text style={[s.badgeText, { color: palette[1] }]}>{label}</Text>
    </View>
  );
}

/** 星評価。onChange を渡すと入力用になる（授業記録入力で使用） */
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
    <View style={{ flexDirection: 'row', gap: size > 24 ? space.xs : 1 }}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
        const star = (
          <StarIcon
            size={size}
            filled={n <= value}
            color={n <= value ? colors.accent : colors.borderStrong}
          />
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
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
}) {
  const off = disabled || loading;
  const fg =
    variant === 'primary' ? '#fff' : variant === 'secondary' ? colors.brandInk : colors.muted;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.btn,
        size === 'lg' && s.btnLg,
        variant === 'primary' && [{ backgroundColor: colors.brand }, shadow.card],
        variant === 'secondary' && { backgroundColor: colors.brandSoft },
        variant === 'ghost' && s.btnGhost,
        off && { opacity: 0.45 },
        pressed && !off && { opacity: 0.88 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <Text style={[s.btnText, size === 'lg' && font.h3, { color: fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Loading({ label = '読み込み中…' }: { label?: string }) {
  return (
    <View style={s.center}>
      <ActivityIndicator color={colors.brand} />
      <Text style={s.centerText}>{label}</Text>
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={s.center}>
      <Text style={[s.centerText, { color: colors.danger }]}>{message}</Text>
      {onRetry && (
        <View style={{ marginTop: space.md, minWidth: 160 }}>
          <Button title="再読み込み" onPress={onRetry} variant="secondary" />
        </View>
      )}
    </View>
  );
}

export function Empty({ message }: { message: string }) {
  return (
    <View style={s.center}>
      <Text style={s.centerText}>{message}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}

/** 画面上部の見出し帯。挨拶や対象者を置く */
export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={s.screenHeader}>
      <Text style={s.screenTitle}>{title}</Text>
      {subtitle && <Text style={s.screenSubtitle}>{subtitle}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  cardRaised: { borderRadius: radius.xl, padding: space.xl },
  cardFlat: { borderWidth: 1, borderColor: colors.border },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xl,
    marginBottom: space.md,
    paddingHorizontal: space.xs,
  },
  sectionTitle: { ...font.caption, color: colors.faint, textTransform: 'uppercase' },

  badge: {
    paddingHorizontal: space.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  badgeText: font.caption,

  btn: {
    minHeight: 48, // タップ領域 44pt 以上（非機能要件）
    paddingHorizontal: space.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLg: { minHeight: 56, borderRadius: radius.lg },
  btnGhost: { borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' },
  btnText: { ...font.h3 },

  center: {
    paddingVertical: space.huge,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  centerText: { ...font.body, color: colors.muted, textAlign: 'center' },

  screenHeader: { paddingTop: space.sm, paddingBottom: space.xs, paddingHorizontal: space.xs },
  screenTitle: { ...font.h1, color: colors.ink },
  screenSubtitle: { ...font.small, color: colors.muted, marginTop: 2 },
});
