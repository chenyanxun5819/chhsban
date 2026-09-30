import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import readXlsxFile from "read-excel-file";
import { addRosterBatch, type RosterBatchResult } from "@/services/rosterService";
import type { OptionalCourseRoster } from "@/types";

const BATCH_MAX = 200;

interface SheetRow {
  student_no: string;
  name: string;
  class: string;
}

interface PreviewRow extends SheetRow {
  result: RosterBatchResult;
}

const cellText = (v: unknown): string => (v === null || v === undefined ? "" : String(v).trim());

/**
 * 讀取範本第一個工作表。以含「學號」的那一列當標題列，依標題找學號／姓名／班級欄；
 * 找不到標題列時，視為第 1、2、3 欄依序是學號、姓名、班級，且沒有標題。
 * 系統只用學號，姓名／班級只用來在預覽時讓老師核對。
 */
async function parseSheet(file: File): Promise<SheetRow[]> {
  const rows = (await readXlsxFile(file)).map((r) => r.map(cellText));

  const headerIdx = rows.findIndex((r) => r.some((c) => c === "學號" || c === "学号"));
  let noCol = 0;
  let nameCol = 1;
  let classCol = 2;
  if (headerIdx >= 0) {
    const header = rows[headerIdx];
    const find = (...names: string[]) => header.findIndex((c) => names.includes(c));
    noCol = find("學號", "学号");
    nameCol = find("姓名", "學生姓名", "学生姓名");
    classCol = find("班級", "班级");
  }

  return rows
    .slice(headerIdx + 1)
    .map((r) => ({
      student_no: r[noCol] || "",
      name: nameCol >= 0 ? r[nameCol] || "" : "",
      class: classCol >= 0 ? r[classCol] || "" : "",
    }))
    .filter((r) => r.student_no);
}

interface Props {
  courseId: string;
  onAdded: (entries: OptionalCourseRoster[]) => void;
}

const RosterBatchImport: React.FC<Props> = ({ courseId, onAdded }) => {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reset = () => {
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setMessage(null);
    setPreview(null);
    try {
      setBusy(true);
      const rows = await parseSheet(file);
      if (rows.length === 0) {
        setError(t("batch.noStudentNo"));
        return;
      }
      if (rows.length > BATCH_MAX) {
        setError(t("batch.tooMany", { max: BATCH_MAX, count: rows.length }));
        return;
      }
      const results = await addRosterBatch(courseId, rows.map((r) => r.student_no), true);
      setPreview(rows.map((r, i) => ({ ...r, result: results[i] })));
    } catch (err: any) {
      setError(err.response?.data?.error || t("batch.readFailed"));
    } finally {
      setBusy(false);
    }
  };

  const okRows = preview?.filter((r) => r.result.status === "ok") ?? [];

  const handleConfirm = async () => {
    if (okRows.length === 0) return;
    try {
      setBusy(true);
      setError(null);
      const results = await addRosterBatch(courseId, okRows.map((r) => r.student_no), false);
      const entries = results.filter((r) => r.status === "added" && r.entry).map((r) => r.entry!);
      onAdded(entries);
      setMessage(t("batch.added", { count: entries.length }));
      reset();
    } catch (err: any) {
      const data = err.response?.data;
      setError(
        data?.error === "COURSE_FULL"
          ? t("roster.courseFull", { max: data.max_students })
          : data?.error || t("batch.failed"),
      );
    } finally {
      setBusy(false);
    }
  };

  const nameMismatch = (r: PreviewRow) =>
    !!r.name && !!r.result.student_name_cn && r.name !== r.result.student_name_cn;

  return (
    <div className="card">
      <h3>{t("batch.title")}</h3>
      <p style={{ margin: "4px 0 12px", color: "#666" }}>
        {t("batch.hint")}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <a className="btn" href="/roster-template.xlsx" download={t("batch.templateFileName")}>
          {t("batch.downloadTemplate")}
        </a>
        <input ref={fileRef} type="file" accept=".xlsx" onChange={handleFile} disabled={busy} />
        {busy && <span>{t("common.processing")}</span>}
      </div>

      {error && <p className="error-text">{error}</p>}
      {message && <p style={{ color: "#2e7d32" }}>{message}</p>}

      {preview && (
        <div style={{ marginTop: 12 }}>
          <p>
            {t("batch.summary", { total: preview.length, ok: okRows.length })}
            {preview.some(nameMismatch) && (
              <span style={{ color: "#c62828" }}>{t("batch.nameMismatch")}</span>
            )}
          </p>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>{t("batch.studentNo")}</th>
                  <th>{t("batch.fileName")}</th>
                  <th>{t("batch.fileClass")}</th>
                  <th>{t("batch.systemName")}</th>
                  <th>{t("batch.systemClass")}</th>
                  <th>{t("batch.status")}</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} style={nameMismatch(r) ? { color: "#c62828" } : undefined}>
                    <td>{r.student_no}</td>
                    <td>{r.name}</td>
                    <td>{r.class}</td>
                    <td>{r.result.student_name_cn || "-"}</td>
                    <td>{r.result.student_class || "-"}</td>
                    <td style={r.result.status === "ok" ? undefined : { color: "#999" }}>
                      {t(`batch.statusLabel.${r.result.status}`)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="btn btn--primary" disabled={busy || okRows.length === 0} onClick={handleConfirm}>
              {t("batch.confirmAdd", { count: okRows.length })}
            </button>
            <button className="btn" disabled={busy} onClick={reset}>
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RosterBatchImport;
