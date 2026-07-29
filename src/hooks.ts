import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

/** GET を叩いて state に載せるだけの薄いフック。画面ごとの定型処理をまとめる */
export function useFetch<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(() => {
    if (!path) return;
    setLoading(true);
    setError(null);
    api
      .get<T>(path)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [path]);

  useEffect(reload, [reload]);

  return { data, error, loading, reload, setData };
}

/** 「2026-07-29 17:00:00」形式を画面表示用に整える */
export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/**
 * 日付チップ用に月と日を別々に取り出す。
 * 「7月29日」のような文字列から数字だけ抜いて切る手は、
 * 「12月5日」→"125"→"25"、「10月9日」→"109"→"09" のように日を壊す。
 */
export function splitDate(value: string | null | undefined) {
  if (!value) return { month: '—', day: '—' };
  const d = new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return { month: '—', day: '—' };
  return { month: `${d.getMonth() + 1}月`, day: String(d.getDate()) };
}
