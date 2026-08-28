import React, { useEffect, useMemo, useState } from "react";
import { adminService, type TeacherPasswordStatus } from "@/services/adminService";

function formatDate(timestamp?: number): string {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleString("zh-Hant", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const PasswordResetList: React.FC = () => {
  const [teachers, setTeachers] = useState<TeacherPasswordStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [resettingId, setResettingId] = useState<string | null>(null);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.listTeacherPasswordStatus();
      setTeachers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入教師列表失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  // 只顯示已設定密碼的教師：還沒設定密碼的教師本來就不需要「重設」，列在這裡沒有意義
  const teachersWithPassword = useMemo(
    () => teachers.filter((t) => t.hasPassword),
    [teachers],
  );

  const filteredTeachers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return teachersWithPassword;
    return teachersWithPassword.filter(
      (t) =>
        t.teacher_id.toLowerCase().includes(keyword) ||
        t.name_cn.toLowerCase().includes(keyword) ||
        t.name_en.toLowerCase().includes(keyword) ||
        t.email.toLowerCase().includes(keyword) ||
        t.department.toLowerCase().includes(keyword),
    );
  }, [teachersWithPassword, search]);

  const handleReset = async (teacher: TeacherPasswordStatus) => {
    if (
      !window.confirm(
        `確定要重設「${teacher.name_cn}」（${teacher.teacher_id}）的密碼嗎？\n重設後，該教師下次登入需要重新設定密碼。`,
      )
    ) {
      return;
    }

    try {
      setResettingId(teacher.teacher_id);
      await adminService.resetTeacherPassword(teacher.teacher_id);
      setTeachers((prev) =>
        prev.map((t) =>
          t.teacher_id === teacher.teacher_id
            ? { ...t, hasPassword: false, passwordUpdatedAt: undefined }
            : t,
        ),
      );
      alert(`✅ 已重設「${teacher.name_cn}」的密碼，下次登入會要求重新設定`);
    } catch (err) {
      alert(`❌ ${err instanceof Error ? err.message : "重設密碼失敗"}`);
    } finally {
      setResettingId(null);
    }
  };

  return (
    <div className="password-reset-list">
      <div className="password-reset-list__toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="搜尋教師 ID、姓名、部門或 Email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" className="btn btn-small" onClick={fetchTeachers} disabled={loading}>
          {loading ? "載入中..." : "🔄 重新整理"}
        </button>
      </div>

      {error && <div className="error-banner">⚠️ {error}</div>}

      {loading && teachers.length === 0 ? (
        <div className="loading-text">載入中...</div>
      ) : filteredTeachers.length === 0 ? (
        <div className="empty-state">找不到符合條件的教師</div>
      ) : (
        <div className="password-reset-table">
          <div className="password-reset-table__header">
            <span>教師 ID</span>
            <span>姓名</span>
            <span>部門</span>
            <span>Email</span>
            <span>密碼設定時間</span>
            <span>操作</span>
          </div>
          {filteredTeachers.map((teacher) => (
            <div key={teacher.teacher_id} className="password-reset-table__row">
              <span>{teacher.teacher_id}</span>
              <span>{teacher.name_cn}</span>
              <span>{teacher.department}</span>
              <span>{teacher.email}</span>
              <span className="password-reset-table__status-date">
                {formatDate(teacher.passwordUpdatedAt)}
              </span>
              <span>
                <button
                  type="button"
                  className="btn btn-small btn--danger"
                  disabled={resettingId === teacher.teacher_id}
                  onClick={() => handleReset(teacher)}
                >
                  {resettingId === teacher.teacher_id ? "重設中..." : "🔑 重設密碼"}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PasswordResetList;
