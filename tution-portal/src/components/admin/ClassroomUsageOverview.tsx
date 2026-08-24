import React, { useEffect, useMemo, useState } from "react";
import type { ClassroomRecord, TutionClass, TutionSchedule } from "@/types/index";
import { scheduleService } from "@/services/scheduleService";
import { formatDate, getDayOfWeekFromDate } from "@/utils/validators";
import "./classroom-usage.css";

interface ClassroomUsageOverviewProps {
  classes: TutionClass[];
  classrooms: ClassroomRecord[];
}

const OCCUPYING_STATUSES = ["reviewing", "approved", "active"];

const WEEKDAY_SHORT: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
};

function todayStr(): string {
  return formatDate(new Date());
}

function addDaysStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

// 產生 from~to 範圍內的所有平日日期（跳過星期六、日），依日期排序
function generateWeekdayDates(fromDate: string, toDate: string): string[] {
  if (!fromDate || !toDate || fromDate > toDate) return [];
  const [fy, fm, fd] = fromDate.split("-").map(Number);
  const [ty, tm, td] = toDate.split("-").map(Number);
  const start = Date.UTC(fy, fm - 1, fd);
  const end = Date.UTC(ty, tm - 1, td);
  const dates: string[] = [];

  for (let t = start; t <= end; t += 86400000) {
    const day = new Date(t).getUTCDay(); // 0=Sun, 6=Sat
    if (day === 0 || day === 6) continue;
    dates.push(formatDate(new Date(t)));
  }
  return dates;
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dayName = getDayOfWeekFromDate(dateStr);
  return `${d}/${m}/${y}(${WEEKDAY_SHORT[dayName] || dayName})`;
}

interface CellEntry {
  class_id: string;
  subject: string;
  form: string;
  teacher_name_cn: string;
}

interface UnassignedEntry {
  schedule: TutionSchedule;
  cls: TutionClass;
}

export const ClassroomUsageOverview: React.FC<ClassroomUsageOverviewProps> = ({
  classes,
  classrooms,
}) => {
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(addDaysStr(todayStr(), 13));
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

  const dates = useMemo(() => generateWeekdayDates(fromDate, toDate), [fromDate, toDate]);

  // 每個日期 -> 每個教室名稱 -> 佔用該格的課程；以及每個日期 -> 尚未指定教室的調課清單
  const { occupancyByDate, unassignedByDate } = useMemo(() => {
    const classById = new Map(classes.map((c) => [c.class_id, c]));
    const occupancy: Record<string, Record<string, CellEntry>> = {};
    const unassigned: Record<string, UnassignedEntry[]> = {};

    for (const date of dates) {
      occupancy[date] = {};
      unassigned[date] = [];

      const dayName = getDayOfWeekFromDate(date);

      // 1. 規律上課：day_of_week 相符，且當天沒有停課／調走的例外記錄
      for (const cls of classes) {
        if (!OCCUPYING_STATUSES.includes(cls.approval_status)) continue;
        if (cls.day_of_week !== dayName) continue;
        if (!cls.venue) continue;

        const exception = schedules.find(
          (s) => s.class_id === cls.class_id && s.scheduled_date === date
        );
        if (exception && (exception.status === "cancelled" || exception.status === "rescheduled")) {
          continue; // 當天停課，或調到別天了
        }

        occupancy[date][cls.venue] = {
          class_id: cls.class_id,
          subject: cls.subject,
          form: cls.form,
          teacher_name_cn: cls.teacher_name_cn,
        };
      }

      // 2. 調課調入：rescheduled_to 命中這一天
      for (const schedule of schedules) {
        if (schedule.status !== "rescheduled" || schedule.rescheduled_to !== date) continue;
        const cls = classById.get(schedule.class_id);
        if (!cls || !OCCUPYING_STATUSES.includes(cls.approval_status)) continue;

        const entry: CellEntry = {
          class_id: cls.class_id,
          subject: cls.subject,
          form: cls.form,
          teacher_name_cn: cls.teacher_name_cn,
        };

        if (schedule.rescheduled_venue) {
          occupancy[date][schedule.rescheduled_venue] = entry;
        } else {
          unassigned[date].push({ schedule, cls });
        }
      }
    }

    return { occupancyByDate: occupancy, unassignedByDate: unassigned };
  }, [classes, schedules, dates]);

  const isVenueFreeOnDate = (date: string, classroomName: string) =>
    !occupancyByDate[date]?.[classroomName];

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
        <label>
          開始日期
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </label>
        <label>
          結束日期
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </label>
      </div>

      {error && <div className="usage-overview__error">❌ {error}</div>}

      {loading ? (
        <div className="loading-text">載入中...</div>
      ) : dates.length === 0 ? (
        <div className="empty-state">請選擇有效的日期範圍</div>
      ) : (
        <div className="usage-overview__table-container">
          <table className="usage-overview__table">
            <thead>
              <tr>
                <th className="usage-overview__date-col">日期</th>
                {sortedClassrooms.map((classroom) => (
                  <th key={classroom.classroom_id}>{classroom.classroom_name}</th>
                ))}
                <th>待指定教室（調課）</th>
              </tr>
            </thead>
            <tbody>
              {dates.map((date) => (
                <tr key={date}>
                  <td className="usage-overview__date-col">{formatDateLabel(date)}</td>
                  {sortedClassrooms.map((classroom) => {
                    const entry = occupancyByDate[date]?.[classroom.classroom_name];
                    return (
                      <td key={classroom.classroom_id}>
                        {entry && (
                          <div className="usage-cell">
                            <div className="usage-cell__subject">
                              {entry.form}
                              {entry.subject}
                            </div>
                            <div className="usage-cell__teacher">（{entry.teacher_name_cn}）</div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="usage-overview__unassigned-col">
                    {unassignedByDate[date]?.map(({ schedule, cls }) => (
                      <UnassignedRescheduleRow
                        key={schedule.schedule_id}
                        date={date}
                        cls={cls}
                        classrooms={sortedClassrooms}
                        isVenueFree={(classroomName) => isVenueFreeOnDate(date, classroomName)}
                        onAssign={(venue) =>
                          handleAssignRescheduleVenue(schedule.schedule_id, venue)
                        }
                      />
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
        ⚠️ 未指定教室：{cls.form}
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
