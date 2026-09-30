import React from "react";
import { ATTENDANCE_STATUS_META, type AttendanceStatusCode } from "@/tution/services/attendanceQueryService";

/**
 * 住宿生點名控管、學號出席查詢共用的狀態標籤。
 * status 為 null 時依 fallback 顯示：未點名（醒目）、停課／調課／尚未上課／未在名單（淡色）。
 */
export type EmptyStatusKind = "unmarked" | "cancelled" | "rescheduled" | "upcoming" | "off_roster";

const EMPTY_LABEL: Record<EmptyStatusKind, string> = {
  unmarked: "未點名",
  cancelled: "停課",
  rescheduled: "調課",
  upcoming: "尚未上課",
  off_roster: "未在名單",
};

export const AttendanceStatusTag: React.FC<{
  status: AttendanceStatusCode | null;
  absenceReason?: string;
  fallback?: EmptyStatusKind;
}> = ({ status, absenceReason, fallback = "unmarked" }) => {
  if (status) {
    const meta = ATTENDANCE_STATUS_META[status];
    return (
      <span className="ba-tag" style={{ background: meta.color }}>
        {meta.label}
        {status === "excuse" && absenceReason ? `（${absenceReason}）` : ""}
      </span>
    );
  }
  return <span className={`ba-tag ba-tag--${fallback}`}>{EMPTY_LABEL[fallback]}</span>;
};

/** YYYY-MM-DD → DD/MM（不經過 Date 物件，避免時區位移） */
export function shortDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

/** YYYY-MM-DD → 星期索引（0=週日） */
export function weekdayIndex(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** 瀏覽器當地的今天（YYYY-MM-DD） */
export function localToday(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}
