import { ApiClient } from "./api-client";
import { TeacherManager } from "./teacher-manager";
import { DepartmentManager } from "./department-manager";
import { UIManager } from "./ui-manager";

// 登入憑證（硬編碼，生產環境應使用加密或伺服器驗證）
const VALID_CREDENTIALS = {
  email: "weschen@mybazaar.my",
  password: "@Sidan49122",
};

export class App {
  private apiClient: ApiClient;
  private teacherManager: TeacherManager;
  private departmentManager: DepartmentManager;
  private uiManager: UIManager;
  private isAuthenticated = false;

  constructor() {
    // 從 localStorage 讀取 API 配置
    const apiBaseUrl =
      localStorage.getItem("apiBaseUrl") ||
      import.meta.env.VITE_API_BASE_URL ||
      "http://localhost:8787";
    const apiKey = localStorage.getItem("apiKey") || "test_key";

    this.apiClient = new ApiClient(apiBaseUrl, apiKey);
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

  private handleLogin(event: Event) {
    event.preventDefault();

    const emailInput = document.getElementById("loginEmail") as HTMLInputElement;
    const passwordInput = document.getElementById("loginPassword") as HTMLInputElement;
    const loginError = document.getElementById("loginError");

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // 驗證憑證
    if (email === VALID_CREDENTIALS.email && password === VALID_CREDENTIALS.password) {
      // 保存登入狀態
      sessionStorage.setItem("authenticated", "true");
      sessionStorage.setItem("loginTime", new Date().toISOString());
      this.isAuthenticated = true;

      // 隱藏登入頁面，顯示應用
      const loginPage = document.getElementById("loginPage");
      const app = document.getElementById("app");
      if (loginPage) loginPage.style.display = "none";
      if (app) app.style.display = "flex";

      // 初始化應用
      this.initialize();
    } else {
      // 顯示錯誤信息
      if (loginError) {
        loginError.textContent = "帳號或密碼不正確，請重試";
        loginError.style.display = "block";
      }
      // 清空密碼欄位
      passwordInput.value = "";
      passwordInput.focus();
    }
  }

  private handleLogout() {
    // 清除登入狀態
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
    // 檢查 sessionStorage 中的認證狀態
    const authenticated = sessionStorage.getItem("authenticated");
    this.isAuthenticated = authenticated === "true";
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
