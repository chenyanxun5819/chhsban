import React from "react";
import { TutionRoster } from "@/types";

interface RosterFormProps {
  student?: TutionRoster;
  classId?: string;
  onSubmit: (data: Partial<TutionRoster>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

interface FormData {
  student_no: string;
  name_cn: string;
  name_en: string;
  input_class_name: string;
}

const RosterForm: React.FC<RosterFormProps> = ({
  student,
  classId,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = React.useState<FormData>({
    student_no: student?.student_no || "",
    name_cn: student?.name_cn || "",
    name_en: student?.name_en || "",
    input_class_name: student?.input_class_name || "",
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.student_no.trim()) {
      newErrors.student_no = "學號不能為空";
    }
    if (!formData.name_cn.trim()) {
      newErrors.name_cn = "中文姓名不能為空";
    }
    if (!formData.name_en.trim()) {
      newErrors.name_en = "英文姓名不能為空";
    }
    if (!formData.input_class_name.trim()) {
      newErrors.input_class_name = "班級不能為空";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // 清除該字段的錯誤
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        ...(student ? { roster_id: student.roster_id } : {}),
        class_id: classId,
        ...formData,
        status: student?.status || "initial",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="roster-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="student_no">學號 *</label>
        <input
          id="student_no"
          type="text"
          name="student_no"
          value={formData.student_no}
          onChange={handleChange}
          placeholder="例: 20139"
          disabled={loading || submitting}
          className={errors.student_no ? "is-invalid" : ""}
        />
        {errors.student_no && (
          <div className="form-error">{errors.student_no}</div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="name_cn">中文姓名 *</label>
        <input
          id="name_cn"
          type="text"
          name="name_cn"
          value={formData.name_cn}
          onChange={handleChange}
          placeholder="例: 張三"
          disabled={loading || submitting}
          className={errors.name_cn ? "is-invalid" : ""}
        />
        {errors.name_cn && (
          <div className="form-error">{errors.name_cn}</div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="name_en">英文姓名 *</label>
        <input
          id="name_en"
          type="text"
          name="name_en"
          value={formData.name_en}
          onChange={handleChange}
          placeholder="例: ZHANG SAN"
          disabled={loading || submitting}
          className={errors.name_en ? "is-invalid" : ""}
        />
        {errors.name_en && (
          <div className="form-error">{errors.name_en}</div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="input_class_name">班級 *</label>
        <input
          id="input_class_name"
          type="text"
          name="input_class_name"
          value={formData.input_class_name}
          onChange={handleChange}
          placeholder="例: S3A"
          disabled={loading || submitting}
          className={errors.input_class_name ? "is-invalid" : ""}
        />
        {errors.input_class_name && (
          <div className="form-error">{errors.input_class_name}</div>
        )}
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={loading || submitting}
        >
          取消
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || submitting}
        >
          {submitting ? "提交中..." : "提交"}
        </button>
      </div>
    </form>
  );
};

export default RosterForm;
