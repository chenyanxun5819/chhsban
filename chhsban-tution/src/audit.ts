/**
 * 審計日誌：記錄關鍵寫入操作（who/when/what/before→after）。
 * 目前只落地存資料，沒有查詢介面。寫入失敗只記 console.error，絕不影響原本的業務操作
 * （呼叫端一律搭配 ctx.waitUntil 非阻塞寫入，不拖慢原本 API 的回應時間）。
 */

export type AuditAction =
  | "roster.add"
  | "roster.withdraw"
  | "roster.update_enrollment_date"
  | "class.approve"
  | "class.reject"
  | "class.delete"
  | "receipt.review"
  | "teacher.password_reset";

export interface AuditLogEntry {
  audit_id: string;
  action: AuditAction;
  target_type: "class" | "roster" | "teacher";
  target_id: string;
  actor_id: string;
  actor_name?: string;
  actor_permission: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  created_at: number;
}

const AUDIT_TTL_SECONDS = 400 * 24 * 60 * 60;

interface AuditEnv {
  AUDIT_LOG_KV: KVNamespace;
}

export async function logAudit(
  env: AuditEnv,
  entry: Omit<AuditLogEntry, "audit_id" | "created_at">,
): Promise<void> {
  try {
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const record: AuditLogEntry = {
      ...entry,
      audit_id: auditId,
      created_at: Date.now(),
    };
    // 保存 13 個月後由 KV 自動刪除（學年重置後不留舊學年的學生資料，也不必另外排程清理）
    await env.AUDIT_LOG_KV.put(auditId, JSON.stringify(record), { expirationTtl: AUDIT_TTL_SECONDS });
  } catch (error) {
    console.error("[AUDIT] Failed to write audit log:", error);
  }
}
