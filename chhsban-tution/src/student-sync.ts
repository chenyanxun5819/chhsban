/**
 * 行政管理站「學生名單同步」：查看 student-sync Worker 的同步狀態、手動觸發同步。只限 super_admin。
 *
 * - 狀態：直接讀 STUDENT_KV 的 sync_status（student-sync 每次同步都會寫入，含最近 20 次記錄）
 * - 手動同步：經 Service Binding（wrangler.toml 的 STUDENT_SYNC，entrypoint = SyncService）
 *   以 RPC 呼叫 student-sync 的 runSync()，同步邏輯只維護在 chhsban-acadoc/chhsban-acadoc/workers/sms-sync.js
 */

export interface StudentSyncService {
  runSync(options: { triggered_by?: string; force?: boolean }): Promise<unknown>;
}

interface StudentSyncEnv {
  STUDENT_KV: KVNamespace;
  STUDENT_SYNC: StudentSyncService;
}

function json(data: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(data), { status, headers });
}

export async function handleStudentSync(
  request: Request,
  env: StudentSyncEnv,
  session: any,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  if (session.permission !== "super_admin") {
    return json({ error: "Forbidden" }, 403, corsHeaders);
  }

  const { pathname } = new URL(request.url);

  // GET /api/admin/student-sync：同步狀態與最近記錄
  if (request.method === "GET" && pathname === "/api/admin/student-sync") {
    const [status, metadata] = await Promise.all([
      env.STUDENT_KV.get("sync_status", "json"),
      env.STUDENT_KV.get("metadata", "json"),
    ]);
    return json({ data: { status: status || null, metadata: metadata || null } }, 200, corsHeaders);
  }

  // POST /api/admin/student-sync/run：手動同步，body { force?: boolean }
  if (request.method === "POST" && pathname === "/api/admin/student-sync/run") {
    const body: any = await request.json().catch(() => ({}));
    const triggeredBy = session.teacher_name_cn || session.teacher_name_en || session.teacher_id || "";
    try {
      const run = await env.STUDENT_SYNC.runSync({ triggered_by: triggeredBy, force: Boolean(body?.force) });
      return json({ data: run }, 200, corsHeaders);
    } catch (error: any) {
      console.error("[student-sync] RPC failed:", error);
      return json({ error: `無法呼叫同步服務：${error?.message || error}` }, 502, corsHeaders);
    }
  }

  return json({ error: "Not found" }, 404, corsHeaders);
}
