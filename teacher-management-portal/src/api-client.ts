import type { TeacherRecord, DepartmentRecord, ApiResponse } from "./types";

export class ApiClient {
  constructor(
    private baseUrl: string,
    private apiKey: string,
  ) {}

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  async health(): Promise<ApiResponse> {
    return this.request("GET", "/api/health", null, false);
  }

  async getTeachers(department?: string): Promise<TeacherRecord[]> {
    let path = "/api/teachers";
    if (department) {
      path += `?department=${encodeURIComponent(department)}`;
    }
    const response = await this.request<TeacherRecord[]>("GET", path);
    return response.data || [];
  }

  async getTeacher(id: string): Promise<TeacherRecord> {
    const response = await this.request<TeacherRecord>(
      "GET",
      `/api/teachers/${encodeURIComponent(id.trim())}`,
    );
    if (!response.data) {
      throw new Error("教師不存在");
    }
    return response.data;
  }

  async createTeacher(
    teacher: Omit<TeacherRecord, "permission"> & { permission?: string },
  ): Promise<TeacherRecord> {
    const response = await this.request<TeacherRecord>(
      "POST",
      "/api/teachers",
      teacher,
    );
    if (!response.data) {
      throw new Error(response.error || "新增教師失敗");
    }
    return response.data;
  }

  async updateTeacher(
    id: string,
    updates: Partial<TeacherRecord>,
  ): Promise<TeacherRecord> {
    const response = await this.request<TeacherRecord>(
      "PUT",
      `/api/teachers/${encodeURIComponent(id.trim())}`,
      updates,
    );
    if (!response.data) {
      throw new Error(response.error || "修改教師失敗");
    }
    return response.data;
  }

  async deleteTeacher(id: string): Promise<void> {
    await this.request("DELETE", `/api/teachers/${encodeURIComponent(id.trim())}`);
  }

  async bulkImportTeachers(teachers: any[]): Promise<ApiResponse<any>> {
    const response = await this.request<any>("POST", "/api/teachers/import", {
      teachers,
    });
    return response;
  }

  async getDepartments(): Promise<DepartmentRecord[]> {
    const response = await this.request<DepartmentRecord[]>(
      "GET",
      "/api/departments",
    );
    return response.data || [];
  }

  async createDepartment(name: string): Promise<DepartmentRecord> {
    const response = await this.request<DepartmentRecord>(
      "POST",
      "/api/departments",
      { name },
    );
    if (!response.data) {
      throw new Error(response.error || "新增部門失敗");
    }
    return response.data;
  }

  async updateDepartment(id: string, name: string): Promise<DepartmentRecord> {
    const response = await this.request<DepartmentRecord>(
      "PUT",
      `/api/departments/${encodeURIComponent(id.trim())}`,
      { name },
    );
    if (!response.data) {
      throw new Error(response.error || "修改部門失敗");
    }
    return response.data;
  }

  async deleteDepartment(id: string): Promise<void> {
    await this.request(
      "DELETE",
      `/api/departments/${encodeURIComponent(id.trim())}`,
    );
  }

  async syncDepartmentsFromTeachers(): Promise<{
    total_distinct: number;
    created: number;
    skipped: number;
  }> {
    const response = await this.request<{
      total_distinct: number;
      created: number;
      skipped: number;
    }>("POST", "/api/departments/sync-from-teachers");
    return response.data || { total_distinct: 0, created: 0, skipped: 0 };
  }

  private async request<T = any>(
    method: string,
    path: string,
    body: any = null,
    requiresAuth: boolean = true,
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: requiresAuth
        ? this.getHeaders()
        : { "Content-Type": "application/json" },
    };

    if (body && (method === "POST" || method === "PUT")) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API 請求失敗: ${method} ${path}`, error);
      throw error;
    }
  }
}
