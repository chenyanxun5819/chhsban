import { ApiClient } from "./api-client";
import { TeacherManager } from "./teacher-manager";
import { UIManager } from "./ui-manager";

export class App {
  private apiClient: ApiClient;
  private teacherManager: TeacherManager;
  private uiManager: UIManager;

  constructor() {
    // 從 localStorage 讀取 API 配置
    const apiBaseUrl =
      localStorage.getItem("apiBaseUrl") ||
      import.meta.env.VITE_API_BASE_URL ||
      "http://localhost:8787";
    const apiKey = localStorage.getItem("apiKey") || "test_key";

    this.apiClient = new ApiClient(apiBaseUrl, apiKey);
    this.teacherManager = new TeacherManager(this.apiClient);
    this.uiManager = new UIManager(this.teacherManager, this.apiClient);
  }

  async initialize() {
    try {
      // 初始化 UI
      this.uiManager.setupEventListeners();

      // 並行測試 API 連接和載入教師列表
      await Promise.all([this.testApiConnection(), this.loadTeachers()]);

      // 加載教師後更新部門下拉菜單
      this.uiManager.refreshDepartmentSelects();

      console.log("✅ 應用初始化完成");
    } catch (error) {
      console.error("❌ 初始化失敗:", error);
      this.uiManager.showToast("應用初始化失敗", "error");
    }
  }

  private async testApiConnection() {
    try {
      await this.apiClient.health();
      this.uiManager.setStatusIndicator(true);
      this.uiManager.updateStatusText("連接正常");
    } catch (error) {
      console.error("API 連接失敗:", error);
      this.uiManager.setStatusIndicator(false);
      this.uiManager.updateStatusText("連接異常");
    }
  }

  private async loadTeachers() {
    try {
      const teachers = await this.teacherManager.getTeachers();
      this.uiManager.renderTeacherTable(teachers);
    } catch (error) {
      console.error("載入教師失敗:", error);
      this.uiManager.showToast("載入教師列表失敗", "error");
    }
  }

  // 暴露公共方法供 HTML 事件處理器使用
  editTeacher(id: string) {
    return (this.uiManager as any).editTeacher(id);
  }

  deleteTeacher(id: string) {
    return (this.uiManager as any).confirmDeleteTeacher(id);
  }

  refreshTeachers() {
    return (this.uiManager as any).refreshTeachers();
  }
}
