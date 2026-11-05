/**
 * OfficeOMR Authentication & Recognition Module
 *
 * Handles:
 * - Firebase authentication (Google OAuth)
 * - User session management
 * - Recognition request to Cloud Functions
 * - Result handling and display
 */

class OfficeOMRApp {
  constructor(firebaseConfig, functionUrl) {
    this.firebaseConfig = firebaseConfig;
    this.functionUrl = functionUrl;
    this.currentUser = null;
    this.currentResult = null;

    this.initFirebase();
    this.setupEventListeners();
  }

  /**
   * Initialize Firebase
   */
  initFirebase() {
    firebase.initializeApp(this.firebaseConfig);
    this.auth = firebase.auth();
    this.storage = firebase.storage();

    // Listen to auth state changes
    this.auth.onAuthStateChanged((user) => this.onAuthStateChanged(user));
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Authentication
    document
      .getElementById("login-btn")
      .addEventListener("click", () => this.login());
    document
      .getElementById("logout-btn")
      .addEventListener("click", () => this.logout());

    // File upload
    const fileInput = document.getElementById("file-input");
    const fileLabel = document.querySelector(".file-input-label");

    fileInput.addEventListener("change", (e) => this.onFileSelected(e));

    // Drag & drop
    fileLabel.addEventListener("dragover", (e) => this.onDragOver(e));
    fileLabel.addEventListener("dragleave", (e) => this.onDragLeave(e));
    fileLabel.addEventListener("drop", (e) => this.onDrop(e));

    // Recognition
    document
      .getElementById("upload-btn")
      .addEventListener("click", () => this.recognize());

    // Results
    document
      .getElementById("download-result-btn")
      .addEventListener("click", () => this.downloadResult());
    document
      .getElementById("new-upload-btn")
      .addEventListener("click", () => this.resetForm());
  }

  /**
   * Google login
   */
  async login() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await this.auth.signInWithPopup(provider);
    } catch (error) {
      this.showStatus(`登录失败: ${error.message}`, "error");
    }
  }

  /**
   * Logout
   */
  async logout() {
    try {
      await this.auth.signOut();
    } catch (error) {
      this.showStatus(`退出失败: ${error.message}`, "error");
    }
  }

  /**
   * Handle auth state change
   */
  onAuthStateChanged(user) {
    this.currentUser = user;
    const loginSection = document.getElementById("login-section");
    const dashboard = document.getElementById("dashboard");

    if (user) {
      // User logged in
      loginSection.style.display = "none";
      dashboard.style.display = "block";
      document.getElementById("user-display-name").textContent =
        user.displayName || "用户";
      document.getElementById("user-email-display").textContent = user.email;

      // Enable upload button
      const fileInput = document.getElementById("file-input");
      if (fileInput.files.length > 0) {
        document.getElementById("upload-btn").disabled = false;
      }
    } else {
      // User logged out
      loginSection.style.display = "block";
      dashboard.style.display = "none";
      document.getElementById("result-section").style.display = "none";
      document.getElementById("upload-btn").disabled = true;
      this.resetForm();
    }
  }

  /**
   * Handle file selection
   */
  onFileSelected(e) {
    const file = e.target.files[0];
    const fileLabel = document.querySelector(".file-input-label");
    const uploadBtn = document.getElementById("upload-btn");

    if (file) {
      fileLabel.classList.add("has-file");
      fileLabel.innerHTML = `✓ 已选择: ${file.name}`;
      if (this.currentUser) {
        uploadBtn.disabled = false;
      }
    } else {
      fileLabel.classList.remove("has-file");
      fileLabel.innerHTML = `
        <svg class="file-input-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
        </svg>
        点击选择或拖拽文件
      `;
      uploadBtn.disabled = true;
    }
  }

  /**
   * Handle drag over
   */
  onDragOver(e) {
    e.preventDefault();
    const fileLabel = document.querySelector(".file-input-label");
    fileLabel.style.borderColor = "#667eea";
    fileLabel.style.background = "#f0f4ff";
  }

  /**
   * Handle drag leave
   */
  onDragLeave(e) {
    const fileLabel = document.querySelector(".file-input-label");
    fileLabel.style.borderColor = "#ddd";
    fileLabel.style.background = "#fafafa";
  }

  /**
   * Handle drop
   */
  onDrop(e) {
    e.preventDefault();
    const fileLabel = document.querySelector(".file-input-label");
    fileLabel.style.borderColor = "#ddd";
    fileLabel.style.background = "#fafafa";

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const fileInput = document.getElementById("file-input");
      fileInput.files = files;
      const event = new Event("change", { bubbles: true });
      fileInput.dispatchEvent(event);
    }
  }

  /**
   * Recognize sheet
   */
  async recognize() {
    const file = document.getElementById("file-input").files[0];
    const template = document.getElementById("template-select").value;

    if (!file || !this.currentUser) {
      this.showStatus("请先登录并选择文件", "error");
      return;
    }

    const uploadBtn = document.getElementById("upload-btn");
    const spinner = uploadBtn.querySelector(".spinner");
    const progressBar = document.getElementById("progress-bar");
    const progressFill = document.getElementById("progress-fill");

    uploadBtn.disabled = true;
    spinner.style.display = "inline-block";
    progressBar.classList.add("active");
    progressFill.style.width = "0%";

    try {
      // Get Firebase ID token
      const token = await this.currentUser.getIdToken();

      // Simulate progress
      const progressInterval = setInterval(() => {
        const current = parseFloat(progressFill.style.width);
        if (current < 90) {
          progressFill.style.width = current + Math.random() * 30 + "%";
        }
      }, 300);

      // Prepare form data
      const formData = new FormData();
      formData.append("image", file);
      formData.append("template", template);

      this.showStatus(`正在处理 ${file.name}...`, "info");

      // Call Cloud Function
      const response = await fetch(this.functionUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      clearInterval(progressInterval);
      progressFill.style.width = "100%";

      // Handle response
      if (!response.ok) {
        const error = await response.json();
        const errorMsg = this.getErrorMessage(error, response.status);
        throw new Error(errorMsg);
      }

      const result = await response.json();
      this.currentResult = result.result;
      this.displayResults(result.result);
      this.showStatus("识别成功！", "success");
    } catch (error) {
      console.error("Recognition error:", error);
      this.showStatus(`识别失败: ${error.message}`, "error");
      progressFill.style.width = "0%";
    } finally {
      uploadBtn.disabled = false;
      spinner.style.display = "none";
      progressBar.classList.remove("active");
    }
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error, status) {
    switch (status) {
      case 401:
        return "未授权。请重新登录。";
      case 403:
        return "您的账号未被批准。请向管理员申请。";
      case 429:
        return "已达到每日限额。请明天再试。";
      case 400:
        return "请求格式错误。请检查文件格式。";
      case 500:
        return "服务器错误。请稍后重试。";
      default:
        return error.message || "发生未知错误。";
    }
  }

  /**
   * Display recognition results
   */
  displayResults(result) {
    const resultSection = document.getElementById("result-section");

    // Populate result data
    document.getElementById("result-student-id").textContent =
      result.student_id || "—";
    document.getElementById("result-accuracy").textContent = result.summary
      ? (result.summary.overall_accuracy * 100).toFixed(1) + "%"
      : "—";
    document.getElementById("result-answers").textContent = result.answers
      ? result.answers.length
      : "0";
    document.getElementById("result-status").textContent =
      result.status || "已识别";

    // Show results
    resultSection.style.display = "block";
    resultSection.scrollIntoView({ behavior: "smooth" });
  }

  /**
   * Download result as JSON
   */
  downloadResult() {
    if (!this.currentResult) return;

    const dataStr = JSON.stringify(this.currentResult, null, 2);
    const dataBlob = new Blob([dataStr], {
      type: "application/json; charset=utf-8",
    });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `OfficeOMR-result-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    this.showStatus("结果已下载", "success");
  }

  /**
   * Reset form
   */
  resetForm() {
    const fileInput = document.getElementById("file-input");
    const fileLabel = document.querySelector(".file-input-label");
    const uploadBtn = document.getElementById("upload-btn");

    fileInput.value = "";
    fileLabel.classList.remove("has-file");
    fileLabel.innerHTML = `
      <svg class="file-input-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
      </svg>
      点击选择或拖拽文件
    `;
    uploadBtn.disabled = true;
    document.getElementById("result-section").style.display = "none";
    this.showStatus("", "");
  }

  /**
   * Show status message
   */
  showStatus(message, type = "info") {
    const statusDiv = document.getElementById("status");
    statusDiv.textContent = message;
    statusDiv.className = type;

    if (type !== "error" && type !== "warning" && message !== "") {
      setTimeout(() => {
        statusDiv.textContent = "";
        statusDiv.className = "";
      }, 5000);
    }
  }

  /**
   * Get authentication status
   */
  isAuthenticated() {
    return this.currentUser !== null;
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }
}

// Initialize app when page loads
document.addEventListener("DOMContentLoaded", () => {
  // Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyCmppoQXk7osjxv-p700JCBLniGRrxOYV0",
    authDomain: "officeomr-fe542.firebaseapp.com",
    projectId: "officeomr-fe542",
    storageBucket: "officeomr-fe542.firebasestorage.app",
    messagingSenderId: "601814582794",
    appId: "1:601814582794:web:9de9f7f427b8b3406bc1f3",
  };

  // Cloud Function URL
  const FUNCTION_URL =
    "https://asia-southeast1-officeomr-fe542.cloudfunctions.net/recognize_sheet";

  // Initialize app
  window.app = new OfficeOMRApp(firebaseConfig, FUNCTION_URL);
});
