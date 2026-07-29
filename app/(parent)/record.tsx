// ⑥ 学習カルテ（F-06）
// 受け入れ基準: 推移が1画面で俯瞰でき、苦手単元が視覚的に識別できること
//
// 理解度は「線の濃さ＋長さ＋数値」で示し、色だけに判別を負わせない。
// 2以下の単元にだけ朱を立てる。

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { LearningRecord } from '../../src/api';
import { useFetch, formatDate } from '../../src/hooks';
import { useViewingStudentId } from '../../src/session';
import { RadarChart } from '../../src/components/RadarChart';
import { ChevronRightIcon } from '../../src/components/icons';
import {
  Badge, Card, Empty, ErrorView, LevelBar, Loading, Row, SectionTitle, Stars,
} from '../../src/components/ui';
import { colors, font, levelColor, needsAttention, space } from '../../src/theme';

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

  const weak = data.units.filter((u) => needsAttention(u.level));

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <SectionTitle>単元別の理解度</SectionTitle>
      <Card>
        <RadarChart data={data.units} />
      </Card>

      {weak.length > 0 && (
        <>
          <SectionTitle>重点的に取り組みたい単元</SectionTitle>
          <Row style={{ gap: space.sm, flexWrap: 'wrap' }}>
            {weak.map((u) => (
              <Badge key={u.unit} label={`${u.unit} ${u.level}／5`} tone="shu" />
            ))}
          </Row>
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
              <Row style={{ gap: space.md, marginTop: space.sm }}>
                <LevelBar level={u.level} />
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
        <View style={{ gap: space.sm }}>
          {data.lessons.map((l, i) => (
            <Card
              key={i}
              mark={!!l.report_id}
              onPress={l.report_id ? () => router.push(`/(parent)/report/${l.report_id}`) : undefined}
            >
              <Row style={{ justifyContent: 'space-between', gap: space.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.lessonTitle}>
                    {l.subject}／{l.unit}
                  </Text>
                  <Text style={s.lessonDate}>{formatDate(l.held_at)}</Text>
                </View>
                <Row style={{ gap: space.sm }}>
                  <Stars value={l.understanding_level} size={13} />
                  {l.report_id && <ChevronRightIcon color={colors.sumiFaint} size={18} />}
                </Row>
              </Row>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, paddingBottom: space.huge },
  unitRow: { paddingVertical: space.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.rule },
  unitName: { ...font.body, color: colors.sumi },
  level: { ...font.num, minWidth: 16, textAlign: 'right' },
  lessonTitle: { ...font.h3, color: colors.sumi },
  lessonDate: { ...font.num, color: colors.sumiFaint, marginTop: space.xs },
});
