import { ApiClient } from "./api-client";
import type { TeacherRecord } from "./types";

export class TeacherManager {
  private teachers: TeacherRecord[] = [];
  private allTeachers: TeacherRecord[] = []; // 保存完整教师列表

  constructor(private apiClient: ApiClient) {}

  async getTeachers(department?: string): Promise<TeacherRecord[]> {
    if (!department) {
      // 获取所有教师，保存到两个字段
      this.allTeachers = await this.apiClient.getTeachers();
      this.teachers = this.allTeachers;
    } else {
      // 获取特定部门的教师，只更新显示列表
      this.teachers = await this.apiClient.getTeachers(department);
    }
    return this.teachers;
  }

  async getTeacher(id: string): Promise<TeacherRecord> {
    return this.apiClient.getTeacher(id);
  }

  async createTeacher(
    teacher: Omit<TeacherRecord, "permission"> & { permission?: string },
  ): Promise<TeacherRecord> {
    const newTeacher = await this.apiClient.createTeacher(teacher);
    this.teachers.push(newTeacher);
    return newTeacher;
  }

  async updateTeacher(
    id: string,
    updates: Partial<TeacherRecord>,
  ): Promise<TeacherRecord> {
    const updated = await this.apiClient.updateTeacher(id, updates);
    const index = this.teachers.findIndex((t) => t.teacher_id === id);
    if (index > -1) {
      this.teachers[index] = updated;
    }
    return updated;
  }

  async deleteTeacher(id: string): Promise<void> {
    await this.apiClient.deleteTeacher(id);
    this.teachers = this.teachers.filter((t) => t.teacher_id !== id);
  }

  searchTeachers(keyword: string): TeacherRecord[] {
    const lower = keyword.toLowerCase();
    return this.teachers.filter(
      (t) =>
        t.teacher_id.toLowerCase().includes(lower) ||
        t.name_cn.toLowerCase().includes(lower) ||
        (t.name_en && t.name_en.toLowerCase().includes(lower)),
    );
  }

  getTeachersByDepartment(department: string): TeacherRecord[] {
    return this.teachers.filter((t) => t.department === department);
  }

  getAllTeachers(): TeacherRecord[] {
    return [...this.teachers];
  }

  getDepartments(): string[] {
    // 从完整教师列表中提取部门，而不是从过滤后的列表
    const departments = new Set<string>();
    const sourceTeachers =
      this.allTeachers.length > 0 ? this.allTeachers : this.teachers;
    sourceTeachers.forEach((t) => {
      if (t.department) {
        departments.add(t.department);
      }
    });
    return Array.from(departments).sort();
  }
}
