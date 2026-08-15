import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/utils/api";
import type { ClassroomRecord } from "@/types/index";
import "./classroom-management.css";

type ModalMode = "add" | "edit" | "batch";

// Excel 範本欄位標題（需與 handleDownloadTemplate 產生的範本一致）
const XLSX_HEADER_FIELD_MAP: Record<string, keyof ClassroomRecord> = {
  教室編號: "classroom_id",
  教室名稱: "classroom_name",
  班級: "class_name",
  桌數: "number_of_desks",
  補習選用: "available_for_tution",
};

// 解析批量更新用的 Excel (.xlsx/.xls) 檔案
async function parseClassroomXLSX(file: File): Promise<ClassroomRecord[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!worksheet) {
    throw new Error("Excel 檔案中找不到工作表");
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
    defval: "",
  });

  if (rows.length === 0) {
    throw new Error("Excel 檔案中沒有數據");
  }

  const classrooms: ClassroomRecord[] = [];

  rows.forEach((row, idx) => {
    const record: Partial<ClassroomRecord> = {
      last_updated: Date.now(),
      available_for_tution: false,
    };

    for (const [header, field] of Object.entries(XLSX_HEADER_FIELD_MAP)) {
      const rawValue = row[header];
      if (rawValue === undefined || rawValue === "") continue;

      if (field === "number_of_desks") {
        record.number_of_desks = parseInt(String(rawValue), 10) || 0;
      } else if (field === "available_for_tution") {
        const v = String(rawValue).trim().toLowerCase();
        record.available_for_tution = v === "true" || v === "是" || v === "1";
      } else {
        (record as any)[field] = String(rawValue).trim();
      }
    }

    if (!record.classroom_id || !record.classroom_name || !record.class_name) {
      console.warn(`跳過第 ${idx + 2} 行：缺少必填欄位（教室編號／教室名稱／班級）`);
      return;
    }

    classrooms.push(record as ClassroomRecord);
  });

  if (classrooms.length === 0) {
    throw new Error(
      "Excel 檔案中沒有有效的教室數據，請確認欄位標題為：教室編號、教室名稱、班級、桌數"
    );
  }

  return classrooms;
}

interface ClassroomFormData {
  classroom_id: string;
  classroom_name: string;
  class_name: string;
  number_of_desks: number;
  available_for_tution: boolean;
}

const initialFormData: ClassroomFormData = {
  classroom_id: "",
  classroom_name: "",
  class_name: "",
  number_of_desks: 0,
  available_for_tution: true,
};

export const ClassroomManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // 狀態
  const [classrooms, setClassrooms] = useState<ClassroomRecord[]>([]);
  const [filteredClassrooms, setFilteredClassrooms] = useState<ClassroomRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAvailable, setFilterAvailable] = useState<boolean | null>(null);

  // 補習選用批量勾選狀態（教室 ID -> 勾選中的值）
  const [availabilityDraft, setAvailabilityDraft] = useState<Record<string, boolean>>({});
  const [availabilitySaving, setAvailabilitySaving] = useState(false);

  // 模態框狀態
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [formData, setFormData] = useState<ClassroomFormData>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 批量更新狀態
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchInitMode, setBatchInitMode] = useState(false);
  const [batchResult, setBatchResult] = useState<{
    success: number;
    failed: number;
    errors: Array<{ id: string; error: string }>;
  } | null>(null);

  // 權限檢查
  useEffect(() => {
    if (user && !["admin", "super_admin"].includes(user.permission)) {
      alert("無權訪問此頁面");
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  // 載入教室列表
  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get("/classrooms");
      
      if (response.data?.success) {
        setClassrooms(response.data.data || []);
      } else {
        throw new Error(response.data?.error || "載入教室失敗");
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || "載入教室失敗";
      setError(errMsg);
      console.error("Fetch classrooms error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.permission && ["admin", "super_admin"].includes(user.permission)) {
      fetchClassrooms();
    }
  }, [user?.permission]);

  // 過濾和搜尋
  useEffect(() => {
    let filtered = [...classrooms];

    // 搜尋過濾
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.classroom_id.toLowerCase().includes(term) ||
          c.classroom_name.toLowerCase().includes(term) ||
          c.class_name.toLowerCase().includes(term)
      );
    }

    // 可用性過濾
    if (filterAvailable !== null) {
      filtered = filtered.filter((c) => c.available_for_tution === filterAvailable);
    }

    setFilteredClassrooms(filtered);
  }, [classrooms, searchTerm, filterAvailable]);

  // 每次教室列表重新載入時，把批量勾選草稿同步回伺服器目前的狀態
  useEffect(() => {
    setAvailabilityDraft(
      Object.fromEntries(classrooms.map((c) => [c.classroom_id, c.available_for_tution]))
    );
  }, [classrooms]);

  // 開啟新增模態框
  const handleAdd = () => {
    setModalMode("add");
    setFormData(initialFormData);
    setFormError(null);
    setModalOpen(true);
  };

  // 開啟編輯模態框
  const handleEdit = (classroom: ClassroomRecord) => {
    setModalMode("edit");
    setFormData({
      classroom_id: classroom.classroom_id,
      classroom_name: classroom.classroom_name,
      class_name: classroom.class_name,
      number_of_desks: classroom.number_of_desks,
      available_for_tution: classroom.available_for_tution,
    });
    setFormError(null);
    setModalOpen(true);
  };

  // 提交表單
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // 驗證
    if (!formData.classroom_id.trim()) {
      setFormError("教室編號不能為空");
      return;
    }
    if (!formData.classroom_name.trim()) {
      setFormError("教室名稱不能為空");
      return;
    }
    if (!formData.class_name.trim()) {
      setFormError("班級名稱不能為空");
      return;
    }
    if (formData.number_of_desks < 0) {
      setFormError("桌數不能為負數");
      return;
    }

    try {
      setSubmitting(true);

      if (modalMode === "add") {
        // 新增教室
        const response = await apiClient.post("/classrooms", formData);
        if (!response.data?.success) {
          throw new Error(response.data?.error || "新增失敗");
        }
        alert("✅ 教室新增成功");
      } else if (modalMode === "edit") {
        // 更新教室
        const { classroom_id, ...updates } = formData;
        const response = await apiClient.put(`/classrooms/${classroom_id}`, updates);
        if (!response.data?.success) {
          throw new Error(response.data?.error || "更新失敗");
        }
        alert("✅ 教室更新成功");
      }

      setModalOpen(false);
      await fetchClassrooms();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || "操作失敗";
      setFormError(errMsg);
      console.error("Submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // 補習選用勾選（不即時送出，先記在草稿中，等按「確定修改」再批量送出）
  const handleAvailabilityCheck = (classroomId: string, checked: boolean) => {
    setAvailabilityDraft((prev) => ({ ...prev, [classroomId]: checked }));
  };

  // 與伺服器目前狀態不同、尚未送出的教室 ID 清單
  const dirtyAvailabilityIds = classrooms
    .filter((c) => availabilityDraft[c.classroom_id] !== c.available_for_tution)
    .map((c) => c.classroom_id);

  // 批量套用補習選用勾選變更
  const handleApplyAvailabilityChanges = async () => {
    if (dirtyAvailabilityIds.length === 0) return;

    if (!window.confirm(`確定要套用 ${dirtyAvailabilityIds.length} 筆補習選用變更嗎？`)) {
      return;
    }

    setAvailabilitySaving(true);
    try {
      const results = await Promise.allSettled(
        dirtyAvailabilityIds.map((id) =>
          apiClient.patch(`/classrooms/${id}/tution`, { available: availabilityDraft[id] })
        )
      );

      const failedCount = results.filter((r) => r.status === "rejected").length;
      if (failedCount > 0) {
        alert(
          `⚠️ 部分更新失敗\n\n✅ 成功：${dirtyAvailabilityIds.length - failedCount} 筆\n❌ 失敗：${failedCount} 筆`
        );
      } else {
        alert(`✅ 已更新 ${dirtyAvailabilityIds.length} 筆補習選用狀態`);
      }

      await fetchClassrooms();
    } finally {
      setAvailabilitySaving(false);
    }
  };

  // 刪除教室
  const handleDelete = async (classroomId: string) => {
    if (!window.confirm(`確定要刪除教室 ${classroomId} 嗎？此操作無法復原。`)) {
      return;
    }

    try {
      const response = await apiClient.delete(`/classrooms/${classroomId}`);

      if (!response.data?.success) {
        throw new Error(response.data?.error || "刪除失敗");
      }

      alert("✅ 教室已刪除");
      await fetchClassrooms();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || "刪除失敗";
      alert(`❌ ${errMsg}`);
      console.error("Delete error:", err);
    }
  };

  // 處理批量更新文件選擇
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 驗證文件類型
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ];
      const validExt = [".xlsx", ".xls", ".csv", ".json"];
      if (!validTypes.includes(file.type) && !validExt.some((ext) => file.name.endsWith(ext))) {
        alert("❌ 請上傳 Excel (.xlsx) 或 CSV 檔案");
        return;
      }
      setBatchFile(file);
      setBatchResult(null);
    }
  };

  // 下載批量更新用的 Excel 範本
  const handleDownloadTemplate = () => {
    const headers = ["教室編號", "教室名稱", "班級", "桌數"];
    const sampleRows = [
      ["ROOM-001", "演講廳A", "中一A班", 40],
      ["ROOM-002", "演講廳B", "中二B班", 35],
      ["ROOM-003", "討論室C", "高一C班", 20],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "教室範本");
    XLSX.writeFile(workbook, "教室批量更新範本.xlsx");
  };

  // 處理批量更新
  const handleBatchUpdate = async () => {
    if (!batchFile) {
      alert("請先選擇檔案");
      return;
    }

    try {
      setBatchLoading(true);
      setFormError(null);

      let data: any = null;
      const fileName = batchFile.name.toLowerCase();

      // 1. JSON 文件
      if (fileName.endsWith(".json")) {
        const text = await batchFile.text();
        try {
          data = JSON.parse(text);
        } catch (parseErr) {
          throw new Error("JSON 文件格式無效。請確保文件是有效的 JSON 格式");
        }
      }
      // 2. CSV 文件 - 簡單處理（逗號分隔）
      else if (fileName.endsWith(".csv")) {
        const text = await batchFile.text();
        const lines = text.split("\n").filter(line => line.trim());
        
        if (lines.length < 2) {
          throw new Error("CSV 文件至少需要一列表頭和一行數據");
        }

        const classrooms: ClassroomRecord[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map(v => v.trim());
          
          if (values.length < 4) continue; // 跳過不完整的行

          try {
            classrooms.push({
              classroom_id: values[0],
              classroom_name: values[1],
              class_name: values[2],
              number_of_desks: parseInt(values[3]) || 0,
              available_for_tution: values[4]?.toLowerCase() === "true",
              last_updated: Date.now(),
            });
          } catch (lineErr) {
            console.warn(`跳過第 ${i + 1} 行`, lineErr);
          }
        }

        data = { classrooms };
      }
      // 3. Excel 文件 (.xlsx, .xls)
      else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        const classroomsFromExcel = await parseClassroomXLSX(batchFile);
        data = { classrooms: classroomsFromExcel };
      }
      // 4. 未知格式
      else {
        throw new Error(`不支援的檔案格式：${batchFile.type || "未知"}。支援的格式：.xlsx, .json, .csv`);
      }

      // 驗證數據結構
      if (!data || !Array.isArray(data.classrooms)) {
        throw new Error("檔案格式錯誤：需要包含 'classrooms' 陣列");
      }

      if (data.classrooms.length === 0) {
        throw new Error("檔案中沒有教室數據");
      }

      // 初始化模式：教室不存在時自動建立（用於第一次批量匯入）
      data.createIfMissing = batchInitMode;

      // 發送到後端
      const response = await apiClient.post("/classrooms/batch-update", data);
      
      if (!response.data?.success) {
        throw new Error(response.data?.error || "批量更新失敗");
      }

      // 顯示結果
      const stats = response.data.stats;
      setBatchResult(stats);
      
      if (stats.failed > 0) {
        alert(
          `⚠️ 批量更新部分成功\n\n` +
          `✅ 成功：${stats.success} 筆\n` +
          `❌ 失敗：${stats.failed} 筆\n\n` +
          (stats.errors?.length > 0 ? `請展開查看詳細錯誤信息` : "")
        );
      } else {
        alert(`✅ 批量更新完成：全部 ${stats.success} 筆成功！`);
      }

      await fetchClassrooms();
      setBatchFile(null);
      // 清除文件輸入框
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (err: any) {
      const errMsg = err.message || "批量更新失敗";
      setFormError(errMsg);
      alert(`❌ ${errMsg}`);
      console.error("Batch update error:", err);
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <>
      <div className="classroom-management">
        <div className="page-header">
          <h1>教室管理</h1>
          <div className="header-actions">
            <button className="btn btn-primary" onClick={handleAdd}>
              ➕ 新增教室
            </button>
          </div>
        </div>

        {error && <div className="error-message">❌ {error}</div>}

        {/* 搜尋和過濾 */}
        <div className="filters">
          <input
            type="text"
            className="search-input"
            placeholder="搜尋教室編號、名稱或班級..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="filter-select"
            value={filterAvailable === null ? "all" : filterAvailable ? "available" : "unavailable"}
            onChange={(e) => {
              const val = e.target.value;
              setFilterAvailable(val === "all" ? null : val === "available");
            }}
          >
            <option value="all">全部教室</option>
            <option value="available">僅補習可用</option>
            <option value="unavailable">僅補習不可用</option>
          </select>
        </div>

        {/* 批量更新區域 */}
        <div className="batch-update-section">
          <h3>批量更新教室</h3>
          <p className="batch-info">支援格式：Excel (.xlsx / .xls)、JSON (.json) 或 CSV (.csv)</p>
          <div className="batch-controls">
            <input
              type="file"
              accept=".xlsx,.xls,.json,.csv"
              onChange={handleFileChange}
              disabled={batchLoading}
              title="支援 Excel、JSON 和 CSV 格式"
            />
            <button
              className="btn btn-secondary"
              onClick={handleBatchUpdate}
              disabled={!batchFile || batchLoading}
            >
              {batchLoading ? "上傳中..." : "📤 上傳並更新"}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleDownloadTemplate}
            >
              📥 下載 Excel 範本
            </button>
          </div>
          <p className="batch-info batch-template-hint">
            Excel 範本欄位：教室編號、教室名稱、班級、桌數（第一列須為標題列，依範本欄位名稱填寫）
          </p>

          <label className="batch-init-toggle">
            <input
              type="checkbox"
              checked={batchInitMode}
              onChange={(e) => setBatchInitMode(e.target.checked)}
              disabled={batchLoading}
            />
            <span>
              初始化匯入（教室不存在時自動建立，適用於第一次批量匯入新教室；平時每年更新請保持關閉，以免誤建立打錯的教室編號）
            </span>
          </label>

          {formError && (
            <div className="batch-error">
              <strong>❌ 錯誤：</strong> {formError}
            </div>
          )}
          {batchResult && (
            <div className="batch-result">
              <p>
                ✅ 成功: {batchResult.success} 筆 | ❌ 失敗: {batchResult.failed} 筆
              </p>
              {batchResult.errors.length > 0 && (
                <details>
                  <summary>查看錯誤詳情</summary>
                  <ul>
                    {batchResult.errors.map((err, idx) => (
                      <li key={idx}>
                        {err.id}: {err.error}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        {/* 教室列表 */}
        {loading ? (
          <p className="loading">載入中...</p>
        ) : (
          <>
            <div className="classroom-count-row">
              <p className="classroom-count">
                顯示 {filteredClassrooms.length} / {classrooms.length} 間教室
              </p>
              <button
                type="button"
                className="btn btn-primary"
                disabled={dirtyAvailabilityIds.length === 0 || availabilitySaving}
                onClick={handleApplyAvailabilityChanges}
              >
                {availabilitySaving
                  ? "更新中..."
                  : `✅ 確定修改${dirtyAvailabilityIds.length > 0 ? `（${dirtyAvailabilityIds.length}）` : ""}`}
              </button>
            </div>
            <div className="classroom-table-container">
              <table className="classroom-table">
                <thead>
                  <tr>
                    <th>教室編號</th>
                    <th>教室名稱</th>
                    <th>班級</th>
                    <th>桌數</th>
                    <th>補習選用</th>
                    <th>最後更新</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClassrooms.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty-message">
                        暫無教室資料
                      </td>
                    </tr>
                  ) : (
                    filteredClassrooms.map((classroom) => (
                      <tr key={classroom.classroom_id}>
                        <td>{classroom.classroom_id}</td>
                        <td>{classroom.classroom_name}</td>
                        <td>{classroom.class_name}</td>
                        <td>{classroom.number_of_desks}</td>
                        <td>
                          <label className="availability-checkbox">
                            <input
                              type="checkbox"
                              checked={
                                availabilityDraft[classroom.classroom_id] ??
                                classroom.available_for_tution
                              }
                              onChange={(e) =>
                                handleAvailabilityCheck(classroom.classroom_id, e.target.checked)
                              }
                            />
                            <span>可用</span>
                          </label>
                        </td>
                        <td>{new Date(classroom.last_updated).toLocaleString("zh-TW")}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn btn-sm btn-edit"
                              onClick={() => handleEdit(classroom)}
                            >
                              ✏️ 編輯
                            </button>
                            <button
                              className="btn btn-sm btn-delete"
                              onClick={() => handleDelete(classroom.classroom_id)}
                            >
                              🗑️ 刪除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="classroom-count-row classroom-count-row--bottom">
              <button
                type="button"
                className="btn btn-primary"
                disabled={dirtyAvailabilityIds.length === 0 || availabilitySaving}
                onClick={handleApplyAvailabilityChanges}
              >
                {availabilitySaving
                  ? "更新中..."
                  : `✅ 確定修改${dirtyAvailabilityIds.length > 0 ? `（${dirtyAvailabilityIds.length}）` : ""}`}
              </button>
            </div>
          </>
        )}

        {/* 新增/編輯模態框 */}
        {modalOpen && (
          <div className="modal-overlay" onClick={() => setModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{modalMode === "add" ? "新增教室" : "編輯教室"}</h2>
                <button className="modal-close" onClick={() => setModalOpen(false)}>
                  ✖
                </button>
              </div>
              <form onSubmit={handleSubmit} className="classroom-form">
                {formError && <div className="form-error">❌ {formError}</div>}

                <div className="form-group">
                  <label htmlFor="classroom_id">
                    教室編號 <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="classroom_id"
                    value={formData.classroom_id}
                    onChange={(e) =>
                      setFormData({ ...formData, classroom_id: e.target.value })
                    }
                    disabled={modalMode === "edit"}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="classroom_name">
                    教室名稱 <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="classroom_name"
                    value={formData.classroom_name}
                    onChange={(e) =>
                      setFormData({ ...formData, classroom_name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="class_name">
                    班級名稱 <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="class_name"
                    value={formData.class_name}
                    onChange={(e) =>
                      setFormData({ ...formData, class_name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="number_of_desks">
                    桌數 <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    id="number_of_desks"
                    value={formData.number_of_desks}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        number_of_desks: parseInt(e.target.value) || 0,
                      })
                    }
                    min="0"
                    required
                  />
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.available_for_tution}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          available_for_tution: e.target.checked,
                        })
                      }
                    />
                    <span>補習選用</span>
                  </label>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setModalOpen(false)}
                    disabled={submitting}
                  >
                    取消
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? "提交中..." : modalMode === "add" ? "新增" : "更新"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ClassroomManagement;
