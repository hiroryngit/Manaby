// 初回登録（F-01）
//
//   ① 立場を選ぶ  →  ② プロフィールを書く  →  ③ 確認して登録
//
// 役割は①でしか決められず、以後変更できない。だから③で確認を挟む。
// ②で聞くのは「他の画面が実際に読む項目」だけ。空のまま通すと、
// 講師一覧に科目の無い講師が並び、学習カルテに学年の無い生徒が出る。
//
// 管理者だけは別。合言葉を入れた時点で権限が付き、②③を通らない ——
// 管理者は講師一覧にも学習カルテにも現れないので、埋める項目がそもそも無い。

import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Role } from '../src/api';
import { homeRoute, useSession } from '../src/session';
import { Button, Card, Chip, Input, Row, ScreenHeader, SectionTitle } from '../src/components/ui';
import { colors, font, radius, space } from '../src/theme';

type Choice = Exclude<Role, 'admin'> | 'admin';

const SUBJECTS = ['算数', '数学', '国語', '英語', '理科', '社会'];

const CHOICES: { value: Choice; label: string; description: string }[] = [
  {
    value: 'parent',
    label: '保護者',
    description: 'お子さまの学習状況・レポート・宿題の進捗を確認します',
  },
  {
    value: 'student',
    label: '生徒',
    description: '宿題の確認・提出と、先生からのコメントを見ます',
  },
  {
    value: 'tutor',
    label: '講師',
    description: '授業記録を書き、宿題を設定します',
  },
  {
    value: 'admin',
    label: '管理者',
    description: '合言葉が必要です。プロフィールの入力はありません',
  },
];

export default function Onboarding() {
  const router = useRouter();
  const { register, activateAdmin } = useSession();
  const params = useLocalSearchParams<{ idToken: string; name?: string }>();

  const [step, setStep] = useState<'role' | 'profile' | 'confirm'>('role');
  const [choice, setChoice] = useState<Choice | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // プロフィール。役割によって使う欄が変わる
  const [displayName, setDisplayName] = useState(params.name ?? '');
  const [phone, setPhone] = useState('');
  const [grade, setGrade] = useState('');
  const [school, setSchool] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [policy, setPolicy] = useState('');
  const [password, setPassword] = useState('');

  const selected = CHOICES.find((c) => c.value === choice);

  /** ②で埋まっていない必須項目。埋まるまで先へ進ませない */
  const missing = (): string | null => {
    if (!displayName.trim()) return 'お名前を入力してください';
    if (choice === 'parent' && !phone.trim()) return '電話番号を入力してください';
    if (choice === 'student' && !grade.trim()) return '学年を入力してください';
    if (choice === 'tutor') {
      if (subjects.length === 0) return '担当科目を1つ以上選んでください';
      if (!bio.trim()) return '経歴・自己紹介を入力してください';
      if (!policy.trim()) return '指導方針を入力してください';
    }
    return null;
  };

  const toggleSubject = (sub: string) =>
    setSubjects((cur) => (cur.includes(sub) ? cur.filter((x) => x !== sub) : [...cur, sub]));

  const unlockAdmin = async () => {
    if (!password.trim()) return setError('合言葉を入力してください');
    setSaving(true);
    setError(null);
    try {
      const user = await activateAdmin({ idToken: params.idToken, password: password.trim() });
      router.replace(homeRoute(user));
    } catch (e) {
      setError(e instanceof Error ? e.message : '認証に失敗しました');
      setSaving(false);
    }
  };

  const submit = async () => {
    if (!choice || choice === 'admin') return;
    setSaving(true);
    setError(null);
    try {
      const user = await register({
        idToken: params.idToken,
        role: choice,
        profile: {
          display_name: displayName.trim(),
          phone: phone.trim(),
          grade: grade.trim(),
          school_name: school.trim(),
          subjects,
          bio: bio.trim(),
          policy: policy.trim(),
        },
      });
      router.replace(homeRoute(user));
    } catch (e) {
      // 失敗したら書いた内容を残したまま入力画面へ戻す
      setError(e instanceof Error ? e.message : '登録に失敗しました');
      setSaving(false);
      setStep('profile');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
          {/* ------------------------------------------------ ① 立場を選ぶ */}
          {step === 'role' && (
            <>
              <ScreenHeader
                title="ご利用の立場を選んでください"
                subtitle="この選択は登録後に変更できません。"
              />

              <View style={{ gap: space.sm, marginTop: space.md }}>
                {CHOICES.map((c) => {
                  const active = choice === c.value;
                  return (
                    <Card
                      key={c.value}
                      style={active ? s.optionActive : undefined}
                      onPress={() => {
                        setChoice(c.value);
                        setError(null);
                      }}
                    >
                      <Row style={{ gap: space.md }}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.optionLabel}>{c.label}</Text>
                          <Text style={s.optionDesc}>{c.description}</Text>
                        </View>
                        <View style={[s.pick, active && s.pickOn]}>
                          {active && <View style={s.pickDot} />}
                        </View>
                      </Row>
                    </Card>
                  );
                })}
              </View>

              <View style={{ marginTop: space.xl }}>
                <Button title="次へ" onPress={() => setStep('profile')} disabled={!choice} />
              </View>
            </>
          )}

          {/* -------------------------------- ② 管理者は合言葉だけを入れる */}
          {step === 'profile' && choice === 'admin' && (
            <>
              <ScreenHeader
                title="管理者の合言葉"
                subtitle="合言葉が通れば、プロフィールの入力なしで管理者になります。"
              />

              <SectionTitle>合言葉</SectionTitle>
              <TextInput
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  setError(null);
                }}
                placeholder="サーバーに設定された合言葉"
                placeholderTextColor={colors.sumiFaint}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                style={s.secret}
                onSubmitEditing={unlockAdmin}
              />

              {error && <Text style={s.error}>{error}</Text>}

              <View style={{ gap: space.sm, marginTop: space.xl }}>
                <Button title="認証する" onPress={unlockAdmin} loading={saving} />
                <Button title="立場を選び直す" variant="ghost" onPress={() => setStep('role')} />
              </View>
            </>
          )}

          {/* ------------------------------------ ② プロフィールを入力する */}
          {step === 'profile' && choice && choice !== 'admin' && (
            <>
              <ScreenHeader
                title="プロフィールを入力してください"
                subtitle={`${selected?.label}として登録します。ここで入れた内容が各画面に表示されます。`}
              />

              <SectionTitle>お名前</SectionTitle>
              <Input value={displayName} onChangeText={setDisplayName} placeholder="例: 佐藤 美咲" />

              {choice === 'parent' && (
                <>
                  <SectionTitle>電話番号</SectionTitle>
                  <Input value={phone} onChangeText={setPhone} placeholder="例: 090-1234-5678" />
                  <Text style={s.hint}>講師や管理者からの連絡に使います。</Text>
                </>
              )}

              {choice === 'student' && (
                <>
                  <SectionTitle>学年</SectionTitle>
                  <Input value={grade} onChangeText={setGrade} placeholder="例: 小学6年" />

                  <SectionTitle>学校名（任意）</SectionTitle>
                  <Input
                    value={school}
                    onChangeText={setSchool}
                    placeholder="例: ◯◯市立△△小学校"
                  />
                </>
              )}

              {choice === 'tutor' && (
                <>
                  <SectionTitle>担当科目</SectionTitle>
                  <Row style={{ gap: space.xs, flexWrap: 'wrap' }}>
                    {SUBJECTS.map((sub) => (
                      <Chip
                        key={sub}
                        label={sub}
                        active={subjects.includes(sub)}
                        onPress={() => toggleSubject(sub)}
                      />
                    ))}
                  </Row>

                  <SectionTitle>経歴・自己紹介</SectionTitle>
                  <Input
                    value={bio}
                    onChangeText={setBio}
                    placeholder="例: ◯◯大学教育学部卒。中学受験の算数指導を6年"
                    multiline
                  />

                  <SectionTitle>指導方針</SectionTitle>
                  <Input
                    value={policy}
                    onChangeText={setPolicy}
                    placeholder="例: つまずいた原因を本人の言葉で説明できるまで戻ります"
                    multiline
                  />
                  <Text style={s.hint}>この2つは講師プロフィールとして保護者に公開されます。</Text>
                </>
              )}

              {error && <Text style={s.error}>{error}</Text>}

              <View style={{ gap: space.sm, marginTop: space.xl }}>
                <Button
                  title="次へ"
                  onPress={() => {
                    const problem = missing();
                    if (problem) return setError(problem);
                    setError(null);
                    setStep('confirm');
                  }}
                />
                <Button title="立場を選び直す" variant="ghost" onPress={() => setStep('role')} />
              </View>
            </>
          )}

          {/* -------------------------------------------- ③ 確認して登録 */}
          {step === 'confirm' && selected && (
            <>
              <ScreenHeader
                title="この内容で登録します"
                subtitle="立場はあとから変更できません。"
              />

              <Card style={{ marginTop: space.md }}>
                <Text style={s.confirmLabel}>あとから変更できません</Text>
                <Text style={s.confirmTitle}>{selected.label}</Text>

                <View style={s.summary}>
                  <SummaryRow label="お名前" value={displayName} />
                  {choice === 'parent' && <SummaryRow label="電話番号" value={phone} />}
                  {choice === 'student' && (
                    <>
                      <SummaryRow label="学年" value={grade} />
                      <SummaryRow label="学校名" value={school || '未入力'} />
                    </>
                  )}
                  {choice === 'tutor' && (
                    <>
                      <SummaryRow label="担当科目" value={subjects.join('・')} />
                      <SummaryRow label="経歴・自己紹介" value={bio} />
                      <SummaryRow label="指導方針" value={policy} />
                    </>
                  )}
                </View>
              </Card>

              {error && <Text style={s.error}>{error}</Text>}

              <View style={{ gap: space.sm, marginTop: space.xl }}>
                <Button title="この内容で登録する" onPress={submit} loading={saving} />
                <Button title="書き直す" variant="ghost" onPress={() => setStep('profile')} />
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.summaryRow}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={s.summaryValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, paddingTop: space.xl, paddingBottom: space.huge },
  optionActive: { borderWidth: 1, borderColor: colors.sumi },
  optionLabel: { ...font.h3, color: colors.sumi },
  optionDesc: { ...font.small, color: colors.sumiMid, marginTop: space.xs },

  // 選択の印も角を立てる。丸いラジオは使わない
  pick: {
    width: 20,
    height: 20,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.ruleDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickOn: { borderColor: colors.sumi },
  pickDot: { width: 10, height: 10, backgroundColor: colors.sumi },

  // 合言葉欄だけ共通の Input を使わない（secureTextEntry と自動補完の抑止が要る）
  secret: {
    ...font.body,
    color: colors.sumi,
    minHeight: 48,
    paddingVertical: space.sm,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.ruleDeep,
  },

  confirmLabel: { ...font.label, color: colors.shu },
  confirmTitle: { ...font.h2, color: colors.sumi, marginTop: space.sm },
  summary: { marginTop: space.lg, borderTopWidth: 1, borderTopColor: colors.rule },
  summaryRow: { paddingTop: space.md },
  summaryLabel: { ...font.label, color: colors.sumiFaint },
  summaryValue: { ...font.body, color: colors.sumi, marginTop: 2 },

  hint: { ...font.small, color: colors.sumiFaint, marginTop: space.sm },
  error: { ...font.small, color: colors.shu, marginTop: space.md },
});
