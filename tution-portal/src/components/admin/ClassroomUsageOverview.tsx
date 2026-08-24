import React, { useEffect, useMemo, useState } from "react";
import type { ClassroomRecord, TutionClass, TutionSchedule } from "@/types/index";
import { scheduleService } from "@/services/scheduleService";
import { formatDate, getDayOfWeekFromDate } from "@/utils/validators";
import { getSemesterInfo } from "@/utils/semester";
import "./classroom-usage.css";

interface ClassroomUsageOverviewProps {
  classes: TutionClass[];
  classrooms: ClassroomRecord[];
  /** 管理員設定的全域「最後上課日期」：課程沒自行設定 end_date 時的預設終止日 */
  lastTeachingDate?: string;
}

const OCCUPYING_STATUSES = ["reviewing", "approved", "active"];

const WEEKDAY_SHORT: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
};

function currentMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  return `${y}年${m}月`;
}

// 產生該月份的所有平日日期（跳過星期六、日），依日期排序
function generateMonthWeekdays(yearMonth: string): string[] {
  if (!yearMonth) return [];
  const [y, m] = yearMonth.split("-").map(Number);
  const start = Date.UTC(y, m - 1, 1);
  const end = Date.UTC(y, m, 0); // 該月最後一天
  const dates: string[] = [];

  for (let t = start; t <= end; t += 86400000) {
    const day = new Date(t).getUTCDay(); // 0=Sun, 6=Sat
    if (day === 0 || day === 6) continue;
    dates.push(formatDate(new Date(t)));
  }
  return dates;
}

// 沒有設定 end_date 時的預設邊界，依序參考：
// 1. 申請人自己設定的 end_date
// 2. 管理員設定的全域「最後上課日期」
// 3. 開課日所在那個學期（上/下學年）的最後一天（管理員也還沒設定時的保底邊界）
// 避免課程沒設結束日期就被當成無限期每週重複，一路排到很久以後的月份
function getEffectiveEndDate(cls: TutionClass, lastTeachingDate?: string): string {
  if (cls.end_date) return cls.end_date;
  if (lastTeachingDate) return lastTeachingDate;
  const { year, half } = getSemesterInfo(cls.start_date);
  return half === "h1" ? `${year}-05-31` : `${year}-12-31`;
}

// 課程是否仍在有效上課區間內
function isDateWithinClassRange(cls: TutionClass, date: string, lastTeachingDate?: string): boolean {
  if (date < cls.start_date) return false;
  return date <= getEffectiveEndDate(cls, lastTeachingDate);
}

function formatDateMain(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${d}/${m}/${y}`;
}

function formatDateWeekday(dateStr: string): string {
  const dayName = getDayOfWeekFromDate(dateStr);
  return `(${WEEKDAY_SHORT[dayName] || dayName})`;
}

interface CellEntry {
  class_id: string;
  subject: string;
  form: string;
  teacher_name_cn: string;
  kind: "regular" | "rescheduled-in";
}

interface FadedEntry {
  class_id: string;
  subject: string;
  form: string;
  teacher_name_cn: string;
  note: string; // 例如「已調至 8/9/2026」或「已停課」
}

interface UnassignedEntry {
  date: string;
  schedule: TutionSchedule;
  cls: TutionClass;
}

export const ClassroomUsageOverview: React.FC<ClassroomUsageOverviewProps> = ({
  classes,
  classrooms,
  lastTeachingDate,
}) => {
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());
  const [schedules, setSchedules] = useState<TutionSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await scheduleService.listAllSchedules();
      setSchedules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入調課記錄失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedClassrooms = useMemo(
    () => [...classrooms].sort((a, b) => a.classroom_id.localeCompare(b.classroom_id)),
    [classrooms]
  );

  // 教室編號前兩碼相同的分成一組，各自一張表，避免單一表格橫向過長
  const classroomGroups = useMemo(() => {
    const map = new Map<string, ClassroomRecord[]>();
    for (const classroom of sortedClassrooms) {
      const prefix = classroom.classroom_id.slice(0, 2);
      if (!map.has(prefix)) map.set(prefix, []);
      map.get(prefix)!.push(classroom);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [sortedClassrooms]);

  const dates = useMemo(() => generateMonthWeekdays(selectedMonth), [selectedMonth]);

  // 每個日期 -> 每個教室名稱 -> 目前實際佔用該格的課程（判斷空閒／衝堂用這份）
  // 另外還有：已調走／停課的原課程（反灰顯示用，不算佔用），以及尚未指定教室的調課清單
  const { occupancyByDate, fadedByDate, unassignedList } = useMemo(() => {
    const classById = new Map(classes.map((c) => [c.class_id, c]));
    const occupancy: Record<string, Record<string, CellEntry>> = {};
    const faded: Record<string, Record<string, FadedEntry>> = {};
    const unassigned: UnassignedEntry[] = [];

    for (const date of dates) {
      occupancy[date] = {};
      faded[date] = {};
      const dayName = getDayOfWeekFromDate(date);

      // 1. 規律上課：day_of_week 相符，且這一天落在課程的開課～結束日期之間
      for (const cls of classes) {
        if (!OCCUPYING_STATUSES.includes(cls.approval_status)) continue;
        if (cls.day_of_week !== dayName) continue;
        if (!cls.venue) continue;
        if (!isDateWithinClassRange(cls, date, lastTeachingDate)) continue;

        const exception = schedules.find(
          (s) => s.class_id === cls.class_id && s.scheduled_date === date
        );

        if (!exception) {
          // 正常上課
          occupancy[date][cls.venue] = {
            class_id: cls.class_id,
            subject: cls.subject,
            form: cls.form,
            teacher_name_cn: cls.teacher_name_cn,
            kind: "regular",
          };
        } else if (exception.status === "cancelled") {
          // 當天停課：反灰顯示，這格教室視為空的
          faded[date][cls.venue] = {
            class_id: cls.class_id,
            subject: cls.subject,
            form: cls.form,
            teacher_name_cn: cls.teacher_name_cn,
            note: "已停課",
          };
        } else if (exception.status === "rescheduled" && exception.rescheduled_to) {
          // 調到別天了：反灰並註記調到哪一天，這格教室視為空的
          faded[date][cls.venue] = {
            class_id: cls.class_id,
            subject: cls.subject,
            form: cls.form,
            teacher_name_cn: cls.teacher_name_cn,
            note: `已調至 ${formatDateMain(exception.rescheduled_to)}`,
          };
        }
      }

      // 2. 調課調入：rescheduled_to 命中這一天
      for (const schedule of schedules) {
        if (schedule.status !== "rescheduled" || schedule.rescheduled_to !== date) continue;
        const cls = classById.get(schedule.class_id);
        if (!cls || !OCCUPYING_STATUSES.includes(cls.approval_status)) continue;

        if (schedule.rescheduled_venue) {
          occupancy[date][schedule.rescheduled_venue] = {
            class_id: cls.class_id,
            subject: cls.subject,
            form: cls.form,
            teacher_name_cn: cls.teacher_name_cn,
            kind: "rescheduled-in",
          };
        } else {
          unassigned.push({ date, schedule, cls });
        }
      }
    }

    unassigned.sort((a, b) => a.date.localeCompare(b.date));

    return { occupancyByDate: occupancy, fadedByDate: faded, unassignedList: unassigned };
  }, [classes, schedules, dates, lastTeachingDate]);

  // 空不空只看「目前實際佔用」，原課程調走／停課後反灰顯示的那格不算佔用
  const isVenueFreeOnDate = (date: string, classroomName: string) =>
    !occupancyByDate[date]?.[classroomName];

  // 只顯示當天在任一教室有課程活動（含反灰的原課程）的日期，過去／未來完全沒課的日期不顯示
  const activeDates = useMemo(
    () =>
      dates.filter((date) => {
        const occ = occupancyByDate[date];
        const fad = fadedByDate[date];
        return (occ && Object.keys(occ).length > 0) || (fad && Object.keys(fad).length > 0);
      }),
    [dates, occupancyByDate, fadedByDate]
  );

  const handleAssignRescheduleVenue = async (scheduleId: string, venue: string) => {
    try {
      await scheduleService.assignRescheduleVenue(scheduleId, venue);
      await fetchSchedules();
    } catch (err) {
      alert(`❌ ${err instanceof Error ? err.message : "指定教室失敗"}`);
    }
  };

  return (
    <div className="usage-overview">
      <div className="usage-overview__controls">
        <button
          type="button"
          className="btn btn--secondary btn--small"
          onClick={() => setSelectedMonth((m) => shiftMonth(m, -1))}
        >
          ◀ 上個月
        </button>
        <label>
          月份
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn btn--secondary btn--small"
          onClick={() => setSelectedMonth((m) => shiftMonth(m, 1))}
        >
          下個月 ▶
        </button>
        <span className="usage-overview__month-label">{formatMonthLabel(selectedMonth)}</span>
      </div>

      {error && <div className="usage-overview__error">❌ {error}</div>}

      {/* 待指定教室（調課）：放在頁面最上方，不放進表格裡 */}
      {unassignedList.length > 0 && (
        <div className="unassigned-section">
          <h3 className="unassigned-section__title">⚠️ 待指定教室（調課）</h3>
          {unassignedList.map(({ date, schedule, cls }) => (
            <UnassignedRescheduleRow
              key={schedule.schedule_id}
              date={date}
              cls={cls}
              classrooms={sortedClassrooms}
              isVenueFree={(classroomName) => isVenueFreeOnDate(date, classroomName)}
              onAssign={(venue) => handleAssignRescheduleVenue(schedule.schedule_id, venue)}
            />
          ))}
        </div>
      )}

      {loading ? (
        <div className="loading-text">載入中...</div>
      ) : activeDates.length === 0 ? (
        <div className="empty-state">這個月沒有任何課程紀錄</div>
      ) : (
        classroomGroups.map(([prefix, groupClassrooms]) => (
          <div key={prefix} className="usage-overview__group">
            <h3 className="usage-overview__group-title">
              {prefix}xx（{groupClassrooms.length} 間）
            </h3>
            <div className="usage-overview__table-container">
              <table className="usage-overview__table">
                <thead>
                  <tr>
                    <th className="usage-overview__date-col">日期</th>
                    {groupClassrooms.map((classroom) => (
                      <th key={classroom.classroom_id}>
                        <div>{classroom.classroom_name}</div>
                        <div className="usage-overview__desks">
                          ({classroom.number_of_desks}桌)
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeDates.map((date) => (
                    <tr key={date}>
                      <td className="usage-overview__date-col">
                        <div>{formatDateMain(date)}</div>
                        <div className="usage-overview__weekday">{formatDateWeekday(date)}</div>
                      </td>
                      {groupClassrooms.map((classroom) => {
                        const entry = occupancyByDate[date]?.[classroom.classroom_name];
                        const fadedEntry = fadedByDate[date]?.[classroom.classroom_name];
                        return (
                          <td key={classroom.classroom_id}>
                            {fadedEntry && (
                              <div className="usage-cell usage-cell--faded">
                                <div className="usage-cell__subject">
                                  {fadedEntry.form}
                                  {fadedEntry.subject}
                                </div>
                                <div className="usage-cell__teacher">
                                  （{fadedEntry.teacher_name_cn}）
                                </div>
                                <div className="usage-cell__note">{fadedEntry.note}</div>
                              </div>
                            )}
                            {entry && (
                              <div
                                className={`usage-cell ${
                                  entry.kind === "rescheduled-in" ? "usage-cell--rescheduled" : ""
                                }`}
                              >
                                <div className="usage-cell__subject">
                                  {entry.form}
                                  {entry.subject}
                                </div>
                                <div className="usage-cell__teacher">
                                  （{entry.teacher_name_cn}）
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

interface UnassignedRescheduleRowProps {
  date: string;
  cls: TutionClass;
  classrooms: ClassroomRecord[];
  isVenueFree: (classroomName: string) => boolean;
  onAssign: (venue: string) => Promise<void>;
}

const UnassignedRescheduleRow: React.FC<UnassignedRescheduleRowProps> = ({
  date,
  cls,
  classrooms,
  isVenueFree,
  onAssign,
}) => {
  const [venue, setVenue] = useState("");
  const [assigning, setAssigning] = useState(false);

  const handleClick = async () => {
    if (!venue) {
      alert("請先選擇教室");
      return;
    }
    setAssigning(true);
    try {
      await onAssign(venue);
      setVenue("");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="unassigned-reschedule">
      <div className="unassigned-reschedule__info">
        {formatDateMain(date)}
        {formatDateWeekday(date)}　{cls.form}
        {cls.subject}（{cls.teacher_name_cn}）
      </div>
      <div className="unassigned-reschedule__row">
        <select value={venue} onChange={(e) => setVenue(e.target.value)} disabled={assigning}>
          <option value="">選擇教室</option>
          {classrooms.map((classroom) => {
            const free = isVenueFree(classroom.classroom_name);
            return (
              <option
                key={classroom.classroom_id}
                value={classroom.classroom_name}
                disabled={!free}
              >
                {classroom.classroom_name}
                {!free ? "（已被使用）" : ""}
              </option>
            );
          })}
        </select>
        <button
          type="button"
          className="btn btn--primary btn--small"
          onClick={handleClick}
          disabled={assigning}
        >
          {assigning ? "指定中..." : "指定教室"}
        </button>
      </div>
    </div>
  );
};

export default ClassroomUsageOverview;
