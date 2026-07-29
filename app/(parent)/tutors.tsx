// ① 講師一覧（F-02）

import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Tutor } from '../../src/api';
import { useFetch } from '../../src/hooks';
import { Badge, Card, Empty, ErrorView, Loading, Row, Stars } from '../../src/components/ui';
import { colors, font, radius, space } from '../../src/theme';

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
          <Row style={{ gap: space.md }}>
            {/* 写真未登録は頭文字で代替する */}
            <View style={s.avatar}>
              <Text style={s.avatarText}>{item.display_name.slice(0, 1)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.display_name} 先生</Text>
              <Row style={{ gap: space.xs, marginTop: 2 }}>
                <Stars value={Math.round(item.rating_avg)} size={14} />
                <Text style={s.rating}>
                  {item.rating_avg.toFixed(1)}（{item.rating_count}件）
                </Text>
              </Row>
              <Row style={{ gap: space.xs, marginTop: space.sm, flexWrap: 'wrap' }}>
                {item.subjects.map((sub) => (
                  <Badge key={sub} label={sub} tone="brand" />
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
  wrap: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...font.h2, color: colors.brandInk },
  name: { ...font.h3, color: colors.text },
  rating: { ...font.small, color: colors.muted },
  policy: { ...font.small, color: colors.muted, marginTop: space.md, lineHeight: 19 },
});
