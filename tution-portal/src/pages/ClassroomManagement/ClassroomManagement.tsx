import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/common/Layout";
import apiClient from "@/utils/api";
import type { ClassroomRecord } from "@/types/index";
import "./classroom-management.css";

type ModalMode = "add" | "edit" | "batch";

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

  // 模態框狀態
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [formData, setFormData] = useState<ClassroomFormData>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 批量更新狀態
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
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

  // 切換補習選用
  const handleToggleAvailable = async (classroomId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const action = newStatus ? "啟用" : "停用";

    if (!window.confirm(`確定要${action}此教室的補習選用嗎？`)) {
      return;
    }

    try {
      const response = await apiClient.patch(`/classrooms/${classroomId}/tution`, {
        available: newStatus,
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || "操作失敗");
      }

      alert(`✅ 已${action}補習選用`);
      await fetchClassrooms();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || "操作失敗";
      alert(`❌ ${errMsg}`);
      console.error("Toggle available error:", err);
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
      if (!validTypes.includes(file.type) && !file.name.endsWith(".xlsx") && !file.name.endsWith(".csv")) {
        alert("❌ 請上傳 Excel (.xlsx) 或 CSV 檔案");
        return;
      }
      setBatchFile(file);
      setBatchResult(null);
    }
  };

  // 處理批量更新
  const handleBatchUpdate = async () => {
    if (!batchFile) {
      alert("請先選擇檔案");
      return;
    }

    // 注意：這裡需要實現 Excel 解析邏輯
    // 由於前端解析 Excel 需要額外的庫（如 xlsx），這裡僅提供框架
    alert("⚠️ Excel 解析功能需要配合 xlsx 庫實現。目前僅支援 JSON 格式批量更新。");
    
    // 示例：如果是 JSON 文件
    try {
      setBatchLoading(true);
      const text = await batchFile.text();
      const data = JSON.parse(text);
      
      if (!Array.isArray(data.classrooms)) {
        throw new Error("檔案格式錯誤：需要包含 classrooms 陣列");
      }

      const response = await apiClient.post("/classrooms/batch-update", data);
      
      if (response.data?.success) {
        setBatchResult(response.data.stats);
        alert(`✅ 批量更新完成：成功 ${response.data.stats.success} 筆，失敗 ${response.data.stats.failed} 筆`);
        await fetchClassrooms();
      } else {
        throw new Error(response.data?.error || "批量更新失敗");
      }
    } catch (err: any) {
      const errMsg = err.message || "批量更新失敗";
      alert(`❌ ${errMsg}`);
      console.error("Batch update error:", err);
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <Layout title="教室管理">
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
          <div className="batch-controls">
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.json"
              onChange={handleFileChange}
              disabled={batchLoading}
            />
            <button
              className="btn btn-secondary"
              onClick={handleBatchUpdate}
              disabled={!batchFile || batchLoading}
            >
              {batchLoading ? "上傳中..." : "📤 上傳並更新"}
            </button>
          </div>
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
            <p className="classroom-count">
              顯示 {filteredClassrooms.length} / {classrooms.length} 間教室
            </p>
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
                          <button
                            className={`toggle-btn ${classroom.available_for_tution ? "active" : ""}`}
                            onClick={() =>
                              handleToggleAvailable(
                                classroom.classroom_id,
                                classroom.available_for_tution
                              )
                            }
                          >
                            {classroom.available_for_tution ? "✅ 可用" : "❌ 不可用"}
                          </button>
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
    </Layout>
  );
};

export default ClassroomManagement;
