import React from "react";

/**
 * 學生資料（students_KV）共用的型別與「學生變動明細」表：
 * 學生名單同步、核對官方名單兩頁都用同一份。
 */

export interface StudentBrief {
  student_no: string;
  name_cn: string;
  name_en: string;
}

export type LeftReason = "leave_class" | "removed" | "not_in_official_list";

export interface SyncChanges {
  joined: Array<StudentBrief & { class: string }>;
  left: Array<StudentBrief & { class: string; reason: LeftReason; left_class?: string }>;
  rejoined: Array<StudentBrief & { class: string }>;
  excluded?: Array<StudentBrief & { class: string; reason: string }>;
  transferred: Array<StudentBrief & { from: string; to: string }>;
  boarding: Array<StudentBrief & { from: string | null; to: string | null }>;
}

export const LEFT_REASON_LABEL: Record<string, string> = {
  leave_class: "SMS 移到離校班",
  removed: "已從 SMS 刪除",
  not_in_official_list: "官方名單沒有",
};

export const EXCLUDED_REASON_LABEL: Record<string, string> = {
  star_class: "STAR 班",
};

export function countChanges(c: SyncChanges | undefined): number {
  if (!c) return 0;
  return (
    c.joined.length +
    c.left.length +
    c.rejoined.length +
    (c.excluded?.length || 0) +
    c.transferred.length +
    c.boarding.length
  );
}

export function errorMessage(err: any, fallback: string): string {
  return err?.response?.data?.error || err?.message || fallback;
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("zh-TW", { hour12: false });
}

const studentLabel = (s: StudentBrief) => `${s.student_no} ${(s.name_cn || s.name_en || "").trim()}`;

export const ChangeList: React.FC<{ changes: SyncChanges; emptyText?: string }> = ({
  changes,
  emptyText = "本次沒有學生變動。",
}) => {
  if (countChanges(changes) === 0) {
    return <p className="ss-muted">{emptyText}</p>;
  }
  return (
    <div className="ss-table-wrap ss-changes-wrap">
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
          {(changes.excluded || []).map((s) => (
            <tr key={`ex-${s.student_no}`}>
              <td><span className="badge badge--closed">不計入</span></td>
              <td>{studentLabel(s)}</td>
              <td>{s.class}・{EXCLUDED_REASON_LABEL[s.reason] || s.reason}</td>
            </tr>
          ))}
          {changes.transferred.map((s) => (
            <tr key={`tr-${s.student_no}-${s.to}`}>
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
    </div>
  );
};
