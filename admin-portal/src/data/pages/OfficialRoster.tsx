import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Layout } from "@/shared/components/Layout";
import tutionApi from "@/tution/api";
import { ChangeList, countChanges, errorMessage, type SyncChanges } from "@/data/components/ChangeList";
import "@/data/styles/student-sync.css";

/**
 * 學生資料 → 核對官方名單（只限 super_admin）。
 * 上傳行政人員拿到的最準確名單（例如 combineToAccess.xlsx：class / classID / studentID / EngName / ChnName / Gender），
 * 前端解析成 rows，先預覽比對結果（dry_run，不寫入），確認後才正式寫入 students_KV：
 * 名單外的學生改為離校（不刪除），住宿代碼以名單為準。比對規則在 student-sync Worker（sms-sync.js）。
 */

interface RosterRow {
  student_no: string;
  class: string;
  name_cn: string;
  name_en: string;
  gender: string;
}

interface CheckResult {
  file_name: string;
  sheet_name: string;
  official_total: number;
  absent_count: number;
  not_in_kv: Array<{ student_no: string; name_cn: string; class: string }>;
  class_mismatch: Array<{ student_no: string; name_cn: string; official_class: string; kv_class: string }>;
  changes: SyncChanges;
  after: { active: number; left: number; excluded: number };
  dry_run: boolean;
}

// 欄位名稱（不分大小寫），第一個找得到的就用
const COLUMN_ALIASES: Record<keyof RosterRow, string[]> = {
  student_no: ["studentid", "student_id", "studentno", "student_no", "學號", "学号"],
  class: ["class", "班級", "班级"],
  name_cn: ["chnname", "chinesename", "中文姓名", "中文名", "姓名"],
  name_en: ["engname", "englishname", "英文姓名", "英文名"],
  gender: ["gender", "住宿", "住宿代碼", "住宿代码", "性別", "性别"],
};

function parseWorkbook(buffer: ArrayBuffer): { sheetName: string; rows: RosterRow[] } {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "" });
  if (raw.length === 0) throw new Error("第一個工作表沒有資料");

  const headers = Object.keys(raw[0]);
  const findHeader = (key: keyof RosterRow) =>
    headers.find((h) => COLUMN_ALIASES[key].includes(h.trim().toLowerCase().replace(/\s+/g, "")));
  const columns = {
    student_no: findHeader("student_no"),
    class: findHeader("class"),
    name_cn: findHeader("name_cn"),
    name_en: findHeader("name_en"),
    gender: findHeader("gender"),
  };
  if (!columns.student_no) {
    throw new Error(`找不到學號欄位（studentID）。目前的欄位：${headers.join("、")}`);
  }

  const rows: RosterRow[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    const no = String(r[columns.student_no] ?? "").trim();
    if (!no || seen.has(no)) continue;
    seen.add(no);
    const text = (col?: string) => (col ? String(r[col] ?? "").trim() : "");
    rows.push({
      student_no: no,
      class: text(columns.class),
      name_cn: text(columns.name_cn),
      name_en: text(columns.name_en),
      gender: text(columns.gender),
    });
  }
  return { sheetName, rows };
}

const OfficialRoster: React.FC = () => {
  const [fileName, setFileName] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [preview, setPreview] = useState<CheckResult | null>(null);
  const [applied, setApplied] = useState<CheckResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (payloadRows: RosterRow[], file: string, sheet: string, dryRun: boolean) =>
    (
      await tutionApi.post(
        "/admin/student-sync/official-roster",
        { file_name: file, sheet_name: sheet, rows: payloadRows, dry_run: dryRun },
        { timeout: 120000 },
      )
    ).data.data as CheckResult;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setPreview(null);
    setApplied(null);
    setRows([]);
    setBusy(true);
    try {
      const { sheetName: sheet, rows: parsed } = parseWorkbook(await file.arrayBuffer());
      if (parsed.length === 0) throw new Error("名單裡沒有任何學號");
      setFileName(file.name);
      setSheetName(sheet);
      setRows(parsed);
      setPreview(await submit(parsed, file.name, sheet, true));
    } catch (err: any) {
      setError(errorMessage(err, "讀取 Excel 失敗"));
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!preview) return;
    const message =
      `確定以「${fileName}」（${rows.length} 人）核對學生資料嗎？\n\n` +
      `將有 ${preview.changes.left.length} 人改為離校、${preview.changes.rejoined.length} 人恢復在校、` +
      `${preview.changes.boarding.length} 人住宿代碼更新。資料不會刪除。`;
    if (!window.confirm(message)) return;

    setBusy(true);
    setError(null);
    try {
      setApplied(await submit(rows, fileName, sheetName, false));
      setPreview(null);
    } catch (err: any) {
      setError(errorMessage(err, "寫入失敗"));
    } finally {
      setBusy(false);
    }
  };

  const shown = applied || preview;

  return (
    <Layout title="核對官方名單">
      <div className="ss-page">
        <div className="card">
          <h2 className="ss-card-title">核對官方名單</h2>
          <p className="ss-muted">
            上傳最準確的學生名單 Excel（例如 combineToAccess.xlsx，需有 studentID 欄；class、ChnName、EngName、Gender
            欄會一併使用），與 students_KV 比對。先顯示比對結果，確認後才寫入：
          </p>
          <ul className="ss-muted ss-list">
            <li>名單裡沒有、但 SMS 上仍在一般班級的學生 → 改為「離校」（不刪除），之後的 SMS 同步也會維持，直到下一份名單再列入</li>
            <li>名單裡有的學生 → 住宿代碼以名單的 Gender 為準</li>
            <li>STAR 班本來就不計入在校生，不受名單影響；班級不同只列出，班級仍以 SMS 為準</li>
          </ul>
          <div className="ss-upload">
            <label className="btn btn--primary">
              {busy && !preview ? "處理中..." : "📤 選擇 Excel 檔"}
              <input type="file" accept=".xlsx,.xls" onChange={onFile} disabled={busy} hidden />
            </label>
            {fileName && rows.length > 0 && (
              <span className="ss-muted">
                {fileName}（工作表 {sheetName}，{rows.length} 人）
              </span>
            )}
          </div>
          {error && <p className="error-text ss-result">{error}</p>}
        </div>

        {shown && (
          <div className="card">
            <h3 className="ss-card-title">{applied ? "✅ 已寫入" : "比對結果（尚未寫入）"}</h3>
            <div className="ss-stats">
              <div className="ss-stat">
                <div className="ss-stat__label">官方名單</div>
                <div className="ss-stat__value">{shown.official_total}</div>
              </div>
              <div className="ss-stat">
                <div className="ss-stat__label">{applied ? "在校學生" : "核對後在校學生"}</div>
                <div className="ss-stat__value">{shown.after.active}</div>
              </div>
              <div className="ss-stat">
                <div className="ss-stat__label">{applied ? "離校（保留記錄）" : "核對後離校"}</div>
                <div className="ss-stat__value">{shown.after.left}</div>
              </div>
              <div className="ss-stat">
                <div className="ss-stat__label">不計入（STAR 班）</div>
                <div className="ss-stat__value">{shown.after.excluded}</div>
              </div>
            </div>

            {shown.after.active !== shown.official_total && (
              <div className="ss-warning">
                核對後在校人數（{shown.after.active}）與名單人數（{shown.official_total}）不同，
                請看下方「名單有、KV 沒有」或 STAR 班的學生。
              </div>
            )}

            {shown.not_in_kv.length > 0 && (
              <>
                <h4 className="ss-subtitle">名單有、KV 沒有（{shown.not_in_kv.length}）</h4>
                <p className="ss-muted">可能是 SMS 尚未建檔，或下次 SMS 同步後就會出現；這些學生不會寫入。</p>
                <div className="ss-table-wrap ss-changes-wrap">
                  <table className="table">
                    <thead>
                      <tr><th>學號</th><th>姓名</th><th>班級</th></tr>
                    </thead>
                    <tbody>
                      {shown.not_in_kv.map((s) => (
                        <tr key={s.student_no}><td>{s.student_no}</td><td>{s.name_cn}</td><td>{s.class}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {shown.class_mismatch.length > 0 && (
              <>
                <h4 className="ss-subtitle">班級不同（{shown.class_mismatch.length}，只列出，班級仍以 SMS 為準）</h4>
                <div className="ss-table-wrap ss-changes-wrap">
                  <table className="table">
                    <thead>
                      <tr><th>學號</th><th>姓名</th><th>官方名單</th><th>SMS</th></tr>
                    </thead>
                    <tbody>
                      {shown.class_mismatch.map((s) => (
                        <tr key={s.student_no}>
                          <td>{s.student_no}</td><td>{s.name_cn}</td><td>{s.official_class}</td><td>{s.kv_class}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <h4 className="ss-subtitle">
              {applied ? "本次變動" : "確認後的變動"}（{countChanges(shown.changes)}）
            </h4>
            <ChangeList changes={shown.changes} emptyText="與目前資料一致，沒有變動。" />

            {preview && (
              <div className="ss-upload">
                <button className="btn btn--primary" onClick={apply} disabled={busy}>
                  {busy ? "寫入中..." : "確認寫入"}
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setPreview(null);
                    setRows([]);
                    setFileName("");
                  }}
                  disabled={busy}
                >
                  取消
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default OfficialRoster;
