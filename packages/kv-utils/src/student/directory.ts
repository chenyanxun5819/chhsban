/**
 * 學生名錄：讀 students_KV 的 `students_by_no`（student-sync Worker 從 SMS 同步、並經官方名單核對的全校學生資料）。
 *
 * 取代舊的「每位學生一個 key」（student:{學號}、student:{內部編號}、student_no:{學號}），
 * 那批資料是早期 Python 腳本寫入的，不會自動更新。
 *
 * - 整份名錄只讀 1 次 KV；解析後在同一個 Worker isolate 內快取 CACHE_TTL_MS，
 *   同時間的多個查詢共用同一次讀取（Promise 快取），避免每位學生各讀一次 KV。
 * - 學生不會被刪除：離校的 status 為 "left"、STAR 班為 "excluded"，由呼叫端決定怎麼處理。
 */

import type { KVNamespace } from "../types/index.js";

const DIRECTORY_KEY = "students_by_no";
const CACHE_TTL_MS = 60_000;

export type StudentStatus = "active" | "left" | "excluded";

export interface DirectoryHistoryEntry {
  from: string | null;
  to: string | null;
  date: string;
}

export interface DirectoryStudent {
  student_id: string; // SMS 內部編號（名冊的 student_id 存的是這個）
  student_no: string; // 學號
  name_cn: string;
  name_en: string;
  real_class_name: string;
  input_class_name?: string;
  gender_boarding: string | null;
  status?: StudentStatus; // 舊資料沒有 status 時視為 active
  left_at?: string;
  left_reason?: "leave_class" | "removed" | "not_in_official_list";
  excluded_reason?: string;
  class_history?: DirectoryHistoryEntry[];
  boarding_history?: DirectoryHistoryEntry[];
  [key: string]: unknown;
}

interface DirectoryData {
  byNo: Map<string, DirectoryStudent>;
  byId: Map<string, DirectoryStudent>;
}

let cache: { loadedAt: number; promise: Promise<DirectoryData> } | null = null;

async function loadDirectory(kv: KVNamespace): Promise<DirectoryData> {
  const raw = await kv.get(DIRECTORY_KEY);
  const parsed: Record<string, DirectoryStudent> = raw ? JSON.parse(raw) : {};
  const byNo = new Map<string, DirectoryStudent>();
  const byId = new Map<string, DirectoryStudent>();
  for (const [no, student] of Object.entries(parsed)) {
    byNo.set(no, student);
    if (student.student_id) byId.set(String(student.student_id), student);
  }
  return { byNo, byId };
}

export function studentStatus(student: DirectoryStudent | null | undefined): StudentStatus | null {
  if (!student) return null;
  return student.status || "active";
}

export function isLeftSchool(student: DirectoryStudent | null | undefined): boolean {
  return studentStatus(student) === "left";
}

export class StudentDirectory {
  constructor(private kv: KVNamespace) {}

  private data(): Promise<DirectoryData> {
    const now = Date.now();
    if (!cache || now - cache.loadedAt > CACHE_TTL_MS) {
      const promise = loadDirectory(this.kv);
      cache = { loadedAt: now, promise };
      // 讀取失敗不要把錯誤快取起來，下次呼叫重讀
      promise.catch(() => {
        if (cache?.promise === promise) cache = null;
      });
    }
    return cache.promise;
  }

  /** 依學號查 */
  async getByNo(studentNo: string): Promise<DirectoryStudent | null> {
    return (await this.data()).byNo.get(String(studentNo).trim()) || null;
  }

  /** 依 SMS 內部編號（名冊的 student_id）查 */
  async getById(studentId: string): Promise<DirectoryStudent | null> {
    return (await this.data()).byId.get(String(studentId).trim()) || null;
  }

  /**
   * 學號或內部編號都可以（使用者輸入、或舊名冊條目 student_id 有時存的是學號）：先當學號查，再當內部編號查。
   * 學號是 5 位數（2xxxx），內部編號目前是 4 位數，兩者不會重疊。
   */
  async getStudent(identifier: string): Promise<DirectoryStudent | null> {
    const data = await this.data();
    const key = String(identifier).trim();
    return data.byNo.get(key) || data.byId.get(key) || null;
  }
}

export function createStudentDirectory(kv: KVNamespace): StudentDirectory {
  return new StudentDirectory(kv);
}
