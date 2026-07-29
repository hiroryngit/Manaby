// API ルート定義。パターンは `METHOD /path/:param` 形式。

import { all, one, run, parseJson, newId } from './db.mjs';
import { generateReport, generateHomework } from './ai.mjs';
import { loadFreeModels, statusSnapshot } from './models.mjs';

const bad = (status, message) => Object.assign(new Error(message), { status });

const OK = { ok: true };

export const routes = {
  // --- 稼働確認 --------------------------------------------------------------

  'GET /health': async () => {
    const r = await one('select sqlite_version() as v');
    return { ok: true, db: 'up', sqlite: r.v, ...statusSnapshot() };
  },

  'GET /models': async () => ({ free_models: await loadFreeModels(), ...statusSnapshot() }),

  // --- 講師を探す（F-02） ----------------------------------------------------

  'GET /tutors': async () =>
    (
      await all(`
        select u.id, u.display_name, t.subjects, t.photo_url,
               t.rating_avg, t.rating_count, t.policy
        from users u join tutor_profiles t on t.user_id = u.id
        where u.role = 'tutor'
        order by t.rating_avg desc`)
    ).map((t) => ({ ...t, subjects: parseJson(t.subjects) })),

  'GET /tutors/:id': async (_b, { id }) => {
    const tutor = await one(
      `select u.id, u.display_name, t.bio, t.subjects, t.policy, t.photo_url,
              t.rating_avg, t.rating_count
       from users u join tutor_profiles t on t.user_id = u.id
       where u.id = ?`,
      [id],
    );
    if (!tutor) throw bad(404, '講師が見つかりません');

    return {
      ...tutor,
      subjects: parseJson(tutor.subjects),
      reviews: await all(
        `select r.rating, r.comment, r.created_at, u.display_name as author
         from reviews r join users u on u.id = r.author_id
         where r.tutor_id = ? order by r.created_at desc limit 20`,
        [id],
      ),
      availabilities: await all(
        `select id, starts_at, ends_at from availabilities
         where tutor_id = ? and starts_at > datetime('now')
         order by starts_at limit 20`,
        [id],
      ),
    };
  },

  // 予約リクエスト。講師/管理者が承認するまで requested のまま
  'POST /bookings': async (b) => {
    if (!b?.student_id || !b?.tutor_id || !b?.starts_at) {
      throw bad(400, 'student_id / tutor_id / starts_at は必須です');
    }
    const id = newId();
    await run(
      `insert into bookings (id, student_id, tutor_id, starts_at, status)
       values (?, ?, ?, ?, 'requested')`,
      [id, b.student_id, b.tutor_id, b.starts_at],
    );
    await notify(b.tutor_id, 'booking', '新しい予約リクエスト', '内容を確認してください');
    return { id, status: 'requested' };
  },

  // --- 保護者ダッシュボード（F-03） ------------------------------------------

  'GET /students/:id/dashboard': async (_b, { id }) => {
    const student = await one(
      `select u.id, u.display_name, s.grade from users u
       left join student_profiles s on s.user_id = u.id where u.id = ?`,
      [id],
    );
    if (!student) throw bad(404, '生徒が見つかりません');

    return {
      student,
      next_lesson: await one(
        `select b.starts_at, u.display_name as tutor_name
         from bookings b join users u on u.id = b.tutor_id
         where b.student_id = ? and b.status = 'accepted' and b.starts_at > datetime('now')
         order by b.starts_at limit 1`,
        [id],
      ),
      pending_homework: await all(
        `select h.id, h.subject, h.unit, h.question_count, h.due_at,
                coalesce(hs.status, 'not_started') as status
         from homeworks h
         left join homework_submissions hs on hs.homework_id = h.id
         where h.student_id = ? and coalesce(hs.status,'not_started') <> 'reviewed'
         order by h.due_at limit 10`,
        [id],
      ),
      latest_report: await one(
        `select r.id, r.status, r.generated_at, lr.subject, lr.unit,
                lr.understanding_level
         from ai_reports r
         join lesson_records lr on lr.id = r.lesson_record_id
         join lessons l on l.id = lr.lesson_id
         where l.student_id = ? and r.status = 'confirmed'
         order by r.generated_at desc limit 1`,
        [id],
      ),
    };
  },

  // --- AI 分析ノート（F-04） -------------------------------------------------

  'GET /reports/:id': async (_b, { id }) => {
    const report = await one(
      `select r.*, lr.subject, lr.unit, lr.content, lr.understanding_level,
              lr.concentration_level, lr.weak_units, lr.tutor_comment, l.held_at
       from ai_reports r
       join lesson_records lr on lr.id = r.lesson_record_id
       join lessons l on l.id = lr.lesson_id
       where r.id = ?`,
      [id],
    );
    if (!report) throw bad(404, 'レポートが見つかりません');
    return { ...report, weak_units: parseJson(report.weak_units) };
  },

  // 講師が内容を確認してから保護者に公開する
  'POST /reports/:id/confirm': async (b, { id }) => {
    const r = await one('select id from ai_reports where id = ?', [id]);
    if (!r) throw bad(404, 'レポートが見つかりません');

    await run(
      `update ai_reports set status='confirmed',
        parent_report = coalesce(?, parent_report),
        student_message = coalesce(?, student_message),
        teaching_policy = coalesce(?, teaching_policy)
       where id = ?`,
      [b?.parent_report ?? null, b?.student_message ?? null, b?.teaching_policy ?? null, id],
    );

    const owner = await one(
      `select l.student_id, sp.parent_id from ai_reports r
       join lesson_records lr on lr.id = r.lesson_record_id
       join lessons l on l.id = lr.lesson_id
       left join student_profiles sp on sp.user_id = l.student_id
       where r.id = ?`,
      [id],
    );
    for (const uid of [owner?.parent_id, owner?.student_id].filter(Boolean)) {
      await notify(uid, 'report_ready', 'レポートが完成しました', '授業の記録を確認できます');
    }
    return OK;
  },

  // --- 宿題（F-05） ----------------------------------------------------------

  'GET /students/:id/homework': async (_b, { id }) =>
    (
      await all(
        `select h.*, coalesce(hs.status,'not_started') as status, hs.id as submission_id
         from homeworks h
         left join homework_submissions hs on hs.homework_id = h.id
         where h.student_id = ? order by h.due_at desc`,
        [id],
      )
    ).map((h) => ({ ...h, questions: parseJson(h.questions) })),

  'POST /homework/:id/status': async (b, { id }) => {
    const allowed = ['not_started', 'in_progress', 'submitted', 'reviewed'];
    if (!allowed.includes(b?.status)) throw bad(400, `status は ${allowed.join('/')} のいずれか`);

    const existing = await one('select id from homework_submissions where homework_id = ?', [id]);
    const submittedAt = b.status === 'submitted' ? new Date().toISOString() : null;

    if (existing) {
      await run(
        `update homework_submissions
         set status=?, submitted_at=coalesce(?, submitted_at), updated_at=datetime('now')
         where id=?`,
        [b.status, submittedAt, existing.id],
      );
    } else {
      await run(
        `insert into homework_submissions (id, homework_id, status, submitted_at)
         values (?, ?, ?, ?)`,
        [newId(), id, b.status, submittedAt],
      );
    }
    return OK;
  },

  // --- 学習カルテ（F-06） ----------------------------------------------------

  'GET /students/:id/record': async (_b, { id }) => {
    const logs = await all(
      `select unit, level, recorded_at from understanding_logs
       where student_id = ? order by recorded_at`,
      [id],
    );
    // 単元別の最新値をレーダーチャート用にまとめる
    const byUnit = new Map();
    for (const l of logs) byUnit.set(l.unit, l.level);

    return {
      units: [...byUnit].map(([unit, level]) => ({ unit, level })),
      timeline: logs,
      lessons: await all(
        `select l.held_at, lr.subject, lr.unit, lr.understanding_level, r.id as report_id
         from lessons l
         join lesson_records lr on lr.lesson_id = l.id
         left join ai_reports r on r.lesson_record_id = lr.id and r.status='confirmed'
         where l.student_id = ? order by l.held_at desc limit 30`,
        [id],
      ),
    };
  },

  // --- 講師ホーム（F-07） ----------------------------------------------------

  'GET /tutors/:id/students': async (_b, { id }) =>
    all(
      `select u.id, u.display_name, sp.grade,
              (select max(l2.held_at) from lessons l2
                where l2.student_id = u.id and l2.tutor_id = ?) as last_lesson_at,
              (select count(*) from lessons l3
                left join lesson_records lr3 on lr3.lesson_id = l3.id
                where l3.tutor_id = ? and l3.student_id = u.id and lr3.id is null
              ) as unrecorded_count,
              (select count(*) from homeworks h
                left join homework_submissions hs on hs.homework_id = h.id
                where h.student_id = u.id and coalesce(hs.status,'not_started') = 'not_started'
              ) as pending_homework_count
       from users u
       left join student_profiles sp on sp.user_id = u.id
       where u.role='student' and exists (
         select 1 from lessons l where l.student_id = u.id and l.tutor_id = ?
         union select 1 from bookings b where b.student_id = u.id and b.tutor_id = ?)
       order by u.display_name`,
      [id, id, id, id],
    ),

  // 記録未入力の授業（授業記録入力画面の入口）
  'GET /tutors/:id/pending-lessons': async (_b, { id }) =>
    all(
      `select l.id, l.held_at, u.display_name as student_name, l.student_id
       from lessons l join users u on u.id = l.student_id
       left join lesson_records lr on lr.lesson_id = l.id
       where l.tutor_id = ? and lr.id is null
       order by l.held_at desc`,
      [id],
    ),

  // --- 授業記録入力 → AI 生成（F-08 / F-10） ---------------------------------

  'POST /lesson-records': async (b) => {
    for (const f of ['lesson_id', 'subject', 'unit', 'content']) {
      if (!b?.[f]) throw bad(400, `${f} は必須です`);
    }
    const lesson = await one('select id, student_id from lessons where id = ?', [b.lesson_id]);
    if (!lesson) throw bad(404, '授業が見つかりません');

    const recordId = newId();
    const weakUnits = JSON.stringify(b.weak_units ?? []);
    await run(
      `insert into lesson_records
        (id, lesson_id, subject, unit, content, understanding_level,
         concentration_level, weak_units, tutor_comment)
       values (?,?,?,?,?,?,?,?,?)`,
      [
        recordId,
        b.lesson_id,
        b.subject,
        b.unit,
        b.content,
        b.understanding_level ?? 3,
        b.concentration_level ?? 3,
        weakUnits,
        b.tutor_comment ?? null,
      ],
    );

    // 学習カルテ用に理解度を記録
    await run(
      `insert into understanding_logs (id, student_id, lesson_record_id, unit, level)
       values (?,?,?,?,?)`,
      [newId(), lesson.student_id, recordId, b.unit, b.understanding_level ?? 3],
    );

    // 過去の推移を踏まえた指導方針を出すため、直近の記録を文脈として渡す
    const history = await all(
      `select lr.subject, lr.unit, lr.understanding_level, lr.weak_units
       from lesson_records lr join lessons l on l.id = lr.lesson_id
       where l.student_id = ? and lr.id <> ?
       order by lr.submitted_at desc limit 5`,
      [lesson.student_id, recordId],
    );

    const reportId = newId();
    try {
      const gen = await generateReport(
        {
          subject: b.subject,
          unit: b.unit,
          content: b.content,
          understanding_level: b.understanding_level ?? 3,
          concentration_level: b.concentration_level ?? 3,
          weak_units: b.weak_units ?? [],
          tutor_comment: b.tutor_comment ?? '',
        },
        history,
      );
      await run(
        `insert into ai_reports
          (id, lesson_record_id, parent_report, student_message, teaching_policy, status, model)
         values (?,?,?,?,?, 'draft', ?)`,
        [reportId, recordId, gen.parent_report, gen.student_message, gen.teaching_policy, gen.model],
      );
      return { lesson_record_id: recordId, report_id: reportId, model: gen.model };
    } catch (e) {
      // AI が落ちても記録は残す。空の draft を作り、講師が手入力できるようにする
      await run(
        `insert into ai_reports (id, lesson_record_id, status) values (?,?, 'draft')`,
        [reportId, recordId],
      );
      return {
        lesson_record_id: recordId,
        report_id: reportId,
        ai_error: e.message,
      };
    }
  },

  // --- 宿題設定（F-09） ------------------------------------------------------

  'POST /ai/homework': async (b) => {
    for (const f of ['subject', 'unit']) if (!b?.[f]) throw bad(400, `${f} は必須です`);
    return generateHomework({
      subject: b.subject,
      unit: b.unit,
      question_count: b.question_count ?? 5,
      difficulty: b.difficulty ?? 2,
    });
  },

  'POST /homework': async (b) => {
    for (const f of ['student_id', 'subject', 'unit']) {
      if (!b?.[f]) throw bad(400, `${f} は必須です`);
    }
    const id = newId();
    const questions = b.questions ?? [];
    await run(
      `insert into homeworks
        (id, lesson_record_id, student_id, source, subject, unit,
         question_count, difficulty, questions, due_at)
       values (?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        b.lesson_record_id ?? null,
        b.student_id,
        b.source === 'ai' ? 'ai' : 'manual',
        b.subject,
        b.unit,
        questions.length || (b.question_count ?? 0),
        b.difficulty ?? 2,
        JSON.stringify(questions),
        b.due_at ?? null,
      ],
    );
    await notify(b.student_id, 'homework_added', '宿題が追加されました', `${b.subject} / ${b.unit}`);
    return { id };
  },

  // 既存の AI レポートを差し替える（生成し直し）
  'POST /reports/:id/regenerate': async (_b, { id }) => {
    const rec = await one(
      `select lr.*, l.student_id from ai_reports r
       join lesson_records lr on lr.id = r.lesson_record_id
       join lessons l on l.id = lr.lesson_id where r.id = ?`,
      [id],
    );
    if (!rec) throw bad(404, 'レポートが見つかりません');

    const gen = await generateReport(
      { ...rec, weak_units: parseJson(rec.weak_units) },
      await all(
        `select lr.subject, lr.unit, lr.understanding_level from lesson_records lr
         join lessons l on l.id = lr.lesson_id
         where l.student_id = ? and lr.id <> ? order by lr.submitted_at desc limit 5`,
        [rec.student_id, rec.id],
      ),
    );
    await run(
      `update ai_reports set parent_report=?, student_message=?, teaching_policy=?,
        model=?, status='draft', generated_at=datetime('now') where id=?`,
      [gen.parent_report, gen.student_message, gen.teaching_policy, gen.model, id],
    );
    return { id, model: gen.model };
  },

  // --- 通知（F-11） ----------------------------------------------------------

  'GET /users/:id/notifications': async (_b, { id }) =>
    all(
      `select id, kind, title, body, read_at, created_at from notifications
       where user_id = ? order by created_at desc limit 50`,
      [id],
    ),

  'POST /notifications/:id/read': async (_b, { id }) => {
    await run(`update notifications set read_at = datetime('now') where id = ?`, [id]);
    return OK;
  },

  // --- 認証（F-01） ----------------------------------------------------------

  // Google ログイン後に呼ぶ。登録済みならその利用者を、未登録なら初回登録が必要な旨を返す
  'POST /auth/session': async (b) => {
    if (!b?.auth_uid) throw bad(400, 'auth_uid は必須です');
    const user = await one(
      'select id, display_name, role from users where auth_uid = ?',
      [b.auth_uid],
    );
    return user ? { user } : { needs_onboarding: true };
  },

  // 初回登録。役割はここでのみ決まり、以後変更できない。
  // 登録済みの auth_uid で再度呼ばれても、保存済みの役割をそのまま返す。
  'POST /auth/register': async (b) => {
    for (const f of ['auth_uid', 'email', 'display_name', 'role']) {
      if (!b?.[f]) throw bad(400, `${f} は必須です`);
    }
    // admin は自己登録させない
    if (!['parent', 'student', 'tutor'].includes(b.role)) {
      throw bad(400, '役割は 保護者 / 生徒 / 講師 のいずれかです');
    }

    const existing = await one(
      'select id, display_name, role from users where auth_uid = ?',
      [b.auth_uid],
    );
    if (existing) return { user: existing, already_registered: true };

    // 同じメールで別の auth_uid が既にある場合は乗っ取りになるため拒否する
    const byEmail = await one('select id, auth_uid from users where email = ?', [b.email]);
    if (byEmail) throw bad(409, 'このメールアドレスは既に登録されています');

    const id = newId();
    await run(
      'insert into users (id, email, display_name, role, auth_uid) values (?,?,?,?,?)',
      [id, b.email, b.display_name, b.role, b.auth_uid],
    );

    // 役割ごとのプロフィール行を作る
    if (b.role === 'parent') await run('insert into parent_profiles (user_id) values (?)', [id]);
    if (b.role === 'student') await run('insert into student_profiles (user_id) values (?)', [id]);
    if (b.role === 'tutor') {
      await run('insert into tutor_profiles (user_id, subjects) values (?, ?)', [id, '[]']);
    }

    return { user: { id, display_name: b.display_name, role: b.role } };
  },

  // 保護者に紐づく生徒。保護者アカウントがどの生徒を見るかの解決に使う
  'GET /users/:id/children': async (_b, { id }) =>
    all(
      `select u.id, u.display_name, s.grade from users u
       join student_profiles s on s.user_id = u.id
       where s.parent_id = ? order by u.display_name`,
      [id],
    ),

  // --- 開発用: ログインする利用者を選ぶための一覧 ----------------------------

  'GET /users': async () =>
    all('select id, display_name, role from users order by role, display_name'),
};

async function notify(userId, kind, title, body) {
  await run(
    'insert into notifications (id, user_id, kind, title, body) values (?,?,?,?,?)',
    [newId(), userId, kind, title, body],
  );
}
