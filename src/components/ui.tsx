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
import { colors, font, radius, space } from '../theme';

export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const inner = <View style={[s.card, style]}>{children}</View>;
  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>
      {inner}
    </Pressable>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={s.sectionTitle}>{children}</Text>;
}

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'brand' | 'warn' | 'success' | 'danger';
}) {
  const bg = {
    neutral: colors.border,
    brand: colors.brandSoft,
    warn: '#FEF3C7',
    success: '#D1FAE5',
    danger: '#FEE2E2',
  }[tone];
  const fg = {
    neutral: colors.muted,
    brand: colors.brandInk,
    warn: '#92400E',
    success: '#065F46',
    danger: '#991B1B',
  }[tone];
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[s.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

/** 星評価。onChange を渡すと入力用になる（授業記録入力で使用） */
export function Stars({
  value,
  max = 5,
  size = 20,
  onChange,
}: {
  value: number;
  max?: number;
  size?: number;
  onChange?: (v: number) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
        const star = (
          <Text style={{ fontSize: size, color: n <= value ? colors.star : colors.border }}>★</Text>
        );
        return onChange ? (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            hitSlop={6}
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
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
}) {
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.btn,
        variant === 'primary' && { backgroundColor: colors.brand },
        variant === 'secondary' && { backgroundColor: colors.brandSoft },
        variant === 'ghost' && { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
        off && { opacity: 0.5 },
        pressed && !off && { opacity: 0.85 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.brand} />
      ) : (
        <Text
          style={[
            s.btnText,
            { color: variant === 'primary' ? '#fff' : colors.brandInk },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Loading({ label = '読み込み中…' }: { label?: string }) {
  return (
    <View style={s.center}>
      <ActivityIndicator color={colors.brand} />
      <Text style={s.muted}>{label}</Text>
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={s.center}>
      <Text style={{ ...font.body, color: colors.danger, textAlign: 'center' }}>{message}</Text>
      {onRetry && (
        <View style={{ marginTop: space.md }}>
          <Button title="再読み込み" onPress={onRetry} variant="secondary" />
        </View>
      )}
    </View>
  );
}

export function Empty({ message }: { message: string }) {
  return (
    <View style={s.center}>
      <Text style={s.muted}>{message}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    ...font.h3,
    color: colors.muted,
    marginBottom: space.sm,
    marginTop: space.lg,
  },
  badge: {
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  badgeText: font.tiny,
  btn: {
    minHeight: 44, // タップ領域 44pt 以上（非機能要件）
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: font.h3,
  center: { padding: space.xxl, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  muted: { ...font.body, color: colors.muted, textAlign: 'center' },
});
