import { useState } from 'react';
import './TeacherSearch.css';

interface TeacherData {
  department: string;
  'School ID': string;
  Name: string;
  email: string;
  [key: string]: any;
}

interface QueryResult {
  success: boolean;
  data?: TeacherData;
  error?: string;
}

const TEACHER_API_BASE = 'https://student-sync.astcws.workers.dev/api/teacher';

export default function TeacherSearch() {
  const [teacherName, setTeacherName] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!teacherName.trim()) {
      setResult({ success: false, error: '请输入教师姓名' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${TEACHER_API_BASE}/${encodeURIComponent(teacherName.trim())}`
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
    <div className="teacher-search">
      <div className="search-container">
        <h2>教师信息查询</h2>
        <div className="search-box">
          <input
            type="text"
            placeholder="请输入教师姓名（如：谭长咏）"
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
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
              <div className="teacher-card">
                <div className="card-row">
                  <span className="label">姓名：</span>
                  <span className="value">{result.data.Name}</span>
                </div>
                <div className="card-row">
                  <span className="label">教师 ID：</span>
                  <span className="value">{result.data['School ID']}</span>
                </div>
                <div className="card-row">
                  <span className="label">部门：</span>
                  <span className="value">{result.data.department}</span>
                </div>
                <div className="card-row">
                  <span className="label">邮箱：</span>
                  <span className="value">{result.data.email}</span>
                </div>
                {Object.entries(result.data).map(([key, value]) => {
                  if (!['Name', 'School ID', 'department', 'email'].includes(key)) {
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
