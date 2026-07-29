// 管理画面への入口（F-12）。
//
// 管理者は役割ではなく属性なので、保護者・講師どちらの画面からも入れる必要がある。
// 合言葉で守られているため誰の目に触れても構わないが、日常の操作ではないので
// 画面末尾に控えめに置く。

import { useRouter } from 'expo-router';
import { useSession } from '../session';
import { Button } from './ui';

export function AdminEntry() {
  const router = useRouter();
  const { user } = useSession();
  if (!user) return null;

  return user.is_admin ? (
    <Button title="管理画面" variant="ghost" onPress={() => router.push('/(admin)')} />
  ) : (
    <Button
      title="管理者として認証する"
      variant="ghost"
      onPress={() => router.push('/admin-unlock')}
    />
  );
}
