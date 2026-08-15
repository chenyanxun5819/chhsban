/**
 * Classroom KV 操作層
 * 處理教室資料的查詢、儲存和管理
 */

import type { ClassroomRecord, KVNamespace } from "../types/index.js";
import { KV_CONFIG } from "../types/index.js";

/**
 * 教室 KV 管理類
 */
export class ClassroomKVManager {
  constructor(private kv: KVNamespace) {}

  /**
   * 新增教室
   * @param data ClassroomRecord 教室資料
   * @returns 儲存成功的 ClassroomRecord
   */
  async createClassroom(data: ClassroomRecord): Promise<ClassroomRecord> {
    const classroom: ClassroomRecord = {
      ...data,
      last_updated: Date.now(),
    };

    // 儲存教室資料
    const key = `${KV_CONFIG.CLASSROOM_PREFIX}${classroom.classroom_id}`;
    await this.kv.put(key, JSON.stringify(classroom));

    // 更新教室列表索引
    await this.updateClassroomIndex(classroom.classroom_id, true);

    // 如果可用於補習，更新可用教室列表
    if (classroom.available_for_tution) {
      await this.updateAvailableClassroomIndex(classroom.classroom_id, true);
    }

    return classroom;
  }

  /**
   * 查詢單一教室
   * @param classroomId 教室 ID
   * @returns ClassroomRecord 或 null
   */
  async getClassroom(classroomId: string): Promise<ClassroomRecord | null> {
    const key = `${KV_CONFIG.CLASSROOM_PREFIX}${classroomId}`;
    const data = await this.kv.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as ClassroomRecord;
    } catch (error) {
      console.error(`Failed to parse classroom data for ${classroomId}:`, error);
      return null;
    }
  }

  /**
   * 列出所有教室
   * @param filterAvailableOnly 是否只列出可用於補習的教室
   * @returns ClassroomRecord[]
   */
  async listAllClassrooms(filterAvailableOnly: boolean = false): Promise<ClassroomRecord[]> {
    if (filterAvailableOnly) {
      // 使用可用教室索引加速查詢
      const availableIds = await this.getAvailableClassroomIds();
      const classrooms: ClassroomRecord[] = [];
      
      for (const id of availableIds) {
        const classroom = await this.getClassroom(id);
        if (classroom) {
          classrooms.push(classroom);
        }
      }
      
      return classrooms;
    }

    // 列出所有教室
    const classrooms: ClassroomRecord[] = [];
    let cursor: string | undefined;

    const listOptions: Parameters<typeof this.kv.list>[0] = {
      prefix: KV_CONFIG.CLASSROOM_PREFIX,
    };

    do {
      const result = await this.kv.list(listOptions);

      for (const item of result.keys) {
        const classroomId = item.name.replace(KV_CONFIG.CLASSROOM_PREFIX, "");
        const classroom = await this.getClassroom(classroomId);
        if (classroom) {
          classrooms.push(classroom);
        }
      }

      cursor = result.list_complete ? undefined : result.cursor;
      if (cursor) {
        listOptions.cursor = cursor;
      }
    } while (cursor);

    return classrooms;
  }

  /**
   * 更新教室資料
   * @param classroomId 教室 ID
   * @param updates 需要更新的欄位
   * @returns 更新後的 ClassroomRecord
   */
  async updateClassroom(
    classroomId: string,
    updates: Partial<Omit<ClassroomRecord, "classroom_id">>
  ): Promise<ClassroomRecord> {
    const existing = await this.getClassroom(classroomId);
    if (!existing) {
      throw new Error(`Classroom not found: ${classroomId}`);
    }

    // 檢查是否改變了 available_for_tution 狀態
    const wasAvailable = existing.available_for_tution;
    const newAvailable = updates.available_for_tution ?? wasAvailable;

    const updated: ClassroomRecord = {
      ...existing,
      ...updates,
      classroom_id: classroomId, // 確保 ID 不會被修改
      last_updated: Date.now(),
    };

    // 儲存更新的資料
    const key = `${KV_CONFIG.CLASSROOM_PREFIX}${classroomId}`;
    await this.kv.put(key, JSON.stringify(updated));

    // 如果 available_for_tution 狀態改變，更新索引
    if (wasAvailable !== newAvailable) {
      await this.updateAvailableClassroomIndex(classroomId, newAvailable);
    }

    return updated;
  }

  /**
   * 勾選/取消補習選用
   * @param classroomId 教室 ID
   * @param available 是否可用於補習
   * @returns 更新後的 ClassroomRecord
   */
  async toggleAvailableForTution(
    classroomId: string,
    available: boolean
  ): Promise<ClassroomRecord> {
    return this.updateClassroom(classroomId, { available_for_tution: available });
  }

  /**
   * 刪除教室
   * @param classroomId 教室 ID
   * @returns 是否刪除成功
   */
  async deleteClassroom(classroomId: string): Promise<boolean> {
    const existing = await this.getClassroom(classroomId);
    if (!existing) {
      return false;
    }

    // 刪除教室資料
    const key = `${KV_CONFIG.CLASSROOM_PREFIX}${classroomId}`;
    await this.kv.delete(key);

    // 更新教室列表索引
    await this.updateClassroomIndex(classroomId, false);

    // 如果在可用教室列表中，也要移除
    if (existing.available_for_tution) {
      await this.updateAvailableClassroomIndex(classroomId, false);
    }

    return true;
  }

  /**
   * 批量更新教室（用於 Excel 導入）
   * 根據 classroom_id 匹配現有教室，更新班級和桌數
   * @param data ClassroomRecord[] 教室資料陣列
   * @param options.createIfMissing 教室不存在時是否自動建立（用於初始化匯入，預設 false 以維持原本「只更新」語意）
   * @returns 更新統計
   */
  async batchUpdateClassrooms(
    data: ClassroomRecord[],
    options: { createIfMissing?: boolean } = {}
  ): Promise<{
    success: number;
    failed: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    const { createIfMissing = false } = options;
    const stats = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ id: string; error: string }>,
    };

    for (const classroom of data) {
      try {
        const existing = await this.getClassroom(classroom.classroom_id);

        if (!existing) {
          if (!createIfMissing) {
            stats.failed++;
            stats.errors.push({
              id: classroom.classroom_id,
              error: "教室不存在",
            });
            continue;
          }

          // 初始化匯入：教室不存在則建立新教室
          await this.createClassroom({
            classroom_id: classroom.classroom_id,
            classroom_name: classroom.classroom_name,
            class_name: classroom.class_name,
            number_of_desks: classroom.number_of_desks,
            available_for_tution: classroom.available_for_tution ?? true,
            last_updated: Date.now(),
          });

          stats.success++;
          continue;
        }

        // 只更新 class_name 和 number_of_desks
        await this.updateClassroom(classroom.classroom_id, {
          class_name: classroom.class_name,
          number_of_desks: classroom.number_of_desks,
        });

        stats.success++;
      } catch (error) {
        stats.failed++;
        stats.errors.push({
          id: classroom.classroom_id,
          error: error instanceof Error ? error.message : "未知錯誤",
        });
      }
    }

    return stats;
  }

  /**
   * 更新教室列表索引
   * @param classroomId 教室 ID
   * @param add true=添加, false=移除
   */
  private async updateClassroomIndex(classroomId: string, add: boolean): Promise<void> {
    const indexKey = "classrooms:list";
    const data = await this.kv.get(indexKey);
    
    let ids: string[] = [];
    if (data) {
      try {
        ids = JSON.parse(data) as string[];
      } catch (error) {
        console.error("Failed to parse classroom index:", error);
      }
    }

    if (add) {
      if (!ids.includes(classroomId)) {
        ids.push(classroomId);
      }
    } else {
      ids = ids.filter(id => id !== classroomId);
    }

    await this.kv.put(indexKey, JSON.stringify(ids));
  }

  /**
   * 更新可用教室列表索引
   * @param classroomId 教室 ID
   * @param add true=添加, false=移除
   */
  private async updateAvailableClassroomIndex(classroomId: string, add: boolean): Promise<void> {
    const indexKey = "classrooms:available";
    const data = await this.kv.get(indexKey);
    
    let ids: string[] = [];
    if (data) {
      try {
        ids = JSON.parse(data) as string[];
      } catch (error) {
        console.error("Failed to parse available classroom index:", error);
      }
    }

    if (add) {
      if (!ids.includes(classroomId)) {
        ids.push(classroomId);
      }
    } else {
      ids = ids.filter(id => id !== classroomId);
    }

    await this.kv.put(indexKey, JSON.stringify(ids));
  }

  /**
   * 取得可用教室 ID 列表
   * @returns string[]
   */
  private async getAvailableClassroomIds(): Promise<string[]> {
    const indexKey = "classrooms:available";
    const data = await this.kv.get(indexKey);
    
    if (!data) {
      return [];
    }

    try {
      return JSON.parse(data) as string[];
    } catch (error) {
      console.error("Failed to parse available classroom index:", error);
      return [];
    }
  }
}

/**
 * 工廠函數：創建 ClassroomKVManager 實例
 * @param kv Cloudflare KV 綁定
 * @returns ClassroomKVManager 實例
 */
export function createClassroomKVManager(kv: KVNamespace): ClassroomKVManager {
  return new ClassroomKVManager(kv);
}
