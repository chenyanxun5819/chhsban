import { TutionClass, TutionRoster, TutionAttendance } from "@/types";

/**
 * PDF 生成工具函数
 * 將數據轉換為可列印的 HTML，再由瀏覽器轉換為 PDF
 */

export const generateApplicationPDF = (
  classInfo: TutionClass,
  roster: TutionRoster[]
): string => {
  const now = new Date().toLocaleString("zh-TW");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>應用表 - ${classInfo.class_id}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 800px; margin: 40px auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header h1 { font-size: 24px; margin-bottom: 5px; }
        .header p { font-size: 12px; color: #666; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 16px; font-weight: bold; background-color: #f0f0f0; padding: 8px; margin-bottom: 10px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .info-item { border-bottom: 1px solid #ddd; padding: 8px 0; }
        .info-label { font-weight: bold; color: #555; font-size: 12px; }
        .info-value { font-size: 14px; margin-top: 3px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f0f0f0; font-weight: bold; }
        .footer { margin-top: 30px; font-size: 12px; color: #999; text-align: center; }
        @page { margin: 1cm; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>補習班申請表</h1>
          <p>生成時間: ${now}</p>
        </div>

        <div class="section">
          <div class="section-title">📋 課程基本信息</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">課程編號</div>
              <div class="info-value">${classInfo.class_id}</div>
            </div>
            <div class="info-item">
              <div class="info-label">科目</div>
              <div class="info-value">${classInfo.subject}</div>
            </div>
            <div class="info-item">
              <div class="info-label">年級</div>
              <div class="info-value">${classInfo.form}</div>
            </div>
            <div class="info-item">
              <div class="info-label">學費 (RM)</div>
              <div class="info-value">${classInfo.fees}</div>
            </div>
            <div class="info-item">
              <div class="info-label">上課日期</div>
              <div class="info-value">${classInfo.day_of_week}</div>
            </div>
            <div class="info-item">
              <div class="info-label">上課時間</div>
              <div class="info-value">${classInfo.time_start} - ${classInfo.time_end}</div>
            </div>
            <div class="info-item">
              <div class="info-label">開課日期</div>
              <div class="info-value">${new Date(classInfo.start_date).toLocaleDateString("zh-TW")}</div>
            </div>
            <div class="info-item">
              <div class="info-label">上課地點</div>
              <div class="info-value">${classInfo.venue}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">👨‍🏫 教師信息</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">教師名字</div>
              <div class="info-value">${classInfo.teacher_name_cn}</div>
            </div>
            <div class="info-item">
              <div class="info-label">教師編號</div>
              <div class="info-value">${classInfo.teacher_id}</div>
            </div>
            <div class="info-item">
              <div class="info-label">開課時間</div>
              <div class="info-value">${classInfo.time_start} - ${classInfo.time_end}</div>
            </div>
            <div class="info-item">
              <div class="info-label">上課地點</div>
              <div class="info-value">${classInfo.venue}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">👥 初始學生名單 (共 ${roster.length} 名)</div>
          <table>
            <thead>
              <tr>
                <th>學生編號</th>
                <th>中文名字</th>
                <th>英文名字</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              ${roster
                .map(
                  (student) => `
                <tr>
                  <td>${student.student_id}</td>
                  <td>${student.name_cn}</td>
                  <td>${student.name_en}</td>
                  <td>${student.status === "active" ? "✅ 活躍" : "⏳ 初始"}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>本表格由補習班管理系統自動生成</p>
          <p>補習班編號: ${classInfo.class_id} | 申請狀態: ${classInfo.approval_status}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const generateAttendancePDF = (
  classInfo: TutionClass,
  attendance: TutionAttendance[],
  roster: TutionRoster[]
): string => {
  const now = new Date().toLocaleString("zh-TW");

  // 按日期分組
  const byDate: Record<string, TutionAttendance[]> = {};
  attendance.forEach((record) => {
    const dateStr = new Date(record.recorded_at).toLocaleDateString("zh-TW");
    if (!byDate[dateStr]) {
      byDate[dateStr] = [];
    }
    byDate[dateStr].push(record);
  });

  const dateGroups = Object.entries(byDate)
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    .map(
      ([date, records]) => `
    <div class="date-group">
      <h3>${date}</h3>
      <table>
        <thead>
          <tr>
            <th>學生編號</th>
            <th>名字</th>
            <th>狀態</th>
            <th>記錄時間</th>
          </tr>
        </thead>
        <tbody>
          ${records
            .map(
              (record) => `
            <tr>
              <td>${record.student_id}</td>
              <td>${roster.find((s) => s.student_id === record.student_id)?.name_cn || "N/A"}</td>
              <td>${record.status === "present" ? "✅ 出席" : record.status === "late" ? "⏰ 遲到" : "❌ 缺席"}</td>
              <td>${new Date(record.recorded_at).toLocaleTimeString("zh-TW")}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>點名表 - ${classInfo.class_id}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 900px; margin: 40px auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header h1 { font-size: 24px; margin-bottom: 5px; }
        .header p { font-size: 12px; color: #666; }
        .course-info { background-color: #f0f0f0; padding: 10px; margin-bottom: 20px; border-radius: 4px; font-size: 12px; }
        .date-group { margin-bottom: 25px; page-break-inside: avoid; }
        .date-group h3 { font-size: 14px; font-weight: bold; margin-bottom: 8px; background-color: #e9ecef; padding: 6px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f0f0f0; font-weight: bold; font-size: 12px; }
        td { font-size: 12px; }
        .footer { margin-top: 30px; font-size: 12px; color: #999; text-align: center; }
        @page { margin: 1cm; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>點名表</h1>
          <p>生成時間: ${now}</p>
        </div>

        <div class="course-info">
          <strong>課程:</strong> ${classInfo.subject} (${classInfo.form}) | 
          <strong>教師:</strong> ${classInfo.teacher_name_cn} | 
          <strong>編號:</strong> ${classInfo.class_id}
        </div>

        <div class="attendance-records">
          ${dateGroups}
        </div>

        <div class="footer">
          <p>本表格由補習班管理系統自動生成</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const generateAttendanceReportPDF = (
  classInfo: TutionClass,
  attendance: TutionAttendance[],
  roster: TutionRoster[]
): string => {
  const now = new Date().toLocaleString("zh-TW");

  // 計算統計數據
  const stats = {
    total: attendance.length,
    present: attendance.filter((a) => a.status === "present").length,
    late: attendance.filter((a) => a.status === "late").length,
    absent: attendance.filter((a) => a.status === "absent").length,
  };

  // 按學生統計
  const studentStats: Record<
    string,
    { name: string; present: number; late: number; absent: number }
  > = {};
  roster.forEach((student) => {
    studentStats[student.student_id] = {
      name: student.name_cn,
      present: 0,
      late: 0,
      absent: 0,
    };
  });

  attendance.forEach((record) => {
    if (studentStats[record.student_id]) {
      if (record.status === "present") {
        studentStats[record.student_id].present++;
      } else if (record.status === "late") {
        studentStats[record.student_id].late++;
      } else if (record.status === "absent") {
        studentStats[record.student_id].absent++;
      }
    }
  });

  const studentRows = Object.values(studentStats)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (stat) => `
    <tr>
      <td>${stat.name}</td>
      <td>${stat.present}</td>
      <td>${stat.late}</td>
      <td>${stat.absent}</td>
      <td>${stat.present + stat.late + stat.absent}</td>
      <td>${((((stat.present + stat.late) / (stat.present + stat.late + stat.absent)) * 100) || 0).toFixed(1)}%</td>
    </tr>
  `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>出勤報告 - ${classInfo.class_id}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 900px; margin: 40px auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header h1 { font-size: 24px; margin-bottom: 5px; }
        .header p { font-size: 12px; color: #666; }
        .course-info { background-color: #f0f0f0; padding: 10px; margin-bottom: 20px; border-radius: 4px; font-size: 12px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 25px; }
        .stat-box { background-color: #f8f9fa; padding: 15px; border-left: 3px solid #007bff; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; margin: 5px 0; }
        .stat-label { font-size: 11px; color: #666; }
        .section-title { font-size: 16px; font-weight: bold; margin-top: 25px; margin-bottom: 12px; background-color: #f0f0f0; padding: 8px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background-color: #f0f0f0; font-weight: bold; }
        .footer { margin-top: 30px; font-size: 12px; color: #999; text-align: center; }
        @page { margin: 1cm; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>出勤報告</h1>
          <p>生成時間: ${now}</p>
        </div>

        <div class="course-info">
          <strong>課程:</strong> ${classInfo.subject} (${classInfo.form}) | 
          <strong>教師:</strong> ${classInfo.teacher_name_cn} | 
          <strong>學生數:</strong> ${roster.length}
        </div>

        <div class="section-title">📊 出勤統計摘要</div>
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-label">總記錄</div>
            <div class="stat-value">${stats.total}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">出席</div>
            <div class="stat-value">${stats.present}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">遲到</div>
            <div class="stat-value">${stats.late}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">缺席</div>
            <div class="stat-value">${stats.absent}</div>
          </div>
        </div>

        <div class="section-title">👥 按學生的出勤詳情</div>
        <table>
          <thead>
            <tr>
              <th>學生名字</th>
              <th>出席</th>
              <th>遲到</th>
              <th>缺席</th>
              <th>總計</th>
              <th>出勤率</th>
            </tr>
          </thead>
          <tbody>
            ${studentRows}
          </tbody>
        </table>

        <div class="footer">
          <p>本報告由補習班管理系統自動生成</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
