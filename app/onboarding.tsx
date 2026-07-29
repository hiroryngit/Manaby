// 初回登録：役割の選択（F-01）
//
// 役割はここでしか決められず、以後変更できない。
// そのため選択前に「変更できない」ことを明示し、確認を挟む。

import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Role } from '../src/api';
import { useSession } from '../src/session';
import { Button, Card, Row } from '../src/components/ui';
import { colors, font, radius, space } from '../src/theme';

type SelectableRole = Exclude<Role, 'admin'>;

const ROLES: { value: SelectableRole; label: string; description: string; glyph: string }[] = [
  {
    value: 'parent',
    label: '保護者',
    description: 'お子さまの学習状況・レポート・宿題の進捗を確認します',
    glyph: '👨‍👩‍👧',
  },
  {
    value: 'student',
    label: '生徒',
    description: '宿題の確認・提出と、先生からのコメントを見ます',
    glyph: '🎒',
  },
  {
    value: 'tutor',
    label: '講師',
    description: '授業記録の入力と、宿題の設定を行います',
    glyph: '👨‍🏫',
  },
];

export default function Onboarding() {
  const router = useRouter();
  const { register } = useSession();
  const params = useLocalSearchParams<{ uid: string; email: string; name: string }>();

  const [role, setRole] = useState<SelectableRole | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!role || !params.uid) return;
    setSaving(true);
    setError(null);
    try {
      const user = await register({
        authUid: params.uid,
        email: params.email ?? '',
        displayName: params.name ?? '名称未設定',
        role,
      });
      router.replace(user.role === 'tutor' ? '/(tutor)' : '/(parent)');
    } catch (e) {
      setError(e instanceof Error ? e.message : '登録に失敗しました');
      setSaving(false);
      setConfirming(false);
    }
  };

  const selected = ROLES.find((r) => r.value === role);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={s.wrap}>
        <Text style={s.title}>ご利用の立場を選んでください</Text>
        <Text style={s.lead}>
          {params.name ? `${params.name} さん、ようこそ。` : 'ようこそ。'}
          この選択は登録後に変更できません。
        </Text>

        {ROLES.map((r) => {
          const active = role === r.value;
          return (
            <Card
              key={r.value}
              style={[s.option, active && s.optionActive]}
              onPress={() => {
                setRole(r.value);
                setConfirming(false);
              }}
            >
              <Row style={{ gap: space.md }}>
                <Text style={s.glyph}>{r.glyph}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.optionLabel, active && { color: colors.brandInk }]}>{r.label}</Text>
                  <Text style={s.optionDesc}>{r.description}</Text>
                </View>
                <View style={[s.radio, active && s.radioActive]} />
              </Row>
            </Card>
          );
        })}

        {error && <Text style={s.error}>{error}</Text>}

        {/* 変更できない選択なので、確定前にもう一段の確認を入れる */}
        {confirming && selected ? (
          <Card style={s.confirm}>
            <Text style={s.confirmTitle}>「{selected.label}」で登録します</Text>
            <Text style={s.confirmBody}>
              あとから変更することはできません。この立場でよろしいですか？
            </Text>
            <View style={{ gap: space.sm, marginTop: space.md }}>
              <Button title="この立場で登録する" onPress={submit} loading={saving} />
              <Button title="選び直す" variant="ghost" onPress={() => setConfirming(false)} />
            </View>
          </Card>
        ) : (
          <View style={{ marginTop: space.lg }}>
            <Button title="次へ" onPress={() => setConfirming(true)} disabled={!role} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  title: { ...font.h1, color: colors.text, marginTop: space.lg },
  lead: { ...font.small, color: colors.muted, lineHeight: 20, marginBottom: space.md },
  option: {},
  optionActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  glyph: { fontSize: 28 },
  optionLabel: { ...font.h3, color: colors.text },
  optionDesc: { ...font.small, color: colors.muted, marginTop: 2, lineHeight: 18 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioActive: { borderColor: colors.brand, backgroundColor: colors.brand, borderWidth: 7 },
  confirm: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA', marginTop: space.lg },
  confirmTitle: { ...font.h3, color: '#9A3412' },
  confirmBody: { ...font.small, color: '#9A3412', marginTop: space.xs, lineHeight: 19 },
  error: { ...font.small, color: colors.danger },
});
