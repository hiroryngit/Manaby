// ③ ダッシュボード（F-03）
// 受け入れ基準: 起動後スクロールなしで「今日やること」が判別できること

import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Dashboard } from '../../src/api';
import { useFetch, formatDateTime, formatDate } from '../../src/hooks';
import { useSession, useViewingStudentId } from '../../src/session';
import { ChevronRightIcon } from '../../src/components/icons';
import {
  Badge, Button, Card, Empty, ErrorView, Loading, Row, SectionTitle, Stars,
} from '../../src/components/ui';
import { colors, font, levelColor, radius, space } from '../../src/theme';

const STATUS_LABEL = {
  not_started: { label: '未着手', tone: 'danger' as const },
  in_progress: { label: '進行中', tone: 'warn' as const },
  submitted: { label: '提出済', tone: 'brand' as const },
  reviewed: { label: '確認済', tone: 'success' as const },
};

export default function ParentHome() {
  const router = useRouter();
  const { user, signOut } = useSession();
  const { studentId, loading: resolvingStudent } = useViewingStudentId();
  const { data, error, loading, reload } = useFetch<Dashboard>(
    studentId ? `/students/${studentId}/dashboard` : null,
  );

  if (!resolvingStudent && !studentId)
    return <Empty message="お子さまのアカウントがまだ紐づいていません。管理者にお問い合わせください。" />;
  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const todo = data.pending_homework.filter((h) => h.status !== 'reviewed');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.wrap}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.brand} />}
      >
        <View style={s.head}>
          <Text style={s.greeting}>{user?.display_name} さん</Text>
          <Text style={s.student}>
            {data.student.display_name}（{data.student.grade ?? '—'}）の学習状況
          </Text>
        </View>

        {/* 画面で最も強い面。ここだけ影を強め、余白も広く取る */}
        <Card emphasis="raised" style={s.todoCard}>
          <Row style={{ justifyContent: 'space-between', marginBottom: space.md }}>
            <Text style={s.todoLabel}>今日やること</Text>
            {todo.length > 0 && <Badge label={`${todo.length}件`} tone="accent" />}
          </Row>

          {todo.length === 0 ? (
            <Text style={s.todoDone}>未完了の宿題はありません</Text>
          ) : (
            todo.slice(0, 3).map((h, i) => {
              const st = STATUS_LABEL[h.status];
              return (
                <View key={h.id} style={[s.todoItem, i > 0 && s.todoDivider]}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.todoTitle}>
                        {h.subject}・{h.unit}
                      </Text>
                      <Text style={s.todoMeta}>
                        {h.question_count}問 ／ 期限 {formatDate(h.due_at)}
                      </Text>
                    </View>
                    <Badge label={st.label} tone={st.tone} />
                  </Row>
                </View>
              );
            })
          )}

          {todo.length > 0 && (
            <View style={{ marginTop: space.lg }}>
              <Button title="宿題をひらく" onPress={() => router.push('/(parent)/homework')} />
            </View>
          )}
        </Card>

        <SectionTitle>次回の授業</SectionTitle>
        <Card>
          {data.next_lesson ? (
            <Row style={{ gap: space.lg }}>
              <View style={s.dateChip}>
                <Text style={s.dateChipDay}>
                  {formatDate(data.next_lesson.starts_at).replace(/[^0-9]/g, '').slice(-2)}
                </Text>
                <Text style={s.dateChipMonth}>
                  {formatDate(data.next_lesson.starts_at).split('月')[0]}月
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.itemTitle}>{formatDateTime(data.next_lesson.starts_at)}</Text>
                <Text style={s.itemSub}>{data.next_lesson.tutor_name} 先生</Text>
              </View>
            </Row>
          ) : (
            <Row style={{ justifyContent: 'space-between', gap: space.md }}>
              <Text style={s.itemSub}>予定がありません</Text>
              <Button
                title="講師を探す"
                variant="secondary"
                onPress={() => router.push('/(parent)/tutors')}
              />
            </Row>
          )}
        </Card>

        <SectionTitle>最新のAI分析ノート</SectionTitle>
        <Card
          onPress={
            data.latest_report
              ? () => router.push(`/(parent)/report/${data.latest_report!.id}`)
              : undefined
          }
        >
          {data.latest_report ? (
            <Row style={{ gap: space.md }}>
              <View style={{ flex: 1 }}>
                <Text style={s.itemTitle}>
                  {data.latest_report.subject}・{data.latest_report.unit}
                </Text>
                <Row style={{ marginTop: space.sm, gap: space.sm }}>
                  <Stars value={data.latest_report.understanding_level} size={15} />
                  <Text
                    style={[
                      s.level,
                      { color: levelColor(data.latest_report.understanding_level) },
                    ]}
                  >
                    理解度 {data.latest_report.understanding_level}/5
                  </Text>
                </Row>
                <Text style={s.itemDate}>{formatDate(data.latest_report.generated_at)}</Text>
              </View>
              <ChevronRightIcon color={colors.faint} size={20} />
            </Row>
          ) : (
            <Empty message="まだレポートがありません" />
          )}
        </Card>

        <View style={{ marginTop: space.huge }}>
          <Button title="ログアウト" variant="ghost" onPress={signOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, paddingBottom: space.huge },

  head: { paddingHorizontal: space.xs, paddingTop: space.sm, marginBottom: space.lg },
  greeting: { ...font.h1, color: colors.ink },
  student: { ...font.small, color: colors.muted, marginTop: 2 },

  todoCard: { backgroundColor: colors.surface },
  todoLabel: { ...font.h2, color: colors.ink },
  todoDone: { ...font.body, color: colors.muted, paddingVertical: space.sm },
  todoItem: { paddingVertical: space.md },
  todoDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  todoTitle: { ...font.h3, color: colors.ink },
  todoMeta: { ...font.small, color: colors.muted, marginTop: 2 },

  dateChip: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChipDay: { ...font.h2, color: colors.brandInk },
  dateChipMonth: { ...font.caption, color: colors.brand },

  itemTitle: { ...font.h3, color: colors.ink },
  itemSub: { ...font.small, color: colors.muted, marginTop: 2 },
  itemDate: { ...font.small, color: colors.faint, marginTop: space.sm },
  level: { ...font.small, fontWeight: '700' },
});
