// ⑦ 講師ホーム（担当生徒一覧）（F-07）
// 受け入れ基準: 記録未入力の生徒が一覧上で即座に識別できること

import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { TutorStudent } from '../../src/api';
import { useFetch, formatDate } from '../../src/hooks';
import { useSession } from '../../src/session';
import { Badge, Button, Card, Empty, ErrorView, Loading, Row } from '../../src/components/ui';
import { colors, font, radius, space } from '../../src/theme';

export default function TutorHome() {
  const router = useRouter();
  const { user, signOut } = useSession();
  const { data, error, loading, reload } = useFetch<TutorStudent[]>(
    user ? `/tutors/${user.id}/students` : null,
  );

  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Loading />;

  return (
    <FlatList
      data={data}
      keyExtractor={(s) => s.id}
      contentContainerStyle={s.wrap}
      refreshing={loading}
      onRefresh={reload}
      ListHeaderComponent={
        <Card style={s.header}>
          <Text style={s.greeting}>{user?.display_name} 先生</Text>
          <Text style={s.sub}>担当 {data.length} 名</Text>
        </Card>
      }
      ListEmptyComponent={<Empty message="担当生徒がいません" />}
      ListFooterComponent={
        <View style={{ marginTop: space.xl }}>
          <Button title="ログアウト" variant="ghost" onPress={signOut} />
        </View>
      }
      renderItem={({ item }) => (
        <Card>
          <Row style={{ gap: space.md }}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{item.display_name.slice(0, 1)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.display_name}</Text>
              <Text style={s.meta}>
                {item.grade ?? '—'} ・ 最終授業 {formatDate(item.last_lesson_at)}
              </Text>
            </View>
          </Row>

          {/* 未入力があることを最優先で目立たせる */}
          <Row style={{ gap: space.xs, marginTop: space.md, flexWrap: 'wrap' }}>
            {item.unrecorded_count > 0 && (
              <Badge label={`記録未入力 ${item.unrecorded_count}件`} tone="danger" />
            )}
            {item.pending_homework_count > 0 && (
              <Badge label={`宿題未着手 ${item.pending_homework_count}件`} tone="warn" />
            )}
            {item.unrecorded_count === 0 && item.pending_homework_count === 0 && (
              <Badge label="対応済み" tone="success" />
            )}
          </Row>

          <Row style={{ gap: space.sm, marginTop: space.md }}>
            <View style={{ flex: 1 }}>
              <Button
                title="授業記録を入力"
                variant={item.unrecorded_count > 0 ? 'primary' : 'ghost'}
                onPress={() => router.push('/(tutor)/lessons')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title="宿題を設定"
                variant="secondary"
                onPress={() => router.push(`/(tutor)/homework/${item.id}`)}
              />
            </View>
          </Row>
        </Card>
      )}
    />
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  header: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  greeting: { ...font.h2, color: colors.brandInk },
  sub: { ...font.small, color: colors.brandInk, marginTop: 2 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...font.h2, color: colors.tutor },
  name: { ...font.h3, color: colors.ink },
  meta: { ...font.small, color: colors.muted, marginTop: 2 },
});
