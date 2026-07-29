// 記録未入力の授業一覧（⑧ 授業記録入力への入口）

import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { PendingLesson } from '../../src/api';
import { useFetch, formatDateTime } from '../../src/hooks';
import { useSession } from '../../src/session';
import { Badge, Button, Card, Empty, ErrorView, Loading, Row } from '../../src/components/ui';
import { colors, font, space } from '../../src/theme';

export default function PendingLessons() {
  const router = useRouter();
  const { user } = useSession();
  const { data, error, loading, reload } = useFetch<PendingLesson[]>(
    user ? `/tutors/${user.id}/pending-lessons` : null,
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
        <Card style={s.notice}>
          <Text style={s.noticeText}>
            授業記録の入力は3〜5分で完了します。入力するとAIがレポート・指導方針・
            生徒向けコメントを自動生成します。
          </Text>
        </Card>
      }
      ListEmptyComponent={
        <Card>
          <Empty message="記録が未入力の授業はありません" />
        </Card>
      }
      renderItem={({ item }) => (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.student_name}</Text>
              <Text style={s.date}>{formatDateTime(item.held_at)}</Text>
            </View>
            <Badge label="未入力" tone="danger" />
          </Row>
          <View style={{ marginTop: space.md }}>
            <Button
              title="記録を入力する"
              onPress={() => router.push(`/(tutor)/record/${item.id}`)}
            />
          </View>
        </Card>
      )}
    />
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  notice: { backgroundColor: colors.brandSoft, borderColor: colors.brandSoft },
  noticeText: { ...font.small, color: colors.brandInk, lineHeight: 20 },
  name: { ...font.h3, color: colors.ink },
  date: { ...font.small, color: colors.muted, marginTop: 2 },
});
