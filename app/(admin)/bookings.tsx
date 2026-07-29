// 管理：予約の承認（F-12）
//
// 保護者が出した予約リクエストは requested のまま止まる。
// ここで承認すると授業（lessons）が立ち、講師の「記録未入力」に現れる ——
// つまりこの画面を通らないと、授業記録も AI分析ノートも始まらない。

import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { api, type AdminBooking } from '../../src/api';
import { useFetch, formatDateTime } from '../../src/hooks';
import { AdminAuthError, isAuthFailure } from '../../src/components/AdminAuthError';
import { confirmDestructive } from '../../src/dialog';
import {
  Badge, Button, Card, Empty, ErrorView, Loading, Row, type Tone,
} from '../../src/components/ui';
import { colors, font, space } from '../../src/theme';

const STATUS: Record<AdminBooking['status'], { label: string; tone: Tone }> = {
  requested: { label: '承認待ち', tone: 'shu' },
  accepted: { label: '確定', tone: 'ao' },
  rejected: { label: '見送り', tone: 'done' },
  cancelled: { label: '取消', tone: 'done' },
};

export default function AdminBookings() {
  const { data, error, status, loading, reload } = useFetch<AdminBooking[]>('/admin/bookings');
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ id: string; message: string } | null>(null);

  // 認証で弾かれた場合、再読み込みしても永久に直らない。合言葉の画面へ逃がす
  if (error && isAuthFailure(status)) return <AdminAuthError message={error} />;
  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const decide = async (booking: AdminBooking, decision: 'accepted' | 'rejected') => {
    if (decision === 'rejected') {
      const ok = await confirmDestructive({
        title: '予約を見送ります',
        message: '保護者と生徒に通知されます。この操作は取り消せません。',
        confirmLabel: '見送る',
      });
      if (!ok) return;
    }

    setBusy(booking.id);
    setNote(null);
    try {
      await api.post(`/admin/bookings/${booking.id}/decide`, { decision });
      reload();
    } catch (e) {
      setNote({ id: booking.id, message: e instanceof Error ? e.message : '処理に失敗しました' });
    } finally {
      setBusy(null);
    }
  };

  const waiting = data.filter((b) => b.status === 'requested').length;

  return (
    <FlatList
      data={data}
      keyExtractor={(b) => b.id}
      contentContainerStyle={s.wrap}
      refreshing={loading}
      onRefresh={reload}
      ListHeaderComponent={
        <Text style={s.lead}>
          {waiting > 0
            ? `承認待ちが ${waiting} 件あります。承認すると授業が作られ、講師が記録を書けるようになります。`
            : '承認待ちの予約はありません。'}
        </Text>
      }
      ListEmptyComponent={<Empty message="予約はまだありません" />}
      renderItem={({ item }) => {
        const st = STATUS[item.status];
        const pending = item.status === 'requested';
        return (
          <Card>
            <Row style={{ justifyContent: 'space-between', gap: space.md }}>
              <View style={{ flex: 1 }}>
                <Text style={s.when}>{formatDateTime(item.starts_at)}</Text>
                <Text style={s.who}>
                  {item.student_name} ／ {item.tutor_name} 先生
                </Text>
              </View>
              <Badge label={st.label} tone={st.tone} />
            </Row>

            {pending && (
              <Row style={{ gap: space.sm, marginTop: space.lg }}>
                <View style={{ flex: 1 }}>
                  <Button
                    title="承認する"
                    loading={busy === item.id}
                    onPress={() => decide(item, 'accepted')}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title="見送る"
                    variant="ghost"
                    loading={busy === item.id}
                    onPress={() => decide(item, 'rejected')}
                  />
                </View>
              </Row>
            )}

            {item.status === 'accepted' && !item.lesson_id && (
              <Text style={s.warn}>授業データが作られていません。管理者に確認してください。</Text>
            )}

            {note?.id === item.id && <Text style={s.warn}>{note.message}</Text>}
          </Card>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, gap: space.sm, paddingBottom: space.huge },
  lead: { ...font.small, color: colors.sumiMid, marginBottom: space.md },
  when: { ...font.h3, color: colors.sumi },
  who: { ...font.num, color: colors.sumiFaint, marginTop: space.xs },
  warn: { ...font.small, color: colors.shu, marginTop: space.md },
});
