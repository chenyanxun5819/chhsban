import React, { useCallback, useEffect, useState } from "react";
import { Layout } from "@/shared/components/Layout";
import tutionApi from "@/tution/api";
import optionalApi from "@/optional/api";
import "@/data/styles/student-sync.css";

interface MaintenanceNotice {
  notice_id: string;
  created_at: string;
  title: string;
  detail: string;
}

interface TutionMaintenanceData {
  system: "tution";
  current_year: number;
  retained_from_year: number;
  purge_window_open: boolean;
  current_purge_target_year: number | null;
  next_purge_start: string;
  attendance_purge_pending: boolean;
  notices: MaintenanceNotice[];
}

interface OptionalMaintenanceData {
  system: "optional-course";
  current_year: number;
  retained_from_year: number;
  purge_window_open: boolean;
  current_purge_target_year: number | null;
  next_purge_start: string;
  notices: MaintenanceNotice[];
}

const formatDateTime = (value: string): string => value.replace("T", " ").replace(/\.\d+Z$/, "Z");

const policyText = (data: { current_year: number; retained_from_year: number; purge_window_open: boolean; current_purge_target_year: number | null; next_purge_start: string }) =>
  data.purge_window_open
    ? `目前已進入 ${data.current_year}/12/1 之後的清理窗口，正在分批清理 ${data.current_purge_target_year} 年資料。`
    : `目前保留 ${data.retained_from_year}～${data.current_year} 年資料；下一次清理將於 ${data.next_purge_start} 開始。`;

const MaintenanceNotices: React.FC = () => {
  const [tution, setTution] = useState<TutionMaintenanceData | null>(null);
  const [optional, setOptional] = useState<OptionalMaintenanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tutionRes, optionalRes] = await Promise.all([
        tutionApi.get<{ data: TutionMaintenanceData }>("/v1/settings/maintenance-notices"),
        optionalApi.get<{ success: boolean; data: OptionalMaintenanceData }>("/admin/maintenance-notices"),
      ]);
      setTution(tutionRes.data.data);
      setOptional(optionalRes.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "載入失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Layout title="系統維護通報">
      <div className="ss-page">
        <div className="card">
          <h2 className="ss-card-title">系統維護通報</h2>
          <p className="ss-muted">
            這裡集中顯示補習班與選修課的舊資料分批清理通報。清理作業會配合 Cloudflare 免費額度分天執行，
            因此通報可能連續出現多天，直到該年度的歷史資料清完為止。
          </p>
          <div className="ss-upload">
            <button className="btn btn--primary" onClick={load} disabled={loading}>
              {loading ? "讀取中..." : "🔄 重新整理"}
            </button>
          </div>
          {error && <p className="error-text ss-result">{error}</p>}
        </div>

        {[tution, optional].map((section) =>
          section ? (
            <div className="card" key={section.system}>
              <h3 style={{ marginTop: 0 }}>{section.system === "tution" ? "補習班" : "選修課"}</h3>
              <p className="ss-muted">{policyText(section)}</p>
              <ul className="ss-muted ss-list">
                <li>目前保留起始年份：{section.retained_from_year}</li>
                <li>目前年份：{section.current_year}</li>
                <li>下一次清理起始日：{section.next_purge_start}</li>
                {section.system === "tution" && (
                  <li>點名殘餘資料待清：{section.attendance_purge_pending ? "是" : "否"}</li>
                )}
              </ul>

              {section.notices.length === 0 ? (
                <p className="ss-muted">目前沒有新的維護通報。</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>時間</th>
                      <th>標題</th>
                      <th>內容</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.notices.map((notice) => (
                      <tr key={notice.notice_id}>
                        <td style={{ whiteSpace: "nowrap" }}>{formatDateTime(notice.created_at)}</td>
                        <td>{notice.title}</td>
                        <td>{notice.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : null,
        )}
      </div>
    </Layout>
  );
};

export default MaintenanceNotices;
