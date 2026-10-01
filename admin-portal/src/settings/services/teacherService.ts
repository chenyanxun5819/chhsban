import { createApiClient } from "@/shared/api/createApiClient";
import type { Permission } from "@/shared/types";

// 教師管理 Worker（teacher-management）：帶行政管理站的登入 token，後端只接受 super_admin
const teacherApi = createApiClient(
  import.meta.env.VITE_TEACHER_API_BASE_URL || "https://teacher-management.astcws.workers.dev/api",
);

export interface Teacher {
  teacher_id: string;
  name_cn: string;
  name_en: string;
  department: string;
  /** 學校工作信箱（顯示、聯絡用） */
  email: string;
  /** 私人 Google 帳號：老師登入各系統用的帳號 */
  google_email?: string;
  permission: Permission;
  has_password: boolean;
}

export interface Department {
  department_id: string;
  name: string;
  created_at: number;
  updated_at: number;
}

export type TeacherInput = Pick<Teacher, "teacher_id" | "name_cn" | "name_en" | "department" | "email" | "permission"> & {
  google_email: string;
};

/** Excel 批量匯入的一列；既有教師只需 teacher_id，其餘欄位留空代表不變更 */
export interface TeacherImportRow {
  teacher_id: string;
  name_cn?: string;
  department?: string;
  email?: string;
  google_email?: string;
}

export interface TeacherImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ teacher_id: string; error: string }>;
}

/** 把後端回的錯誤訊息（{ error }）取出來，取不到就用 fallback */
export function apiErrorMessage(err: any, fallback: string): string {
  return err?.response?.data?.error || err?.message || fallback;
}

export const teacherService = {
  async listTeachers(): Promise<Teacher[]> {
    const response = await teacherApi.get<{ data: Teacher[] }>("/teachers");
    return response.data.data || [];
  },

  async createTeacher(teacher: TeacherInput): Promise<Teacher> {
    const response = await teacherApi.post<{ data: Teacher }>("/teachers", teacher);
    return response.data.data;
  },

  async updateTeacher(teacherId: string, updates: Omit<TeacherInput, "teacher_id">): Promise<Teacher> {
    const response = await teacherApi.put<{ data: Teacher }>(`/teachers/${encodeURIComponent(teacherId)}`, updates);
    return response.data.data;
  },

  async deleteTeacher(teacherId: string): Promise<void> {
    await teacherApi.delete(`/teachers/${encodeURIComponent(teacherId)}`);
  },

  async importTeachers(teachers: TeacherImportRow[]): Promise<TeacherImportResult> {
    // 逐位教師讀寫 KV，一百多位老師需要一點時間
    const response = await teacherApi.post<{ data: TeacherImportResult }>("/teachers/import", { teachers }, { timeout: 120000 });
    return response.data.data;
  },

  async listDepartments(): Promise<Department[]> {
    const response = await teacherApi.get<{ data: Department[] }>("/departments");
    return response.data.data || [];
  },

  async createDepartment(name: string): Promise<Department> {
    const response = await teacherApi.post<{ data: Department }>("/departments", { name });
    return response.data.data;
  },

  /** 改名；若新名稱已是另一個部門，後端會把教師併過去並刪除這筆（回傳的 message 會說明） */
  async renameDepartment(departmentId: string, name: string): Promise<string> {
    const response = await teacherApi.put<{ message?: string }>(`/departments/${encodeURIComponent(departmentId)}`, { name });
    return response.data.message || "部門修改成功";
  },

  async deleteDepartment(departmentId: string): Promise<void> {
    await teacherApi.delete(`/departments/${encodeURIComponent(departmentId)}`);
  },

  /** 把教師資料裡用到、但部門主檔還沒有的部門名稱補進去 */
  async syncDepartmentsFromTeachers(): Promise<{ created: number }> {
    const response = await teacherApi.post<{ data: { created: number } }>("/departments/sync-from-teachers");
    return response.data.data;
  },
};
