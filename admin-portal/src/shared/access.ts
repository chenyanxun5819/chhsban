import type { Permission } from "@/shared/types";

/**
 * 各頁面可進入的身分（路由守衛與側邊欄共用同一份，避免兩邊不一致）。
 * 與原 tution-portal 規則一致：督察員只能看報表、出席與選修課；教室管理員只能看每日教室使用。
 * 能不能「修改」由各 Worker 把關，前端只負責隱藏按鈕。
 */
export const PAGE_ACCESS: Record<string, Permission[]> = {
  "/tution/approvals": ["super_admin"],
  "/tution/courses": ["super_admin"],
  "/tution/course-report": ["super_admin", "admin"],
  "/tution/course-attendance": ["super_admin", "admin"],
  "/tution/usage": ["super_admin", "classroom_manager"],
  "/optional/courses": ["super_admin", "admin"],
  "/optional/calendar": ["super_admin", "admin"],
  "/optional/attendance": ["super_admin", "admin"],
  "/settings/teachers": ["super_admin"],
  "/settings/password-reset": ["super_admin"],
  "/settings/classrooms": ["super_admin"],
};

/** 登入後的首頁 */
export const HOME_BY_PERMISSION: Partial<Record<Permission, string>> = {
  super_admin: "/tution/approvals",
  admin: "/optional/courses",
  classroom_manager: "/tution/usage",
};

export function canAccess(path: string, permission: Permission | undefined): boolean {
  return !!permission && (PAGE_ACCESS[path] ?? []).includes(permission);
}
