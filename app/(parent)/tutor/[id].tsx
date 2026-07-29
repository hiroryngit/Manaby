// ② 講師プロフィール + 予約リクエスト（F-02）

import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api, type TutorDetail } from '../../../src/api';
import { useFetch, formatDateTime } from '../../../src/hooks';
import { useViewingStudentId } from '../../../src/session';
import {
  Annotation, Avatar, Badge, Button, Card, Empty, ErrorView, Loading, Row, SectionTitle, Stars,
} from '../../../src/components/ui';
import { colors, font, space } from '../../../src/theme';

function notify(message: string) {
  // React Native の Alert は web で表示されないため分岐する
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert(message);
}

export default function TutorProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { studentId } = useViewingStudentId();
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
      <View style={s.head}>
        <Row style={{ gap: space.lg, alignItems: 'flex-start' }}>
          <Avatar name={data.display_name} size={60} />
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{data.display_name} 先生</Text>
            <Row style={{ gap: space.sm, marginTop: space.xs }}>
              <Stars value={Math.round(data.rating_avg)} size={14} />
              <Text style={s.num}>
                {data.rating_avg.toFixed(1)}（{data.rating_count}件）
              </Text>
            </Row>
            <Row style={{ gap: space.xs, marginTop: space.sm, flexWrap: 'wrap' }}>
              {data.subjects.map((sub) => (
                <Badge key={sub} label={sub} tone="neutral" />
              ))}
            </Row>
          </View>
        </Row>
        {data.bio && <Text style={s.body}>{data.bio}</Text>}
      </View>

      {data.policy && (
        <>
          <SectionTitle>指導方針</SectionTitle>
          {/* 講師自身が書いた文章なので朱の傍線を立てる */}
          <Annotation>
            <Text style={s.body}>{data.policy}</Text>
          </Annotation>
        </>
      )}

      <SectionTitle>空き日程</SectionTitle>
      {data.availabilities.length === 0 ? (
        <Card>
          <Empty message="現在公開されている空き日程はありません" />
        </Card>
      ) : (
        <View style={{ gap: space.sm }}>
          {data.availabilities.map((a) => {
            const done = requested.includes(a.id);
            return (
              <Card key={a.id}>
                <Row style={{ justifyContent: 'space-between', gap: space.md }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.slot}>{formatDateTime(a.starts_at)}</Text>
                    <Text style={s.num}>〜 {formatDateTime(a.ends_at).split(' ')[1] ?? ''}</Text>
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
          })}
        </View>
      )}

      <SectionTitle>レビュー</SectionTitle>
      {data.reviews.length === 0 ? (
        <Card>
          <Empty message="レビューはまだありません" />
        </Card>
      ) : (
        <View style={{ gap: space.sm }}>
          {data.reviews.map((r, i) => (
            <Card key={i}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Stars value={r.rating} size={13} />
                <Text style={s.num}>{r.author}</Text>
              </Row>
              <Text style={[s.body, { marginTop: space.sm }]}>{r.comment}</Text>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, paddingBottom: space.huge },
  head: { paddingBottom: space.sm },
  name: { ...font.h1, color: colors.sumi },
  num: { ...font.num, color: colors.sumiFaint },
  body: { ...font.body, color: colors.sumi, marginTop: space.md },
  slot: { ...font.h3, color: colors.sumi },
});
