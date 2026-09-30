#!/usr/bin/env node
/**
 * 一次性工具：把補習班資料從 KV 搬到 D1（2026-09-30）。
 *
 * 用法（在 chhsban-tution 目錄）：
 *   node scripts/migrate-kv-to-d1.mjs --local    匯入本機 D1（wrangler dev 測試用）
 *   node scripts/migrate-kv-to-d1.mjs --remote   匯入線上 D1
 *
 * - 一律從「線上」KV 讀資料（唯讀，不會改動或刪除 KV）。
 * - 可以重複執行：班級、名單、排課例外、設定用覆寫；點名歷史已存在的不重複寫入；
 *   點名目前狀態只在 KV 的紀錄比 D1 新時才更新。部署前一刻再跑一次，就能補上當天的新資料。
 * - 需要先建表：npx wrangler@4 d1 migrations apply tution-db --local|--remote
 * - 用 wrangler@4 是因為 `kv bulk get`（一次讀 100 筆）只有 v4 才有。
 */

import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const target = process.argv.includes("--remote") ? "--remote" : process.argv.includes("--local") ? "--local" : null;
if (!target) {
  console.error("請指定 --local 或 --remote");
  process.exit(1);
}

const NAMESPACES = {
  class: "16fbdfd4c5e2444ebea8c55d313e00f8",
  roster: "ab63a42d9b6643e3ae5b17e7f807da03",
  schedule: "f95d69ef1fc347f29c9936605e9ccfde",
  attendance: "d16847622dd244bb9d1d235cdfce6d1c",
};
const WRANGLER = "npx -y wrangler@4";
const workDir = mkdtempSync(join(tmpdir(), "tution-migrate-"));

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", maxBuffer: 200 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
}

/** 從 wrangler 輸出裡取出 JSON（前後可能夾著警告或 "Success!" 等文字） */
function parseJsonOutput(output) {
  const start = output.search(/[[{]/);
  const end = output.lastIndexOf(output[start] === "[" ? "]" : "}");
  return JSON.parse(output.slice(start, end + 1));
}

function readNamespace(label, namespaceId) {
  const keys = parseJsonOutput(run(`${WRANGLER} kv key list --namespace-id ${namespaceId} --remote`)).map((k) => k.name);
  const values = {};
  for (let i = 0; i < keys.length; i += 100) {
    const file = join(workDir, `${label}-${i}.json`);
    writeFileSync(file, JSON.stringify(keys.slice(i, i + 100)));
    Object.assign(values, parseJsonOutput(run(`${WRANGLER} kv bulk get "${file}" --namespace-id ${namespaceId} --remote`)));
  }
  console.log(`讀取 KV ${label}: ${keys.length} 筆`);
  return values;
}

const sqlValue = (v) =>
  v === undefined || v === null ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`;

function parseValue(raw) {
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

const statements = [];
const expected = {};

// ===== 班級（含 system: 設定） =====
const classValues = readNamespace("class", NAMESPACES.class);
expected.classes = 0;
for (const [key, raw] of Object.entries(classValues)) {
  const value = parseValue(raw);
  if (!value) continue;
  if (key === "system:last_teaching_date") {
    if (value.date) {
      statements.push(
        `INSERT OR REPLACE INTO tution_settings (key, value, updated_at) VALUES ('last_teaching_date', ${sqlValue(value.date)}, ${sqlValue(value.updated_at || Date.now())});`,
      );
    }
    continue;
  }
  if (key === "system:course_report_summary") {
    statements.push(
      `INSERT OR REPLACE INTO tution_settings (key, value, updated_at) VALUES ('course_report_summary', ${sqlValue(JSON.stringify(value))}, ${sqlValue(value.generated_at || Date.now())});`,
    );
    continue;
  }
  if (!key.startsWith("class_")) continue;
  expected.classes++;
  statements.push(
    `INSERT OR REPLACE INTO tution_classes (class_id, teacher_id, approval_status, start_date, created_at, data) VALUES (${sqlValue(key)}, ${sqlValue(value.teacher_id || "")}, ${sqlValue(value.approval_status || "pending")}, ${sqlValue(value.start_date)}, ${sqlValue(value.created_at || 0)}, ${sqlValue(JSON.stringify({ ...value, class_id: key }))});`,
  );
}

// ===== 名單 =====
const rosterValues = readNamespace("roster", NAMESPACES.roster);
expected.roster = 0;
for (const [key, raw] of Object.entries(rosterValues)) {
  const value = parseValue(raw);
  if (!value || !key.startsWith("roster_") || !value.class_id) continue;
  expected.roster++;
  const entry = { ...value, roster_id: key, is_active: !value.withdrawal_date };
  statements.push(
    `INSERT OR REPLACE INTO tution_roster (roster_id, class_id, student_id, student_no, updated_at, data) VALUES (${sqlValue(key)}, ${sqlValue(value.class_id)}, ${sqlValue(String(value.student_id ?? ""))}, ${sqlValue(value.student_no)}, ${sqlValue(value.updated_at || value.created_at || 0)}, ${sqlValue(JSON.stringify(entry))});`,
  );
}

// ===== 排課例外 =====
const scheduleValues = readNamespace("schedule", NAMESPACES.schedule);
expected.schedules = 0;
for (const [key, raw] of Object.entries(scheduleValues)) {
  const value = parseValue(raw);
  if (!value || !key.startsWith("schedule_") || !value.class_id) continue;
  expected.schedules++;
  statements.push(
    `INSERT OR REPLACE INTO tution_schedules (schedule_id, class_id, scheduled_date, data) VALUES (${sqlValue(key)}, ${sqlValue(value.class_id)}, ${sqlValue(value.scheduled_date || "")}, ${sqlValue(JSON.stringify({ ...value, schedule_id: key }))});`,
  );
}

// ===== 點名：歷史全部寫入 log，目前狀態取每位學生每堂課最新一筆 =====
const attendanceValues = readNamespace("attendance", NAMESPACES.attendance);
const latest = new Map();
expected.attendance_log = 0;
for (const [key, raw] of Object.entries(attendanceValues)) {
  const value = parseValue(raw);
  if (!value || !key.startsWith("attendance_") || !value.class_id || !value.class_date) continue;
  expected.attendance_log++;
  const record = { ...value, attendance_id: key, student_id: String(value.student_id) };
  const cols = `${sqlValue(record.class_id)}, ${sqlValue(record.student_id)}, ${sqlValue(record.class_date)}, ${sqlValue(record.attendance_id)}, ${sqlValue(record.status)}, ${sqlValue(record.absence_reason || null)}, ${sqlValue(record.recorded_at || 0)}, ${sqlValue(record.recorded_by || null)}`;
  statements.push(
    `INSERT OR IGNORE INTO tution_attendance_log (class_id, student_id, class_date, attendance_id, status, absence_reason, recorded_at, recorded_by) VALUES (${cols});`,
  );
  const group = `${record.class_id}|${record.student_id}|${record.class_date}`;
  const current = latest.get(group);
  if (
    !current ||
    record.recorded_at > current.record.recorded_at ||
    (record.recorded_at === current.record.recorded_at && record.attendance_id > current.record.attendance_id)
  ) {
    latest.set(group, { record, cols });
  }
}
expected.attendance = latest.size;
for (const { cols } of latest.values()) {
  statements.push(
    `INSERT INTO tution_attendance (class_id, student_id, class_date, attendance_id, status, absence_reason, recorded_at, recorded_by) VALUES (${cols})
     ON CONFLICT (class_id, student_id, class_date) DO UPDATE SET attendance_id = excluded.attendance_id, status = excluded.status, absence_reason = excluded.absence_reason, recorded_at = excluded.recorded_at, recorded_by = excluded.recorded_by
     WHERE excluded.recorded_at > tution_attendance.recorded_at OR (excluded.recorded_at = tution_attendance.recorded_at AND excluded.attendance_id > tution_attendance.attendance_id);`,
  );
}

// ===== 匯入 D1 =====
const sqlFile = join(workDir, "import.sql");
writeFileSync(sqlFile, statements.join("\n"));
console.log(`產生 ${statements.length} 條 SQL，匯入 D1（${target}）...`);
run(`${WRANGLER} d1 execute tution-db ${target} --file="${sqlFile}" --yes`);

// ===== 核對筆數 =====
const counts = parseJsonOutput(
  run(
    `${WRANGLER} d1 execute tution-db ${target} --json --command="SELECT (SELECT COUNT(*) FROM tution_classes) AS classes, (SELECT COUNT(*) FROM tution_roster) AS roster, (SELECT COUNT(*) FROM tution_schedules) AS schedules, (SELECT COUNT(*) FROM tution_attendance_log) AS attendance_log, (SELECT COUNT(*) FROM tution_attendance) AS attendance"`,
  ),
)[0].results[0];

console.log("\n項目            KV     D1");
let ok = true;
for (const [name, kvCount] of Object.entries(expected)) {
  const d1Count = counts[name];
  // 遷移後 D1 可能已有新資料，所以 D1 ≥ KV 就算正常
  const mark = d1Count >= kvCount ? "✓" : "✗";
  if (d1Count < kvCount) ok = false;
  console.log(`${name.padEnd(15)} ${String(kvCount).padStart(4)} ${String(d1Count).padStart(6)}  ${mark}`);
}
console.log(ok ? "\n✅ 搬移完成，筆數核對無誤" : "\n❌ 有項目筆數不足，請檢查");
process.exit(ok ? 0 : 1);
