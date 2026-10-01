import { ApiClient } from "./api-client";
import { TeacherManager } from "./teacher-manager";
import { DepartmentManager } from "./department-manager";
import { UIManager } from "./ui-manager";

// 登入方式：輸入管理 API Key，向後端實際呼叫一次需要 key 的 API 確認正確才放行。
// （2026-10-01 前這裡是寫死在前端程式裡的帳號密碼，任何人看網頁原始碼就看得到，已移除）
// 一律用建置時設定的網址（.env.production），不讀瀏覽器裡可能存著的舊網址
const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL || "https://teacher-management.astcws.workers.dev";

export class App {
  private apiClient: ApiClient;
  private teacherManager: TeacherManager;
  private departmentManager: DepartmentManager;
  private uiManager: UIManager;
  private isAuthenticated = false;

  constructor() {
    const apiKey = localStorage.getItem("apiKey") || "";
    this.apiClient = new ApiClient(API_BASE_URL, apiKey);
    this.teacherManager = new TeacherManager(this.apiClient);
    this.departmentManager = new DepartmentManager(this.apiClient);
    this.uiManager = new UIManager(this.teacherManager, this.apiClient, this.departmentManager);

    this.setupLoginHandlers();
  }

  async initialize() {
    // 檢查是否已登入
    if (!this.checkAuthentication()) {
      this.showLoginPage();
      return;
    }

    try {
      // 初始化 UI
      this.uiManager.setupEventListeners();

      // 並行測試 API 連接、載入教師列表與部門列表
      await Promise.all([this.testApiConnection(), this.loadTeachers(), this.loadDepartments()]);

      // 加載教師後更新部門下拉菜單
      this.uiManager.refreshDepartmentSelects();

      console.log("✅ 應用初始化完成");
    } catch (error) {
      console.error("❌ 初始化失敗:", error);
      this.uiManager.showToast("應用初始化失敗", "error");
    }
  }

  private setupLoginHandlers() {
    const loginForm = document.getElementById("loginForm") as HTMLFormElement;
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => this.handleLogin(e));
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => this.handleLogout());
    }
  }

  private async handleLogin(event: Event) {
    event.preventDefault();

    const passwordInput = document.getElementById("loginPassword") as HTMLInputElement;
    const loginError = document.getElementById("loginError");
    const apiKey = passwordInput.value.trim();

    // 用輸入的 key 實際呼叫一次需要授權的 API，後端回 401 就代表 key 不對
    const response = await fetch(`${API_BASE_URL}/api/departments`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    }).catch(() => null);

    if (response && response.ok) {
      localStorage.setItem("apiKey", apiKey);
      localStorage.setItem("apiBaseUrl", API_BASE_URL);
      sessionStorage.setItem("authenticated", "true");
      sessionStorage.setItem("loginTime", new Date().toISOString());
      // API 客戶端在頁面載入時就建立好了，重新載入才會用新的 key
      window.location.reload();
      return;
    }

    if (loginError) {
      loginError.textContent = response ? "API Key 不正確，請重試" : "無法連線到教師管理服務，請檢查網路";
      loginError.style.display = "block";
    }
    passwordInput.value = "";
    passwordInput.focus();
  }

  private handleLogout() {
    // 清除登入狀態（連同存在這台瀏覽器的 API Key）
    localStorage.removeItem("apiKey");
    sessionStorage.removeItem("authenticated");
    sessionStorage.removeItem("loginTime");
    this.isAuthenticated = false;

    // 隱藏應用，顯示登入頁面
    const loginPage = document.getElementById("loginPage");
    const app = document.getElementById("app");
    if (loginPage) {
      loginPage.style.display = "flex";
      // 清空登入表單
      const loginForm = document.getElementById("loginForm") as HTMLFormElement;
      if (loginForm) loginForm.reset();
      const loginError = document.getElementById("loginError");
      if (loginError) loginError.style.display = "none";
    }
    if (app) app.style.display = "none";

    console.log("✅ 已登出");
  }

  private checkAuthentication(): boolean {
    // 需要本次分頁已登入，且這台瀏覽器存有 API Key（真正的驗證在後端，key 錯了 API 會回 401）
    const authenticated = sessionStorage.getItem("authenticated");
    this.isAuthenticated = authenticated === "true" && !!localStorage.getItem("apiKey");
    return this.isAuthenticated;
  }

  private showLoginPage() {
    const loginPage = document.getElementById("loginPage");
    const app = document.getElementById("app");
    if (loginPage) loginPage.style.display = "flex";
    if (app) app.style.display = "none";
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

  private async loadDepartments() {
    try {
      await this.departmentManager.getDepartments();
    } catch (error) {
      console.error("載入部門失敗:", error);
      this.uiManager.showToast("載入部門列表失敗", "error");
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

  editDepartment(id: string) {
    return (this.uiManager as any).editDepartment(id);
  }

  deleteDepartment(id: string) {
    return (this.uiManager as any).confirmDeleteDepartment(id);
  }
}
