import React, { useCallback, useEffect, useState } from "react";
import { Layout } from "@/shared/components/Layout";
import tutionApi from "@/tution/api";
import { errorMessage, formatTime } from "@/data/components/ChangeList";
import "@/data/styles/student-sync.css";

/**
 * 【一次性工具，清完即可刪除】維護 → 舊學生資料清理（只限 super_admin）。
 * 每天按一次，刪除 students_KV 裡最多 900 個不再使用的舊 key（Cloudflare 免費版每天刪除額度 1,000）。
 * 後端見 chhsban-tution/src/legacy-cleanup.ts；移除方式見頁面下方的提示語。
 */

interface CleanupRun {
  date: string;
  at: string;
  by: string;
  deleted: number;
  remaining: number;
}

interface CleanupStatus {
  remaining: number;
  by_type: { student_key: number; student_no_index: number; class_lists: number; others: number };
  daily_limit: number;
  ran_today: boolean;
  runs: CleanupRun[];
}

// 清完之後交給 Copilot 移除這個工具用的提示語
const REMOVAL_PROMPT = `請幫我移除「舊學生資料清理」這個一次性工具（students_KV 的舊資料已經清完，不再需要）：

1. 刪除檔案 chhsban-tution/src/legacy-cleanup.ts
2. chhsban-tution/src/index.ts：刪除 import { handleLegacyCleanup } from "./legacy-cleanup" 這一行，
   以及 pathname.startsWith("/api/admin/legacy-cleanup") 的路由區塊
3. 刪除檔案 admin-portal/src/data/pages/LegacyCleanup.tsx
4. admin-portal/src/App.tsx：刪除 LegacyCleanup 的 import 與 /maintenance/legacy-cleanup 的 <Route>
5. admin-portal/src/shared/components/Layout.tsx：刪除側邊欄「維護」群組（舊學生資料清理）
6. admin-portal/src/shared/access.ts：刪除 "/maintenance/legacy-cleanup" 這一行
7. （選做）packages/kv-utils：StudentKVManager、createStudentKVManager、KV_CONFIG.STUDENT_PREFIX
   讀的是已刪除的舊 key（student:{…}），確認沒有其他地方使用後一併移除；
   chhsban-acadoc/chhsban-acadoc/workers/auth-example.ts 與 packages/kv-utils/examples/ 是範例檔，也有用到
8. 確認 admin-portal（npx tsc --noEmit、npm run build）與 chhsban-tution（npm run build）都能通過

改完後需要重新部署 chhsban-tution（cd chhsban-tution; npx wrangler deploy，不要加 --env production），
admin-portal 推到 master 會自動部署。
另外 students_KV 裡的 legacy_cleanup_log 這個 key 也可以手動刪掉。`;

const LegacyCleanup: React.FC = () => {
  const [status, setStatus] = useState<CleanupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await tutionApi.get("/admin/legacy-cleanup", { timeout: 60000 });
      setStatus(res.data.data);
    } catch (err: any) {
      setError(errorMessage(err, "讀取失敗"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async () => {
    if (!status) return;
    const count = Math.min(status.remaining, status.daily_limit);
    if (!window.confirm(`確定要刪除 ${count} 個舊學生資料 key 嗎？\n（這些資料已不再使用，刪除後無法復原）`)) return;
    setRunning(true);
    setError(null);
    setMessage(null);
    try {
      const res = await tutionApi.post("/admin/legacy-cleanup/run", {}, { timeout: 120000 });
      const r: CleanupRun = res.data.data;
      setMessage(`已刪除 ${r.deleted} 個，還剩 ${r.remaining} 個。`);
    } catch (err: any) {
      setError(errorMessage(err, "刪除失敗"));
    } finally {
      setRunning(false);
      load();
    }
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(REMOVAL_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("請手動複製：", REMOVAL_PROMPT);
    }
  };

  const done = status?.remaining === 0;
  const daysLeft = status ? Math.ceil(status.remaining / status.daily_limit) : 0;

  return (
    <Layout title="舊學生資料清理">
      <div className="ss-page">
        <div className="card">
          <h2 className="ss-card-title">舊學生資料清理</h2>
          <p className="ss-muted">
            students_KV 裡早期寫入的「每位學生一個 key」（student:…、student_no:…）已不再使用，
            補習班與選修課都改讀新的學生名錄。Cloudflare 免費版每天只能刪除 1,000 個 key，
            所以每天按一次，每次刪除最多 {status?.daily_limit ?? 900} 個。
            額度在馬來西亞時間每天早上 8 點（UTC 00:00）重置。
          </p>

          {error && <div className="notice error-text ss-error">{error}</div>}
          {message && <p className="success-text ss-result">{message}</p>}

          {loading && !status ? (
            <p className="ss-muted">載入中...</p>
          ) : status ? (
            <>
              <div className="ss-stats" style={{ marginTop: 12 }}>
                <div className="ss-stat">
                  <div className="ss-stat__label">剩餘舊資料</div>
                  <div className="ss-stat__value">{status.remaining}</div>
                  <div className="ss-stat__sub">{done ? "已全部清除" : `約還需 ${daysLeft} 天`}</div>
                </div>
                <div className="ss-stat">
                  <div className="ss-stat__label">student:（學號／內部編號）</div>
                  <div className="ss-stat__value">{status.by_type.student_key}</div>
                </div>
                <div className="ss-stat">
                  <div className="ss-stat__label">student_no:（索引）</div>
                  <div className="ss-stat__value">{status.by_type.student_no_index}</div>
                </div>
                <div className="ss-stat">
                  <div className="ss-stat__label">舊班級清單與其他</div>
                  <div className="ss-stat__value">{status.by_type.class_lists + status.by_type.others}</div>
                </div>
              </div>

              <div className="ss-upload">
                <button className="btn btn--danger" onClick={run} disabled={running || status.ran_today || done}>
                  {running
                    ? "刪除中..."
                    : done
                      ? "已全部清除"
                      : status.ran_today
                        ? "今天已執行，明天再按"
                        : `🗑 刪除今天的 ${Math.min(status.remaining, status.daily_limit)} 個`}
                </button>
              </div>

              {status.runs.length > 0 && (
                <>
                  <h4 className="ss-subtitle">執行記錄</h4>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>時間</th>
                        <th>執行人</th>
                        <th>刪除</th>
                        <th>剩餘</th>
                      </tr>
                    </thead>
                    <tbody>
                      {status.runs.map((r) => (
                        <tr key={r.at}>
                          <td>{formatTime(r.at)}</td>
                          <td>{r.by || "-"}</td>
                          <td>{r.deleted}</td>
                          <td>{r.remaining}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          ) : null}
        </div>

        <div className="card">
          <h3 className="ss-card-title">清完後：移除這個工具</h3>
          <p className="ss-muted">
            剩餘數量變成 0 之後，這個頁面就不需要了。把下面的提示語貼給 Copilot，即可移除相關程式碼。
          </p>
          <pre className="ss-prompt">{REMOVAL_PROMPT}</pre>
          <button className="btn" onClick={copyPrompt}>
            {copied ? "✅ 已複製" : "📋 複製提示語"}
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default LegacyCleanup;
