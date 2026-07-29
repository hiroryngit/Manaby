// ⑨ 宿題設定画面（F-09）
// AI生成 と 手入力 をタブで切り替える。AI の結果は確定前に必ず確認できる。

import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, type Question } from '../../../src/api';
import { Badge, Button, Card, Row, SectionTitle } from '../../../src/components/ui';
import { colors, font, radius, space } from '../../../src/theme';

const SUBJECTS = ['算数', '数学', '国語', '英語', '理科', '社会'];
const COUNTS = [3, 5, 10];
const DIFFICULTIES = [
  { value: 1, label: '易' },
  { value: 2, label: '標準' },
  { value: 3, label: '難' },
];

function notify(message: string) {
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert(message);
}

export default function HomeworkSetup() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const router = useRouter();

  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [subject, setSubject] = useState('算数');
  const [unit, setUnit] = useState('');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState(2);

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [manualText, setManualText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedModel, setUsedModel] = useState<string | null>(null);

  const generate = async () => {
    if (!unit.trim()) {
      setError('単元を入力してください');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await api.post<{ questions: Question[]; model: string; raw?: string }>(
        '/ai/homework',
        { subject, unit: unit.trim(), question_count: count, difficulty },
      );
      if (!res.questions.length) {
        setError('AIが問題を生成できませんでした。手入力に切り替えるか、再度お試しください。');
      }
      setQuestions(res.questions);
      setUsedModel(res.model);
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成に失敗しました');
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    const payload =
      mode === 'ai'
        ? questions ?? []
        : manualText
            .split('\n')
            .map((t) => t.trim())
            .filter(Boolean)
            .map((text) => ({ text }));

    if (!unit.trim()) return setError('単元を入力してください');
    if (payload.length === 0) return setError('問題が1問もありません');

    setSaving(true);
    setError(null);
    try {
      await api.post('/homework', {
        student_id: studentId,
        subject,
        unit: unit.trim(),
        source: mode,
        difficulty,
        questions: payload,
      });
      notify('宿題を設定しました。生徒に通知されます。');
      router.replace('/(tutor)');
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
      {/* モード切替 */}
      <Row style={s.tabs}>
        {(['ai', 'manual'] as const).map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} style={[s.tab, mode === m && s.tabActive]}>
            <Text style={[s.tabText, mode === m && s.tabTextActive]}>
              {m === 'ai' ? 'AI生成' : '手入力'}
            </Text>
          </Pressable>
        ))}
      </Row>

      <SectionTitle>教科</SectionTitle>
      <Row style={{ gap: space.xs, flexWrap: 'wrap' }}>
        {SUBJECTS.map((sub) => (
          <Chip key={sub} label={sub} active={subject === sub} onPress={() => setSubject(sub)} />
        ))}
      </Row>

      <SectionTitle>単元</SectionTitle>
      <TextInput
        style={s.input}
        value={unit}
        onChangeText={setUnit}
        placeholder="例: 割合"
        placeholderTextColor={colors.faint}
      />

      {mode === 'ai' ? (
        <>
          <SectionTitle>問題数</SectionTitle>
          <Row style={{ gap: space.xs }}>
            {COUNTS.map((c) => (
              <Chip key={c} label={`${c}問`} active={count === c} onPress={() => setCount(c)} />
            ))}
          </Row>

          <SectionTitle>難易度</SectionTitle>
          <Row style={{ gap: space.xs }}>
            {DIFFICULTIES.map((d) => (
              <Chip
                key={d.value}
                label={d.label}
                active={difficulty === d.value}
                onPress={() => setDifficulty(d.value)}
              />
            ))}
          </Row>

          <View style={{ marginTop: space.lg }}>
            <Button
              title={generating ? 'AIが生成中…' : 'AIで生成する'}
              onPress={generate}
              loading={generating}
              variant="secondary"
            />
          </View>

          {questions && (
            <>
              <SectionTitle>生成結果（確認してから確定してください）</SectionTitle>
              {questions.map((q, i) => (
                <Card key={i} style={{ marginBottom: space.sm }}>
                  <Row style={{ gap: space.sm }}>
                    <Text style={s.qNum}>問{i + 1}</Text>
                    <Text style={s.qText}>{q.text}</Text>
                  </Row>
                  {q.answer && <Text style={s.answer}>解答: {q.answer}</Text>}
                </Card>
              ))}
              {usedModel && <Text style={s.model}>生成モデル: {usedModel}</Text>}
            </>
          )}
        </>
      ) : (
        <>
          <SectionTitle>問題（1行に1問）</SectionTitle>
          <TextInput
            style={[s.input, { minHeight: 200 }]}
            value={manualText}
            onChangeText={setManualText}
            multiline
            placeholder={'2/3 × 3/4 を計算しなさい。\n5/6 × 2/5 を計算しなさい。'}
            placeholderTextColor={colors.faint}
          />
          <Row style={{ marginTop: space.sm }}>
            <Badge
              label={`${manualText.split('\n').filter((t) => t.trim()).length}問`}
              tone="brand"
            />
          </Row>
        </>
      )}

      {error && <Text style={s.error}>{error}</Text>}

      <View style={{ marginTop: space.lg }}>
        <Button
          title={mode === 'ai' ? 'この内容で確定する' : '宿題を設定する'}
          onPress={save}
          loading={saving}
          disabled={mode === 'ai' && !questions?.length}
        />
      </View>
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Text
      onPress={onPress}
      style={[
        s.chip,
        active
          ? { backgroundColor: colors.brandSoft, color: colors.brandInk, borderColor: colors.brandSoft }
          : { backgroundColor: colors.surface, color: colors.muted, borderColor: colors.border },
      ]}
    >
      {label}
    </Text>
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, paddingBottom: space.xxl },
  tabs: {
    backgroundColor: colors.border,
    borderRadius: radius.md,
    padding: 3,
    gap: 3,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center' },
  tabActive: { backgroundColor: colors.surface },
  tabText: { ...font.h3, color: colors.muted },
  tabTextActive: { color: colors.brand },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    minHeight: 48,
    ...font.body,
    color: colors.text,
    textAlignVertical: 'top',
  },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    overflow: 'hidden',
    ...font.small,
  },
  qNum: { ...font.small, color: colors.brand, fontWeight: '700', minWidth: 32 },
  qText: { ...font.body, color: colors.text, flex: 1, lineHeight: 22 },
  answer: { ...font.small, color: colors.muted, marginTop: space.sm, marginLeft: 40 },
  model: { ...font.tiny, color: colors.faint, textAlign: 'center' },
  error: { ...font.small, color: colors.danger, marginTop: space.md },
});
