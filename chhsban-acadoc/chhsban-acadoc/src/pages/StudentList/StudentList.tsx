import { useState, useRef } from 'react';
import './StudentList.css';
import * as XLSX from 'xlsx';

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

interface ResultItem {
  studentNo: string;
  success: boolean;
  data?: StudentData;
  error?: string;
}

export function StudentList() {
  const [projectName, setProjectName] = useState('');
  const [projectDate, setProjectDate] = useState('');
  const [studentNumbers, setStudentNumbers] = useState<string[]>([]);
  const [generatingExcel, setGeneratingExcel] = useState(false);
  const [resultData, setResultData] = useState<ResultItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理CSV文件上传
  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.trim().split('\n');
        // 过滤：只保留5位数字的学号
        const numbers = lines
          .map(line => line.trim())
          .filter(line => /^\d{5}$/.test(line)); // 只保留恰好5位数字的学号
        
        setStudentNumbers(numbers);
        setResultData([]); // 清空之前的数据
      } catch (error) {
        alert(`处理CSV文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    };
    reader.readAsText(file);
  };

  // 生成Excel文件和显示数据
  const handleGenerateExcel = async () => {
    if (!projectName.trim()) {
      alert('请输入项目名称');
      return;
    }
    if (studentNumbers.length === 0) {
      alert('请上传学号列表');
      return;
    }

    setGeneratingExcel(true);
    try {
      const results: ResultItem[] = [];
      const validStudents: StudentData[] = [];

      // 并发获取所有学生数据
      const fetchPromises = studentNumbers.map(async (studentNo) => {
        try {
          const response = await fetch(
            `${STUDENT_API_BASE}/${encodeURIComponent(studentNo.trim())}`
          );
          const data: QueryResult = await response.json();
          if (data.success && data.data) {
            results.push({
              studentNo: studentNo.trim(),
              success: true,
              data: data.data,
            });
            validStudents.push(data.data);
          } else {
            results.push({
              studentNo: studentNo.trim(),
              success: false,
              error: '找不到该笔资料',
            });
          }
        } catch (error) {
          results.push({
            studentNo: studentNo.trim(),
            success: false,
            error: '查询失败',
          });
        }
      });

      await Promise.all(fetchPromises);

      // 按原始学号顺序排序结果
      const sortedResults = studentNumbers.map(
        (num) => results.find((r) => r.studentNo === num.trim()) || {
          studentNo: num.trim(),
          success: false,
          error: '未知错误',
        }
      );

      // 显示所有结果（包括失败的）
      setResultData(sortedResults);

      // 只导出成功的数据到Excel
      if (validStudents.length > 0) {
        const excelData = validStudents.map((student) => ({
          学号: student.student_no,
          英文名: student.name_en,
          中文名: student.name_cn,
          班级: student.real_class_name || '',
          性别宿舍: student.gender_boarding || '',
        }));

        // 创建工作簿
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '学生名单');

        // 设置列宽
        ws['!cols'] = [
          { wch: 12 }, // 学号
          { wch: 15 }, // 英文名
          { wch: 12 }, // 中文名
          { wch: 12 }, // 班级
          { wch: 15 }, // 性别宿舍
        ];

        // 导出Excel
        const filename = `${projectName}_${projectDate || new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, filename);
      }
    } finally {
      setGeneratingExcel(false);
    }
  };

  return (
    <div className="student-list">
      <div className="form-section">
        <h2>学生名单生成</h2>

        <div className="form-group">
          <label htmlFor="project-name">项目名称：</label>
          <input
            id="project-name"
            type="text"
            placeholder="请输入项目名称"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="project-date">项目日期：</label>
          <input
            id="project-date"
            type="date"
            value={projectDate}
            onChange={(e) => setProjectDate(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="csv-upload">学号上传（CSV格式）：</label>
          <div className="csv-upload-section">
            <input
              ref={fileInputRef}
              id="csv-upload"
              type="file"
              accept=".csv,.txt"
              onChange={handleCSVUpload}
              className="file-input"
              style={{ display: 'none' }}
            />
            <button
              className="upload-button"
              onClick={() => fileInputRef.current?.click()}
            >
              📁 选择文件
            </button>
            <span className="upload-status">
              {studentNumbers.length > 0
                ? `已上传 ${studentNumbers.length} 个学号`
                : '未选择文件'}
            </span>
          </div>
        </div>

        {studentNumbers.length > 0 && (
          <div className="form-group">
            <label>已上传的学号列表：</label>
            <div className="student-numbers-preview">
              {studentNumbers.map((num, idx) => (
                <span key={idx} className="student-number-tag">
                  {num}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          className="generate-button"
          onClick={handleGenerateExcel}
          disabled={generatingExcel || projectName === '' || studentNumbers.length === 0}
        >
          {generatingExcel ? '生成中...' : '📊 生成Excel并下载'}
        </button>
      </div>

      {/* 显示生成的学生名单 */}
      {resultData.length > 0 && (
        <div className="result-section">
          <h3>
            学生名单 ({resultData.filter((r) => r.success).length} 人 / 查询 {resultData.length} 个)
          </h3>
          <div className="table-wrapper">
            <table className="student-table">
              <thead>
                <tr>
                  <th>学号</th>
                  <th>英文名</th>
                  <th>中文名</th>
                  <th>班级</th>
                  <th>性别/宿舍</th>
                </tr>
              </thead>
              <tbody>
                {resultData.map((result, idx) => (
                  <tr key={idx} className={result.success ? '' : 'error-row'}>
                    <td>{result.studentNo}</td>
                    {result.success ? (
                      <>
                        <td>{result.data?.name_en}</td>
                        <td>{result.data?.name_cn}</td>
                        <td>{result.data?.real_class_name || '-'}</td>
                        <td>{result.data?.gender_boarding || '-'}</td>
                      </>
                    ) : (
                      <td colSpan={4} className="error-message">
                        {result.error}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
