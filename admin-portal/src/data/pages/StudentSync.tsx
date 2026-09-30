import React, { useCallback, useEffect, useState } from "react";
import { Layout } from "@/shared/components/Layout";
import tutionApi from "@/tution/api";
import "@/data/styles/student-sync.css";

/**
 * 資料更新 → 學生名單同步（只限 super_admin）。
 * 同步本身由 student-sync Worker 執行（每週定時 + 這裡手動），寫入 students_KV；
 * 這頁透過 tution-system 讀取 sync_status 顯示工作狀態，並可手動觸發同步。
 */

interface StudentBrief {
  student_no: string;
  name_cn: string;
  name_en: string;
}

interface SyncChanges {
  joined: Array<StudentBrief & { class: string }>;
  left: Array<StudentBrief & { class: string; reason: "leave_class" | "removed"; left_class?: string }>;
  rejoined: Array<StudentBrief & { class: string }>;
  transferred: Array<StudentBrief & { from: string; to: string }>;
  boarding: Array<StudentBrief & { from: string | null; to: string | null }>;
}

interface SyncRun {
  started_at: string;
  finished_at: string;
  duration_ms: number;
  trigger: "cron" | "manual";
  triggered_by: string;
  forced: boolean;
  result: "success" | "failed" | "blocked";
  error: string | null;
  total_fetched: number;
  active_students: number;
  left_students: number;
  total_classes: number;
  changes: SyncChanges;
  log?: string[];
}

interface SyncStatusResponse {
  status: { last_run: SyncRun; last_success_at: string | null; runs: SyncRun[] } | null;
  metadata: { total_students: number; left_students?: number; total_classes: number; updated_at: string } | null;
}

const RESULT_LABEL: Record<SyncRun["result"], { text: string; className: string }> = {
  success: { text: "成功", className: "badge badge--open" },
  failed: { text: "失敗", className: "badge badge--missing" },
  blocked: { text: "已攔下（未寫入）", className: "badge badge--pending" },
};

const LEFT_REASON_LABEL: Record<string, string> = {
  leave_class: "SMS 移到離校班",
  removed: "已從 SMS 刪除",
};

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("zh-TW", { hour12: false });
}

function countChanges(c: SyncChanges | undefined): number {
  if (!c) return 0;
  return c.joined.length + c.left.length + c.rejoined.length + c.transferred.length + c.boarding.length;
}

function errorMessage(err: any, fallback: string): string {
  return err?.response?.data?.error || err?.message || fallback;
}

const studentLabel = (s: StudentBrief) => `${s.student_no} ${s.name_cn || s.name_en}`;

const ChangeList: React.FC<{ changes: SyncChanges }> = ({ changes }) => {
  if (countChanges(changes) === 0) {
    return <p className="ss-muted">本次沒有學生變動。</p>;
  }
  return (
    <table className="table ss-changes">
      <thead>
        <tr>
          <th>類型</th>
          <th>學生</th>
          <th>內容</th>
        </tr>
      </thead>
      <tbody>
        {changes.left.map((s) => (
          <tr key={`left-${s.student_no}`}>
            <td><span className="badge badge--missing">離校</span></td>
            <td>{studentLabel(s)}</td>
            <td>
              {s.class}・{LEFT_REASON_LABEL[s.reason] || s.reason}
              {s.left_class ? `（${s.left_class}）` : ""}
            </td>
          </tr>
        ))}
        {changes.transferred.map((s) => (
          <tr key={`tr-${s.student_no}`}>
            <td><span className="badge badge--pending">調班</span></td>
            <td>{studentLabel(s)}</td>
            <td>{s.from} → {s.to}</td>
          </tr>
        ))}
        {changes.boarding.map((s) => (
          <tr key={`bd-${s.student_no}`}>
            <td><span className="badge badge--pending">住宿變動</span></td>
            <td>{studentLabel(s)}</td>
            <td>{s.from ?? "（無）"} → {s.to ?? "（無）"}</td>
          </tr>
        ))}
        {changes.joined.map((s) => (
          <tr key={`join-${s.student_no}`}>
            <td><span className="badge badge--open">新增</span></td>
            <td>{studentLabel(s)}</td>
            <td>{s.class}</td>
          </tr>
        ))}
        {changes.rejoined.map((s) => (
          <tr key={`rej-${s.student_no}`}>
            <td><span className="badge badge--open">復學</span></td>
            <td>{studentLabel(s)}</td>
            <td>{s.class}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

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
              學生調班、離校會記錄在學生資料中，不會刪除。
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
                  <div className="ss-stat__label">最近一次同步</div>
                  <div className="ss-stat__value">
                    <span className={RESULT_LABEL[lastRun.result].className}>{RESULT_LABEL[lastRun.result].text}</span>
                  </div>
                  <div className="ss-stat__sub">{formatTime(lastRun.finished_at)}</div>
                </div>
                <div className="ss-stat">
                  <div className="ss-stat__label">上次成功</div>
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
              </div>

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
                      <th>在校 / 離校</th>
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
                              {run.trigger === "cron" ? "自動" : `手動（${run.triggered_by || "-"}）`}
                              {run.forced && "・強制"}
                            </td>
                            <td>
                              <span className={RESULT_LABEL[run.result].className}>{RESULT_LABEL[run.result].text}</span>
                            </td>
                            <td>{run.result === "success" ? `${run.active_students} / ${run.left_students}` : "-"}</td>
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
