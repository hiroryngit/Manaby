// API クライアント。
// Turso と OpenRouter の資格情報はサーバー側にあるため、アプリは常にこの窓口だけを叩く。

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://manaby.duckdns.org';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// 管理 API 用のトークン。合言葉を通ったときにサーバーが発行する（src/session.tsx が設定）。
// 通常の画面では使わないため、既定では付けない。
let adminToken: string | null = null;
export const setAdminToken = (token: string | null) => {
  adminToken = token;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(adminToken && (path.startsWith('/admin') || path.startsWith('/auth/admin'))
          ? { Authorization: `Bearer ${adminToken}` }
          : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    // ネットワーク断は原因が利用者側にあることが多いので、その旨を伝える
    throw new ApiError(0, 'サーバーに接続できませんでした。通信環境を確認してください。');
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `エラーが発生しました (${res.status})`);
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
};

// --- 型定義 ------------------------------------------------------------------

export type Role = 'parent' | 'student' | 'tutor' | 'admin';

/**
 * 役割は初回登録で固定され変更できない。
 * 管理者はその役割に割り込まず、合言葉で立てる別の属性として持つ。
 */
export type User = { id: string; display_name: string; role: Role; is_admin?: boolean };

export type AdminUser = {
  id: string;
  email: string;
  display_name: string;
  role: Role;
  is_admin: boolean;
  google_linked: boolean;
  created_at: string;
  parent_id: string | null;
  parent_name: string | null;
  grade: string | null;
};

export type AdminBooking = {
  id: string;
  starts_at: string;
  status: 'requested' | 'accepted' | 'rejected' | 'cancelled';
  created_at: string;
  student_name: string;
  student_id: string;
  tutor_name: string;
  tutor_id: string;
  lesson_id: string | null;
};

export type Tutor = {
  id: string;
  display_name: string;
  subjects: string[];
  photo_url: string | null;
  rating_avg: number;
  rating_count: number;
  policy: string | null;
};

export type TutorDetail = Tutor & {
  bio: string | null;
  reviews: { rating: number; comment: string; created_at: string; author: string }[];
  availabilities: { id: string; starts_at: string; ends_at: string }[];
};

export type Dashboard = {
  student: { id: string; display_name: string; grade: string | null };
  next_lesson: { starts_at: string; tutor_name: string } | null;
  pending_homework: {
    id: string;
    subject: string;
    unit: string;
    question_count: number;
    due_at: string | null;
    status: HomeworkStatus;
  }[];
  latest_report: {
    id: string;
    status: string;
    generated_at: string;
    subject: string;
    unit: string;
    understanding_level: number;
  } | null;
};

export type HomeworkStatus = 'not_started' | 'in_progress' | 'submitted' | 'reviewed';

export type Question = { text: string; answer?: string };

export type Homework = {
  id: string;
  subject: string;
  unit: string;
  source: 'ai' | 'manual';
  question_count: number;
  difficulty: number | null;
  questions: Question[];
  due_at: string | null;
  status: HomeworkStatus;
};

export type Report = {
  id: string;
  parent_report: string | null;
  student_message: string | null;
  teaching_policy: string | null;
  status: 'draft' | 'confirmed';
  model: string | null;
  generated_at: string;
  subject: string;
  unit: string;
  content: string;
  understanding_level: number;
  concentration_level: number;
  weak_units: string[];
  tutor_comment: string | null;
  held_at: string;
};

export type LearningRecord = {
  units: { unit: string; level: number }[];
  timeline: { unit: string; level: number; recorded_at: string }[];
  lessons: {
    held_at: string;
    subject: string;
    unit: string;
    understanding_level: number;
    report_id: string | null;
  }[];
};

export type TutorStudent = {
  id: string;
  display_name: string;
  grade: string | null;
  last_lesson_at: string | null;
  unrecorded_count: number;
  pending_homework_count: number;
};

export type PendingLesson = {
  id: string;
  held_at: string;
  student_name: string;
  student_id: string;
};

export type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
};
