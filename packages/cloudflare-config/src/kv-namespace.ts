/**
 * Cloudflare KV 命名空間配置
 * 所有 Worker 的 KV 綁定都在此集中管理
 */

export const CLOUDFLARE_ACCOUNT_ID = "82d225cda80f37208228877b32268b26";

export interface KVNamespaceConfig {
  binding: string;
  id: string;
  description: string;
}

export const KV_NAMESPACES = {
  STUDENT_KV: {
    binding: "STUDENT_KV",
    id: "9d870e2344c84c74a1ed2f2851c93408",
    description: "存放學生資料（班級、姓名、學號等）",
  },
  TEACHER_KV: {
    binding: "TEACHER_KV",
    id: "8892dc8c30984f4591850521a1b57ed8",
    description: "存放老師資料（名字、部門、權限等）",
  },
  AUTH_KV: {
    binding: "AUTH_KV",
    id: "8ddeccbeeae9440fafba384d35205a81",
    description: "驗證身份用（session tokens，配合 TEACHER_KV）",
  },
  TUTION_CLASS_KV: {
    binding: "TUTION_CLASS_KV",
    id: "16fbdfd4c5e2444ebea8c55d313e00f8",
    description: "補習班系統 - 補習班開課記錄（主表）",
  },
  TUTION_ROSTER_KV: {
    binding: "TUTION_ROSTER_KV",
    id: "ab63a42d9b6643e3ae5b17e7f807da03",
    description: "補習班系統 - 補習班學生名單（子表1）",
  },
  TUTION_ATTENDANCE_KV: {
    binding: "TUTION_ATTENDANCE_KV",
    id: "d16847622dd244bb9d1d235cdfce6d1c",
    description: "補習班系統 - 學生出勤紀錄（子表2）",
  },
  TUTION_SCHEDULE_KV: {
    binding: "TUTION_SCHEDULE_KV",
    id: "f95d69ef1fc347f29c9936605e9ccfde",
    description: "補習班系統 - 排課例外記錄（無開課/調課，子表3）",
  },
  CLASSROOM_KV: {
    binding: "CLASSROOM_KV",
    id: "43882431a6344d929976a1281ffca873",
    description: "教室管理系統 - 存放教室資料（編號、名稱、班級、桌數、補習選用狀態）",
  }
} as const;

export type KVNamespaceKey = keyof typeof KV_NAMESPACES;

/**
 * 返回所有 KV namespace 配置
 */
export function getAllKVNamespaces(): KVNamespaceConfig[] {
  return Object.values(KV_NAMESPACES);
}

/**
 * 根據 binding 名稱返回對應的 KV 配置
 */
export function getKVNamespace(key: KVNamespaceKey): KVNamespaceConfig {
  return KV_NAMESPACES[key];
}

/**
 * 返回 wrangler.toml 格式的 KV namespace 配置陣列
 * 用於生成 wrangler.toml 文件
 */
export function generateWranglerKVConfig() {
  return Object.entries(KV_NAMESPACES).map(([_, config]) => ({
    binding: config.binding,
    id: config.id,
  }));
}
