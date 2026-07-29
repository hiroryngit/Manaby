// ⑥ 学習カルテ（F-06）
// 受け入れ基準: 推移が1画面で俯瞰でき、苦手単元が視覚的に識別できること

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { LearningRecord } from '../../src/api';
import { useFetch, formatDate } from '../../src/hooks';
import { useViewingStudentId } from '../../src/session';
import { RadarChart } from '../../src/components/RadarChart';
import { Badge, Card, Empty, ErrorView, Loading, Row, SectionTitle, Stars } from '../../src/components/ui';
import { colors, font, levelColor, radius, space } from '../../src/theme';

export default function RecordScreen() {
  const router = useRouter();
  const { studentId, loading: resolvingStudent } = useViewingStudentId();
  const { data, error, reload } = useFetch<LearningRecord>(
    studentId ? `/students/${studentId}/record` : null,
  );

  if (!resolvingStudent && !studentId)
    return <Empty message="お子さまのアカウントがまだ紐づいていません。管理者にお問い合わせください。" />;
  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const weak = data.units.filter((u) => u.level <= 2);

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <SectionTitle>単元別の理解度</SectionTitle>
      <Card>
        <RadarChart data={data.units} />
      </Card>

      {weak.length > 0 && (
        <>
          <SectionTitle>重点的に取り組みたい単元</SectionTitle>
          <Card style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}>
            <Row style={{ gap: space.xs, flexWrap: 'wrap' }}>
              {weak.map((u) => (
                <Badge key={u.unit} label={`${u.unit}（${u.level}/5）`} tone="danger" />
              ))}
            </Row>
          </Card>
        </>
      )}

      <SectionTitle>単元一覧</SectionTitle>
      <Card>
        {data.units.length === 0 ? (
          <Empty message="記録がまだありません" />
        ) : (
          data.units.map((u, i) => (
            <View key={u.unit} style={[s.unitRow, i > 0 && s.divider]}>
              <Text style={s.unitName}>{u.unit}</Text>
              <Row style={{ gap: space.sm }}>
                {/* 数値をバーで示す。色でも識別できるようにする */}
                <View style={s.barTrack}>
                  <View
                    style={[
                      s.barFill,
                      { width: `${(u.level / 5) * 100}%`, backgroundColor: levelColor(u.level) },
                    ]}
                  />
                </View>
                <Text style={[s.level, { color: levelColor(u.level) }]}>{u.level}</Text>
              </Row>
            </View>
          ))
        )}
      </Card>

      <SectionTitle>指導履歴</SectionTitle>
      {data.lessons.length === 0 ? (
        <Card>
          <Empty message="授業の記録がまだありません" />
        </Card>
      ) : (
        data.lessons.map((l, i) => (
          <Card
            key={i}
            onPress={l.report_id ? () => router.push(`/(parent)/report/${l.report_id}`) : undefined}
          >
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={s.lessonTitle}>
                  {l.subject} / {l.unit}
                </Text>
                <Text style={s.lessonDate}>{formatDate(l.held_at)}</Text>
              </View>
              <Row style={{ gap: space.sm }}>
                <Stars value={l.understanding_level} size={14} />
                {l.report_id && <Text style={s.chevron}>›</Text>}
              </Row>
            </Row>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, gap: space.sm, paddingBottom: space.xxl },
  unitRow: { paddingVertical: space.md, gap: space.sm },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  unitName: { ...font.body, color: colors.text },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: radius.pill },
  level: { ...font.h3, minWidth: 18, textAlign: 'right' },
  lessonTitle: { ...font.h3, color: colors.text },
  lessonDate: { ...font.small, color: colors.muted, marginTop: 2 },
  chevron: { ...font.h2, color: colors.faint },
});
