import { TeacherManager } from "./teacher-manager";
import { ApiClient } from "./api-client";
import type { TeacherRecord } from "./types";

export class UIManager {
  private currentPage = "list";
  private editingTeacherId: string | null = null;
  private currentDepartmentFilter = "";
  private currentPageNumber = 1;
  private pageSize = 10;

  constructor(
    private teacherManager: TeacherManager,
    private apiClient: ApiClient,
  ) {}

  setupEventListeners() {
    // 頁面導航
    document.querySelectorAll(".nav-item").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const page = (e.currentTarget as HTMLElement).getAttribute("data-page");
        if (page) this.navigateTo(page);
      });
    });

    // 右上⚙️設置按鈕
    document
      .getElementById("settingsBtn")
      ?.addEventListener("click", () => this.navigateTo("settings"));

    // 刷新按鈕
    document
      .getElementById("refreshBtn")
      ?.addEventListener("click", () => this.refreshTeachers());

    // 教師列表頁面
    document
      .getElementById("addTeacherBtn")
      ?.addEventListener("click", () => this.navigateTo("add"));
    document.getElementById("searchInput")?.addEventListener("input", (e) => {
      const keyword = (e.target as HTMLInputElement).value;
      this.filterTeachers(keyword);
    });
    document
      .getElementById("departmentFilter")
      ?.addEventListener("change", (e) => {
        this.currentDepartmentFilter = (e.target as HTMLSelectElement).value;
        this.currentPageNumber = 1; // 重置頁碼
        // 輕量級過濾 - 只更新表格和分頁，不重新加載數據
        const teachers = this.currentDepartmentFilter
          ? this.teacherManager.getTeachersByDepartment(
              this.currentDepartmentFilter,
            )
          : this.teacherManager.getAllTeachers();
        this.renderTeacherTable(teachers);
      });

    // 頁碼按鈕
    document
      .getElementById("prevPageBtn")
      ?.addEventListener("click", () => this.previousPage());
    document
      .getElementById("nextPageBtn")
      ?.addEventListener("click", () => this.nextPage());

    // 表單
    document.getElementById("teacherForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleFormSubmit();
    });
    document
      .getElementById("cancelFormBtn")
      ?.addEventListener("click", () => this.navigateTo("list"));
    document
      .getElementById("deleteFormBtn")
      ?.addEventListener("click", () => this.handleDeleteTeacher());

    // 設置頁面
    document
      .getElementById("testApiBtn")
      ?.addEventListener("click", () => this.testApiConnection());
    document
      .getElementById("saveSettingsBtn")
      ?.addEventListener("click", () => this.saveSettings());
    document
      .getElementById("exportDataBtn")
      ?.addEventListener("click", () => this.exportData());
    document.getElementById("importDataBtn")?.addEventListener("click", () => {
      document.getElementById("importFileInput")?.click();
    });
    document
      .getElementById("importFileInput")
      ?.addEventListener("change", (e) => this.handleFileImport(e));

    // 批量導入
    document
      .getElementById("downloadTemplateBtn")
      ?.addEventListener("click", () => this.downloadTemplate());
    document
      .getElementById("importTeachersBtn")
      ?.addEventListener("click", () => {
        document.getElementById("importTeachersFileInput")?.click();
      });
    document
      .getElementById("importTeachersFileInput")
      ?.addEventListener("change", (e) => this.handleBulkImport(e));

    // 模態框
    document
      .getElementById("modalCloseBtn")
      ?.addEventListener("click", () => this.closeModal());
    document
      .getElementById("modalCancelBtn")
      ?.addEventListener("click", () => this.closeModal());

    // 載入設置
    this.loadSettings();
  }

  private navigateTo(page: string) {
    // 隱藏所有頁面
    document
      .querySelectorAll(".page-content")
      .forEach((el) => el.classList.remove("active"));

    // 更新導航
    document
      .querySelectorAll(".nav-item")
      .forEach((el) => el.classList.remove("active"));
    document.querySelector(`[data-page="${page}"]`)?.classList.add("active");

    // 顯示新頁面
    const newPage = document.getElementById(`page-${page}`);
    if (newPage) {
      newPage.classList.add("active");
      this.currentPage = page;

      // 更新頁面標題
      const titles: Record<string, string> = {
        list: "教師列表",
        add: "新增教師",
        settings: "系統設置",
      };
      document.querySelector(".breadcrumb")!.textContent =
        titles[page] || "首頁";

      // 重置編輯狀態
      if (page === "add") {
        this.resetForm();
      }

      // 進入設置頁面時更新系統信息
      if (page === "settings") {
        this.updateSystemInfo();
      }
    }
  }

  renderTeacherTable(teachers: TeacherRecord[]) {
    const tbody = document.getElementById("teacherTableBody");
    if (!tbody) return;

    if (teachers.length === 0) {
      tbody.innerHTML =
        '<tr class="loading-row"><td colspan="7">無教師資料</td></tr>';
      this.updatePaginationControls(0, 0);
      return;
    }

    // 計算分頁
    const totalItems = teachers.length;
    const totalPages = Math.ceil(totalItems / this.pageSize);
    const startIndex = (this.currentPageNumber - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    const pageTeachers = teachers.slice(startIndex, endIndex);

    // 渲染當前頁的教師
    tbody.innerHTML = pageTeachers
      .map(
        (teacher) => `
      <tr>
        <td><strong>${teacher.teacher_id}</strong></td>
        <td>${teacher.name_cn}${teacher.name_en ? ` (${teacher.name_en})` : ""}</td>
        <td>${teacher.department}</td>
        <td>${teacher.email}</td>
        <td>
          <span class="permission-badge ${teacher.permission}">
            ${this.getPermissionLabel(teacher.permission)}
          </span>
        </td>
        <td>
          <div class="table-actions">
            <button class="btn-table edit" onclick="app.editTeacher('${teacher.teacher_id}')">✏️ 編輯</button>
            <button class="btn-table delete" onclick="app.deleteTeacher('${teacher.teacher_id}')">🗑️ 刪除</button>
          </div>
        </td>
      </tr>
    `,
      )
      .join("");

    // 更新分頁控制
    this.updatePaginationControls(this.currentPageNumber, totalPages);
  }

  private updatePaginationControls(currentPage: number, totalPages: number) {
    const prevBtn = document.getElementById("prevPageBtn") as HTMLButtonElement;
    const nextBtn = document.getElementById("nextPageBtn") as HTMLButtonElement;
    const pageInfo = document.getElementById("pageInfo");

    if (!prevBtn || !nextBtn || !pageInfo) return;

    // 更新按鈕狀態
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;

    // 更新頁碼信息
    if (totalPages > 0) {
      pageInfo.textContent = `第 ${currentPage} 頁 (共 ${totalPages} 頁)`;
    } else {
      pageInfo.textContent = "第 1 頁";
    }
  }

  private previousPage() {
    if (this.currentPageNumber > 1) {
      this.currentPageNumber--;
      const teachers = this.currentDepartmentFilter
        ? this.teacherManager.getTeachersByDepartment(
            this.currentDepartmentFilter,
          )
        : this.teacherManager.getAllTeachers();
      this.renderTeacherTable(teachers);
    }
  }

  private nextPage() {
    const allTeachers = this.currentDepartmentFilter
      ? this.teacherManager.getTeachersByDepartment(
          this.currentDepartmentFilter,
        )
      : this.teacherManager.getAllTeachers();
    const totalPages = Math.ceil(allTeachers.length / this.pageSize);

    if (this.currentPageNumber < totalPages) {
      this.currentPageNumber++;
      this.renderTeacherTable(allTeachers);
    }
  }

  private getPermissionLabel(permission: string): string {
    const labels: Record<string, string> = {
      teacher: "教師",
      classroom_manager: "教室管理員",
      admin: "督察員",
      super_admin: "超級管理員",
    };
    return labels[permission] || permission;
  }

  private filterTeachers(keyword: string) {
    this.currentPageNumber = 1; // 重置頁碼
    const teachers = keyword
      ? this.teacherManager.searchTeachers(keyword)
      : this.teacherManager.getAllTeachers();

    const filtered = this.currentDepartmentFilter
      ? teachers.filter((t) => t.department === this.currentDepartmentFilter)
      : teachers;

    this.renderTeacherTable(filtered);
  }

  async refreshTeachers() {
    try {
      this.currentPageNumber = 1; // 重置頁碼
      await this.teacherManager.getTeachers(
        this.currentDepartmentFilter || undefined,
      );
      // 刷新後更新部門下拉菜單
      this.updateDepartmentSelects();
      const teachers = this.currentDepartmentFilter
        ? this.teacherManager.getTeachersByDepartment(
            this.currentDepartmentFilter,
          )
        : this.teacherManager.getAllTeachers();
      this.renderTeacherTable(teachers);
      this.showToast("教師列表已刷新", "success");
    } catch (error) {
      this.showToast("刷新失敗", "error");
    }
  }

  refreshDepartmentSelects() {
    this.updateDepartmentSelects();
  }

  private updateDepartmentSelects() {
    const departments = this.teacherManager.getDepartments();

    // 更新篩選下拉菜單
    const filterSelect = document.getElementById(
      "departmentFilter",
    ) as HTMLSelectElement;
    if (filterSelect) {
      const currentValue = filterSelect.value;
      // 保留 "所有部門" 選項
      filterSelect.innerHTML = '<option value="">所有部門</option>';
      departments.forEach((dept) => {
        const option = document.createElement("option");
        option.value = dept;
        option.textContent = dept;
        filterSelect.appendChild(option);
      });
      filterSelect.value = currentValue;
    }

    // 更新表單中的部門選擇
    const deptSelect = document.getElementById(
      "department",
    ) as HTMLSelectElement;
    if (deptSelect) {
      const currentValue = deptSelect.value;
      // 保留佔位符選項
      deptSelect.innerHTML = '<option value="">-- 選擇部門 --</option>';
      departments.forEach((dept) => {
        const option = document.createElement("option");
        option.value = dept;
        option.textContent = dept;
        deptSelect.appendChild(option);
      });
      if (currentValue && departments.includes(currentValue)) {
        deptSelect.value = currentValue;
      }
    }
  }

  private resetForm() {
    const form = document.getElementById("teacherForm") as HTMLFormElement;
    form?.reset();

    const teacherIdInput = document.getElementById(
      "teacherId",
    ) as HTMLInputElement;
    if (teacherIdInput) {
      teacherIdInput.disabled = false;
      teacherIdInput.value = "";
    }

    const deleteBtn = document.getElementById("deleteFormBtn");
    if (deleteBtn) {
      deleteBtn.style.display = "none";
    }

    const title = document.getElementById("formTitle");
    if (title) {
      title.textContent = "新增教師";
    }

    this.editingTeacherId = null;
  }

  private async editTeacher(id: string) {
    try {
      const teacher = await this.teacherManager.getTeacher(id);
      this.navigateTo("add");
      this.populateForm(teacher);
    } catch (error) {
      this.showToast("載入教師資料失敗", "error");
    }
  }

  private populateForm(teacher: TeacherRecord) {
    const form = document.getElementById("teacherForm") as HTMLFormElement;
    if (!form) return;

    (form.elements.namedItem("teacher_id") as HTMLInputElement).value =
      teacher.teacher_id;
    (form.elements.namedItem("teacher_id") as HTMLInputElement).disabled = true;
    (form.elements.namedItem("name_cn") as HTMLInputElement).value =
      teacher.name_cn;
    (form.elements.namedItem("name_en") as HTMLInputElement).value =
      teacher.name_en || "";
    (form.elements.namedItem("department") as HTMLSelectElement).value =
      teacher.department;
    (form.elements.namedItem("email") as HTMLInputElement).value =
      teacher.email;
    (form.elements.namedItem("google_email") as HTMLInputElement).value =
      teacher.google_email || "";
    (form.elements.namedItem("permission") as HTMLSelectElement).value =
      teacher.permission;

    const title = document.getElementById("formTitle");
    if (title) {
      title.textContent = `編輯教師 - ${teacher.name_cn}`;
    }

    const deleteBtn = document.getElementById("deleteFormBtn");
    if (deleteBtn) {
      deleteBtn.style.display = "block";
    }

    this.editingTeacherId = teacher.teacher_id;
  }

  private async handleFormSubmit() {
    const form = document.getElementById("teacherForm") as HTMLFormElement;
    const formData = new FormData(form);

    const teacher: any = {
      teacher_id: formData.get("teacher_id"),
      name_cn: formData.get("name_cn"),
      name_en: formData.get("name_en"),
      department: formData.get("department"),
      email: formData.get("email"),
      google_email: formData.get("google_email"),
      permission: formData.get("permission"),
    };

    try {
      if (this.editingTeacherId) {
        // 修改
        const updates = { ...teacher };
        delete updates.teacher_id;
        await this.teacherManager.updateTeacher(this.editingTeacherId, updates);
        this.showToast("教師修改成功", "success");
      } else {
        // 新增
        await this.teacherManager.createTeacher(teacher);
        this.showToast("教師新增成功", "success");
      }

      await this.refreshTeachers();
      this.navigateTo("list");
    } catch (error) {
      this.showToast(`操作失敗: ${error}`, "error");
    }
  }

  private async handleDeleteTeacher() {
    if (!this.editingTeacherId) return;

    this.showConfirmModal(
      `確定要刪除教師 ${this.editingTeacherId} 嗎？`,
      async () => {
        try {
          await this.teacherManager.deleteTeacher(this.editingTeacherId!);
          this.showToast("教師刪除成功", "success");
          await this.refreshTeachers();
          this.navigateTo("list");
        } catch (error) {
          this.showToast("刪除失敗", "error");
        }
      },
    );
  }

  private confirmDeleteTeacher(id: string) {
    this.showConfirmModal(`確定要刪除教師 ${id} 嗎？`, async () => {
      try {
        await this.teacherManager.deleteTeacher(id);
        this.showToast("教師刪除成功", "success");
        await this.refreshTeachers();
      } catch (error) {
        this.showToast("刪除失敗", "error");
      }
    });
  }

  private async testApiConnection() {
    try {
      await this.apiClient.health();
      this.showToast("API 連接正常", "success");
      this.setStatusIndicator(true);
    } catch (error) {
      this.showToast("API 連接失敗", "error");
      this.setStatusIndicator(false);
    }
  }

  private saveSettings() {
    const baseUrl = (document.getElementById("apiBaseUrl") as HTMLInputElement)
      ?.value;
    const apiKey = (document.getElementById("apiKey") as HTMLInputElement)
      ?.value;

    if (!baseUrl || !apiKey) {
      this.showToast("請填入所有設置項", "warning");
      return;
    }

    localStorage.setItem("apiBaseUrl", baseUrl);
    localStorage.setItem("apiKey", apiKey);
    this.showToast("設置已保存", "success");
  }

  private loadSettings() {
    const baseUrl =
      localStorage.getItem("apiBaseUrl") || "http://localhost:8787";
    const apiKey = localStorage.getItem("apiKey") || "test_key";

    const baseUrlInput = document.getElementById(
      "apiBaseUrl",
    ) as HTMLInputElement;
    const apiKeyInput = document.getElementById("apiKey") as HTMLInputElement;

    if (baseUrlInput) baseUrlInput.value = baseUrl;
    if (apiKeyInput) apiKeyInput.value = apiKey;

    // 更新系統信息
    this.updateSystemInfo();
  }

  private async updateSystemInfo() {
    try {
      // 版本信息
      const versionInfo = document.getElementById("versionInfo");
      if (versionInfo) {
        versionInfo.textContent = "v1.0.0";
      }

      // API 狀態
      const apiStatusInfo = document.getElementById("apiStatusInfo");
      if (apiStatusInfo) {
        const isOnline = await this.apiClient.health();
        apiStatusInfo.textContent = isOnline ? "✅ 連接正常" : "❌ 連接異常";
      }

      // 總教師數
      const totalTeachersInfo = document.getElementById("totalTeachersInfo");
      if (totalTeachersInfo) {
        const teachers = this.teacherManager.getAllTeachers();
        totalTeachersInfo.textContent = `${teachers.length} 位`;
      }
    } catch (error) {
      console.error("更新系統信息失敗:", error);
    }
  }

  private exportData() {
    const teachers = this.teacherManager.getAllTeachers();
    const data = JSON.stringify(teachers, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teachers-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    this.showToast("資料已匯出", "success");
  }

  private handleFileImport(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!Array.isArray(data)) {
          throw new Error("無效的檔案格式");
        }

        // 匯入所有教師
        let success = 0;
        for (const teacher of data) {
          try {
            await this.teacherManager.createTeacher(teacher);
            success++;
          } catch (error) {
            console.error(`匯入教師 ${teacher.teacher_id} 失敗:`, error);
          }
        }

        this.showToast(`成功匯入 ${success} 位教師`, "success");
        await this.refreshTeachers();
      } catch (error) {
        this.showToast("檔案讀取失敗", "error");
      }
    };
    reader.readAsText(file);

    // 清空 input
    input.value = "";
  }

  private downloadTemplate() {
    // 動態載入 xlsx 庫
    const xlsxScript = document.createElement("script");
    xlsxScript.src =
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";

    xlsxScript.onload = () => {
      try {
        // 使用 xlsx 庫生成 Excel 文件
        const headers = ["department", "School ID", "Name", "email"];
        const sampleData = [
          ["华文 Chinese", "T119", "谭长咏", "ecchhs014@chhsban.edu.my"],
          ["数学 Maths", "T001", "李明", "ecchhs001@chhsban.edu.my"],
          ["英文 English", "T100", "王美玲", "ecchhs100@chhsban.edu.my"],
        ];

        // 建立工作表数据
        const wsData = [headers, ...sampleData];

        // 建立工作簿
        const ws = (window as any).XLSX.utils.aoa_to_sheet(wsData);
        const wb = (window as any).XLSX.utils.book_new();
        (window as any).XLSX.utils.book_append_sheet(wb, ws, "Teachers");

        // 设置列宽
        ws["!cols"] = [
          { wch: 20 }, // department
          { wch: 12 }, // School ID
          { wch: 15 }, // Name
          { wch: 30 }, // email
        ];

        // 下载文件
        (window as any).XLSX.writeFile(wb, "template.xlsx");
        this.showToast("模板已下載", "success");
      } catch (error) {
        this.showToast("生成模板失敗", "error");
      }
    };

    xlsxScript.onerror = () => {
      this.showToast("無法載入 Excel 生成庫", "error");
    };

    document.head.appendChild(xlsxScript);
  }

  private async handleBulkImport(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      this.showToast("請選擇 .xlsx 或 .xls 檔案", "error");
      input.value = "";
      return;
    }

    try {
      // 動態載入 xlsx 库
      const xlsxScript = document.createElement("script");
      xlsxScript.src =
        "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";

      xlsxScript.onload = async () => {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const data = event.target?.result as ArrayBuffer;
            const workbook = (window as any).XLSX.read(data, { type: "array" });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = (window as any).XLSX.utils.sheet_to_json(
              worksheet,
            );

            if (jsonData.length === 0) {
              this.showToast("檔案為空", "error");
              input.value = "";
              return;
            }

            // 显示进度
            const progressDiv = document.getElementById(
              "bulkImportProgress",
            ) as HTMLDivElement;
            const progressBar = document.getElementById(
              "bulkImportProgressBar",
            ) as HTMLDivElement;
            const statusText = document.getElementById(
              "bulkImportStatus",
            ) as HTMLDivElement;

            if (progressDiv && progressBar && statusText) {
              progressDiv.style.display = "block";
            }

            // 转换数据格式
            const teachers = jsonData.map((row: any) => ({
              teacher_id: row["School ID"] || row["teacher_id"],
              name_cn: row["Name"] || row["name_cn"],
              department: row["department"],
              email: row["email"],
            }));

            // 调用 API
            statusText.textContent = `準備匯入 ${teachers.length} 位教師...`;
            progressBar.style.width = "0%";

            const response = await this.apiClient.bulkImportTeachers(teachers);

            const results = response.data || {};
            progressBar.style.width = "100%";
            statusText.innerHTML = `
              ✅ 匯入完成！<br/>
              新增: ${results.created} 位 | 更新: ${results.updated} 位 | 跳過: ${results.skipped} 位
              ${results.errors && results.errors.length > 0 ? `<br/>❌ 錯誤: ${results.errors.length} 筆` : ""}
            `;

            this.showToast("批量匯入成功", "success");
            setTimeout(() => {
              if (progressDiv) progressDiv.style.display = "none";
              this.refreshTeachers();
            }, 2000);
          } catch (error) {
            this.showToast(`檔案解析失敗: ${error}`, "error");
            if (progressDiv) progressDiv.style.display = "none";
          }
        };
        reader.readAsArrayBuffer(file);
      };

      xlsxScript.onerror = () => {
        this.showToast("無法載入 Excel 解析庫", "error");
      };

      document.head.appendChild(xlsxScript);
    } catch (error) {
      this.showToast("匯入失敗", "error");
    }

    // 清空 input
    input.value = "";
  }

  showToast(
    message: string,
    type: "success" | "error" | "info" | "warning" = "info",
  ) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const icons: Record<string, string> = {
      success: "✓",
      error: "✗",
      info: "ℹ",
      warning: "⚠",
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close">&times;</button>
    `;

    container.appendChild(toast);

    const closeBtn = toast.querySelector(".toast-close");
    closeBtn?.addEventListener("click", () => toast.remove());

    setTimeout(() => toast.remove(), 3000);
  }

  private showConfirmModal(message: string, onConfirm: () => void) {
    const overlay = document.getElementById("modalOverlay");
    const messageEl = document.getElementById("modalMessage");
    const confirmBtn = document.getElementById("modalConfirmBtn");

    if (!overlay || !messageEl || !confirmBtn) return;

    messageEl.textContent = message;
    overlay.style.display = "flex";

    const handler = () => {
      onConfirm();
      this.closeModal();
      confirmBtn.removeEventListener("click", handler);
    };

    confirmBtn.addEventListener("click", handler);
  }

  private closeModal() {
    const overlay = document.getElementById("modalOverlay");
    if (overlay) {
      overlay.style.display = "none";
    }
  }

  setStatusIndicator(isOnline: boolean) {
    const indicator = document.getElementById("statusIndicator");
    if (indicator) {
      indicator.classList.toggle("error", !isOnline);
    }
  }

  updateStatusText(text: string) {
    const statusText = document.getElementById("statusText");
    if (statusText) {
      statusText.textContent = text;
    }
  }
}
