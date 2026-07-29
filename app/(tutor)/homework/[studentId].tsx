// ⑨ 宿題設定画面（F-09）
// AI生成 と 手入力 を切り替える。AI の結果は確定前に必ず確認できる。

import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, type Question } from '../../../src/api';
import { notify } from '../../../src/dialog';
import {
  Button, Card, Chip, Input, Row, SectionTitle, Segmented,
} from '../../../src/components/ui';
import { colors, font, space } from '../../../src/theme';

const SUBJECTS = ['算数', '数学', '国語', '英語', '理科', '社会'];
const COUNTS = [3, 5, 10];
const DIFFICULTIES = [
  { value: 1, label: '易' },
  { value: 2, label: '標準' },
  { value: 3, label: '難' },
];

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

  const manualCount = manualText.split('\n').filter((t) => t.trim()).length;

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
        setError('AIが問題を作れませんでした。手入力に切り替えるか、もう一度お試しください。');
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
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'ai', label: 'AIに作らせる' },
          { value: 'manual', label: '自分で書く' },
        ]}
      />

      <SectionTitle>教科</SectionTitle>
      <Row style={{ gap: space.xs, flexWrap: 'wrap' }}>
        {SUBJECTS.map((sub) => (
          <Chip key={sub} label={sub} active={subject === sub} onPress={() => setSubject(sub)} />
        ))}
      </Row>

      <SectionTitle>単元</SectionTitle>
      <Input value={unit} onChangeText={setUnit} placeholder="例: 割合" />

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

          <View style={{ marginTop: space.xl }}>
            <Button
              title={generating ? 'AIが作っています…' : 'AIで作る'}
              onPress={generate}
              loading={generating}
              variant="secondary"
            />
          </View>

          {questions && (
            <>
              <SectionTitle>下書き（確認してから確定してください）</SectionTitle>
              <View style={{ gap: space.sm }}>
                {questions.map((q, i) => (
                  <Card key={i}>
                    <Row style={{ gap: space.md, alignItems: 'flex-start' }}>
                      <Text style={s.qNum}>問{i + 1}</Text>
                      <Text style={s.qText}>{q.text}</Text>
                    </Row>
                    {q.answer && <Text style={s.answer}>解答 {q.answer}</Text>}
                  </Card>
                ))}
              </View>
              {usedModel && <Text style={s.model}>生成モデル {usedModel}</Text>}
            </>
          )}
        </>
      ) : (
        <>
          <SectionTitle>問題（1行に1問）</SectionTitle>
          <Input
            value={manualText}
            onChangeText={setManualText}
            multiline
            minHeight={200}
            placeholder={'2/3 × 3/4 を計算しなさい。\n5/6 × 2/5 を計算しなさい。'}
          />
          <Text style={s.count}>{manualCount}問</Text>
        </>
      )}

      {error && <Text style={s.error}>{error}</Text>}

      <View style={{ marginTop: space.xl }}>
        <Button
          title={mode === 'ai' ? 'この内容で確定する' : '宿題を設定する'}
          onPress={save}
          loading={saving}
          disabled={mode === 'ai' && !questions?.length}
          variant="mark"
          size="lg"
        />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.lg, paddingBottom: space.huge },
  qNum: { ...font.num, color: colors.ao, minWidth: 30 },
  qText: { ...font.body, color: colors.sumi, flex: 1 },
  answer: { ...font.small, color: colors.sumiFaint, marginTop: space.sm, marginLeft: 42 },
  count: { ...font.num, color: colors.sumiFaint, marginTop: space.sm, textAlign: 'right' },
  model: { ...font.num, color: colors.sumiFaint, textAlign: 'center', marginTop: space.md },
  error: { ...font.small, color: colors.shu, marginTop: space.lg },
});
