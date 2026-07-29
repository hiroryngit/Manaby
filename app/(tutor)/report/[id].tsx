// ⑩ AI生成プレビュー（F-10）
//
// AI の出力を無検証で保護者・生徒に届けないための画面。
// 講師が確認・修正して「確定」するまで status は draft のまま。
//
// ここでやっているのは AI の下書きの添削なので、編集欄そのものを朱の傍線の中に置く。
// 箱で囲わず、朱の罫だけを枠にする。

import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, type Report } from '../../../src/api';
import { useFetch } from '../../../src/hooks';
import {
  Annotation, Badge, Button, ErrorView, Input, Loading, Row,
} from '../../../src/components/ui';
import { colors, font, space } from '../../../src/theme';

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
  if (!data) return <Loading label="AIの下書きを読み込み中…" />;

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
      <View style={s.head}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Text style={s.title}>
            {data.subject}／{data.unit}
          </Text>
          <Badge
            label={data.status === 'confirmed' ? '確定済' : '未確定'}
            tone={data.status === 'confirmed' ? 'done' : 'shu'}
          />
        </Row>
        <Text style={s.lead}>
          {empty
            ? 'AIの下書きに失敗しました。手入力で書くか、作り直してください。'
            : '内容を確認し、必要なら直してから確定してください。'}
        </Text>
      </View>

      <Annotation label="保護者へ" style={s.field}>
        <Input
          value={parentReport}
          onChangeText={setParentReport}
          multiline
          minHeight={200}
          placeholder="できたこと / つまずいた点 / 今後の方針"
          style={s.bare}
        />
      </Annotation>

      <Annotation label="生徒へ" style={s.field}>
        <Input
          value={studentMessage}
          onChangeText={setStudentMessage}
          multiline
          minHeight={96}
          placeholder="励ましと、次にやること1つ"
          style={s.bare}
        />
      </Annotation>

      <Annotation label="指導方針（講師用メモ）" style={s.field}>
        <Input
          value={policy}
          onChangeText={setPolicy}
          multiline
          minHeight={96}
          placeholder="次回扱う単元とアプローチ"
          style={s.bare}
        />
      </Annotation>

      {data.model && <Text style={s.model}>生成モデル {data.model}</Text>}

      <View style={{ gap: space.sm, marginTop: space.xl }}>
        <Button
          title="確定して保護者に公開"
          onPress={confirm}
          loading={busy === 'confirm'}
          disabled={!parentReport.trim()}
          variant="mark"
          size="lg"
        />
        <Button
          title="AIに書き直させる"
          variant="ghost"
          onPress={regenerate}
          loading={busy === 'regenerate'}
        />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, paddingBottom: space.huge },
  head: { paddingBottom: space.lg },
  title: { ...font.h1, color: colors.sumi, flex: 1, paddingRight: space.md },
  lead: { ...font.small, color: colors.sumiMid, marginTop: space.xs },

  field: { marginTop: space.xl },
  // 朱の罫を唯一の枠にするため、入力欄そのものの箱は外す
  bare: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  model: { ...font.num, color: colors.sumiFaint, textAlign: 'center', marginTop: space.xl },
});
