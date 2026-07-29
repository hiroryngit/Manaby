-- デモ用データ。画面が空にならないように最低限を入れる。
-- 適用: turso db shell manaby < server/db/seed.sql
-- 固定 ID を使い、再実行しても増殖しないよう insert or replace にしてある。

-- 保護者 1 / 生徒 2 / 講師 2
insert or replace into users (id, email, display_name, role) values
  ('u-parent-1',  'parent1@example.com',  '佐藤 美咲',   'parent'),
  ('u-student-1', 'student1@example.com', '佐藤 陽翔',   'student'),
  ('u-student-2', 'student2@example.com', '佐藤 結愛',   'student'),
  ('u-tutor-1',   'tutor1@example.com',   '田中 健一',   'tutor'),
  ('u-tutor-2',   'tutor2@example.com',   '鈴木 彩',     'tutor'),
  ('u-admin-1',   'admin@example.com',    '管理者',       'admin');

insert or replace into parent_profiles (user_id, phone) values ('u-parent-1', '090-0000-0000');

insert or replace into student_profiles (user_id, parent_id, grade, school_name) values
  ('u-student-1', 'u-parent-1', '小学6年', '第一小学校'),
  ('u-student-2', 'u-parent-1', '中学2年', '第一中学校');

insert or replace into tutor_profiles
  (user_id, bio, subjects, policy, rating_avg, rating_count) values
  ('u-tutor-1', '大学で数学を専攻。中学受験の指導歴8年。',
   '["算数","数学","理科"]',
   'つまずいた原因を一緒に言語化することを大切にしています。', 4.6, 24),
  ('u-tutor-2', '英語・国語を担当。読解の型を教えるのが得意です。',
   '["英語","国語"]',
   '暗記に頼らず、文の構造から理解してもらいます。', 4.8, 31);

-- 空き日程（今日から数日分）
insert or replace into availabilities (id, tutor_id, starts_at, ends_at) values
  ('av-1', 'u-tutor-1', datetime('now','+1 day','start of day','+17 hours'), datetime('now','+1 day','start of day','+19 hours')),
  ('av-2', 'u-tutor-1', datetime('now','+3 day','start of day','+17 hours'), datetime('now','+3 day','start of day','+19 hours')),
  ('av-3', 'u-tutor-2', datetime('now','+2 day','start of day','+16 hours'), datetime('now','+2 day','start of day','+18 hours'));

insert or replace into reviews (id, tutor_id, author_id, rating, comment) values
  ('rv-1', 'u-tutor-1', 'u-parent-1', 5, '苦手だった割合が解けるようになりました。'),
  ('rv-2', 'u-tutor-2', 'u-parent-1', 5, '長文読解の点数が安定してきました。');

-- 予約（承認済み・次回授業として表示される）
insert or replace into bookings (id, student_id, tutor_id, starts_at, status) values
  ('bk-1', 'u-student-1', 'u-tutor-1', datetime('now','+1 day','start of day','+17 hours'), 'accepted'),
  ('bk-2', 'u-student-2', 'u-tutor-2', datetime('now','+2 day','start of day','+16 hours'), 'accepted');

-- 実施済みの授業
insert or replace into lessons (id, booking_id, student_id, tutor_id, held_at) values
  ('ls-1', null, 'u-student-1', 'u-tutor-1', datetime('now','-7 day')),
  ('ls-2', null, 'u-student-1', 'u-tutor-1', datetime('now','-3 day')),
  -- 記録未入力（講師ホームにバッジが出る）
  ('ls-3', null, 'u-student-1', 'u-tutor-1', datetime('now','-1 day')),
  ('ls-4', null, 'u-student-2', 'u-tutor-2', datetime('now','-2 day'));

insert or replace into lesson_records
  (id, lesson_id, subject, unit, content, understanding_level,
   concentration_level, weak_units, tutor_comment) values
  ('lr-1', 'ls-1', '算数', '分数のかけ算', '分数×分数の計算と約分の練習', 4, 4,
   '[]', '計算は正確。約分の見落としが時々ある。'),
  ('lr-2', 'ls-2', '算数', '割合', '百分率と歩合の変換、割合の3用法', 3, 4,
   '["割合の第3用法"]', '公式は覚えているが文章題で立式に迷う。'),
  ('lr-3', 'ls-4', '英語', '不定詞', '名詞的用法・形容詞的用法の識別', 3, 3,
   '["形容詞的用法"]', '用法の区別があいまい。');

insert or replace into ai_reports
  (id, lesson_record_id, parent_report, student_message, teaching_policy, status, model) values
  ('rp-1', 'lr-1',
   '**できたこと**
分数どうしのかけ算は、手順を覚えてスムーズに解けていました。

**つまずいた点**
約分をし忘れる場面が何度かありました。答えは合っていても、最後まで簡単にする習慣がまだついていません。

**今後の方針**
計算の最後に「これ以上割れないか」を確認する手順を、声に出して確認する練習を入れます。',
   'かけ算の手順はばっちりでした。次は最後に約分できないか、ひと呼吸おいて確かめてみよう。',
   '約分の確認をルーチン化させる。計算過程に確認ステップを明示的に挟ませる。',
   'confirmed', 'google/gemma-4-31b-it:free'),
  ('rp-2', 'lr-2',
   '**できたこと**
百分率と歩合の変換は、ほぼ正確にできていました。

**つまずいた点**
文章問題になると、何を基準にするかの判断に迷う場面がありました。

**今後の方針**
図を使って「何に対して何％か」を整理してから式を立てる手順を練習します。',
   '変換の計算はよくできていました。次は文章題を、まず図にしてから解いてみよう。',
   '割合の第3用法を線分図で可視化させる。立式前に基準量を指差し確認させる。',
   'confirmed', 'nvidia/nemotron-3-super-120b-a12b:free');

insert or replace into homeworks
  (id, lesson_record_id, student_id, source, subject, unit,
   question_count, difficulty, questions, due_at) values
  ('hw-1', 'lr-2', 'u-student-1', 'ai', '算数', '割合', 3, 2,
   '[{"text":"定価800円の品物を25%引きで買いました。代金はいくらですか。","answer":"600円"},{"text":"ある数の40%が60です。ある数はいくつですか。","answer":"150"},{"text":"120人の35%は何人ですか。","answer":"42人"}]',
   datetime('now','+2 day')),
  ('hw-2', 'lr-1', 'u-student-1', 'manual', '算数', '分数のかけ算', 2, 1,
   '[{"text":"2/3 × 3/4 を計算しなさい。","answer":"1/2"},{"text":"5/6 × 2/5 を計算しなさい。","answer":"1/3"}]',
   datetime('now','-1 day')),
  ('hw-3', 'lr-3', 'u-student-2', 'ai', '英語', '不定詞', 2, 2,
   '[{"text":"次の文の不定詞の用法を答えなさい: I have a lot of work to do.","answer":"形容詞的用法"},{"text":"次の文の不定詞の用法を答えなさい: To read books is fun.","answer":"名詞的用法"}]',
   datetime('now','+3 day'));

insert or replace into homework_submissions (id, homework_id, status, submitted_at) values
  ('hs-1', 'hw-2', 'reviewed', datetime('now','-2 day'));

-- 学習カルテ（レーダーチャート・推移用）
insert or replace into understanding_logs
  (id, student_id, lesson_record_id, unit, level, recorded_at) values
  ('ul-1', 'u-student-1', 'lr-1', '分数のかけ算', 4, datetime('now','-7 day')),
  ('ul-2', 'u-student-1', 'lr-2', '割合', 3, datetime('now','-3 day')),
  ('ul-3', 'u-student-1', null,   '図形', 4, datetime('now','-14 day')),
  ('ul-4', 'u-student-1', null,   '速さ',   2, datetime('now','-10 day')),
  ('ul-5', 'u-student-1', null,   '場合の数', 5, datetime('now','-20 day')),
  ('ul-6', 'u-student-2', 'lr-3', '不定詞', 3, datetime('now','-2 day'));

insert or replace into notifications (id, user_id, kind, title, body) values
  ('nt-1', 'u-parent-1', 'report_ready',   'レポートが完成しました', '算数 / 割合 の授業レポート'),
  ('nt-2', 'u-student-1','homework_added', '宿題が追加されました',   '算数 / 割合（3問）');
