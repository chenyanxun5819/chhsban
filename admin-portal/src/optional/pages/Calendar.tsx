import React, { useEffect, useMemo, useState } from "react";
import { Layout } from "@/shared/components/Layout";
import { useAuth } from "@/shared/auth/AuthContext";
import { getCalendar, saveCalendar } from "@/optional/services/calendarService";
import type {
  CalendarConflict,
  HolidayType,
  SchoolCalendar,
  SchoolHoliday,
  Weekday,
} from "@/optional/types";
import {
  HOLIDAY_TYPE_LABEL,
  SCHOOL_WEEKDAYS,
  WEEKDAY_LABEL,
  countSchoolDays,
  formatDate,
  resolveDay,
  toDateString,
  todayMYT,
  weekdayOf,
} from "@/optional/utils/calendar";
import { currentYear, selectableYears } from "@/shared/utils/year";
import CalendarImport, { type ImportResult } from "./CalendarImport";
import "@/optional/optional.css";

const MONTH_LABEL = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
const WEEK_HEADER = ["日", "一", "二", "三", "四", "五", "六"];

const ERROR_LABEL: Record<string, string> = {
  CALENDAR_VERSION_CONFLICT: "行事曆已被其他人修改，請重新載入後再編輯",
  TERM_INCOMPLETE: "開學日與結業日要一起設定",
  TERM_START_AFTER_END: "開學日不能晚於結業日",
  TERM_OUT_OF_YEAR: "開學日與結業日必須在同一年度內",
  INVALID_HOLIDAY: "假期資料有誤",
  INVALID_MAKEUP_DAY: "補課日資料有誤",
  MAKEUP_DAY_ON_SUNDAY: "補課日不能是星期日",
  DUPLICATE_MAKEUP_DAY: "補課日重複",
  INVALID_YEAR: "只能編輯今年或明年的行事曆",
};

/** 某天在月曆格子上的樣式 */
function dayClass(calendar: SchoolCalendar, date: string): string {
  const r = resolveDay(calendar, date);
  switch (r.kind) {
    case "makeup":
      return "oc-cal-day--makeup";
    case "holiday":
      return `oc-cal-day--${r.holiday!.type}`;
    case "sunday":
    case "saturday":
      return "oc-cal-day--weekend";
    case "out_of_term":
      return weekdayOf(date) === "Sunday" || weekdayOf(date) === "Saturday" ? "oc-cal-day--weekend oc-cal-day--out" : "oc-cal-day--out";
    default:
      return "oc-cal-day--normal";
  }
}

function dayTitle(calendar: SchoolCalendar, date: string): string {
  const r = resolveDay(calendar, date);
  const base = formatDate(date);
  switch (r.kind) {
    case "makeup":
      return `${base} 補課日（按${WEEKDAY_LABEL[r.follows_weekday!]}課表）`;
    case "holiday":
      return `${base} ${r.holiday!.name}（${HOLIDAY_TYPE_LABEL[r.holiday!.type]}）`;
    case "out_of_term":
      return `${base} 學期外`;
    case "sunday":
    case "saturday":
      return `${base} 週末`;
    default:
      return `${base} 上課日`;
  }
}

const Calendar: React.FC = () => {
  const [year, setYear] = useState(currentYear());
  const [saved, setSaved] = useState<SchoolCalendar | null>(null);
  const [draft, setDraft] = useState<SchoolCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<CalendarConflict[] | null>(null);

  // 選取範圍（在月曆上點選或拖曳）
  const [anchor, setAnchor] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ start: string; end: string } | null>(null);
  const [dragging, setDragging] = useState(false);

  const [holidayName, setHolidayName] = useState("");
  const [holidayType, setHolidayType] = useState<HolidayType>("public");
  const [makeupWeekday, setMakeupWeekday] = useState<Weekday>("Monday");
  const [makeupNote, setMakeupNote] = useState("");

  // 只有 super_admin 能修改，且只能改今年、明年；督察員與往年一律唯讀
  const { user } = useAuth();
  const canManage = user?.permission === "super_admin";
  const editableYear = year === currentYear() || year === currentYear() + 1;
  const editable = canManage && editableYear;
  const dirty = !!saved && !!draft && JSON.stringify(saved) !== JSON.stringify(draft);
  const today = todayMYT();

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      setConflicts(null);
      setSelection(null);
      const calendar = await getCalendar(year);
      setSaved(calendar);
      setDraft(calendar);
    } catch (err: any) {
      setError(err.response?.data?.error || "載入失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  useEffect(() => {
    const stop = () => setDragging(false);
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, []);

  // 未儲存就離開頁面時提醒
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const stats = useMemo(() => (draft ? countSchoolDays(draft) : null), [draft]);

  const update = (patch: Partial<SchoolCalendar>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
    setMessage(null);
    setConflicts(null);
  };

  const select = (start: string, end: string) => {
    const [s, e] = start <= end ? [start, end] : [end, start];
    setSelection({ start: s, end: e });
    if (s === e) {
      const w = weekdayOf(s);
      setMakeupWeekday(w === "Sunday" || w === "Saturday" ? "Monday" : w);
    }
  };

  const handleMouseDown = (date: string, e: React.MouseEvent) => {
    if (e.shiftKey && anchor) {
      select(anchor, date);
      return;
    }
    setAnchor(date);
    setDragging(true);
    select(date, date);
  };

  const handleMouseEnter = (date: string) => {
    if (dragging && anchor) select(anchor, date);
  };

  // 與選取範圍重疊的假期、選取的那一天的補課日
  const overlapping = useMemo(
    () =>
      draft && selection
        ? draft.holidays.filter((h) => h.start_date <= selection.end && h.end_date >= selection.start)
        : [],
    [draft, selection],
  );
  const singleDate = selection && selection.start === selection.end ? selection.start : null;
  const selectedMakeup = draft && singleDate ? draft.makeup_days.find((m) => m.date === singleDate) : undefined;

  const addHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || !selection || !holidayName.trim()) return;
    const holiday: SchoolHoliday = {
      holiday_id: "",
      start_date: selection.start,
      end_date: selection.end,
      name: holidayName.trim(),
      type: holidayType,
    };
    update({ holidays: [...draft.holidays, holiday].sort((a, b) => a.start_date.localeCompare(b.start_date)) });
    setHolidayName("");
  };

  const removeHoliday = (holiday: SchoolHoliday) => {
    if (!draft) return;
    update({ holidays: draft.holidays.filter((h) => h !== holiday) });
  };

  const setMakeup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || !singleDate) return;
    const others = draft.makeup_days.filter((m) => m.date !== singleDate);
    const note = makeupNote.trim();
    update({
      makeup_days: [...others, { date: singleDate, follows_weekday: makeupWeekday, ...(note ? { note } : {}) }].sort(
        (a, b) => a.date.localeCompare(b.date),
      ),
    });
    setMakeupNote("");
  };

  const removeMakeup = (date: string) => {
    if (!draft) return;
    update({ makeup_days: draft.makeup_days.filter((m) => m.date !== date) });
  };

  const handleImport = (result: ImportResult) => {
    if (!draft) return;
    const holidayKey = (h: SchoolHoliday) => `${h.start_date}|${h.end_date}|${h.name}`;
    const existing = new Set(draft.holidays.map(holidayKey));
    const newHolidays = result.holidays.filter((h) => !existing.has(holidayKey(h)));
    // 同一天的補課日以匯入的為準
    const importedDates = new Set(result.makeupDays.map((m) => m.date));
    update({
      holidays: [...draft.holidays, ...newHolidays].sort((a, b) => a.start_date.localeCompare(b.start_date)),
      makeup_days: [...draft.makeup_days.filter((m) => !importedDates.has(m.date)), ...result.makeupDays].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    });
    setMessage(
      `已加入 ${newHolidays.length} 筆假期、${result.makeupDays.length} 筆補課日` +
        (newHolidays.length < result.holidays.length ? `（${result.holidays.length - newHolidays.length} 筆假期已存在，略過）` : "") +
        "，確認後請按「儲存行事曆」",
    );
  };

  const handleSave = async (force = false) => {
    if (!draft) return;
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      const result = await saveCalendar(draft, force);
      setSaved(result);
      setDraft(result);
      setConflicts(null);
      setMessage("行事曆已儲存");
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.error === "CALENDAR_AFFECTS_ATTENDANCE") {
        setConflicts(data.conflicts);
      } else {
        const label = ERROR_LABEL[data?.error] || data?.error || "儲存失敗";
        setError(data?.detail ? `${label}：${data.detail}` : label);
      }
    } finally {
      setSaving(false);
    }
  };

  const renderMonth = (calendar: SchoolCalendar, monthIndex: number) => {
    const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    const cells: React.ReactNode[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(<div key={`b${i}`} className="oc-cal-day oc-cal-day--blank" />);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = toDateString(year, monthIndex, d);
      const selected = !!selection && date >= selection.start && date <= selection.end;
      cells.push(
        <div
          key={date}
          className={`oc-cal-day ${dayClass(calendar, date)}${selected ? " oc-cal-day--selected" : ""}${
            date === today ? " oc-cal-day--today" : ""
          }`}
          title={dayTitle(calendar, date)}
          onMouseDown={(e) => editable && handleMouseDown(date, e)}
          onMouseEnter={() => editable && handleMouseEnter(date)}
        >
          {d}
        </div>,
      );
    }
    return (
      <div className="oc-cal-month" key={monthIndex}>
        <div className="oc-cal-month__title">{MONTH_LABEL[monthIndex]}</div>
        <div className="oc-cal-grid">
          {WEEK_HEADER.map((w) => (
            <div key={w} className="oc-cal-weekhead">
              {w}
            </div>
          ))}
          {cells}
        </div>
      </div>
    );
  };

  return (
    <Layout title="選修課行事曆">
      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0", flexWrap: "wrap" }}>
        <label htmlFor="calYear">年份：</label>
        <select
          id="calYear"
          value={year}
          onChange={(e) => {
            if (dirty && !window.confirm("行事曆還沒儲存，確定要切換年份？")) return;
            setYear(Number(e.target.value));
          }}
        >
          {selectableYears().map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        {!editable && (
          <span style={{ color: "#888", fontSize: 13 }}>
            {!canManage ? "督察員僅可查看" : "往年的行事曆只能查看"}
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {dirty && <span style={{ color: "#b45309", fontSize: 13 }}>有未儲存的修改</span>}
          {editable && (
            <>
              <button className="btn" disabled={!dirty || saving} onClick={() => setDraft(saved)}>
                放棄修改
              </button>
              <button className="btn btn--primary" disabled={!dirty || saving} onClick={() => handleSave(false)}>
                {saving ? "儲存中..." : "儲存行事曆"}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}
      {message && <p style={{ color: "#166534" }}>{message}</p>}

      {conflicts && (
        <div className="card" style={{ borderColor: "#f59e0b", background: "#fffbeb" }}>
          <h3 style={{ marginTop: 0 }}>這次修改會影響 {conflicts.length} 筆已點名的紀錄</h3>
          <p style={{ color: "#666" }}>
            下列日期已經點過名，改完後就不再是這門課的上課日。點名紀錄不會被刪除，但不會再計入應點名堂數。
          </p>
          <table className="table">
            <thead>
              <tr>
                <th>日期</th>
                <th>課程</th>
                <th>老師</th>
              </tr>
            </thead>
            <tbody>
              {conflicts.map((c) => (
                <tr key={`${c.course_id}|${c.date}`}>
                  <td>{formatDate(c.date)}</td>
                  <td>
                    <span style={{ color: "#888", marginRight: 6 }}>{c.course_no}</span>
                    {c.subject}
                  </td>
                  <td>{c.teacher_name_cn || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn btn--danger" disabled={saving} onClick={() => handleSave(true)}>
              仍要儲存
            </button>
            <button className="btn" onClick={() => setConflicts(null)}>
              返回修改
            </button>
          </div>
        </div>
      )}

      {loading || !draft ? (
        <p>載入中...</p>
      ) : (
        <>
          <div className="card">
            <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <label htmlFor="termStart">開學日</label>
                <input
                  id="termStart"
                  type="date"
                  value={draft.term_start || ""}
                  min={`${year}-01-01`}
                  max={`${year}-12-31`}
                  disabled={!editable}
                  onChange={(e) => update({ term_start: e.target.value || undefined })}
                />
              </div>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <label htmlFor="termEnd">結業日</label>
                <input
                  id="termEnd"
                  type="date"
                  value={draft.term_end || ""}
                  min={`${year}-01-01`}
                  max={`${year}-12-31`}
                  disabled={!editable}
                  onChange={(e) => update({ term_end: e.target.value || undefined })}
                />
              </div>
              {stats && draft.term_start && draft.term_end ? (
                <div style={{ fontSize: 14, color: "#444" }}>
                  本年上課日共 <strong>{stats.total}</strong> 天：
                  {SCHOOL_WEEKDAYS.filter((w) => w !== "Saturday" || stats.byWeekday.Saturday > 0).map((w) => (
                    <span key={w} style={{ marginLeft: 8 }}>
                      {WEEKDAY_LABEL[w].slice(-1)} {stats.byWeekday[w]}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ color: "#b45309", fontSize: 14 }}>
                  尚未設定開學日與結業日：行事曆未建立前，系統不會推算應點名日期，也不限制點名日期。
                </div>
              )}
            </div>
          </div>

          <div className="oc-cal-legend">
            <span><i className="oc-cal-day--normal" />上課日</span>
            <span><i className="oc-cal-day--public" />國定假日</span>
            <span><i className="oc-cal-day--school_break" />學校假期</span>
            <span><i className="oc-cal-day--event" />活動停課</span>
            <span><i className="oc-cal-day--makeup" />補課日</span>
            <span><i className="oc-cal-day--weekend" />週末</span>
            <span><i className="oc-cal-day--out" />學期外</span>
            {editable && <span style={{ color: "#888" }}>點選日期，拖曳或按住 Shift 可選取一段期間</span>}
          </div>

          <div className="oc-cal-layout">
            <div className="oc-cal-year">{Array.from({ length: 12 }, (_, m) => renderMonth(draft, m))}</div>

            {editable && (
              <div className="oc-cal-side">
                <div className="card">
                  {!selection ? (
                    <p style={{ color: "#888", margin: 0 }}>在月曆上選取日期，即可設定假期或補課日。</p>
                  ) : (
                    <>
                      <h3 style={{ marginTop: 0 }}>
                        {singleDate ? formatDate(singleDate) : `${formatDate(selection.start)} ～ ${formatDate(selection.end)}`}
                      </h3>

                      {overlapping.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          {overlapping.map((h, i) => (
                            <div key={`${h.holiday_id}|${i}`} className="oc-cal-item">
                              <span>
                                {h.name}
                                <small>
                                  {HOLIDAY_TYPE_LABEL[h.type]}・
                                  {h.start_date === h.end_date ? formatDate(h.start_date) : `${formatDate(h.start_date)}～${formatDate(h.end_date)}`}
                                </small>
                              </span>
                              <button className="btn btn--danger btn--small" onClick={() => removeHoliday(h)}>
                                刪除
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {selectedMakeup && (
                        <div className="oc-cal-item" style={{ marginBottom: 12 }}>
                          <span>
                            補課日：按{WEEKDAY_LABEL[selectedMakeup.follows_weekday]}課表
                            {selectedMakeup.note && <small>{selectedMakeup.note}</small>}
                          </span>
                          <button className="btn btn--danger btn--small" onClick={() => removeMakeup(selectedMakeup.date)}>
                            刪除
                          </button>
                        </div>
                      )}

                      <form onSubmit={addHoliday}>
                        <h4>設為假期</h4>
                        <div className="form-row">
                          <label>名稱</label>
                          <input value={holidayName} onChange={(e) => setHolidayName(e.target.value)} placeholder="例如：國慶日、年中假期" />
                        </div>
                        <div className="form-row">
                          <label>類型</label>
                          <select value={holidayType} onChange={(e) => setHolidayType(e.target.value as HolidayType)}>
                            {(Object.keys(HOLIDAY_TYPE_LABEL) as HolidayType[]).map((t) => (
                              <option key={t} value={t}>
                                {HOLIDAY_TYPE_LABEL[t]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button type="submit" className="btn btn--primary" disabled={!holidayName.trim()}>
                          新增假期
                        </button>
                      </form>

                      {singleDate && weekdayOf(singleDate) !== "Sunday" && (
                        <form onSubmit={setMakeup} style={{ marginTop: 16 }}>
                          <h4>設為補課日</h4>
                          <p style={{ color: "#888", fontSize: 13, marginTop: 0 }}>
                            週六或假期中改為上課時使用；補課日優先於假期。
                          </p>
                          <div className="form-row">
                            <label>當天按哪一天的課表上課</label>
                            <select value={makeupWeekday} onChange={(e) => setMakeupWeekday(e.target.value as Weekday)}>
                              {SCHOOL_WEEKDAYS.map((w) => (
                                <option key={w} value={w}>
                                  {WEEKDAY_LABEL[w]}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="form-row">
                            <label>備註</label>
                            <input value={makeupNote} onChange={(e) => setMakeupNote(e.target.value)} placeholder="例如：補 10/20 屠妖節" />
                          </div>
                          <button type="submit" className="btn">
                            {selectedMakeup ? "更新補課日" : "設為補課日"}
                          </button>
                        </form>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h3>假期清單（{draft.holidays.length}）</h3>
            {draft.holidays.length === 0 ? (
              <p style={{ color: "#888" }}>尚未登記任何假期。</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>名稱</th>
                    <th>類型</th>
                    {editable && <th />}
                  </tr>
                </thead>
                <tbody>
                  {draft.holidays.map((h, i) => (
                    <tr key={`${h.holiday_id}|${i}`}>
                      <td>
                        {h.start_date === h.end_date ? formatDate(h.start_date) : `${formatDate(h.start_date)} ～ ${formatDate(h.end_date)}`}
                      </td>
                      <td>{h.name}</td>
                      <td>
                        <span className={`badge oc-badge--${h.type}`}>{HOLIDAY_TYPE_LABEL[h.type]}</span>
                      </td>
                      {editable && (
                        <td style={{ textAlign: "right" }}>
                          <button className="btn btn--small" onClick={() => select(h.start_date, h.end_date)}>
                            選取
                          </button>{" "}
                          <button className="btn btn--danger btn--small" onClick={() => removeHoliday(h)}>
                            刪除
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h3>補課日清單（{draft.makeup_days.length}）</h3>
            {draft.makeup_days.length === 0 ? (
              <p style={{ color: "#888" }}>沒有補課日。</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>按哪一天的課表</th>
                    <th>備註</th>
                    {editable && <th />}
                  </tr>
                </thead>
                <tbody>
                  {draft.makeup_days.map((m) => (
                    <tr key={m.date}>
                      <td>{formatDate(m.date)}</td>
                      <td>{WEEKDAY_LABEL[m.follows_weekday]}</td>
                      <td>{m.note || "-"}</td>
                      {editable && (
                        <td style={{ textAlign: "right" }}>
                          <button className="btn btn--danger btn--small" onClick={() => removeMakeup(m.date)}>
                            刪除
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {editable && <CalendarImport year={year} disabled={saving} onImport={handleImport} />}
        </>
      )}
    </Layout>
  );
};

export default Calendar;
