import React, { useState } from "react";
import "./form.css";

interface StudentListFormProps {
  onSubmit: (students: Array<{ student_id: string; name?: string }>) => void;
  isLoading?: boolean;
}

export const StudentListForm: React.FC<StudentListFormProps> = ({
  onSubmit,
  isLoading = false,
}) => {
  const [students, setStudents] = useState<Array<{ student_id: string; name?: string }>>([
    { student_id: "", name: "" },
  ]);

  const handleAddStudent = () => {
    setStudents([...students, { student_id: "", name: "" }]);
  };

  const handleRemoveStudent = (index: number) => {
    setStudents(students.filter((_, i) => i !== index));
  };

  const handleStudentChange = (
    index: number,
    field: "student_id" | "name",
    value: string
  ) => {
    const updated = [...students];
    updated[index][field] = value;
    setStudents(updated);
  };

  const handleSubmit = () => {
    const validStudents = students.filter((s) => s.student_id.trim());
    if (validStudents.length === 0) {
      alert("請至少輸入一名學生");
      return;
    }
    onSubmit(validStudents);
  };

  return (
    <div className="student-list-form">
      <div className="form-header">
        <h3>學生名單 (手動輸入)</h3>
        <p className="help-text">逐個輸入學生 ID，系統會自動查詢學生信息</p>
      </div>

      <div className="student-table-responsive">
        <table className="student-table">
          <thead>
            <tr>
              <th>學生 ID</th>
              <th>學生名稱 (可選)</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, index) => (
              <tr key={index}>
                <td>
                  <input
                    type="text"
                    placeholder="例: 20139"
                    value={student.student_id}
                    onChange={(e) =>
                      handleStudentChange(index, "student_id", e.target.value)
                    }
                    disabled={isLoading}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="自動填充"
                    value={student.name || ""}
                    onChange={(e) =>
                      handleStudentChange(index, "name", e.target.value)
                    }
                    disabled={isLoading}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => handleRemoveStudent(index)}
                    disabled={isLoading || students.length === 1}
                    className="btn-remove"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="form-actions">
        <button
          type="button"
          onClick={handleAddStudent}
          disabled={isLoading}
          className="btn btn-secondary"
        >
          + 新增學生
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className="btn btn-primary"
        >
          {isLoading ? "處理中..." : "提交"}
        </button>
      </div>
    </div>
  );
};
