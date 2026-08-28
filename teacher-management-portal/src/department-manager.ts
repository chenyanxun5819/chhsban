import { ApiClient } from "./api-client";
import type { DepartmentRecord } from "./types";

export class DepartmentManager {
  private departments: DepartmentRecord[] = [];

  constructor(private apiClient: ApiClient) {}

  async getDepartments(): Promise<DepartmentRecord[]> {
    this.departments = await this.apiClient.getDepartments();
    return this.departments;
  }

  getCachedDepartments(): DepartmentRecord[] {
    return [...this.departments];
  }

  async createDepartment(name: string): Promise<DepartmentRecord> {
    const created = await this.apiClient.createDepartment(name);
    this.departments.push(created);
    return created;
  }

  async updateDepartment(id: string, name: string): Promise<DepartmentRecord> {
    const updated = await this.apiClient.updateDepartment(id, name);
    const index = this.departments.findIndex((d) => d.department_id === id);
    if (index > -1) {
      this.departments[index] = updated;
    }
    return updated;
  }

  async deleteDepartment(id: string): Promise<void> {
    await this.apiClient.deleteDepartment(id);
    this.departments = this.departments.filter((d) => d.department_id !== id);
  }
}
