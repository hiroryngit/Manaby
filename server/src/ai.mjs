// OpenRouter への中継。無料モデルが 429 を返す前提でフォールバックする。

import { candidateModels, markRateLimited } from './models.mjs';

const { OPENROUTER_API_KEY, OPENROUTER_MODEL = 'google/gemma-4-31b-it:free' } = process.env;

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

function fail(status, message, detail) {
  const e = new Error(message);
  e.status = status;
  if (detail) e.detail = detail;
  return e;
}

/**
 * 使えるモデルが見つかるまで順に試す。
 * 429/5xx はモデルを変えれば通る可能性があるので次へ、
 * 401/400 は変えても直らないので即座に失敗させる。
 */
export async function chat(messages, { preferred } = {}) {
  if (!OPENROUTER_API_KEY) throw fail(503, 'OPENROUTER_API_KEY が未設定です');

  const models = await candidateModels(preferred ?? OPENROUTER_MODEL);
  const attempts = [];

  for (const model of models) {
    let res;
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages }),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (e) {
      attempts.push({ model, error: e.message });
      continue;
    }

    if (res.ok) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content ?? '';
      if (text.trim()) return { text, model, attempts };
      attempts.push({ model, status: 200, error: 'empty response' });
      continue;
    }

    attempts.push({ model, status: res.status });
    if (res.status === 429 || res.status >= 500) {
      if (res.status === 429) markRateLimited(model);
      continue;
    }
    throw fail(
      res.status === 401 ? 500 : 502,
      `OpenRouter がエラーを返しました: ${res.status}`,
      await res.text().catch(() => ''),
    );
  }

  throw fail(
    503,
    `利用可能な無料モデルがありません（${attempts.length}件すべて失敗）`,
    JSON.stringify(attempts),
  );
}

const REPORT_SYSTEM = `あなたは家庭教師の授業記録から、保護者・生徒・講師それぞれに向けた文章を作成します。
必ず次の JSON 形式のみを出力してください。前置きや説明、コードフェンスは書かないでください。

{
  "parent_report": "保護者向けレポート。専門用語を使わず1分で読み切れる分量。「できたこと」「つまずいた点」「今後の方針」を必ず含める",
  "student_message": "生徒本人へのメッセージ。否定形を避け、次にやることを1つだけ明確に示す。2〜3文",
  "teaching_policy": "講師向けの次回指導方針の提案。具体的な単元とアプローチを含める。2〜3文"
}`;

const HOMEWORK_SYSTEM = `あなたは家庭教師の宿題を作成します。
指定された教科・単元・問題数・難易度に従い、必ず次の JSON 形式のみを出力してください。
前置きや説明、コードフェンスは書かないでください。

{ "questions": [ { "text": "問題文", "answer": "解答" } ] }`;

/** モデルの出力から JSON を取り出す。前後に地の文が付く場合があるため緩めに拾う */
function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function generateReport(lessonRecord, history = []) {
  const { text, model, attempts } = await chat([
    { role: 'system', content: REPORT_SYSTEM },
    {
      role: 'user',
      content: JSON.stringify({ lesson: lessonRecord, recent_history: history }),
    },
  ]);

  const parsed = extractJson(text);
  // JSON が壊れていても本文は返す。講師が確認・修正する前提なので破棄しない
  return {
    parent_report: parsed?.parent_report ?? text,
    student_message: parsed?.student_message ?? '',
    teaching_policy: parsed?.teaching_policy ?? '',
    model,
    attempts,
  };
}

export async function generateHomework({ subject, unit, question_count, difficulty }) {
  const { text, model, attempts } = await chat([
    { role: 'system', content: HOMEWORK_SYSTEM },
    {
      role: 'user',
      content: `教科: ${subject} / 単元: ${unit} / 問題数: ${question_count} / 難易度: ${difficulty}（1=易 3=難）`,
    },
  ]);

  const parsed = extractJson(text);
  const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];
  return { questions, raw: questions.length ? undefined : text, model, attempts };
}
