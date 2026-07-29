// ⑤ 宿題画面（F-05）
// 受け入れ基準: 生徒が完了マークでき、その状態が保護者・講師の双方に即時反映されること

import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { api, type Homework, type HomeworkStatus } from '../../src/api';
import { useFetch, formatDate } from '../../src/hooks';
import { useViewingStudentId } from '../../src/session';
import { Badge, Button, Card, Empty, ErrorView, Loading, Row } from '../../src/components/ui';
import { colors, font, space } from '../../src/theme';

// 手をつけていないものだけ朱で立てる。終わったものは静かに引く
const STATUS = {
  not_started: { label: '未着手', tone: 'shu' as const, next: 'in_progress' as const, cta: '取りかかる' },
  in_progress: { label: '進行中', tone: 'ao' as const, next: 'submitted' as const, cta: '提出する' },
  submitted: { label: '提出済', tone: 'ao' as const, next: null, cta: null },
  reviewed: { label: '確認済', tone: 'done' as const, next: null, cta: null },
};

export default function HomeworkScreen() {
  const { studentId, loading: resolvingStudent } = useViewingStudentId();
  const { data, error, loading, reload, setData } = useFetch<Homework[]>(
    studentId ? `/students/${studentId}/homework` : null,
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!resolvingStudent && !studentId)
    return <Empty message="お子さまのアカウントがまだ紐づいていません。管理者にお問い合わせください。" />;
  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const advance = async (hw: Homework) => {
    const next = STATUS[hw.status].next;
    if (!next) return;
    setBusy(hw.id);
    // 楽観的更新。失敗したら元に戻す
    setData((cur) => cur?.map((h) => (h.id === hw.id ? { ...h, status: next } : h)) ?? cur);
    try {
      await api.post(`/homework/${hw.id}/status`, { status: next as HomeworkStatus });
    } catch {
      setData((cur) => cur?.map((h) => (h.id === hw.id ? { ...h, status: hw.status } : h)) ?? cur);
    } finally {
      setBusy(null);
    }
  };

  return (
    <FlatList
      data={data}
      keyExtractor={(h) => h.id}
      contentContainerStyle={s.wrap}
      refreshing={loading}
      onRefresh={reload}
      ListEmptyComponent={<Empty message="出されている宿題はありません" />}
      renderItem={({ item }) => {
        const st = STATUS[item.status];
        const open = expanded === item.id;
        return (
          <Card>
            <Row style={{ justifyContent: 'space-between', gap: space.md }}>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>
                  {item.subject}／{item.unit}
                </Text>
                <Text style={s.sub}>
                  {item.question_count}問 ・ 期限 {formatDate(item.due_at)}
                  {item.source === 'ai' ? ' ・ AI作成' : ''}
                </Text>
              </View>
              <Badge label={st.label} tone={st.tone} />
            </Row>

            {open && item.questions.length > 0 && (
              <View style={s.questions}>
                {item.questions.map((q, i) => (
                  <View key={i} style={s.question}>
                    <Text style={s.qNum}>問{i + 1}</Text>
                    <Text style={s.qText}>{q.text}</Text>
                  </View>
                ))}
              </View>
            )}

            <Row style={{ gap: space.sm, marginTop: space.lg }}>
              {item.questions.length > 0 && (
                <View style={{ flex: 1 }}>
                  <Button
                    title={open ? '問題を閉じる' : '問題を見る'}
                    variant="ghost"
                    onPress={() => setExpanded(open ? null : item.id)}
                  />
                </View>
              )}
              {st.cta && (
                <View style={{ flex: 1 }}>
                  <Button title={st.cta} loading={busy === item.id} onPress={() => advance(item)} />
                </View>
              )}
            </Row>
          </Card>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, gap: space.sm, paddingBottom: space.huge },
  title: { ...font.h3, color: colors.sumi },
  sub: { ...font.num, color: colors.sumiFaint, marginTop: space.xs },
  questions: {
    marginTop: space.lg,
    paddingTop: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    gap: space.md,
  },
  question: { flexDirection: 'row', gap: space.md },
  qNum: { ...font.num, color: colors.ao, minWidth: 30 },
  qText: { ...font.body, color: colors.sumi, flex: 1 },
});
