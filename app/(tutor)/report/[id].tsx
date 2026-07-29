// ⑩ AI生成プレビュー（F-10）
//
// AI の出力を無検証で保護者・生徒に届けないための画面。
// 講師が確認・修正して「確定」するまで status は draft のまま。

import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, type Report } from '../../../src/api';
import { useFetch } from '../../../src/hooks';
import { Badge, Button, Card, ErrorView, Loading, Row, SectionTitle } from '../../../src/components/ui';
import { colors, font, radius, space } from '../../../src/theme';

function notify(message: string) {
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert(message);
}

export default function ReportPreview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, error, reload } = useFetch<Report>(id ? `/reports/${id}` : null);

  const [parentReport, setParentReport] = useState('');
  const [studentMessage, setStudentMessage] = useState('');
  const [policy, setPolicy] = useState('');
  const [busy, setBusy] = useState<'confirm' | 'regenerate' | null>(null);

  // 取得後に編集用の state へ流し込む
  useEffect(() => {
    if (!data) return;
    setParentReport(data.parent_report ?? '');
    setStudentMessage(data.student_message ?? '');
    setPolicy(data.teaching_policy ?? '');
  }, [data]);

  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Loading label="AIの生成結果を読み込み中…" />;

  const confirm = async () => {
    setBusy('confirm');
    try {
      await api.post(`/reports/${id}/confirm`, {
        parent_report: parentReport,
        student_message: studentMessage,
        teaching_policy: policy,
      });
      notify('確定しました。保護者と生徒に通知されます。');
      router.replace('/(tutor)');
    } catch (e) {
      notify(e instanceof Error ? e.message : '確定に失敗しました');
    } finally {
      setBusy(null);
    }
  };

  const regenerate = async () => {
    setBusy('regenerate');
    try {
      await api.post(`/reports/${id}/regenerate`);
      reload();
    } catch (e) {
      notify(e instanceof Error ? e.message : '再生成に失敗しました');
    } finally {
      setBusy(null);
    }
  };

  const empty = !data.parent_report;

  return (
    <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
      <Card style={s.header}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={s.title}>
            {data.subject} / {data.unit}
          </Text>
          <Badge
            label={data.status === 'confirmed' ? '確定済' : '未確定'}
            tone={data.status === 'confirmed' ? 'success' : 'warn'}
          />
        </Row>
        <Text style={s.sub}>
          {empty
            ? 'AIの生成に失敗しました。手入力で作成するか、再生成してください。'
            : '内容を確認し、必要なら修正してから確定してください。'}
        </Text>
      </Card>

      <SectionTitle>保護者向けレポート</SectionTitle>
      <TextInput
        style={[s.input, s.tall]}
        value={parentReport}
        onChangeText={setParentReport}
        multiline
        placeholder="できたこと / つまずいた点 / 今後の方針"
        placeholderTextColor={colors.faint}
      />

      <SectionTitle>生徒へのメッセージ</SectionTitle>
      <TextInput
        style={[s.input, s.mid]}
        value={studentMessage}
        onChangeText={setStudentMessage}
        multiline
        placeholder="励ましと、次にやること1つ"
        placeholderTextColor={colors.faint}
      />

      <SectionTitle>指導方針（講師用メモ）</SectionTitle>
      <TextInput
        style={[s.input, s.mid]}
        value={policy}
        onChangeText={setPolicy}
        multiline
        placeholder="次回扱う単元とアプローチ"
        placeholderTextColor={colors.faint}
      />

      {data.model && <Text style={s.model}>生成モデル: {data.model}</Text>}

      <View style={{ gap: space.sm, marginTop: space.lg }}>
        <Button
          title="確定して保護者に公開"
          onPress={confirm}
          loading={busy === 'confirm'}
          disabled={!parentReport.trim()}
        />
        <Button
          title="AIで作り直す"
          variant="ghost"
          onPress={regenerate}
          loading={busy === 'regenerate'}
        />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, paddingBottom: space.xxl },
  header: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  title: { ...font.h2, color: colors.brandInk },
  sub: { ...font.small, color: colors.brandInk, marginTop: space.xs, lineHeight: 19 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    ...font.body,
    color: colors.ink,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  tall: { minHeight: 200 },
  mid: { minHeight: 96 },
  model: { ...font.caption, color: colors.faint, textAlign: 'center', marginTop: space.md },
});
