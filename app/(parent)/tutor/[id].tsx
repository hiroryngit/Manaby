// ② 講師プロフィール + 予約リクエスト（F-02）

import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, type TutorDetail } from '../../../src/api';
import { useFetch, formatDateTime } from '../../../src/hooks';
import { useViewingStudentId } from '../../../src/session';
import {
  Annotation, Avatar, Badge, Button, Card, Empty, ErrorView, Loading, Row, SectionTitle, Stars,
} from '../../../src/components/ui';
import { colors, font, space } from '../../../src/theme';

/** 予約の結果はその日程の行に出す。どの枠の話か分からなくなるダイアログにはしない */
type SlotNote = { id: string; message: string; failed: boolean };

export default function TutorProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { studentId } = useViewingStudentId();
  const { data, error, reload } = useFetch<TutorDetail>(id ? `/tutors/${id}` : null);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [requested, setRequested] = useState<string[]>([]);
  const [note, setNote] = useState<SlotNote | null>(null);

  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const requestBooking = async (slotId: string, startsAt: string) => {
    if (!studentId) return;
    setRequesting(slotId);
    setNote(null);
    try {
      await api.post('/bookings', { student_id: studentId, tutor_id: id, starts_at: startsAt });
      setRequested((r) => [...r, slotId]);
      setNote({ id: slotId, message: '講師の承認をお待ちください。', failed: false });
    } catch (e) {
      setNote({
        id: slotId,
        message: e instanceof Error ? e.message : '予約に失敗しました',
        failed: true,
      });
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
          <Empty
            message="この講師の空き日程はまだ公開されていません"
            action={<Button title="他の講師を見る" variant="secondary" onPress={() => router.back()} />}
          />
        </Card>
      ) : (
        <View style={{ gap: space.sm }}>
          {data.availabilities.map((a) => {
            const done = requested.includes(a.id);
            const slotNote = note?.id === a.id ? note : null;
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
                {slotNote && (
                  <Text style={[s.note, slotNote.failed && { color: colors.shu }]}>
                    {slotNote.message}
                  </Text>
                )}
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
  note: { ...font.small, color: colors.sumiMid, marginTop: space.md },
});
