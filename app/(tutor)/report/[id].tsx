// ⑩ AI生成プレビュー（F-10）
//
// AI の出力を無検証で保護者・生徒に届けないための画面。
// 講師が確認・修正して「確定」するまで status は draft のまま。
//
// ここでやっているのは AI の下書きの添削なので、編集欄そのものを朱の傍線の中に置く。
// 箱で囲わず、朱の罫だけを枠にする。

import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, type Report } from '../../../src/api';
import { useFetch } from '../../../src/hooks';
import { confirmDestructive, notify } from '../../../src/dialog';
import {
  Annotation, Badge, Button, ErrorView, Input, Loading, Row,
} from '../../../src/components/ui';
import { colors, font, space } from '../../../src/theme';

type Draft = { parentReport: string; studentMessage: string; policy: string };

const toDraft = (r: Report): Draft => ({
  parentReport: r.parent_report ?? '',
  studentMessage: r.student_message ?? '',
  policy: r.teaching_policy ?? '',
});

export default function ReportPreview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, error, reload } = useFetch<Report>(id ? `/reports/${id}` : null);

  const [draft, setDraft] = useState<Draft>({ parentReport: '', studentMessage: '', policy: '' });
  const [syncedFrom, setSyncedFrom] = useState<Report | null>(null);
  const [busy, setBusy] = useState<'confirm' | 'regenerate' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // 取得結果を編集用の状態へ写す。useFetch は取得のたびに別のオブジェクトを返すので、
  // その同一性を見て描画中に写す（useEffect にすると1フレーム古い値が出る）。
  if (data && data !== syncedFrom) {
    setSyncedFrom(data);
    setDraft(toDraft(data));
  }

  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Loading label="AIの下書きを読み込み中…" />;

  const edit = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setActionError(null);
  };

  const saved = toDraft(data);
  const dirty =
    draft.parentReport !== saved.parentReport ||
    draft.studentMessage !== saved.studentMessage ||
    draft.policy !== saved.policy;

  const confirm = async () => {
    const ok = await confirmDestructive({
      title: '保護者と生徒に公開します',
      message: '公開すると確定し、この画面からは取り消せません。',
      confirmLabel: '公開する',
    });
    if (!ok) return;

    setBusy('confirm');
    setActionError(null);
    try {
      await api.post(`/reports/${id}/confirm`, {
        parent_report: draft.parentReport,
        student_message: draft.studentMessage,
        teaching_policy: draft.policy,
      });
      notify('確定しました。保護者と生徒に通知されます。');
      router.replace('/(tutor)');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '確定に失敗しました');
      setBusy(null);
    }
  };

  const regenerate = async () => {
    // 書き直すと編集中の内容は失われる。失うものがあるときだけ確認する
    if (dirty) {
      const ok = await confirmDestructive({
        title: 'AIに書き直させます',
        message: 'いま書きかけの内容は破棄されます。元には戻せません。',
        confirmLabel: '破棄して書き直す',
      });
      if (!ok) return;
    }

    setBusy('regenerate');
    setActionError(null);
    try {
      await api.post(`/reports/${id}/regenerate`);
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '書き直しに失敗しました');
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
          value={draft.parentReport}
          onChangeText={(v) => edit({ parentReport: v })}
          multiline
          minHeight={200}
          placeholder="できたこと / つまずいた点 / 今後の方針"
          style={s.bare}
        />
      </Annotation>

      <Annotation label="生徒へ" style={s.field}>
        <Input
          value={draft.studentMessage}
          onChangeText={(v) => edit({ studentMessage: v })}
          multiline
          minHeight={96}
          placeholder="励ましと、次にやること1つ"
          style={s.bare}
        />
      </Annotation>

      <Annotation label="指導方針（講師用メモ）" style={s.field}>
        <Input
          value={draft.policy}
          onChangeText={(v) => edit({ policy: v })}
          multiline
          minHeight={96}
          placeholder="次回扱う単元とアプローチ"
          style={s.bare}
        />
      </Annotation>

      {data.model && <Text style={s.model}>生成モデル {data.model}</Text>}

      {/* 失敗はダイアログではなく操作の隣に出す */}
      {actionError && <Text style={s.error}>{actionError}</Text>}

      <View style={{ gap: space.sm, marginTop: space.xl }}>
        <Button
          title="確定して保護者に公開"
          onPress={confirm}
          loading={busy === 'confirm'}
          disabled={!draft.parentReport.trim()}
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
  error: { ...font.small, color: colors.shu, marginTop: space.lg },
});
