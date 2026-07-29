// ③ ダッシュボード（F-03）
// 受け入れ基準: 起動後スクロールなしで「今日やること」が判別できること
//
// 画面内で浮くのは「今日やること」1枚だけ。他は罫で区切る。
// AI分析ノートには朱の傍線を立て、アプリが並べた情報と書かれたものを分ける。

import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Dashboard } from '../../src/api';
import { useFetch, formatDateTime, formatDate, splitDate } from '../../src/hooks';
import { useSession, useViewingStudentId } from '../../src/session';
import { AdminEntry } from '../../src/components/AdminEntry';
import { ChevronRightIcon } from '../../src/components/icons';
import {
  Badge, Button, Card, Empty, ErrorView, Loading, Row, ScreenHeader, SectionTitle, Stars,
} from '../../src/components/ui';
import { colors, font, levelColor, radius, space } from '../../src/theme';

const STATUS_LABEL = {
  not_started: { label: '未着手', tone: 'shu' as const },
  in_progress: { label: '進行中', tone: 'ao' as const },
  submitted: { label: '提出済', tone: 'ao' as const },
  reviewed: { label: '確認済', tone: 'done' as const },
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.wrap}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.sumiMid} />
        }
      >
        <ScreenHeader
          title={`${user?.display_name} さん`}
          subtitle={`${data.student.display_name}（${data.student.grade ?? '学年未設定'}）の学習状況`}
        />

        {/* 画面で唯一浮かせる面。ここだけ影と広い余白を持つ */}
        <Card lift>
          <Row style={{ justifyContent: 'space-between', marginBottom: space.md }}>
            <Text style={s.todoLabel}>今日やること</Text>
            {todo.length > 0 && <Badge label={`${todo.length}件`} tone="shu" />}
          </Row>

          {todo.length === 0 ? (
            <Text style={s.todoDone}>未完了の宿題はありません</Text>
          ) : (
            todo.slice(0, 3).map((h, i) => {
              const st = STATUS_LABEL[h.status];
              return (
                <View key={h.id} style={[s.todoItem, i > 0 && s.todoDivider]}>
                  <Row style={{ justifyContent: 'space-between', gap: space.md }}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.todoTitle}>
                        {h.subject}／{h.unit}
                      </Text>
                      <Text style={s.todoMeta}>
                        {h.question_count}問 ・ 期限 {formatDate(h.due_at)}
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
                <Text style={s.dateChipDay}>{splitDate(data.next_lesson.starts_at).day}</Text>
                <Text style={s.dateChipMonth}>{splitDate(data.next_lesson.starts_at).month}</Text>
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
        {/* 講師と AI が書いたものなので朱の傍線を立てる */}
        <Card
          mark={!!data.latest_report}
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
                  {data.latest_report.subject}／{data.latest_report.unit}
                </Text>
                <Row style={{ marginTop: space.sm, gap: space.sm }}>
                  <Text
                    style={[s.level, { color: levelColor(data.latest_report.understanding_level) }]}
                  >
                    理解度 {data.latest_report.understanding_level}／5
                  </Text>
                  <Stars value={data.latest_report.understanding_level} size={14} />
                </Row>
                <Text style={s.itemDate}>{formatDate(data.latest_report.generated_at)}</Text>
              </View>
              <ChevronRightIcon color={colors.sumiFaint} size={20} />
            </Row>
          ) : (
            <Empty message="まだレポートがありません" />
          )}
        </Card>

        <View style={{ marginTop: space.huge, gap: space.sm }}>
          <AdminEntry />
          <Button title="ログアウト" variant="ghost" onPress={signOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, paddingBottom: space.huge },

  todoLabel: { ...font.h2, color: colors.sumi },
  todoDone: { ...font.body, color: colors.sumiFaint, paddingVertical: space.sm },
  todoItem: { paddingVertical: space.md },
  todoDivider: { borderTopWidth: 1, borderTopColor: colors.rule },
  todoTitle: { ...font.h3, color: colors.sumi },
  todoMeta: { ...font.num, color: colors.sumiFaint, marginTop: space.xs },

  // 日付は桁が揃うことに意味があるので等幅で組む
  dateChip: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.rule,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChipDay: { ...font.numLg, color: colors.sumi },
  dateChipMonth: { ...font.label, color: colors.sumiFaint },

  itemTitle: { ...font.h3, color: colors.sumi },
  itemSub: { ...font.small, color: colors.sumiMid },
  itemDate: { ...font.num, color: colors.sumiFaint, marginTop: space.sm },
  level: { ...font.small, fontWeight: '700' },
});
