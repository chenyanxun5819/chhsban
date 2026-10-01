import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "@/shared/auth/AuthContext";
import type { Permission } from "@/shared/types";
import {
  apiErrorMessage,
  teacherService,
  type Department,
  type Teacher,
  type TeacherImportResult,
  type TeacherImportRow,
  type TeacherInput,
} from "@/settings/services/teacherService";

const PERMISSION_LABEL: Record<Permission, string> = {
  teacher: "教師",
  viewer: "檢視者",
  classroom_manager: "教室管理員",
  dorm_supervisor: "舍監",
  admin: "督察員",
  super_admin: "超級管理員",
};

// 表單可選的權限（viewer 目前沒有對應功能，不開放新設定；既有資料仍會照原樣顯示）
const PERMISSION_OPTIONS: Permission[] = ["teacher", "classroom_manager", "dorm_supervisor", "admin", "super_admin"];

type GoogleFilter = "all" | "bound" | "unbound";

const emptyForm: TeacherInput = {
  teacher_id: "",
  name_cn: "",
  name_en: "",
  department: "",
  email: "",
  google_email: "",
  permission: "teacher",
};

// Excel 欄位標題（與舊教師管理系統的範本相同，舊檔案可直接匯入）
const IMPORT_HEADERS = ["department", "School ID", "Name", "email", "google_email"];

const cell = (row: Record<string, unknown>, ...keys: string[]): string => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
};

async function parseTeacherXLSX(file: File): Promise<TeacherImportRow[]> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!worksheet) throw new Error("Excel 檔案中找不到工作表");

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
  const teachers = rows
    .map((row) => ({
      teacher_id: cell(row, "School ID", "teacher_id"),
      name_cn: cell(row, "Name", "name_cn"),
      department: cell(row, "department"),
      email: cell(row, "email"),
      google_email: cell(row, "google_email"),
    }))
    .filter((t) => t.teacher_id);
  if (teachers.length === 0) {
    throw new Error("Excel 檔案中沒有有效資料，請確認第一列標題含有 School ID（可下載範本對照）");
  }
  return teachers;
}

/**
 * 老師管理（整合自原本獨立的教師管理系統）：教師資料、私人 Google 帳號綁定、部門主檔。
 * 只有 super_admin 能進這一頁，後端（teacher-management Worker）也只接受 super_admin 的登入 token。
 */
export const TeacherManagement: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<"teachers" | "departments">("teachers");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [googleFilter, setGoogleFilter] = useState<GoogleFilter>("all");

  // 新增／編輯教師的表單；editingId 有值代表編輯
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TeacherInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importInputKey, setImportInputKey] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<TeacherImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const [busyDepartment, setBusyDepartment] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [teacherList, departmentList] = await Promise.all([
        teacherService.listTeachers(),
        teacherService.listDepartments(),
      ]);
      setTeachers(teacherList.sort((a, b) => a.teacher_id.localeCompare(b.teacher_id, undefined, { numeric: true })));
      setDepartments(departmentList);
    } catch (err) {
      setError(apiErrorMessage(err, "載入教師資料失敗"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredTeachers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return teachers.filter((t) => {
      if (departmentFilter && t.department?.trim() !== departmentFilter) return false;
      if (googleFilter === "bound" && !t.google_email) return false;
      if (googleFilter === "unbound" && t.google_email) return false;
      if (!keyword) return true;
      return [t.teacher_id, t.name_cn, t.name_en, t.email, t.google_email, t.department].some((v) =>
        (v || "").toLowerCase().includes(keyword),
      );
    });
  }, [teachers, search, departmentFilter, googleFilter]);

  const boundCount = teachers.filter((t) => t.google_email).length;

  const teacherCountByDepartment = useMemo(() => {
    const counts = new Map<string, number>();
    teachers.forEach((t) => {
      const name = t.department?.trim();
      if (name) counts.set(name, (counts.get(name) || 0) + 1);
    });
    return counts;
  }, [teachers]);

  // ===== 教師 =====

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (teacher: Teacher) => {
    setEditingId(teacher.teacher_id);
    setForm({
      teacher_id: teacher.teacher_id,
      name_cn: teacher.name_cn,
      name_en: teacher.name_en || "",
      department: teacher.department?.trim() || "",
      email: teacher.email,
      google_email: teacher.google_email || "",
      permission: teacher.permission || "teacher",
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input: TeacherInput = {
      ...form,
      teacher_id: form.teacher_id.trim(),
      name_cn: form.name_cn.trim(),
      name_en: form.name_en.trim(),
      email: form.email.trim(),
      google_email: form.google_email.trim().toLowerCase(),
    };
    if (!input.teacher_id || !input.name_cn || !input.department || !input.email) {
      setFormError("教師 ID、中文姓名、部門、學校 Email 都必須填寫");
      return;
    }

    try {
      setSaving(true);
      setFormError(null);
      if (editingId) {
        const { teacher_id: _id, ...updates } = input;
        const updated = await teacherService.updateTeacher(editingId, updates);
        setTeachers((prev) => prev.map((t) => (t.teacher_id === editingId ? updated : t)));
      } else {
        const created = await teacherService.createTeacher(input);
        setTeachers((prev) =>
          [...prev, created].sort((a, b) => a.teacher_id.localeCompare(b.teacher_id, undefined, { numeric: true })),
        );
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(apiErrorMessage(err, "儲存失敗"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (teacher: Teacher) => {
    if (!window.confirm(`確定要刪除教師「${teacher.name_cn}」（${teacher.teacher_id}）嗎？刪除後該教師無法再登入，此操作無法復原。`)) {
      return;
    }
    try {
      await teacherService.deleteTeacher(teacher.teacher_id);
      setTeachers((prev) => prev.filter((t) => t.teacher_id !== teacher.teacher_id));
    } catch (err) {
      alert(`❌ ${apiErrorMessage(err, "刪除失敗")}`);
    }
  };

  // ===== Excel =====

  const handleDownloadTemplate = () => {
    const sample = [
      ["华文 Chinese", "T119", "谭长咏", "ecchhs014@chhsban.edu.my", "teacher.private@gmail.com"],
      ["数学 Maths", "T001", "", "", "only.bind.google@gmail.com"],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet([IMPORT_HEADERS, ...sample]);
    worksheet["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 30 }, { wch: 30 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Teachers");
    XLSX.writeFile(workbook, "教師匯入範本.xlsx");
  };

  // 匯出的欄位與匯入範本相同（多一欄權限供查看），填好 google_email 後可直接再匯入
  const handleExport = () => {
    const rows = teachers.map((t) => [
      t.department,
      t.teacher_id,
      t.name_cn,
      t.email,
      t.google_email || "",
      PERMISSION_LABEL[t.permission] || t.permission,
    ]);
    const worksheet = XLSX.utils.aoa_to_sheet([[...IMPORT_HEADERS, "權限（僅供查看）"], ...rows]);
    worksheet["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 30 }, { wch: 30 }, { wch: 16 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Teachers");
    XLSX.writeFile(workbook, `教師名單_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleImport = async () => {
    if (!importFile) return;
    try {
      setImporting(true);
      setImportError(null);
      setImportResult(null);
      const rows = await parseTeacherXLSX(importFile);
      const result = await teacherService.importTeachers(rows);
      setImportResult(result);
      setImportFile(null);
      setImportInputKey((key) => key + 1);
      await load();
    } catch (err) {
      setImportError(apiErrorMessage(err, "匯入失敗"));
    } finally {
      setImporting(false);
    }
  };

  // ===== 部門 =====

  const runDepartmentAction = async (action: () => Promise<string | void>, fallback: string) => {
    try {
      setBusyDepartment(true);
      const message = await action();
      await load();
      if (message) alert(`✅ ${message}`);
    } catch (err) {
      alert(`❌ ${apiErrorMessage(err, fallback)}`);
    } finally {
      setBusyDepartment(false);
    }
  };

  const handleAddDepartment = () => {
    const name = window.prompt("新部門名稱（例如：华文 Chinese）")?.trim();
    if (!name) return;
    runDepartmentAction(async () => {
      await teacherService.createDepartment(name);
    }, "新增部門失敗");
  };

  const handleRenameDepartment = (department: Department) => {
    const name = window.prompt(
      "新的部門名稱（使用這個部門的教師會一併更新；若改成另一個既有部門的名稱，會合併過去）",
      department.name,
    )?.trim();
    if (!name || name === department.name) return;
    runDepartmentAction(() => teacherService.renameDepartment(department.department_id, name), "修改部門失敗");
  };

  const handleDeleteDepartment = (department: Department) => {
    if (!window.confirm(`確定要刪除部門「${department.name}」嗎？`)) return;
    runDepartmentAction(async () => {
      await teacherService.deleteDepartment(department.department_id);
    }, "刪除部門失敗");
  };

  const handleSyncDepartments = () => {
    runDepartmentAction(async () => {
      const result = await teacherService.syncDepartmentsFromTeachers();
      return `同步完成，新增 ${result.created} 個部門`;
    }, "同步部門失敗");
  };

  // 部門下拉選單：部門主檔為主；教師資料裡若有主檔沒有的舊部門名稱，也列出來才不會顯示成空白
  const departmentOptions = useMemo(() => {
    const names = new Set(departments.map((d) => d.name));
    teacherCountByDepartment.forEach((_count, name) => names.add(name));
    return Array.from(names).sort((a, b) => a.localeCompare(b, "zh-Hant"));
  }, [departments, teacherCountByDepartment]);

  return (
    <div className="classroom-management">
      <div className="page-header">
        <h1>老師管理</h1>
        <div className="header-actions">
          <button
            type="button"
            className={`btn ${tab === "teachers" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setTab("teachers")}
          >
            教師（{teachers.length}）
          </button>
          <button
            type="button"
            className={`btn ${tab === "departments" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setTab("departments")}
          >
            部門（{departments.length}）
          </button>
        </div>
      </div>

      {error && <div className="error-message">❌ {error}</div>}

      {loading ? (
        <p className="loading">載入中...</p>
      ) : tab === "teachers" ? (
        <>
          <div className="filters">
            <input
              type="text"
              className="search-input"
              placeholder="搜尋教師 ID、姓名、Email、Google 帳號或部門..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="filter-select" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
              <option value="">所有部門</option>
              {departmentOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <select className="filter-select" value={googleFilter} onChange={(e) => setGoogleFilter(e.target.value as GoogleFilter)}>
              <option value="all">Google 帳號：全部</option>
              <option value="unbound">尚未綁定（無法登入）</option>
              <option value="bound">已綁定</option>
            </select>
            <button type="button" className="btn btn-primary" onClick={openAdd}>
              ➕ 新增教師
            </button>
          </div>

          <div className="batch-update-section">
            <h3>Excel 批量匯入／匯出</h3>
            <p className="batch-info">
              欄位：{IMPORT_HEADERS.join("、")}。既有教師只需填 School ID 與要更新的欄位（部門、google_email），留空代表不變更；
              新教師需填 department、Name、email。最方便的做法：先「匯出教師名單」，填好 google_email 再匯入。
            </p>
            <div className="batch-controls">
              <input
                type="file"
                accept=".xlsx,.xls"
                disabled={importing}
                // 匯入完成後換一個 key 讓輸入框重置，才能再選同一個檔
                key={importInputKey}
                onChange={(e) => {
                  setImportFile(e.target.files?.[0] || null);
                  setImportResult(null);
                  setImportError(null);
                }}
              />
              <button type="button" className="btn btn-secondary" disabled={!importFile || importing} onClick={handleImport}>
                {importing ? "匯入中..." : "📤 上傳並匯入"}
              </button>
              <button type="button" className="btn btn-outline" onClick={handleDownloadTemplate}>
                📥 下載範本
              </button>
              <button type="button" className="btn btn-outline" onClick={handleExport} disabled={teachers.length === 0}>
                📥 匯出教師名單
              </button>
            </div>
            {importError && (
              <div className="batch-error">
                <strong>❌ 錯誤：</strong> {importError}
              </div>
            )}
            {importResult && (
              <div className="batch-result">
                <p>
                  ✅ 新增 {importResult.created} 位｜更新 {importResult.updated} 位｜未變更 {importResult.skipped} 位
                  {importResult.errors.length > 0 && `｜❌ 錯誤 ${importResult.errors.length} 筆`}
                </p>
                {importResult.errors.length > 0 && (
                  <ul>
                    {importResult.errors.map((item, idx) => (
                      <li key={idx}>
                        {item.teacher_id}：{item.error}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <p className="classroom-count">
            顯示 {filteredTeachers.length} / {teachers.length} 位教師｜已綁定 Google 帳號 {boundCount} 位、尚未綁定{" "}
            {teachers.length - boundCount} 位
          </p>
          <div className="classroom-table-container">
            <table className="classroom-table">
              <thead>
                <tr>
                  <th>教師 ID</th>
                  <th>姓名</th>
                  <th>部門</th>
                  <th>學校 Email</th>
                  <th>私人 Google 帳號（登入用）</th>
                  <th>權限</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-message">
                      找不到符合條件的教師
                    </td>
                  </tr>
                ) : (
                  filteredTeachers.map((teacher) => (
                    <tr key={teacher.teacher_id}>
                      <td>{teacher.teacher_id}</td>
                      <td>
                        {teacher.name_cn}
                        {teacher.name_en && <div style={{ color: "#888", fontSize: 12 }}>{teacher.name_en}</div>}
                      </td>
                      <td>{teacher.department}</td>
                      <td>{teacher.email}</td>
                      <td>
                        {teacher.google_email || (
                          <span style={{ color: "#c33" }}>
                            尚未綁定{teacher.has_password ? "（暫可用密碼登入）" : ""}
                          </span>
                        )}
                      </td>
                      <td>{PERMISSION_LABEL[teacher.permission] || teacher.permission}</td>
                      <td>
                        <div className="action-buttons">
                          <button type="button" className="btn btn-sm btn-edit" onClick={() => openEdit(teacher)}>
                            ✏️ 編輯
                          </button>
                          {teacher.teacher_id !== user?.teacherId && (
                            <button type="button" className="btn btn-sm btn-delete" onClick={() => handleDelete(teacher)}>
                              🗑️ 刪除
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="filters">
            <button type="button" className="btn btn-primary" disabled={busyDepartment} onClick={handleAddDepartment}>
              ➕ 新增部門
            </button>
            <button type="button" className="btn btn-outline" disabled={busyDepartment} onClick={handleSyncDepartments}>
              🔄 從教師資料同步部門
            </button>
          </div>
          <div className="classroom-table-container">
            <table className="classroom-table">
              <thead>
                <tr>
                  <th>部門名稱</th>
                  <th>使用中教師數</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty-message">
                      尚無部門資料，可按「從教師資料同步部門」建立
                    </td>
                  </tr>
                ) : (
                  departments.map((department) => {
                    const count = teacherCountByDepartment.get(department.name) || 0;
                    return (
                      <tr key={department.department_id}>
                        <td>{department.name}</td>
                        <td>{count}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="btn btn-sm btn-edit"
                              disabled={busyDepartment}
                              onClick={() => handleRenameDepartment(department)}
                            >
                              ✏️ 改名
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-delete"
                              disabled={busyDepartment || count > 0}
                              title={count > 0 ? "仍有教師使用此部門，請先變更他們的部門" : undefined}
                              onClick={() => handleDeleteDepartment(department)}
                            >
                              🗑️ 刪除
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {formOpen && (
        <div className="modal-overlay" onClick={() => !saving && setFormOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? `編輯教師 - ${form.name_cn}` : "新增教師"}</h2>
              <button type="button" className="modal-close" onClick={() => setFormOpen(false)} disabled={saving}>
                ✖
              </button>
            </div>
            <form onSubmit={handleSubmit} className="classroom-form">
              {formError && <div className="form-error">❌ {formError}</div>}

              <div className="form-group">
                <label htmlFor="teacher_id">
                  教師 ID <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="teacher_id"
                  value={form.teacher_id}
                  onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
                  disabled={!!editingId}
                  placeholder="例：T119（新增後無法修改）"
                />
              </div>

              <div className="form-group">
                <label htmlFor="name_cn">
                  中文姓名 <span className="required">*</span>
                </label>
                <input type="text" id="name_cn" value={form.name_cn} onChange={(e) => setForm({ ...form, name_cn: e.target.value })} />
              </div>

              <div className="form-group">
                <label htmlFor="name_en">英文姓名</label>
                <input type="text" id="name_en" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
              </div>

              <div className="form-group">
                <label htmlFor="department">
                  部門 <span className="required">*</span>
                </label>
                <select
                  id="department"
                  className="filter-select"
                  style={{ width: "100%" }}
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                >
                  <option value="">-- 選擇部門 --</option>
                  {departmentOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="email">
                  學校 Email <span className="required">*</span>
                </label>
                <input
                  type="text"
                  inputMode="email"
                  id="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="teacher@chhsban.edu.my"
                />
              </div>

              <div className="form-group">
                <label htmlFor="google_email">私人 Google 帳號（登入用）</label>
                <input
                  type="text"
                  inputMode="email"
                  id="google_email"
                  value={form.google_email}
                  onChange={(e) => setForm({ ...form, google_email: e.target.value })}
                  placeholder="your.email@gmail.com"
                />
                <p className="batch-info" style={{ marginTop: 6 }}>
                  老師登入補習班、選修課、行政管理站時使用的私人 Gmail（學校信箱不能用於 Google 登入）。清空即解除綁定。
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="permission">
                  權限 <span className="required">*</span>
                </label>
                <select
                  id="permission"
                  className="filter-select"
                  style={{ width: "100%" }}
                  value={form.permission}
                  // 不能改自己的權限（後端也會擋），避免把自己鎖在外面
                  disabled={!!editingId && editingId === user?.teacherId}
                  onChange={(e) => setForm({ ...form, permission: e.target.value as Permission })}
                >
                  {(PERMISSION_OPTIONS.includes(form.permission) ? PERMISSION_OPTIONS : [...PERMISSION_OPTIONS, form.permission]).map(
                    (permission) => (
                      <option key={permission} value={permission}>
                        {PERMISSION_LABEL[permission] || permission}
                      </option>
                    ),
                  )}
                </select>
                <p className="batch-info" style={{ marginTop: 6 }}>
                  權限變更在該教師下次登入後生效。
                </p>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "儲存中..." : editingId ? "更新" : "新增"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherManagement;
