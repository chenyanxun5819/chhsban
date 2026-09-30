/**
 * 【一次性工具，清完即可刪除】舊學生資料清理（行政管理站「維護 → 舊學生資料清理」，只限 super_admin）。
 *
 * students_KV 裡早期 Python 腳本寫入的「每位學生一個 key」已不再使用（tution、optional-course 改讀
 * students_by_no，見 packages/kv-utils 的 StudentDirectory），這裡分批刪除：
 *   student:{學號}、student:{內部編號}、student_no:{學號}
 *   以及 student-sync 舊版留下、已不再更新的 students:{班級}、updated_time、last_sync_date、sync_error_log
 *
 * Cloudflare 免費版每天（UTC 00:00 重置）只能刪除 1,000 個 key，所以每次最多刪 DAILY_LIMIT 個，
 * 同一個 UTC 日只能執行一次（記錄在 legacy_cleanup_log）。
 *
 * 移除這個工具：刪掉本檔、index.ts 裡 handleLegacyCleanup 的 import 與路由、
 * admin-portal 的 src/data/pages/LegacyCleanup.tsx 及其路由／側邊欄／權限設定。
 */

const DAILY_LIMIT = 900;
const DELETE_CONCURRENCY = 50;
const LOG_KEY = "legacy_cleanup_log";
const LEGACY_PREFIXES = ["student:", "student_no:", "students:"];
const LEGACY_SINGLE_KEYS = ["updated_time", "last_sync_date", "sync_error_log"];

interface LegacyCleanupEnv {
  STUDENT_KV: KVNamespace;
}

interface CleanupRun {
  date: string; // UTC 日期（配額以 UTC 計）
  at: string;
  by: string;
  deleted: number;
  remaining: number;
}

interface CleanupLog {
  runs: CleanupRun[];
}

function json(data: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(data), { status, headers });
}

const utcDate = () => new Date().toISOString().slice(0, 10);

/** 只刪確定是舊格式的 key，避免誤刪 students_by_no 等新資料 */
function isLegacyKey(name: string): boolean {
  return (
    /^student:\d+$/.test(name) ||
    /^student_no:\d+$/.test(name) ||
    name.startsWith("students:") ||
    LEGACY_SINGLE_KEYS.includes(name)
  );
}

async function listLegacyKeys(kv: KVNamespace): Promise<string[]> {
  const names: string[] = [];
  for (const prefix of LEGACY_PREFIXES) {
    let cursor: string | undefined;
    do {
      const page: any = await kv.list({ prefix, cursor });
      for (const key of page.keys) {
        if (isLegacyKey(key.name)) names.push(key.name);
      }
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
  }
  const singles = await Promise.all(LEGACY_SINGLE_KEYS.map(async (k) => ((await kv.get(k)) !== null ? k : null)));
  return [...names, ...singles.filter((k): k is string => k !== null)];
}

function countByType(names: string[]) {
  return {
    student_key: names.filter((n) => n.startsWith("student:")).length,
    student_no_index: names.filter((n) => n.startsWith("student_no:")).length,
    class_lists: names.filter((n) => n.startsWith("students:")).length,
    others: names.filter((n) => LEGACY_SINGLE_KEYS.includes(n)).length,
  };
}

export async function handleLegacyCleanup(
  request: Request,
  env: LegacyCleanupEnv,
  session: any,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  if (session.permission !== "super_admin") {
    return json({ error: "Forbidden" }, 403, corsHeaders);
  }

  const { pathname } = new URL(request.url);
  const log: CleanupLog = (await env.STUDENT_KV.get(LOG_KEY, "json")) || { runs: [] };
  const ranToday = log.runs.some((r) => r.date === utcDate());

  // GET /api/admin/legacy-cleanup：剩餘數量與執行記錄
  if (request.method === "GET" && pathname === "/api/admin/legacy-cleanup") {
    const names = await listLegacyKeys(env.STUDENT_KV);
    return json(
      {
        data: {
          remaining: names.length,
          by_type: countByType(names),
          daily_limit: DAILY_LIMIT,
          ran_today: ranToday,
          runs: log.runs,
        },
      },
      200,
      corsHeaders,
    );
  }

  // POST /api/admin/legacy-cleanup/run：刪除最多 DAILY_LIMIT 個
  if (request.method === "POST" && pathname === "/api/admin/legacy-cleanup/run") {
    if (ranToday) {
      return json({ error: "今天已執行過（Cloudflare 刪除額度每天 UTC 00:00，即馬來西亞時間早上 8 點重置），請明天再按。" }, 409, corsHeaders);
    }

    // 保險：新資料（students_by_no）必須存在，才刪舊資料
    const directory = await env.STUDENT_KV.get("students_by_no");
    if (!directory || directory.length < 1000) {
      return json({ error: "找不到新的學生名錄（students_by_no），為避免系統沒有學生資料，已停止刪除。" }, 409, corsHeaders);
    }

    const names = await listLegacyKeys(env.STUDENT_KV);
    const batch = names.slice(0, DAILY_LIMIT);
    let deleted = 0;
    for (let i = 0; i < batch.length; i += DELETE_CONCURRENCY) {
      const chunk = batch.slice(i, i + DELETE_CONCURRENCY);
      await Promise.all(chunk.map((name) => env.STUDENT_KV.delete(name)));
      deleted += chunk.length;
    }

    const run: CleanupRun = {
      date: utcDate(),
      at: new Date().toISOString(),
      by: session.teacher_name_cn || session.teacher_name_en || session.teacher_id || "",
      deleted,
      remaining: names.length - deleted,
    };
    await env.STUDENT_KV.put(LOG_KEY, JSON.stringify({ runs: [run, ...log.runs].slice(0, 30) }));

    return json({ data: run }, 200, corsHeaders);
  }

  return json({ error: "Not found" }, 404, corsHeaders);
}
