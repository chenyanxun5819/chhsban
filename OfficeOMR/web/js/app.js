/**
 * 主应用路由和页面管理
 */

class OfficeOMRApp {
  constructor(firebaseConfig) {
    this.firebaseConfig = firebaseConfig;
    this.auth = null;
    this.firestore = null;
    this.functions = null;
    this.authFlow = null;

    // M7 服务
    this.m7Service = null;

    this.loginPage = null;
    this.adminPage = null;
    this.teacherPage = null;

    this.currentPage = null;
  }

  /**
   * 初始化应用
   */
  async init() {
    console.log("🚀 Initializing OfficeOMR app...");

    // 初始化 Firebase
    firebase.initializeApp(this.firebaseConfig);

    this.auth = firebase.auth();
    this.firestore = firebase.firestore();
    this.functions = firebase.functions();

    // 初始化 M7 服务
    this.m7Service = new M7Service(this.functions, this.firestore);
    console.log("✅ M7Service initialized");

    // 创建认证流程
    this.authFlow = new AuthFlow(this.auth, this.firestore, this.functions);

    // 获取主容器
    this.mainContainer = document.getElementById("app-container");

    // 将 app 实例暴露到全局范围，以便前端使用
    window.app = this;

    // 监听认证状态
    this.authFlow.onAuthStateChanged((authState) =>
      this.onAuthStateChanged(authState),
    );

    console.log("✅ OfficeOMR app initialized");
  }

  /**
   * 认证状态变化处理
   */
  async onAuthStateChanged(authState) {
    console.log("🔄 Auth state changed:", {
      isAuthenticated: authState.isAuthenticated,
      isSuperAdmin: authState.isSuperAdmin,
      isTeacher: authState.isTeacher,
    });

    if (!authState.isAuthenticated) {
      // 用户未登录，显示登入页面
      this.showLoginPage();
    } else if (authState.isSuperAdmin) {
      // Super Admin，显示管理页面
      if (location.hash === "#teacher") this.showTeacherPage();
      else this.showAdminPage();
    } else if (authState.isTeacher) {
      // 教师，显示教师页面
      this.showTeacherPage();
    } else {
      // 其他角色（未来扩展）
      console.warn("⚠️ Unknown role:", authState.claims?.role);
      this.showLoginPage();
    }
  }

  /**
   * 显示登入页面
   */
  showLoginPage() {
    console.log("📄 Showing login page");

    if (!this.loginPage) {
      this.loginPage = new LoginPage(this.mainContainer, this.authFlow);
    }

    this.loginPage.render();
    this.currentPage = "login";
  }

  /**
   * 显示管理页面
   */
  async showAdminPage() {
    console.log("📊 Showing admin page");

    if (!this.adminPage) {
      this.adminPage = new AdminPage(
        this.mainContainer,
        this.authFlow,
        this.firestore,
      );
    }

    await this.adminPage.render();
    this.currentPage = "admin";
  }

  /**
   * 显示教师页面
   */
  async showTeacherPage() {
    console.log("👨‍🏫 Showing teacher page");

    if (!this.teacherPage) {
      this.teacherPage = new TeacherPage(
        this.mainContainer,
        this.authFlow,
        this.firestore,
        this.functions,
      );
    }

    await this.teacherPage.render();
    this.currentPage = "teacher";
  }
}
