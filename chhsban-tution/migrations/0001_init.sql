-- 補習班系統 D1 資料表（2026-09-30 由 KV 遷移）
--
-- 班級、名單、排課例外：常用來查詢的欄位獨立成欄並建索引，完整物件存在 data（JSON），
-- 這樣舊資料裡的額外欄位（收據、簽核檔、initial_roster、student_no…）不用逐一建欄也不會遺失。
-- 出勤：資料量最大、要做統計，全部拆成欄位。
--
-- 注意：D1 以「掃描過的行數」計算讀取額度，查詢條件一定要走索引。

CREATE TABLE IF NOT EXISTS tution_classes (
  class_id        TEXT PRIMARY KEY,
  teacher_id      TEXT NOT NULL,
  approval_status TEXT NOT NULL,
  start_date      TEXT,
  created_at      INTEGER NOT NULL,
  data            TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON tution_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_created ON tution_classes(created_at);

CREATE TABLE IF NOT EXISTS tution_roster (
  roster_id   TEXT PRIMARY KEY,
  class_id    TEXT NOT NULL,
  student_id  TEXT NOT NULL,
  student_no  TEXT,
  updated_at  INTEGER NOT NULL,
  data        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_roster_class   ON tution_roster(class_id);
CREATE INDEX IF NOT EXISTS idx_roster_student ON tution_roster(student_id);
CREATE INDEX IF NOT EXISTS idx_roster_no      ON tution_roster(student_no);

CREATE TABLE IF NOT EXISTS tution_schedules (
  schedule_id    TEXT PRIMARY KEY,
  class_id       TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  data           TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_schedules_class ON tution_schedules(class_id);

-- 點名歷史（新增制：每次儲存都新增，不覆寫，保留完整修改紀錄）
CREATE TABLE IF NOT EXISTS tution_attendance_log (
  attendance_id  TEXT PRIMARY KEY,
  class_id       TEXT NOT NULL,
  student_id     TEXT NOT NULL,
  class_date     TEXT NOT NULL,
  status         TEXT NOT NULL,
  absence_reason TEXT,
  recorded_at    INTEGER NOT NULL,
  recorded_by    TEXT
);
CREATE INDEX IF NOT EXISTS idx_att_log_class ON tution_attendance_log(class_id, class_date);

-- 每位學生每堂課的「目前狀態」（歷史裡最新的一筆），所有查詢都讀這張
CREATE TABLE IF NOT EXISTS tution_attendance (
  class_id       TEXT NOT NULL,
  student_id     TEXT NOT NULL,
  class_date     TEXT NOT NULL,
  attendance_id  TEXT NOT NULL,
  status         TEXT NOT NULL,
  absence_reason TEXT,
  recorded_at    INTEGER NOT NULL,
  recorded_by    TEXT,
  PRIMARY KEY (class_id, student_id, class_date)
);
CREATE INDEX IF NOT EXISTS idx_att_date    ON tution_attendance(class_date);
CREATE INDEX IF NOT EXISTS idx_att_student ON tution_attendance(student_id);

-- 系統設定（最後上課日期、開課報表快取）
CREATE TABLE IF NOT EXISTS tution_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 只增不減的計數器（申請編號，刪除申請後號碼不會重複發出）
CREATE TABLE IF NOT EXISTS tution_counters (
  name  TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
