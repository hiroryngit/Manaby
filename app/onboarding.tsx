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
import { Button, Card, Row, ScreenHeader } from '../src/components/ui';
import { colors, font, radius, space } from '../src/theme';

type SelectableRole = Exclude<Role, 'admin'>;

const ROLES: { value: SelectableRole; label: string; description: string }[] = [
  {
    value: 'parent',
    label: '保護者',
    description: 'お子さまの学習状況・レポート・宿題の進捗を確認します',
  },
  {
    value: 'student',
    label: '生徒',
    description: '宿題の確認・提出と、先生からのコメントを見ます',
  },
  {
    value: 'tutor',
    label: '講師',
    description: '授業記録を書き、宿題を設定します',
  },
];

export default function Onboarding() {
  const router = useRouter();
  const { register } = useSession();
  const params = useLocalSearchParams<{ idToken: string }>();

  const [role, setRole] = useState<SelectableRole | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!role || !params.idToken) return;
    setSaving(true);
    setError(null);
    try {
      const user = await register({ idToken: params.idToken, role });
      router.replace(user.role === 'tutor' ? '/(tutor)' : '/(parent)');
    } catch (e) {
      setError(e instanceof Error ? e.message : '登録に失敗しました');
      setSaving(false);
      setConfirming(false);
    }
  };

  const selected = ROLES.find((r) => r.value === role);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={s.wrap}>
        <ScreenHeader
          title="ご利用の立場を選んでください"
          subtitle="この選択は登録後に変更できません。"
        />

        <View style={{ gap: space.sm, marginTop: space.md }}>
          {ROLES.map((r) => {
            const active = role === r.value;
            return (
              <Card
                key={r.value}
                style={active ? s.optionActive : undefined}
                onPress={() => {
                  setRole(r.value);
                  setConfirming(false);
                }}
              >
                <Row style={{ gap: space.md }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.optionLabel}>{r.label}</Text>
                    <Text style={s.optionDesc}>{r.description}</Text>
                  </View>
                  <View style={[s.pick, active && s.pickOn]}>
                    {active && <View style={s.pickDot} />}
                  </View>
                </Row>
              </Card>
            );
          })}
        </View>

        {error && <Text style={s.error}>{error}</Text>}

        {/* 変更できない選択なので、確定前にもう一段の確認を入れる */}
        {confirming && selected ? (
          <Card style={{ marginTop: space.xl }}>
            <Text style={s.confirmLabel}>あとから変更できません</Text>
            <Text style={s.confirmTitle}>「{selected.label}」で登録します</Text>
            <View style={{ gap: space.sm, marginTop: space.lg }}>
              <Button title="この立場で登録する" onPress={submit} loading={saving} />
              <Button title="選び直す" variant="ghost" onPress={() => setConfirming(false)} />
            </View>
          </Card>
        ) : (
          <View style={{ marginTop: space.xl }}>
            <Button title="次へ" onPress={() => setConfirming(true)} disabled={!role} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, paddingTop: space.xl, paddingBottom: space.huge },
  optionActive: { borderWidth: 1, borderColor: colors.sumi },
  optionLabel: { ...font.h3, color: colors.sumi },
  optionDesc: { ...font.small, color: colors.sumiMid, marginTop: space.xs },

  // 選択の印も角を立てる。丸いラジオは使わない
  pick: {
    width: 20,
    height: 20,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.ruleDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickOn: { borderColor: colors.sumi },
  pickDot: { width: 10, height: 10, backgroundColor: colors.sumi },

  confirmLabel: { ...font.label, color: colors.shu },
  confirmTitle: { ...font.h2, color: colors.sumi, marginTop: space.sm },
  error: { ...font.small, color: colors.shu, marginTop: space.md },
});
