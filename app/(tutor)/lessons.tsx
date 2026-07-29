// 記録未入力の授業一覧（⑧ 授業記録入力への入口）

import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { PendingLesson } from '../../src/api';
import { useFetch, formatDateTime } from '../../src/hooks';
import { useSession } from '../../src/session';
import { Badge, Button, Card, Empty, ErrorView, Loading, Row } from '../../src/components/ui';
import { colors, font, space } from '../../src/theme';

export default function PendingLessons() {
  const router = useRouter();
  const { user } = useSession();
  // 講師ホームの生徒カードから来た場合はその生徒だけに絞る
  const { studentId, studentName } = useLocalSearchParams<{
    studentId?: string;
    studentName?: string;
  }>();

  const { data, error, loading, reload } = useFetch<PendingLesson[]>(
    user
      ? `/tutors/${user.id}/pending-lessons${studentId ? `?student_id=${studentId}` : ''}`
      : null,
  );

  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Loading />;

  return (
    <FlatList
      data={data}
      keyExtractor={(l) => l.id}
      contentContainerStyle={s.wrap}
      refreshing={loading}
      onRefresh={reload}
      ListHeaderComponent={
        <Text style={s.lead}>
          {studentName ? `${studentName} さんの未入力分です。` : ''}
          入力は3〜5分で終わります。書き終えるとAIがレポート・生徒へのコメント・
          指導方針を下書きします。
        </Text>
      }
      ListEmptyComponent={
        <Empty
          message={
            studentName
              ? `${studentName} さんの記録はすべて入力済みです`
              : '記録が未入力の授業はありません'
          }
          action={
            studentName ? (
              <Button
                title="すべての授業を見る"
                variant="secondary"
                onPress={() => router.replace('/(tutor)/lessons')}
              />
            ) : undefined
          }
        />
      }
      renderItem={({ item }) => (
        <Card mark>
          <Row style={{ justifyContent: 'space-between', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.student_name}</Text>
              <Text style={s.date}>{formatDateTime(item.held_at)}</Text>
            </View>
            <Badge label="未入力" tone="shu" />
          </Row>
          <View style={{ marginTop: space.lg }}>
            <Button
              title="記録を書く"
              variant="mark"
              onPress={() => router.push(`/(tutor)/record/${item.id}`)}
            />
          </View>
        </Card>
      )}
    />
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, gap: space.sm, paddingBottom: space.huge },
  lead: { ...font.small, color: colors.sumiMid, marginBottom: space.md },
  name: { ...font.h3, color: colors.sumi },
  date: { ...font.num, color: colors.sumiFaint, marginTop: space.xs },
});
