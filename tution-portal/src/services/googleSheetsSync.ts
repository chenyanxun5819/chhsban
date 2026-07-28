/**
 * Google Sheets 同步服務
 * 負責將補習班數據實時同步到 Google Sheets
 */

import apiClient from "@/utils/api";

interface SyncStatus {
  success: boolean;
  message: string;
  syncedAt: string;
  recordsCount: number;
}

interface SyncOptions {
  classId?: string;
  dataType?: "classes" | "roster" | "schedule" | "attendance" | "all";
  forceSync?: boolean;
}

/**
 * 初始化 Google Sheets (首次設置)
 */
export const initGoogleSheets = async (): Promise<SyncStatus> => {
  try {
    const response = await apiClient.get("/api/sync?action=init");
    return {
      success: true,
      message: "Google Sheets 初始化成功",
      syncedAt: new Date().toISOString(),
      recordsCount: response.data?.recordsCount || 0,
    };
  } catch (error) {
    throw new Error(
      `Google Sheets 初始化失敗: ${error instanceof Error ? error.message : "未知錯誤"}`
    );
  }
};

/**
 * 同步所有數據到 Google Sheets
 */
export const syncAllData = async (
  options?: SyncOptions
): Promise<SyncStatus> => {
  try {
    const params = new URLSearchParams();
    params.append("action", "sync-all");

    if (options?.classId) {
      params.append("classId", options.classId);
    }
    if (options?.dataType) {
      params.append("dataType", options.dataType);
    }
    if (options?.forceSync) {
      params.append("forceSync", "true");
    }

    const response = await apiClient.get(`/api/sync?${params.toString()}`);

    return {
      success: response.data?.success || true,
      message: response.data?.message || "同步成功",
      syncedAt: new Date().toISOString(),
      recordsCount: response.data?.totalRecords || 0,
    };
  } catch (error) {
    throw new Error(
      `Google Sheets 同步失敗: ${error instanceof Error ? error.message : "未知錯誤"}`
    );
  }
};

/**
 * 同步特定課程的數據
 */
export const syncClassData = async (classId: string): Promise<SyncStatus> => {
  return syncAllData({ classId, dataType: "all", forceSync: true });
};

/**
 * 同步特定類型的數據
 */
export const syncDataByType = async (
  dataType: "classes" | "roster" | "schedule" | "attendance"
): Promise<SyncStatus> => {
  return syncAllData({ dataType });
};

/**
 * 獲取同步狀態
 */
export const getSyncStatus = async (): Promise<SyncStatus> => {
  try {
    const response = await apiClient.get("/api/sync?action=status");
    return {
      success: true,
      message: response.data?.message || "獲取狀態成功",
      syncedAt: response.data?.lastSyncTime || new Date().toISOString(),
      recordsCount: response.data?.totalRecords || 0,
    };
  } catch (error) {
    throw new Error(
      `獲取同步狀態失敗: ${error instanceof Error ? error.message : "未知錯誤"}`
    );
  }
};

/**
 * 設置自動同步
 */
export const setAutoSync = async (enabled: boolean): Promise<SyncStatus> => {
  try {
    await apiClient.post("/api/sync/auto-sync", {
      enabled,
    });

    return {
      success: true,
      message: enabled ? "自動同步已啟用" : "自動同步已停用",
      syncedAt: new Date().toISOString(),
      recordsCount: 0,
    };
  } catch (error) {
    throw new Error(
      `設置自動同步失敗: ${error instanceof Error ? error.message : "未知錯誤"}`
    );
  }
};

/**
 * 手動觸發同步 (即時同步)
 */
export const triggerManualSync = async (
  classId: string
): Promise<SyncStatus> => {
  try {
    const response = await apiClient.post("/api/sync/manual", {
      classId,
      timestamp: new Date().toISOString(),
    });

    return {
      success: response.data?.success || true,
      message: response.data?.message || "手動同步成功",
      syncedAt: new Date().toISOString(),
      recordsCount: response.data?.recordsCount || 0,
    };
  } catch (error) {
    throw new Error(
      `手動同步失敗: ${error instanceof Error ? error.message : "未知錯誤"}`
    );
  }
};

/**
 * 獲取同步日誌
 */
export const getSyncLogs = async (
  limit: number = 50
): Promise<
  Array<{
    id: string;
    action: string;
    status: "success" | "failed";
    timestamp: string;
    message: string;
  }>
> => {
  try {
    const response = await apiClient.get(`/api/sync/logs?limit=${limit}`);
    return response.data?.logs || [];
  } catch (error) {
    throw new Error(
      `獲取同步日誌失敗: ${error instanceof Error ? error.message : "未知錯誤"}`
    );
  }
};

/**
 * 測試 Google Sheets 連接
 */
export const testGoogleSheetsConnection = async (): Promise<{
  connected: boolean;
  message: string;
}> => {
  try {
    const response = await apiClient.get("/api/sync/test-connection");
    return {
      connected: response.data?.connected || true,
      message: response.data?.message || "連接成功",
    };
  } catch (error) {
    return {
      connected: false,
      message: error instanceof Error ? error.message : "連接失敗",
    };
  }
};

/**
 * 批量導出數據到 Google Sheets
 */
export const exportToGoogleSheets = async (
  dataType: string,
  sheetName?: string
): Promise<SyncStatus> => {
  try {
    const response = await apiClient.post("/api/sync/export", {
      dataType,
      sheetName: sheetName || dataType,
      timestamp: new Date().toISOString(),
    });

    return {
      success: response.data?.success || true,
      message: response.data?.message || "導出成功",
      syncedAt: new Date().toISOString(),
      recordsCount: response.data?.recordsCount || 0,
    };
  } catch (error) {
    throw new Error(
      `導出到 Google Sheets 失敗: ${error instanceof Error ? error.message : "未知錯誤"}`
    );
  }
};

/**
 * 從 Google Sheets 導入數據
 */
export const importFromGoogleSheets = async (
  sheetId: string,
  dataType: string
): Promise<SyncStatus> => {
  try {
    const response = await apiClient.post("/api/sync/import", {
      sheetId,
      dataType,
      timestamp: new Date().toISOString(),
    });

    return {
      success: response.data?.success || true,
      message: response.data?.message || "導入成功",
      syncedAt: new Date().toISOString(),
      recordsCount: response.data?.recordsCount || 0,
    };
  } catch (error) {
    throw new Error(
      `從 Google Sheets 導入失敗: ${error instanceof Error ? error.message : "未知錯誤"}`
    );
  }
};

/**
 * 同步監視器 (定期檢查並同步)
 */
export class SyncMonitor {
  private intervalId: NodeJS.Timer | null = null;
  private isRunning = false;
  private lastSyncTime = 0;
  private readonly syncInterval = 5 * 60 * 1000; // 每 5 分鐘同步一次

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.intervalId = setInterval(async () => {
      const now = Date.now();
      if (now - this.lastSyncTime >= this.syncInterval) {
        try {
          await syncAllData({ forceSync: false });
          this.lastSyncTime = now;
          console.log("[SyncMonitor] 同步完成");
        } catch (error) {
          console.error("[SyncMonitor] 同步失敗:", error);
        }
      }
    }, 60000); // 每分鐘檢查一次

    console.log("[SyncMonitor] 同步監視器已啟動");
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId as unknown as NodeJS.Timeout);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log("[SyncMonitor] 同步監視器已停止");
  }

  isActive(): boolean {
    return this.isRunning;
  }

  async syncNow(): Promise<SyncStatus> {
    this.lastSyncTime = Date.now();
    return syncAllData({ forceSync: true });
  }
}

// 導出單一實例
export const syncMonitor = new SyncMonitor();
