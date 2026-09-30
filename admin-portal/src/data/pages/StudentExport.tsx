import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Layout } from "@/shared/components/Layout";
import tutionApi from "@/tution/api";
import { EXCLUDED_REASON_LABEL, LEFT_REASON_LABEL } from "@/data/components/ChangeList";
import "@/data/styles/student-sync.css";

/**
 * 學生資料 → 學生資料匯出（只限 super_admin）。
 * 讀 students_KV 的 students_by_no（student-sync 同步的全校學生，含已離校）轉成 Excel 下載；
 * 每次下載只有 1 次 KV 讀取，不寫入。
 */

interface HistoryEntry {
  from: string | null;
  to: string | null;
  date: string;
}

interface StudentRecord {
  student_id: string;
  student_no: string;
  name_cn: string;
  name_en: string;
  real_class_name?: string;
  sms_class_name?: string;
  gender_boarding?: string | null;
  status?: "active" | "left" | "excluded";
  left_at?: string;
  left_reason?: "leave_class" | "removed" | "not_in_official_list";
  excluded_reason?: string;
  excluded_at?: string;
  left_class?: string;
  joined_at?: string;
  rejoined_at?: string;
  last_seen_at?: string;
  class_history?: HistoryEntry[];
  boarding_history?: HistoryEntry[];
}

const formatHistory = (history?: HistoryEntry[]) =>
  (history || []).map((h) => `${h.date} ${h.from ?? "（無）"}→${h.to ?? "（無）"}`).join("；");

const byClassThenNo = (a: StudentRecord, b: StudentRecord) =>
  (a.real_class_name || "").localeCompare(b.real_class_name || "") || a.student_no.localeCompare(b.student_no);

function buildWorkbook(students: StudentRecord[]): XLSX.WorkBook {
  const active = students.filter((s) => (s.status || "active") === "active").sort(byClassThenNo);
  const left = students.filter((s) => s.status === "left").sort(byClassThenNo);
  const excluded = students.filter((s) => s.status === "excluded").sort(byClassThenNo);

  const activeRows = active.map((s) => ({
    學號: s.student_no,
    內部編號: s.student_id,
    中文姓名: (s.name_cn || "").trim(),
    英文姓名: (s.name_en || "").trim(),
    班級: s.real_class_name || "",
    住宿代碼: s.gender_boarding || "",
    調班記錄: formatHistory(s.class_history),
    住宿變動記錄: formatHistory(s.boarding_history),
    復學日期: s.rejoined_at || "",
    首次記錄日: s.joined_at || "",
    最後同步日: s.last_seen_at || "",
  }));

  const leftRows = left.map((s) => ({
    學號: s.student_no,
    內部編號: s.student_id,
    中文姓名: (s.name_cn || "").trim(),
    英文姓名: (s.name_en || "").trim(),
    離校前班級: s.real_class_name || "",
    住宿代碼: s.gender_boarding || "",
    離校日期: s.left_at || "",
    離校原因: s.left_reason ? LEFT_REASON_LABEL[s.left_reason] || s.left_reason : "",
    SMS離校班: s.left_class || "",
    調班記錄: formatHistory(s.class_history),
    最後同步日: s.last_seen_at || "",
  }));

  const excludedRows = excluded.map((s) => ({
    學號: s.student_no,
    內部編號: s.student_id,
    中文姓名: (s.name_cn || "").trim(),
    英文姓名: (s.name_en || "").trim(),
    班級: s.real_class_name || "",
    住宿代碼: s.gender_boarding || "",
    原因: s.excluded_reason ? EXCLUDED_REASON_LABEL[s.excluded_reason] || s.excluded_reason : "",
    最後同步日: s.last_seen_at || "",
  }));

  const classCount = new Map<string, { total: number; boarding: number; noBoardingCode: number }>();
  for (const s of active) {
    const cls = s.real_class_name || "（未知）";
    const entry = classCount.get(cls) || { total: 0, boarding: 0, noBoardingCode: 0 };
    entry.total += 1;
    if (s.gender_boarding && s.gender_boarding.includes("H")) entry.boarding += 1;
    if (!s.gender_boarding) entry.noBoardingCode += 1;
    classCount.set(cls, entry);
  }
  const classRows = [...classCount.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cls, c]) => ({ 班級: cls, 在校人數: c.total, 住宿生: c.boarding, 無住宿代碼: c.noBoardingCode }));
  classRows.push({
    班級: "合計",
    在校人數: active.length,
    住宿生: classRows.reduce((n, r) => n + r.住宿生, 0),
    無住宿代碼: classRows.reduce((n, r) => n + r.無住宿代碼, 0),
  });

  const workbook = XLSX.utils.book_new();
  const addSheet = (rows: object[], name: string, widths: number[]) => {
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = widths.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  };
  addSheet(activeRows, "在校學生", [8, 8, 12, 28, 10, 8, 30, 30, 11, 11, 11]);
  addSheet(leftRows, "已離校學生", [8, 8, 12, 28, 10, 8, 11, 14, 11, 30, 11]);
  addSheet(excludedRows, "不計入（STAR班）", [8, 8, 12, 28, 10, 8, 10, 11]);
  addSheet(classRows, "各班人數", [12, 10, 8, 10]);
  return workbook;
}

const StudentExport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const download = async () => {
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const res = await tutionApi.get("/admin/student-sync/students", { timeout: 60000 });
      const students: StudentRecord[] = Object.values(res.data.data.students || {});
      if (students.length === 0) {
        setError("目前沒有學生資料，請先到「學生名單同步」執行同步。");
        return;
      }
      const updatedAt: string | undefined = res.data.data.metadata?.updated_at;
      const stamp = (updatedAt ? new Date(updatedAt) : new Date()).toLocaleDateString("sv-SE");
      XLSX.writeFile(buildWorkbook(students), `學生資料-${stamp}.xlsx`);

      const count = (status: string) => students.filter((s) => (s.status || "active") === status).length;
      setSummary(
        `已下載：在校 ${count("active")} 人、已離校 ${count("left")} 人、不計入 ${count("excluded")} 人（資料更新於 ${stamp}）`,
      );
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "下載失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="學生資料匯出">
      <div className="ss-page">
        <div className="card">
          <h2 className="ss-card-title">學生資料匯出</h2>
          <p className="ss-muted">
            匯出目前 students_KV 的全校學生資料（Excel），共四個工作表：
          </p>
          <ul className="ss-muted ss-list">
            <li>在校學生：學號、姓名、班級、住宿代碼、調班與住宿變動記錄</li>
            <li>已離校學生：離校前班級、離校日期與原因（含官方名單沒有的學生）</li>
            <li>不計入（STAR 班）：不算在校生的學生</li>
            <li>各班人數：在校人數、住宿生人數、沒有住宿代碼的人數</li>
          </ul>
          <button className="btn btn--primary" onClick={download} disabled={loading}>
            {loading ? "產生中..." : "📥 下載 Excel"}
          </button>
          {summary && <p className="success-text ss-result">{summary}</p>}
          {error && <p className="error-text ss-result">{error}</p>}
        </div>
      </div>
    </Layout>
  );
};

export default StudentExport;
