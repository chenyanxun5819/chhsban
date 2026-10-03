/**
 * 行政管理站「學生資料」：查看 student-sync Worker 的同步狀態、手動觸發同步、匯出全校學生資料。只限 super_admin。
 *
 * - 狀態：直接讀 STUDENT_KV 的 sync_status（student-sync 每次同步都會寫入，含最近 20 次記錄）
 * - 核對官方名單：上傳的 Excel（前端解析成 rows）同樣經 RPC 交給 student-sync 比對、改 status
 * - 手動同步：經 Service Binding（wrangler.toml 的 STUDENT_SYNC，entrypoint = SyncService）
 *   以 RPC 呼叫 student-sync 的 runSync()，同步邏輯只維護在 chhsban-acadoc/chhsban-acadoc/workers/sms-sync.js
 */

export interface StudentSyncService {
  runSync(options: { triggered_by?: string; force?: boolean }): Promise<unknown>;
  checkOfficialRoster(input: {
    file_name: string;
    sheet_name?: string;
    rows: Array<{ student_no: string; class?: string; name_cn?: string; name_en?: string; gender?: string }>;
    triggered_by?: string;
    dry_run?: boolean;
  }): Promise<unknown>;
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
    const [status, metadata, official] = await Promise.all([
      env.STUDENT_KV.get("sync_status", "json"),
      env.STUDENT_KV.get("metadata", "json"),
      env.STUDENT_KV.get<any>("official_roster", "json"),
    ]);
    // 官方名單只回摘要（名單本身約兩千多筆，不需要傳給前端）
    const officialSummary = official
      ? {
          file_name: official.file_name,
          sheet_name: official.sheet_name,
          uploaded_at: official.uploaded_at,
          uploaded_by: official.uploaded_by,
          total: official.total,
          absent_count: (official.absent || []).length,
          previous_year: official.previous_year || null,
        }
      : null;
    return json(
      { data: { status: status || null, metadata: metadata || null, official_roster: officialSummary } },
      200,
      corsHeaders,
    );
  }

  // GET /api/admin/student-sync/students：全校學生（含離校）完整資料，供管理站匯出 Excel（1 次 KV 讀取）
  if (request.method === "GET" && pathname === "/api/admin/student-sync/students") {
    const [students, metadata] = await Promise.all([
      env.STUDENT_KV.get("students_by_no", "json"),
      env.STUDENT_KV.get("metadata", "json"),
    ]);
    return json({ data: { students: students || {}, metadata: metadata || null } }, 200, corsHeaders);
  }

  // POST /api/admin/student-sync/official-roster：核對官方名單
  // body { file_name, sheet_name, rows, dry_run }；dry_run 只回傳比對結果，確認後再送一次正式寫入
  if (request.method === "POST" && pathname === "/api/admin/student-sync/official-roster") {
    const body: any = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.rows) || body.rows.length === 0) {
      return json({ error: "名單是空的，請確認 Excel 內容" }, 400, corsHeaders);
    }
    const triggeredBy = session.teacher_name_cn || session.teacher_name_en || session.teacher_id || "";
    try {
      const result = await env.STUDENT_SYNC.checkOfficialRoster({
        file_name: String(body.file_name || ""),
        sheet_name: String(body.sheet_name || ""),
        rows: body.rows,
        triggered_by: triggeredBy,
        dry_run: Boolean(body.dry_run),
      });
      return json({ data: result }, 200, corsHeaders);
    } catch (error: any) {
      console.error("[student-sync] official roster check failed:", error);
      return json({ error: error?.message || "核對失敗" }, 500, corsHeaders);
    }
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
