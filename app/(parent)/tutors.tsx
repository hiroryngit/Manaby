// ① 講師一覧（F-02）

import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Tutor } from '../../src/api';
import { useFetch } from '../../src/hooks';
import { Avatar, Badge, Card, Empty, ErrorView, Loading, Row, Stars } from '../../src/components/ui';
import { colors, font, space } from '../../src/theme';

export default function TutorList() {
  const router = useRouter();
  const { data, error, loading, reload } = useFetch<Tutor[]>('/tutors');

  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Loading />;

  return (
    <FlatList
      data={data}
      keyExtractor={(t) => t.id}
      contentContainerStyle={s.wrap}
      refreshing={loading}
      onRefresh={reload}
      ListEmptyComponent={<Empty message="講師が登録されていません" />}
      renderItem={({ item }) => (
        <Card onPress={() => router.push(`/(parent)/tutor/${item.id}`)}>
          <Row style={{ gap: space.md, alignItems: 'flex-start' }}>
            {/* 写真未登録は頭文字で代替する */}
            <Avatar name={item.display_name} size={50} />
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.display_name} 先生</Text>
              <Row style={{ gap: space.sm, marginTop: space.xs }}>
                <Stars value={Math.round(item.rating_avg)} size={13} />
                <Text style={s.rating}>
                  {item.rating_avg.toFixed(1)}（{item.rating_count}件）
                </Text>
              </Row>
              <Row style={{ gap: space.xs, marginTop: space.sm, flexWrap: 'wrap' }}>
                {item.subjects.map((sub) => (
                  <Badge key={sub} label={sub} tone="neutral" />
                ))}
              </Row>
            </View>
          </Row>
          {item.policy && (
            <Text style={s.policy} numberOfLines={2}>
              {item.policy}
            </Text>
          )}
        </Card>
      )}
    />
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, gap: space.sm, paddingBottom: space.huge },
  name: { ...font.h3, color: colors.sumi },
  rating: { ...font.num, color: colors.sumiFaint },
  policy: { ...font.small, color: colors.sumiMid, marginTop: space.md },
});
