/**
 * Google Sheets API 同步模塊
 * 使用 API Key 進行認證
 */

import { TutionClass, TutionRoster, TutionAttendance } from "@chhsban/kv-utils";

export interface SheetsConfig {
  apiKey: string;
  spreadsheetId: string;
  sheetNames: {
    classes: string;
    roster: string;
    attendance: string;
  };
}

export class TutionSheetsSync {
  private apiKey: string;
  private spreadsheetId: string;
  private sheetNames: SheetsConfig["sheetNames"];
  private baseUrl = "https://sheets.googleapis.com/v4/spreadsheets";

  constructor(config: SheetsConfig) {
    this.apiKey = config.apiKey;
    this.spreadsheetId = config.spreadsheetId;
    this.sheetNames = config.sheetNames;
  }

  /**
   * 初始化 Google Sheet 工作表結構
   */
  async initializeSheets(): Promise<void> {
    try {
      // 1. 清除現有工作表（保留第一個）
      const spreadsheet = await this.getSpreadsheet();
      const sheets = spreadsheet.sheets || [];

      for (let i = sheets.length - 1; i > 0; i--) {
        await this.deleteSheet(sheets[i].properties.sheetId);
      }

      // 2. 重命名第一個工作表為 Classes
      if (sheets.length > 0) {
        await this.renameSheet(sheets[0].properties.sheetId, this.sheetNames.classes);
      }

      // 3. 建立 Roster 和 Attendance 工作表
      await this.addSheet(this.sheetNames.roster);
      await this.addSheet(this.sheetNames.attendance);

      // 4. 寫入欄位標題
      await this.writeClassesHeader();
      await this.writeRosterHeader();
      await this.writeAttendanceHeader();
    } catch (error) {
      console.error("Error initializing sheets:", error);
      throw error;
    }
  }

  /**
   * 同步補習班主表到 Google Sheet
   */
  async syncClasses(classes: TutionClass[]): Promise<void> {
    const rows = [
      [
        "Class ID",
        "Teacher ID",
        "Teacher Name",
        "Form",
        "Subject",
        "Day of Week",
        "Time Start",
        "Time End",
        "Start Date",
        "Fees",
        "Venue",
        "Approval Status",
        "Created At",
        "Updated At",
      ],
      ...classes.map((c) => [
        c.class_id,
        c.teacher_id,
        c.teacher_name_cn || "",
        c.form,
        c.subject,
        c.day_of_week,
        c.time_start,
        c.time_end,
        c.start_date,
        c.fees.toString(),
        c.venue,
        c.approval_status,
        new Date(c.created_at).toISOString(),
        new Date(c.updated_at).toISOString(),
      ]),
    ];

    await this.updateSheetValues(this.sheetNames.classes, "A1", rows);
  }

  /**
   * 同步學生名單到 Google Sheet
   */
  async syncRoster(roster: TutionRoster[]): Promise<void> {
    const rows = [
      [
        "Roster ID",
        "Class ID",
        "Student ID",
        "Student Name (CN)",
        "Student Name (EN)",
        "Student Class",
        "Enrollment Date",
        "Withdrawal Date",
        "Withdrawal Reason",
        "Is Active",
        "Created At",
        "Updated At",
      ],
      ...roster.map((r) => [
        r.roster_id,
        r.class_id,
        r.student_id,
        r.student_name_cn,
        r.student_name_en,
        r.student_class,
        r.enrollment_date,
        r.withdrawal_date || "",
        r.withdrawal_reason || "",
        r.is_active ? "TRUE" : "FALSE",
        new Date(r.created_at).toISOString(),
        new Date(r.updated_at).toISOString(),
      ]),
    ];

    await this.updateSheetValues(this.sheetNames.roster, "A1", rows);
  }

  /**
   * 同步出勤紀錄到 Google Sheet
   */
  async syncAttendance(attendance: TutionAttendance[]): Promise<void> {
    const rows = [
      [
        "Attendance ID",
        "Class ID",
        "Student ID",
        "Class Date",
        "Status",
        "Absence Reason",
        "Recorded At",
        "Recorded By",
      ],
      ...attendance.map((a) => [
        a.attendance_id,
        a.class_id,
        a.student_id,
        a.class_date,
        a.status,
        a.absence_reason || "",
        new Date(a.recorded_at).toISOString(),
        a.recorded_by || "",
      ]),
    ];

    await this.updateSheetValues(this.sheetNames.attendance, "A1", rows);
  }

  /**
   * 從 Google Sheet 讀取補習班主表
   */
  async readClasses(): Promise<TutionClass[]> {
    const values = await this.getSheetValues(this.sheetNames.classes);
    if (!values || values.length < 2) return [];

    const headers = values[0];
    const classes: TutionClass[] = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      classes.push({
        class_id: row[0] || "",
        teacher_id: row[1] || "",
        teacher_name_cn: row[2] || "",
        form: row[3] as any,
        subject: row[4] || "",
        day_of_week: row[5] as any,
        time_start: row[6] || "",
        time_end: row[7] || "",
        start_date: row[8] || "",
        fees: parseInt(row[9]) || 0,
        venue: row[10] || "",
        approval_status: row[11] as any,
        created_at: new Date(row[12]).getTime(),
        updated_at: new Date(row[13]).getTime(),
      });
    }

    return classes;
  }

  /**
   * 從 Google Sheet 讀取學生名單
   */
  async readRoster(): Promise<TutionRoster[]> {
    const values = await this.getSheetValues(this.sheetNames.roster);
    if (!values || values.length < 2) return [];

    const roster: TutionRoster[] = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      roster.push({
        roster_id: row[0] || "",
        class_id: row[1] || "",
        student_id: row[2] || "",
        student_name_cn: row[3] || "",
        student_name_en: row[4] || "",
        student_class: row[5] || "",
        enrollment_date: row[6] || "",
        withdrawal_date: row[7] || undefined,
        withdrawal_reason: row[8] || undefined,
        is_active: row[9] === "TRUE",
        created_at: new Date(row[10]).getTime(),
        updated_at: new Date(row[11]).getTime(),
      });
    }

    return roster;
  }

  /**
   * 從 Google Sheet 讀取出勤紀錄
   */
  async readAttendance(): Promise<TutionAttendance[]> {
    const values = await this.getSheetValues(this.sheetNames.attendance);
    if (!values || values.length < 2) return [];

    const attendance: TutionAttendance[] = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      attendance.push({
        attendance_id: row[0] || "",
        class_id: row[1] || "",
        student_id: row[2] || "",
        class_date: row[3] || "",
        status: row[4] as any,
        absence_reason: row[5] || undefined,
        recorded_at: new Date(row[6]).getTime(),
        recorded_by: row[7] || undefined,
      });
    }

    return attendance;
  }

  // ===== 私有方法 =====

  private async getSpreadsheet(): Promise<any> {
    const url = `${this.baseUrl}/${this.spreadsheetId}?key=${this.apiKey}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to get spreadsheet: ${response.statusText}`);
    return response.json();
  }

  private async getSheetValues(sheetName: string): Promise<any[][]> {
    const range = `${sheetName}!A:Z`;
    const url = `${this.baseUrl}/${this.spreadsheetId}/values/${encodeURIComponent(range)}?key=${this.apiKey}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.values || [];
  }

  private async updateSheetValues(sheetName: string, range: string, values: any[][]): Promise<void> {
    const fullRange = `${sheetName}!${range}`;
    const url = `${this.baseUrl}/${this.spreadsheetId}/values/${encodeURIComponent(fullRange)}?key=${this.apiKey}&valueInputOption=RAW`;

    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    });

    if (!response.ok) throw new Error(`Failed to update sheet: ${response.statusText}`);
  }

  private async addSheet(sheetName: string): Promise<void> {
    const url = `${this.baseUrl}/${this.spreadsheetId}:batchUpdate?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: { title: sheetName },
            },
          },
        ],
      }),
    });

    if (!response.ok) throw new Error(`Failed to add sheet: ${response.statusText}`);
  }

  private async deleteSheet(sheetId: number): Promise<void> {
    const url = `${this.baseUrl}/${this.spreadsheetId}:batchUpdate?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            deleteSheet: { sheetId },
          },
        ],
      }),
    });

    if (!response.ok) throw new Error(`Failed to delete sheet: ${response.statusText}`);
  }

  private async renameSheet(sheetId: number, newTitle: string): Promise<void> {
    const url = `${this.baseUrl}/${this.spreadsheetId}:batchUpdate?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            updateSheetProperties: {
              fields: "title",
              properties: {
                sheetId,
                title: newTitle,
              },
            },
          },
        ],
      }),
    });

    if (!response.ok) throw new Error(`Failed to rename sheet: ${response.statusText}`);
  }

  private async writeClassesHeader(): Promise<void> {
    const headers = [
      ["Class ID", "Teacher ID", "Form", "Subject", "Day of Week", "Time Start", "Time End", "Start Date", "Fees", "Venue", "Approval Status", "Created At", "Updated At"],
    ];
    await this.updateSheetValues(this.sheetNames.classes, "A1", headers);
  }

  private async writeRosterHeader(): Promise<void> {
    const headers = [
      ["Roster ID", "Class ID", "Student ID", "Student Name (CN)", "Student Name (EN)", "Student Class", "Enrollment Date", "Withdrawal Date", "Withdrawal Reason", "Is Active", "Created At", "Updated At"],
    ];
    await this.updateSheetValues(this.sheetNames.roster, "A1", headers);
  }

  private async writeAttendanceHeader(): Promise<void> {
    const headers = [["Attendance ID", "Class ID", "Student ID", "Class Date", "Status", "Absence Reason", "Recorded At", "Recorded By"]];
    await this.updateSheetValues(this.sheetNames.attendance, "A1", headers);
  }
}
