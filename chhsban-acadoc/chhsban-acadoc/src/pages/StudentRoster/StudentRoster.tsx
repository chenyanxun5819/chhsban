import { useState } from 'react';
import './StudentRoster.css';

const STUDENT_API_BASE = 'https://student-sync.astcws.workers.dev/api/student';

interface StudentData {
  student_no: string;
  student_id: string;
  name_en: string;
  name_cn: string;
  gender_boarding?: string;
  real_class_name?: string;
  [key: string]: any;
}

interface QueryResult {
  success: boolean;
  data?: StudentData;
  error?: string;
}

export function StudentRoster() {
  const [studentNo, setStudentNo] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!studentNo.trim()) {
      setResult({ success: false, error: '请输入学号' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${STUDENT_API_BASE}/${encodeURIComponent(studentNo.trim())}`
      );
      const data: QueryResult = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: `查询失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="student-roster">
      <div className="search-container">
        <h2>学生信息查询</h2>
        <div className="search-box">
          <input
            type="text"
            placeholder="请输入学号（如：J1A001）"
            value={studentNo}
            onChange={(e) => setStudentNo(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <button onClick={handleSearch} disabled={loading}>
            {loading ? '查询中...' : '查询'}
          </button>
        </div>
      </div>

      {result && (
        <div className="result-container">
          {result.success && result.data ? (
            <div className="result-success">
              <h3>查询结果</h3>
              <div className="student-card">
                <div className="card-row">
                  <span className="label">学号：</span>
                  <span className="value">{result.data.student_no}</span>
                </div>
                <div className="card-row">
                  <span className="label">英文名：</span>
                  <span className="value">{result.data.name_en}</span>
                </div>
                <div className="card-row">
                  <span className="label">中文名：</span>
                  <span className="value">{result.data.name_cn}</span>
                </div>
                {result.data.real_class_name && (
                  <div className="card-row">
                    <span className="label">班级：</span>
                    <span className="value">{result.data.real_class_name}</span>
                  </div>
                )}
                {result.data.gender_boarding && (
                  <div className="card-row">
                    <span className="label">性别/宿舍：</span>
                    <span className="value">{result.data.gender_boarding}</span>
                  </div>
                )}
                {Object.entries(result.data).map(([key, value]) => {
                  if (![
                    'student_no',
                    'student_id',
                    'name_en',
                    'name_cn',
                    'real_class_name',
                    'gender_boarding'
                  ].includes(key)) {
                    return (
                      <div key={key} className="card-row">
                        <span className="label">{key}：</span>
                        <span className="value">{String(value)}</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ) : (
            <div className="result-error">
              <p>❌ {result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
