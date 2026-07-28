// 無料モデルの自動フォールバック
//
// `:free` モデルは上流プロバイダの共有枠で提供されるため、
// 混雑すると 429 を返す。単一モデル固定だとその都度生成が失敗するので、
// 使える無料モデルを一覧で持ち、429/5xx の間は順に切り替える。

const CATALOG_URL = 'https://openrouter.ai/api/v1/models';
const CATALOG_TTL_MS = 60 * 60 * 1000; // 1時間

// 429 を返したモデルを一定時間だけ避ける（復帰したら自然に再利用される）
const COOLDOWN_MS = 10 * 60 * 1000;

let catalog = { models: [], fetchedAt: 0 };
const cooldownUntil = new Map();

/** OpenRouter のモデル一覧から `:free` のものだけを取得する */
export async function loadFreeModels({ force = false } = {}) {
  const fresh = Date.now() - catalog.fetchedAt < CATALOG_TTL_MS;
  if (!force && fresh && catalog.models.length) return catalog.models;

  try {
    const res = await fetch(CATALOG_URL, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`catalog HTTP ${res.status}`);
    const { data } = await res.json();

    const models = data
      .filter((m) => m.id.endsWith(':free'))
      // 出力トークン上限が大きい順。レポート生成が途中で切れるのを避ける
      .sort(
        (a, b) =>
          (b.top_provider?.max_completion_tokens ?? 0) -
          (a.top_provider?.max_completion_tokens ?? 0),
      )
      .map((m) => m.id);

    catalog = { models, fetchedAt: Date.now() };
    console.log(`[models] 無料モデル ${models.length} 件を取得`);
  } catch (e) {
    console.error('[models] 一覧の取得に失敗:', e.message);
    // 取得できなくても、前回分が残っていればそれを使い続ける
  }
  return catalog.models;
}

/**
 * 試行するモデルを優先順に返す。
 * preferred を先頭に置き、クールダウン中のものは後ろへ回す。
 */
export async function candidateModels(preferred) {
  const free = await loadFreeModels();
  const now = Date.now();

  const ordered = [preferred, ...free.filter((m) => m !== preferred)].filter(Boolean);
  const available = ordered.filter((m) => (cooldownUntil.get(m) ?? 0) <= now);

  // 全部クールダウン中なら、それでも一度は試す（枠が回復している可能性がある）
  return available.length ? available : ordered;
}

export function markRateLimited(model) {
  cooldownUntil.set(model, Date.now() + COOLDOWN_MS);
  console.warn(`[models] ${model} を ${COOLDOWN_MS / 60000} 分間スキップします`);
}

export function statusSnapshot() {
  const now = Date.now();
  return {
    free_model_count: catalog.models.length,
    cooling_down: [...cooldownUntil.entries()]
      .filter(([, until]) => until > now)
      .map(([m, until]) => ({ model: m, seconds_left: Math.round((until - now) / 1000) })),
  };
}
