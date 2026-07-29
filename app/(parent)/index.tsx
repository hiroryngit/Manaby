// ③ ダッシュボード（F-03）
// 受け入れ基準: 起動後スクロールなしで「今日やること」が判別できること

import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Dashboard } from '../../src/api';
import { useFetch, formatDateTime, formatDate } from '../../src/hooks';
import { useSession, useViewingStudentId } from '../../src/session';
import { Badge, Button, Card, Empty, ErrorView, Loading, Row, SectionTitle, Stars } from '../../src/components/ui';
import { colors, font, levelColor, space } from '../../src/theme';

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

  const notStarted = data.pending_homework.filter((h) => h.status !== 'reviewed');

  return (
    <ScrollView
      contentContainerStyle={s.wrap}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
    >
      <Card style={s.header}>
        <Text style={s.greeting}>{user?.display_name} さん</Text>
        <Text style={s.student}>
          {data.student.display_name}（{data.student.grade ?? '—'}）の学習状況
        </Text>
      </Card>

      {/* 「今日やること」を最上部に置く */}
      <SectionTitle>今日やること</SectionTitle>
      {notStarted.length === 0 ? (
        <Card>
          <Empty message="未完了の宿題はありません" />
        </Card>
      ) : (
        notStarted.slice(0, 3).map((h) => {
          const st = STATUS_LABEL[h.status];
          return (
            <Card key={h.id} onPress={() => router.push('/(parent)/homework')}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemTitle}>
                    {h.subject} / {h.unit}
                  </Text>
                  <Text style={s.itemSub}>
                    {h.question_count}問 ・ 期限 {formatDate(h.due_at)}
                  </Text>
                </View>
                <Badge label={st.label} tone={st.tone} />
              </Row>
            </Card>
          );
        })
      )}

      <SectionTitle>次回の授業</SectionTitle>
      <Card>
        {data.next_lesson ? (
          <>
            <Text style={s.itemTitle}>{formatDateTime(data.next_lesson.starts_at)}</Text>
            <Text style={s.itemSub}>担当: {data.next_lesson.tutor_name} 先生</Text>
          </>
        ) : (
          <Row style={{ justifyContent: 'space-between' }}>
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
          data.latest_report ? () => router.push(`/(parent)/report/${data.latest_report!.id}`) : undefined
        }
      >
        {data.latest_report ? (
          <>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={s.itemTitle}>
                {data.latest_report.subject} / {data.latest_report.unit}
              </Text>
              <Text style={{ ...font.small, color: colors.faint }}>
                {formatDate(data.latest_report.generated_at)}
              </Text>
            </Row>
            <Row style={{ marginTop: space.sm, gap: space.sm }}>
              <Text style={{ ...font.small, color: colors.muted }}>理解度</Text>
              <Stars value={data.latest_report.understanding_level} size={16} />
              <Text
                style={{
                  ...font.small,
                  color: levelColor(data.latest_report.understanding_level),
                  fontWeight: '700',
                }}
              >
                {data.latest_report.understanding_level} / 5
              </Text>
            </Row>
          </>
        ) : (
          <Empty message="まだレポートがありません" />
        )}
      </Card>

      <View style={{ marginTop: space.xl }}>
        <Button title="ログアウト" variant="ghost" onPress={signOut} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, gap: space.sm, paddingBottom: space.xxl },
  header: { backgroundColor: colors.brandSoft, borderColor: colors.brandSoft },
  greeting: { ...font.h2, color: colors.brandInk },
  student: { ...font.small, color: colors.brandInk, marginTop: 2 },
  itemTitle: { ...font.h3, color: colors.text },
  itemSub: { ...font.small, color: colors.muted, marginTop: 2 },
});
