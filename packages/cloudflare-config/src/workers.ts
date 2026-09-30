/**
 * Worker 配置定義
 */

export interface WorkerConfig {
  name: string;
  mainFile: string;
  kvNamespaces: string[];
  description: string;
  cronTriggers?: string[];
  environmentVariables?: Record<string, string>;
}

export const WORKERS = {
  acadoc: {
    name: "student-sync",
    mainFile: "chhsban-acadoc/workers/sms-sync.js",
    kvNamespaces: ["STUDENT_KV", "TEACHER_KV", "AUTH_KV"] as string[],
    description: "公文系統 - SMS 學生同步 Worker",
    cronTriggers: ["0 16 * * 7", "0 16 * * 2"] as string[],
    environmentVariables: {
      SMS_BASE_URL: "http://sms.chhsban.edu.my",
    },
  },
  tution: {
    name: "tution-system",
    mainFile: "src/index.ts",
    kvNamespaces: ["STUDENT_KV", "TEACHER_KV", "AUTH_KV", "TUTION_CLASS_KV", "TUTION_ROSTER_KV", "TUTION_ATTENDANCE_KV", "TUTION_SCHEDULE_KV"] as string[],
    description: "補習班系統 - 開課點名管理 Worker",
    environmentVariables: {},
  },
  optionalCourse: {
    name: "optional-course-system",
    mainFile: "optional-course/worker/src/index.ts",
    kvNamespaces: ["STUDENT_KV", "TEACHER_KV", "AUTH_KV", "CLASSROOM_KV", "OPTIONAL_COURSE_KV", "OPTIONAL_COURSE_ROSTER_KV", "OPTIONAL_COURSE_SCHEDULE_KV", "OPTIONAL_COURSE_ATTENDANCE_KV"] as string[],
    description: "選修課點名系統 - 行政人員開課程窗口＋綁定老師，老師自行管理名冊/排課/點名",
    environmentVariables: {},
  },
};

export type WorkerKey = keyof typeof WORKERS;

export function getWorkerConfig(key: WorkerKey): WorkerConfig {
  return WORKERS[key];
}
