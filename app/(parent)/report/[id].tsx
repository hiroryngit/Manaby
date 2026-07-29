// ④ AI分析ノート（授業レポート）（F-04）
//
// このアプリの中心にある成果物。講師と AI が書いた本文には朱の傍線を立て、
// アプリが並べた情報（日付・教科・数値）とはっきり層を分ける。

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { Report } from '../../../src/api';
import { useFetch, formatDate } from '../../../src/hooks';
import {
  Annotation, Badge, Card, ErrorView, Loading, NoteBody, Row, Rule, SectionTitle, Stars,
} from '../../../src/components/ui';
import { colors, font, levelColor, space } from '../../../src/theme';

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.metricLabel}>{label}</Text>
      <Row style={{ gap: space.sm, marginTop: space.xs }}>
        <Text style={[s.metricValue, { color: levelColor(value) }]}>{value}</Text>
        <Stars value={value} size={14} />
      </Row>
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
      {/* 授業の見出し。明朝を使うのはここと画面名だけ */}
      <View style={s.head}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Text style={s.title}>
            {data.subject}／{data.unit}
          </Text>
          <Badge
            label={data.status === 'confirmed' ? '確定' : '下書き'}
            tone={data.status === 'confirmed' ? 'done' : 'shu'}
          />
        </Row>
        <Text style={s.date}>{formatDate(data.held_at)} の授業</Text>

        <Rule style={{ marginTop: space.lg }} />
        <Row style={{ paddingTop: space.md }}>
          <Metric label="理解度" value={data.understanding_level} />
          <Metric label="集中度" value={data.concentration_level} />
        </Row>
      </View>

      <SectionTitle>保護者へ</SectionTitle>
      {data.parent_report ? (
        <Annotation>
          <NoteBody text={data.parent_report} />
        </Annotation>
      ) : (
        <Text style={s.pending}>まだ生成されていません</Text>
      )}

      {data.student_message ? (
        <>
          <SectionTitle>生徒へ</SectionTitle>
          <Annotation>
            <Text style={s.message}>{data.student_message}</Text>
          </Annotation>
        </>
      ) : null}

      {data.weak_units.length > 0 && (
        <>
          <SectionTitle>つまずいた単元</SectionTitle>
          <Row style={{ gap: space.sm, flexWrap: 'wrap' }}>
            {data.weak_units.map((u) => (
              <Badge key={u} label={u} tone="shu" />
            ))}
          </Row>
        </>
      )}

      <SectionTitle>授業内容</SectionTitle>
      <Card>
        <Text style={s.body}>{data.content}</Text>
      </Card>

      {data.tutor_comment ? (
        <>
          <SectionTitle>講師のコメント</SectionTitle>
          <Annotation>
            <Text style={s.body}>{data.tutor_comment}</Text>
          </Annotation>
        </>
      ) : null}

      {data.model && <Text style={s.model}>生成モデル {data.model}</Text>}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, paddingBottom: space.huge },

  head: { paddingBottom: space.sm },
  title: { ...font.h1, color: colors.sumi, flex: 1, paddingRight: space.md },
  date: { ...font.num, color: colors.sumiFaint, marginTop: space.xs },
  metricLabel: { ...font.label, color: colors.sumiFaint },
  metricValue: font.numLg,

  body: { ...font.body, color: colors.sumi },
  message: { ...font.body, color: colors.sumi },
  pending: { ...font.body, color: colors.sumiFaint },
  model: { ...font.num, color: colors.sumiFaint, textAlign: 'center', marginTop: space.xl },
});
