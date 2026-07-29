// ② 講師プロフィール + 予約リクエスト（F-02）

import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api, type TutorDetail } from '../../../src/api';
import { useFetch, formatDateTime } from '../../../src/hooks';
import { useViewingStudentId } from '../../../src/session';
import { Badge, Button, Card, Empty, ErrorView, Loading, Row, SectionTitle, Stars } from '../../../src/components/ui';
import { colors, font, radius, space } from '../../../src/theme';

function notify(message: string) {
  // React Native の Alert は web で表示されないため分岐する
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert(message);
}

export default function TutorProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { studentId, loading: resolvingStudent } = useViewingStudentId();
  const { data, error, reload } = useFetch<TutorDetail>(id ? `/tutors/${id}` : null);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [requested, setRequested] = useState<string[]>([]);

  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const requestBooking = async (slotId: string, startsAt: string) => {
    if (!studentId) return;
    setRequesting(slotId);
    try {
      await api.post('/bookings', { student_id: studentId, tutor_id: id, starts_at: startsAt });
      setRequested((r) => [...r, slotId]);
      notify('予約をリクエストしました。講師の承認をお待ちください。');
    } catch (e) {
      notify(e instanceof Error ? e.message : '予約に失敗しました');
    } finally {
      setRequesting(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Card>
        <Row style={{ gap: space.md }}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{data.display_name.slice(0, 1)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{data.display_name} 先生</Text>
            <Row style={{ gap: space.xs, marginTop: 2 }}>
              <Stars value={Math.round(data.rating_avg)} size={15} />
              <Text style={s.muted}>
                {data.rating_avg.toFixed(1)}（{data.rating_count}件）
              </Text>
            </Row>
            <Row style={{ gap: space.xs, marginTop: space.sm, flexWrap: 'wrap' }}>
              {data.subjects.map((sub) => (
                <Badge key={sub} label={sub} tone="brand" />
              ))}
            </Row>
          </View>
        </Row>
        {data.bio && <Text style={s.body}>{data.bio}</Text>}
      </Card>

      {data.policy && (
        <>
          <SectionTitle>指導方針</SectionTitle>
          <Card>
            <Text style={s.body}>{data.policy}</Text>
          </Card>
        </>
      )}

      <SectionTitle>空き日程 ・ 予約リクエスト</SectionTitle>
      {data.availabilities.length === 0 ? (
        <Card>
          <Empty message="現在公開されている空き日程はありません" />
        </Card>
      ) : (
        data.availabilities.map((a) => {
          const done = requested.includes(a.id);
          return (
            <Card key={a.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.slot}>{formatDateTime(a.starts_at)}</Text>
                  <Text style={s.muted}>〜 {formatDateTime(a.ends_at).split(' ')[1] ?? ''}</Text>
                </View>
                <Button
                  title={done ? 'リクエスト済' : '予約する'}
                  variant={done ? 'ghost' : 'primary'}
                  disabled={done}
                  loading={requesting === a.id}
                  onPress={() => requestBooking(a.id, a.starts_at)}
                />
              </Row>
            </Card>
          );
        })
      )}

      <SectionTitle>レビュー</SectionTitle>
      {data.reviews.length === 0 ? (
        <Card>
          <Empty message="レビューはまだありません" />
        </Card>
      ) : (
        data.reviews.map((r, i) => (
          <Card key={i}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Stars value={r.rating} size={14} />
              <Text style={s.muted}>{r.author}</Text>
            </Row>
            <Text style={[s.body, { marginTop: space.sm }]}>{r.comment}</Text>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, gap: space.sm, paddingBottom: space.xxl },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...font.h1, color: colors.brandInk },
  name: { ...font.h2, color: colors.text },
  muted: { ...font.small, color: colors.muted },
  body: { ...font.body, color: colors.text, lineHeight: 22, marginTop: space.md },
  slot: { ...font.h3, color: colors.text },
});
