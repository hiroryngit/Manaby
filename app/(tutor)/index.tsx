// ⑦ 講師ホーム（担当生徒一覧）（F-07）
// 受け入れ基準: 記録未入力の生徒が一覧上で即座に識別できること
//
// 講師は「書き込む側」なので、この画面群では朱が主要操作の色になる。
// 朱が立っている生徒＝まだ書いていない生徒、と読めるようにする。

import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { TutorStudent } from '../../src/api';
import { useFetch, formatDate } from '../../src/hooks';
import { useSession } from '../../src/session';
import {
  Avatar, Badge, Button, Card, Empty, ErrorView, Loading, Row, ScreenHeader,
} from '../../src/components/ui';
import { colors, font, space } from '../../src/theme';

export default function TutorHome() {
  const router = useRouter();
  const { user, signOut } = useSession();
  const { data, error, loading, reload } = useFetch<TutorStudent[]>(
    user ? `/tutors/${user.id}/students` : null,
  );

  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const unrecorded = data.reduce((n, s) => n + s.unrecorded_count, 0);

  return (
    <FlatList
      data={data}
      keyExtractor={(s) => s.id}
      contentContainerStyle={s.wrap}
      refreshing={loading}
      onRefresh={reload}
      ListHeaderComponent={
        <ScreenHeader
          title={`${user?.display_name} 先生`}
          subtitle={
            unrecorded > 0
              ? `担当 ${data.length} 名 ・ 記録未入力 ${unrecorded} 件`
              : `担当 ${data.length} 名 ・ 記録はすべて入力済み`
          }
        />
      }
      ListEmptyComponent={<Empty message="担当生徒がいません" />}
      ListFooterComponent={
        <View style={{ marginTop: space.huge }}>
          <Button title="ログアウト" variant="ghost" onPress={signOut} />
        </View>
      }
      renderItem={({ item }) => {
        const pending = item.unrecorded_count > 0;
        return (
          <Card mark={pending}>
            <Row style={{ gap: space.md }}>
              <Avatar name={item.display_name} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.display_name}</Text>
                <Text style={s.meta}>
                  {item.grade ?? '学年未設定'} ・ 最終授業 {formatDate(item.last_lesson_at)}
                </Text>
              </View>
            </Row>

            {/* 未入力があることを最優先で目立たせる */}
            <Row style={{ gap: space.xs, marginTop: space.md, flexWrap: 'wrap' }}>
              {pending && <Badge label={`記録未入力 ${item.unrecorded_count}件`} tone="shu" />}
              {item.pending_homework_count > 0 && (
                <Badge label={`宿題未着手 ${item.pending_homework_count}件`} tone="ao" />
              )}
              {!pending && item.pending_homework_count === 0 && (
                <Badge label="対応済み" tone="done" />
              )}
            </Row>

            <Row style={{ gap: space.sm, marginTop: space.lg }}>
              <View style={{ flex: 1 }}>
                <Button
                  title="授業記録を書く"
                  variant={pending ? 'mark' : 'ghost'}
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
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, gap: space.sm, paddingBottom: space.huge },
  name: { ...font.h3, color: colors.sumi },
  meta: { ...font.num, color: colors.sumiFaint, marginTop: space.xs },
});
