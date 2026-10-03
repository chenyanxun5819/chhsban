import React, { useCallback, useEffect, useState } from "react";
import { Layout } from "@/shared/components/Layout";
import tutionApi from "@/tution/api";
import { ChangeList, countChanges, errorMessage, formatTime, type SyncChanges } from "@/data/components/ChangeList";
import "@/data/styles/student-sync.css";

/**
 * 學生資料 → 學生名單同步（只限 super_admin）。
 * 同步本身由 student-sync Worker 執行（每週定時 + 這裡手動），寫入 students_KV；
 * 這頁透過 tution-system 讀取 sync_status 顯示工作狀態，並可手動觸發同步。
 */

interface SmsTerm {
  year: number;
  semester: number;
}

const termLabel = (term: SmsTerm | null | undefined): string =>
  term ? `${term.year} 第${term.semester === 1 ? "一" : "二"}學期` : "-";

interface SyncRun {
  started_at: string;
  finished_at: string;
  duration_ms: number;
  trigger: "cron" | "manual" | "official_roster";
  triggered_by: string;
  forced: boolean;
  result: "success" | "failed" | "blocked";
  error: string | null;
  total_fetched: number;
  active_students: number;
  left_students: number;
  excluded_students?: number;
  total_classes: number;
  changes: SyncChanges;
  sms_term?: SmsTerm | null;
  new_academic_year?: boolean;
  log?: string[];
}

interface SyncStatusResponse {
  status: { last_run: SyncRun; last_success_at: string | null; runs: SyncRun[] } | null;
  metadata: {
    total_students: number;
    left_students?: number;
    excluded_students?: number;
    total_classes: number;
    updated_at: string;
    sms_term?: SmsTerm | null;
  } | null;
  official_roster: {
    file_name: string;
    sheet_name: string;
    uploaded_at: string;
    uploaded_by: string;
    total: number;
    absent_count: number;
  } | null;
}

const RESULT_LABEL: Record<SyncRun["result"], { text: string; className: string }> = {
  success: { text: "成功", className: "badge badge--open" },
  failed: { text: "失敗", className: "badge badge--missing" },
  blocked: { text: "已攔下（未寫入）", className: "badge badge--pending" },
};

function triggerLabel(run: SyncRun): string {
  if (run.trigger === "cron") return "自動同步";
  if (run.trigger === "official_roster") return `核對官方名單（${run.triggered_by || "-"}）`;
  return `手動同步（${run.triggered_by || "-"}）${run.forced ? "・強制" : ""}`;
}

const StudentSync: React.FC = () => {
  const [data, setData] = useState<SyncStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await tutionApi.get("/admin/student-sync");
      setData(res.data.data);
    } catch (err: any) {
      setError(errorMessage(err, "讀取同步狀態失敗"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runSync = async (force: boolean) => {
    const message = force
      ? "強制同步會略過「人數驟降」保險，直接以這次 SMS 名單為準，找不到的學生都會標記為離校。\n請確認 SMS 名單正常後再執行，確定嗎？"
      : "確定要立即從 SMS 同步學生名單嗎？";
    if (!window.confirm(message)) return;

    setRunning(true);
    setError(null);
    try {
      // 同步約需數秒，給足時間
      await tutionApi.post("/admin/student-sync/run", { force }, { timeout: 120000 });
    } catch (err: any) {
      setError(errorMessage(err, "同步失敗"));
    } finally {
      setRunning(false);
      load();
    }
  };

  const lastRun = data?.status?.last_run;
  const runs = data?.status?.runs || [];

  return (
    <Layout title="學生名單同步">
      <div className="ss-page">
        <div className="ss-header">
          <div>
            <h2>學生名單同步</h2>
            <p className="ss-muted">
              從 SMS 同步全校學生到 students_KV。每週日、週二凌晨 00:00（馬來西亞時間）自動執行；
              學生調班、離校會記錄在學生資料中，不會刪除。STAR 班不計入在校生；
              核對過官方名單後，名單外的學生維持離校，直到下一份名單再列入。
              SMS 換到新學年時，上一學年的官方名單自動停用；新學年初 SMS 名單還沒建好時，同步會失敗或被攔下，原資料不受影響。
            </p>
          </div>
          <div className="ss-actions">
            <button className="btn" onClick={load} disabled={loading || running}>
              重新整理
            </button>
            <button className="btn btn--primary" onClick={() => runSync(false)} disabled={running}>
              {running ? "同步中..." : "立即同步"}
            </button>
          </div>
        </div>

        {error && <div className="notice error-text">{error}</div>}

        {loading && !data ? (
          <div className="card">載入中...</div>
        ) : !lastRun ? (
          <div className="card">
            <p className="ss-muted">尚無同步記錄。</p>
            {data?.metadata && (
              <p className="ss-muted">
                KV 現有資料：{data.metadata.total_students} 人、{data.metadata.total_classes} 班，
                更新於 {formatTime(data.metadata.updated_at)}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="card">
              <h3 className="ss-card-title">工作狀態</h3>
              <div className="ss-stats">
                <div className="ss-stat">
                  <div className="ss-stat__label">最近一次（{triggerLabel(lastRun)}）</div>
                  <div className="ss-stat__value">
                    <span className={RESULT_LABEL[lastRun.result].className}>{RESULT_LABEL[lastRun.result].text}</span>
                  </div>
                  <div className="ss-stat__sub">{formatTime(lastRun.finished_at)}</div>
                </div>
                <div className="ss-stat">
                  <div className="ss-stat__label">SMS 目前學期</div>
                  <div className="ss-stat__value ss-stat__value--text">{termLabel(lastRun.sms_term ?? data?.metadata?.sms_term)}</div>
                  {lastRun.new_academic_year && <div className="ss-stat__sub">新學年（上學年官方名單已停用）</div>}
                </div>
                <div className="ss-stat">
                  <div className="ss-stat__label">上次 SMS 同步成功</div>
                  <div className="ss-stat__value ss-stat__value--text">{formatTime(data?.status?.last_success_at)}</div>
                </div>
                <div className="ss-stat">
                  <div className="ss-stat__label">在校學生</div>
                  <div className="ss-stat__value">{data?.metadata?.total_students ?? "-"}</div>
                  <div className="ss-stat__sub">{data?.metadata?.total_classes ?? "-"} 個班</div>
                </div>
                <div className="ss-stat">
                  <div className="ss-stat__label">已離校（保留記錄）</div>
                  <div className="ss-stat__value">{data?.metadata?.left_students ?? "-"}</div>
                </div>
                <div className="ss-stat">
                  <div className="ss-stat__label">不計入（STAR 班）</div>
                  <div className="ss-stat__value">{data?.metadata?.excluded_students ?? "-"}</div>
                </div>
              </div>

              <p className="ss-muted ss-official">
                {data?.official_roster
                  ? `官方名單：${data.official_roster.file_name}（${data.official_roster.total} 人），` +
                    `${formatTime(data.official_roster.uploaded_at)} 由 ${data.official_roster.uploaded_by || "-"} 核對，` +
                    `名單外 ${data.official_roster.absent_count} 人標記為離校。`
                  : "尚未核對官方名單（可到「核對官方名單」上傳 Excel）。"}
              </p>

              {lastRun.result !== "success" && lastRun.error && (
                <div className="notice error-text ss-error">{lastRun.error}</div>
              )}
              {lastRun.result === "blocked" && (
                <div className="ss-force">
                  <button className="btn btn--danger" onClick={() => runSync(true)} disabled={running}>
                    確認 SMS 名單無誤，強制同步
                  </button>
                </div>
              )}

              <h4 className="ss-subtitle">本次變動（{countChanges(lastRun.changes)}）</h4>
              <ChangeList changes={lastRun.changes} />

              {lastRun.log && lastRun.log.length > 0 && (
                <details className="ss-log">
                  <summary>執行日誌</summary>
                  <pre>{lastRun.log.join("\n")}</pre>
                </details>
              )}
            </div>

            <div className="card">
              <h3 className="ss-card-title">最近同步記錄</h3>
              <div className="ss-table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>時間</th>
                      <th>觸發</th>
                      <th>結果</th>
                      <th>在校 / 離校 / 不計入</th>
                      <th>變動</th>
                      <th>耗時</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => {
                      const changes = countChanges(run.changes);
                      const isOpen = expanded === run.started_at;
                      return (
                        <React.Fragment key={run.started_at}>
                          <tr>
                            <td>{formatTime(run.started_at)}</td>
                            <td>
                              {triggerLabel(run)}
                            </td>
                            <td>
                              <span className={RESULT_LABEL[run.result].className}>{RESULT_LABEL[run.result].text}</span>
                            </td>
                            <td>{run.result === "success"
                                ? `${run.active_students} / ${run.left_students} / ${run.excluded_students ?? "-"}`
                                : "-"}</td>
                            <td>
                              {changes > 0 ? (
                                <button className="btn btn--small" onClick={() => setExpanded(isOpen ? null : run.started_at)}>
                                  {changes} 筆{isOpen ? "（收起）" : ""}
                                </button>
                              ) : (
                                "0"
                              )}
                            </td>
                            <td>{Math.round(run.duration_ms / 1000)} 秒</td>
                          </tr>
                          {isOpen && (
                            <tr>
                              <td colSpan={6} className="ss-expanded">
                                <ChangeList changes={run.changes} />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default StudentSync;
