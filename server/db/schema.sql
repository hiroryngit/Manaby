-- manaby スキーマ（Turso / libSQL = SQLite 3.45）
-- README「8.2 データモデル案」に対応
--
-- 適用: turso db shell manaby < server/db/schema.sql
-- 冪等に書いてあるため、再実行しても既存データは壊れません。

PRAGMA foreign_keys = ON;

-- ============================================================
-- アカウント
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('parent','student','tutor','admin')),
  -- Firebase Auth の uid。Google ログインの突き合わせに使う
  auth_uid    TEXT UNIQUE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS parent_profiles (
  user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone       TEXT
);

CREATE TABLE IF NOT EXISTS student_profiles (
  user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  -- 保護者アカウント配下の生徒。独立アカウントの場合は NULL
  parent_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
  grade       TEXT,
  school_name TEXT
);
CREATE INDEX IF NOT EXISTS idx_student_parent ON student_profiles(parent_id);

CREATE TABLE IF NOT EXISTS tutor_profiles (
  user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio         TEXT,
  -- 担当科目・指導方針。SQLite に配列型がないため JSON 文字列で保持
  subjects    TEXT NOT NULL DEFAULT '[]',
  policy      TEXT,
  photo_url   TEXT,
  rating_avg  REAL NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- 予約・授業（F-02）
-- ============================================================

CREATE TABLE IF NOT EXISTS availabilities (
  id          TEXT PRIMARY KEY,
  tutor_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  starts_at   TEXT NOT NULL,
  ends_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_avail_tutor_time ON availabilities(tutor_id, starts_at);

CREATE TABLE IF NOT EXISTS reviews (
  id          TEXT PRIMARY KEY,
  tutor_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reviews_tutor ON reviews(tutor_id);

CREATE TABLE IF NOT EXISTS bookings (
  id          TEXT PRIMARY KEY,
  student_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tutor_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  starts_at   TEXT NOT NULL,
  -- 予約リクエストは講師/管理者が承認するまで確定しない（F-02）
  status      TEXT NOT NULL DEFAULT 'requested'
              CHECK (status IN ('requested','accepted','rejected','cancelled')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bookings_tutor ON bookings(tutor_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_bookings_student ON bookings(student_id, starts_at);

CREATE TABLE IF NOT EXISTS lessons (
  id          TEXT PRIMARY KEY,
  booking_id  TEXT UNIQUE REFERENCES bookings(id) ON DELETE SET NULL,
  student_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tutor_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  held_at     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lessons_student ON lessons(student_id, held_at);

-- ============================================================
-- 授業記録と AI 生成（F-08 / F-10）
-- ============================================================

CREATE TABLE IF NOT EXISTS lesson_records (
  id            TEXT PRIMARY KEY,
  lesson_id     TEXT NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
  subject       TEXT NOT NULL,
  unit          TEXT NOT NULL,
  content       TEXT NOT NULL,
  understanding_level INTEGER NOT NULL CHECK (understanding_level BETWEEN 1 AND 5),
  concentration_level INTEGER NOT NULL CHECK (concentration_level BETWEEN 1 AND 5),
  weak_units    TEXT NOT NULL DEFAULT '[]',   -- JSON 配列
  tutor_comment TEXT,
  submitted_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- lesson_records と分離してある理由:
--   AI 生成のやり直し・履歴管理を可能にするため。
--   status が confirmed になるまで保護者には公開しない（講師の確認が前提）。
CREATE TABLE IF NOT EXISTS ai_reports (
  id               TEXT PRIMARY KEY,
  lesson_record_id TEXT NOT NULL REFERENCES lesson_records(id) ON DELETE CASCADE,
  parent_report    TEXT,
  student_message  TEXT,
  teaching_policy  TEXT,
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed')),
  -- 実際に生成に使われたモデル。無料モデルはフォールバックで変わるため記録する
  model            TEXT,
  generated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reports_record ON ai_reports(lesson_record_id);

-- ============================================================
-- 宿題（F-05 / F-09）
-- ============================================================

CREATE TABLE IF NOT EXISTS homeworks (
  id               TEXT PRIMARY KEY,
  lesson_record_id TEXT REFERENCES lesson_records(id) ON DELETE CASCADE,
  student_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- AI 生成の採用率を KPI として計測するため区別する
  source           TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('ai','manual')),
  subject          TEXT NOT NULL,
  unit             TEXT NOT NULL,
  question_count   INTEGER NOT NULL DEFAULT 0,
  difficulty       INTEGER CHECK (difficulty BETWEEN 1 AND 3),
  questions        TEXT NOT NULL DEFAULT '[]',  -- JSON 配列
  due_at           TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_homework_student ON homeworks(student_id, due_at);

CREATE TABLE IF NOT EXISTS homework_submissions (
  id           TEXT PRIMARY KEY,
  homework_id  TEXT NOT NULL REFERENCES homeworks(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'not_started'
               CHECK (status IN ('not_started','in_progress','submitted','reviewed')),
  submitted_at TEXT,
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_submission_homework ON homework_submissions(homework_id);

-- ============================================================
-- 学習カルテ・通知（F-06 / F-11）
-- ============================================================

-- 単元別の理解度推移。学習カルテの時系列可視化を効率化するため独立テーブルにする
CREATE TABLE IF NOT EXISTS understanding_logs (
  id          TEXT PRIMARY KEY,
  student_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_record_id TEXT REFERENCES lesson_records(id) ON DELETE CASCADE,
  unit        TEXT NOT NULL,
  level       INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ulog_student_unit ON understanding_logs(student_id, unit, recorded_at);

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('report_ready','homework_added','booking')),
  title       TEXT NOT NULL,
  body        TEXT,
  read_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, created_at);

-- ============================================================
-- 管理者（F-12）
-- ============================================================
--
-- 役割（role）は初回登録で固定され変更できない。
-- 管理者はそこに割り込まず「属性」として後から付く ——
-- 合言葉を知っている人だけが自分で立ち上げる。
--
-- ※ 既存 DB には server/db/migrations/002_admin.sql を当てる。

-- users に後付けする列（新規構築時は下の ALTER が効かないため、
-- 既存環境との差を無くす目的でここに記録だけしておく）:
--   is_admin           INTEGER NOT NULL DEFAULT 0
--   admin_activated_at TEXT

-- 管理 API 用のトークン。Google の ID トークンは1時間で切れるため、
-- 管理操作にはこちらを使う。平文は保存せず SHA-256 のみ持つ。
CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(user_id);
