import type { Permission } from "@/shared/types";

/**
 * 各頁面可進入的身分（路由守衛與側邊欄共用同一份，避免兩邊不一致）。
 * 督察員只能查看：已開課管理（唯讀）、報表、出席與選修課；教室管理員只能看每日教室使用；
 * 舍監只能看住宿生點名控管與學號出席查詢。
 * 能不能「修改」由各 Worker 把關，前端只負責隱藏按鈕。
 */
export const PAGE_ACCESS: Record<string, Permission[]> = {
  "/data/student-sync": ["super_admin"],
  "/data/student-export": ["super_admin"],
  "/data/official-roster": ["super_admin"],
  "/tution/approvals": ["super_admin"],
  "/tution/courses": ["super_admin", "admin"],
  "/tution/course-report": ["super_admin", "admin"],
  "/tution/course-attendance": ["super_admin", "admin"],
  "/tution/usage": ["super_admin", "classroom_manager"],
  "/tution/boarding-attendance": ["super_admin", "admin", "dorm_supervisor"],
  "/tution/student-attendance": ["super_admin", "admin", "dorm_supervisor"],
  "/optional/courses": ["super_admin", "admin"],
  "/optional/calendar": ["super_admin", "admin"],
  "/optional/attendance": ["super_admin", "admin"],
  "/settings/teachers": ["super_admin"],
  "/settings/password-reset": ["super_admin"],
  "/settings/classrooms": ["super_admin"],
  "/maintenance/legacy-cleanup": ["super_admin"], // 一次性工具，舊學生資料清完即可移除
};

/** 登入後的首頁 */
export const HOME_BY_PERMISSION: Partial<Record<Permission, string>> = {
  super_admin: "/tution/approvals",
  admin: "/optional/courses",
  classroom_manager: "/tution/usage",
  dorm_supervisor: "/tution/boarding-attendance",
};

export function canAccess(path: string, permission: Permission | undefined): boolean {
  return !!permission && (PAGE_ACCESS[path] ?? []).includes(permission);
}
