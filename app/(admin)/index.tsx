// 管理：利用者一覧と、保護者と生徒の紐付け（F-12）
//
// 保護者アカウントは student_profiles.parent_id を通してのみ子を見る。
// これを書ける経路がここしか無いため、紐付けがこの画面の主目的になる。

import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api, type AdminUser, type Role } from '../../src/api';
import { useFetch } from '../../src/hooks';
import { AdminAuthError, isAuthFailure } from '../../src/components/AdminAuthError';
import { confirmDestructive } from '../../src/dialog';
import { homeRoute, useSession } from '../../src/session';
import {
  Avatar, Badge, Button, Card, Empty, ErrorView, Loading, Row, ScreenHeader, Segmented,
} from '../../src/components/ui';
import { colors, font, space } from '../../src/theme';

const ROLE_LABEL: Record<Role, string> = {
  parent: '保護者',
  student: '生徒',
  tutor: '講師',
  admin: '管理者',
};

type Filter = 'all' | 'parent' | 'student' | 'tutor';

export default function AdminUsers() {
  const router = useRouter();
  const { user, deactivateAdmin } = useSession();
  const { data, error, status, loading, reload } = useFetch<AdminUser[]>('/admin/users');

  const [filter, setFilter] = useState<Filter>('all');
  // 紐付けは「生徒を選ぶ → 保護者を選ぶ」の2手。選択中の生徒をここに持つ
  const [linking, setLinking] = useState<AdminUser | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ id: string; message: string; failed: boolean } | null>(null);

  // 認証で弾かれた場合、再読み込みしても永久に直らない。合言葉の画面へ逃がす
  if (error && isAuthFailure(status)) return <AdminAuthError message={error} />;
  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const parents = data.filter((u) => u.role === 'parent');
  const shown = filter === 'all' ? data : data.filter((u) => u.role === filter);

  const link = async (student: AdminUser, parent: AdminUser) => {
    setBusy(student.id);
    setNote(null);
    try {
      await api.post('/admin/link-child', { parent_id: parent.id, student_id: student.id });
      setLinking(null);
      setNote({ id: student.id, message: `${parent.display_name} さんに紐づけました`, failed: false });
      reload();
    } catch (e) {
      setNote({
        id: student.id,
        message: e instanceof Error ? e.message : '紐付けに失敗しました',
        failed: true,
      });
    } finally {
      setBusy(null);
    }
  };

  const unlink = async (student: AdminUser) => {
    const ok = await confirmDestructive({
      title: '紐付けを解除します',
      message: `${student.parent_name} さんは ${student.display_name} さんの学習状況を見られなくなります。`,
      confirmLabel: '解除する',
    });
    if (!ok) return;

    setBusy(student.id);
    setNote(null);
    try {
      await api.post('/admin/unlink-child', { student_id: student.id });
      reload();
    } catch (e) {
      setNote({
        id: student.id,
        message: e instanceof Error ? e.message : '解除に失敗しました',
        failed: true,
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={['top']}>
      <FlatList
        data={shown}
        keyExtractor={(u) => u.id}
        contentContainerStyle={s.wrap}
        refreshing={loading}
        onRefresh={reload}
        ListHeaderComponent={
          <View>
            <ScreenHeader
              title="利用者"
              subtitle={`${data.length} 名 ・ 保護者 ${parents.length} / 生徒 ${
                data.filter((u) => u.role === 'student').length
              } / 講師 ${data.filter((u) => u.role === 'tutor').length}`}
            />
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'すべて' },
                { value: 'parent', label: '保護者' },
                { value: 'student', label: '生徒' },
                { value: 'tutor', label: '講師' },
              ]}
            />
          </View>
        }
        ListEmptyComponent={<Empty message="該当する利用者がいません" />}
        ListFooterComponent={
          <View style={{ marginTop: space.huge, gap: space.sm }}>
            <Button
              title="管理者権限を解除する"
              variant="ghost"
              onPress={async () => {
                await deactivateAdmin();
                router.replace(homeRoute({ ...user!, is_admin: false }));
              }}
            />
          </View>
        }
        renderItem={({ item }) => {
          const picking = linking?.id === item.id;
          const myNote = note?.id === item.id ? note : null;
          // 保護者が付いていない生徒は、その保護者の画面が空のままになる
          const orphan = item.role === 'student' && !item.parent_id;

          return (
            <Card>
              <Row style={{ gap: space.md, alignItems: 'flex-start' }}>
                <Avatar name={item.display_name} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{item.display_name}</Text>
                  <Text style={s.email}>{item.email}</Text>
                </View>
                <Badge label={ROLE_LABEL[item.role]} tone="neutral" />
              </Row>

              <Row style={{ gap: space.xs, marginTop: space.md, flexWrap: 'wrap' }}>
                {item.is_admin && <Badge label="管理者" tone="ao" />}
                {!item.google_linked && <Badge label="Google未連携" tone="done" />}
                {item.role === 'student' &&
                  (item.parent_id ? (
                    <Badge label={`保護者 ${item.parent_name}`} tone="ao" />
                  ) : (
                    <Badge label="保護者未設定" tone="shu" />
                  ))}
              </Row>

              {orphan && !picking && (
                <View style={{ marginTop: space.lg }}>
                  <Button
                    title="保護者を紐づける"
                    variant="secondary"
                    disabled={parents.length === 0}
                    onPress={() => {
                      setLinking(item);
                      setNote(null);
                    }}
                  />
                  {parents.length === 0 && (
                    <Text style={s.hint}>保護者アカウントがまだ登録されていません。</Text>
                  )}
                </View>
              )}

              {picking && (
                <View style={s.picker}>
                  <Text style={s.pickerLabel}>紐づける保護者を選んでください</Text>
                  {parents.map((p) => (
                    <View key={p.id} style={{ marginTop: space.sm }}>
                      <Button
                        title={p.display_name}
                        variant="secondary"
                        loading={busy === item.id}
                        onPress={() => link(item, p)}
                      />
                    </View>
                  ))}
                  <View style={{ marginTop: space.sm }}>
                    <Button title="やめる" variant="ghost" onPress={() => setLinking(null)} />
                  </View>
                </View>
              )}

              {item.role === 'student' && item.parent_id && (
                <View style={{ marginTop: space.lg }}>
                  <Button
                    title="紐付けを解除"
                    variant="ghost"
                    loading={busy === item.id}
                    onPress={() => unlink(item)}
                  />
                </View>
              )}

              {/* 失敗も成功も、操作したその行に出す */}
              {myNote && (
                <Text style={[s.note, myNote.failed && { color: colors.shu }]}>
                  {myNote.message}
                </Text>
              )}
            </Card>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, gap: space.sm, paddingBottom: space.huge },
  name: { ...font.h3, color: colors.sumi },
  email: { ...font.num, color: colors.sumiFaint, marginTop: 2 },
  picker: {
    marginTop: space.lg,
    paddingTop: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
  },
  pickerLabel: { ...font.label, color: colors.sumiMid },
  hint: { ...font.small, color: colors.sumiFaint, marginTop: space.sm },
  note: { ...font.small, color: colors.sumiMid, marginTop: space.md },
});
