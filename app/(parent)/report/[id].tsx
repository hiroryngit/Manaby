// ④ AI分析ノート（授業レポート）（F-04）

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { Report } from '../../../src/api';
import { useFetch, formatDate } from '../../../src/hooks';
import { Badge, Card, ErrorView, Loading, Row, SectionTitle, Stars } from '../../../src/components/ui';
import { colors, font, levelColor, space } from '../../../src/theme';

/**
 * AI が返す本文は Markdown 風の見出し（**できたこと** など）を含む。
 * 見出しだけ太字にして、それ以外は本文として並べる。
 */
function RichText({ text }: { text: string }) {
  return (
    <View style={{ gap: space.sm }}>
      {text
        .split('\n')
        .filter((line) => line.trim())
        .map((line, i) => {
          const heading = line.match(/^\*\*(.+?)\*\*$/);
          if (heading) {
            return (
              <Text key={i} style={s.heading}>
                {heading[1]}
              </Text>
            );
          }
          return (
            <Text key={i} style={s.body}>
              {line.replace(/\*\*/g, '')}
            </Text>
          );
        })}
    </View>
  );
}

export default function ReportDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, reload } = useFetch<Report>(id ? `/reports/${id}` : null);

  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Loading />;

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Card style={s.header}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={s.title}>
            {data.subject} / {data.unit}
          </Text>
          <Badge
            label={data.status === 'confirmed' ? '確定' : '下書き'}
            tone={data.status === 'confirmed' ? 'success' : 'warn'}
          />
        </Row>
        <Text style={s.date}>{formatDate(data.held_at)} の授業</Text>

        <Row style={{ gap: space.lg, marginTop: space.md }}>
          <View>
            <Text style={s.metricLabel}>理解度</Text>
            <Row style={{ gap: space.xs }}>
              <Stars value={data.understanding_level} size={16} />
              <Text style={[s.metricValue, { color: levelColor(data.understanding_level) }]}>
                {data.understanding_level}
              </Text>
            </Row>
          </View>
          <View>
            <Text style={s.metricLabel}>集中度</Text>
            <Row style={{ gap: space.xs }}>
              <Stars value={data.concentration_level} size={16} />
              <Text style={[s.metricValue, { color: levelColor(data.concentration_level) }]}>
                {data.concentration_level}
              </Text>
            </Row>
          </View>
        </Row>
      </Card>

      <SectionTitle>保護者向けレポート</SectionTitle>
      <Card>
        {data.parent_report ? (
          <RichText text={data.parent_report} />
        ) : (
          <Text style={s.pending}>まだ生成されていません</Text>
        )}
      </Card>

      {data.student_message ? (
        <>
          <SectionTitle>生徒へのメッセージ</SectionTitle>
          <Card style={s.messageCard}>
            <Text style={s.message}>{data.student_message}</Text>
          </Card>
        </>
      ) : null}

      {data.weak_units.length > 0 && (
        <>
          <SectionTitle>苦手単元</SectionTitle>
          <Card>
            <Row style={{ gap: space.xs, flexWrap: 'wrap' }}>
              {data.weak_units.map((u) => (
                <Badge key={u} label={u} tone="danger" />
              ))}
            </Row>
          </Card>
        </>
      )}

      <SectionTitle>授業内容</SectionTitle>
      <Card>
        <Text style={s.body}>{data.content}</Text>
        {data.tutor_comment && (
          <Text style={[s.body, { marginTop: space.md, color: colors.muted }]}>
            講師コメント: {data.tutor_comment}
          </Text>
        )}
      </Card>

      {data.model && (
        <Text style={s.model}>生成モデル: {data.model}</Text>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, gap: space.sm, paddingBottom: space.xxl },
  header: { backgroundColor: colors.brandSoft, borderColor: colors.brandSoft },
  title: { ...font.h2, color: colors.brandInk },
  date: { ...font.small, color: colors.brandInk, marginTop: 2 },
  metricLabel: { ...font.caption, color: colors.muted, marginBottom: 2 },
  metricValue: { ...font.h3 },
  heading: { ...font.h3, color: colors.ink, marginTop: space.sm },
  body: { ...font.body, color: colors.ink, lineHeight: 23 },
  pending: { ...font.body, color: colors.muted },
  messageCard: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  message: { ...font.body, color: '#9A3412', lineHeight: 23 },
  model: { ...font.caption, color: colors.faint, textAlign: 'center', marginTop: space.lg },
});
