/**
 * Google Sheets API 同步模塊
 * 讀取可使用 API Key，寫入需使用 Service Account OAuth
 */

import { TutionClass, TutionRoster, TutionAttendance } from "@chhsban/kv-utils";

export interface SheetsConfig {
  apiKey?: string;
  spreadsheetId: string;
  serviceAccountEmail?: string;
  serviceAccountPrivateKey?: string;
  serviceAccountPrivateKeyId?: string;
  sheetNames: {
    classes: string;
    roster: string;
    attendance: string;
  };
}

export class TutionSheetsSync {
  private apiKey?: string;
  private spreadsheetId: string;
  private serviceAccountEmail?: string;
  private serviceAccountPrivateKey?: string;
  private serviceAccountPrivateKeyId?: string;
  private sheetNames: SheetsConfig["sheetNames"];
  private baseUrl = "https://sheets.googleapis.com/v4/spreadsheets";
  private tokenCache: { accessToken: string; expiresAt: number } | null = null;

  constructor(config: SheetsConfig) {
    this.apiKey = config.apiKey;
    this.spreadsheetId = config.spreadsheetId;
    this.serviceAccountEmail = config.serviceAccountEmail;
    this.serviceAccountPrivateKey = config.serviceAccountPrivateKey;
    this.serviceAccountPrivateKeyId = config.serviceAccountPrivateKeyId;
    this.sheetNames = config.sheetNames;
  }

  hasWriteCredentials(): boolean {
    return Boolean(this.serviceAccountEmail && this.serviceAccountPrivateKey);
  }

  /**
   * 初始化 Google Sheet 工作表結構
   * 注意：使用 API Key 只能读取，无法创建/重命名工作表
   * 请手动在 Google Sheet 中创建以下工作表：
   * - Classes
   * - Roster  
   * - Attendance
   */
  async initializeSheets(): Promise<void> {
    try {
      // 检查 Google Sheet 是否可访问
      const spreadsheet = await this.getSpreadsheet();
      const sheets = spreadsheet.sheets || [];
      
      // 检查必需的工作表是否存在
      const sheetNames = sheets.map((s: any) => s.properties.title);
      const requiredSheets = [
        this.sheetNames.classes,
        this.sheetNames.roster,
        this.sheetNames.attendance
      ];
      
      const missingSheets = requiredSheets.filter(name => !sheetNames.includes(name));
      
      if (missingSheets.length > 0) {
        throw new Error(
          `请手动创建以下工作表: ${missingSheets.join(", ")}\n` +
          `当前存在的工作表: ${sheetNames.join(", ")}`
        );
      }
      
      return;
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
        "Application No",
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
        "End Date",
      ],
      ...classes.map((c) => [
        c.class_id,
        (c as any).application_no || "",
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
        (c as any).end_date || "",
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
        "Student No",
        "Student Name (CN)",
        "Student Name (EN)",
        "Student Class",
        "Gender/Boarding",
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
        (r as any).student_no || "",
        r.student_name_cn,
        r.student_name_en,
        r.student_class,
        (r as any).gender_boarding || "",
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
        end_date: row[15] || undefined,
      } as TutionClass);
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
    const response = await this.authorizedFetch(
      `${this.baseUrl}/${this.spreadsheetId}`,
      {},
      "read",
    );
    if (!response.ok) throw new Error(`Failed to get spreadsheet: ${response.statusText}`);
    return response.json();
  }

  private async getSheetValues(sheetName: string): Promise<any[][]> {
    const range = `${sheetName}!A:Z`;
    const response = await this.authorizedFetch(
      `${this.baseUrl}/${this.spreadsheetId}/values/${encodeURIComponent(range)}`,
      {},
      "read",
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.values || [];
  }

  private async clearSheetValues(sheetName: string): Promise<void> {
    if (!this.hasWriteCredentials()) {
      throw new Error("Google Sheets write credentials are missing. Configure service account secrets.");
    }

    // 清空整張工作表（不含表頭以外的殘留舊資料），避免每次同步筆數變少時
    // values.update 只覆蓋新資料涵蓋的範圍、留下舊的多餘列
    const fullRange = `${sheetName}!A1:ZZ10000`;
    const response = await this.authorizedFetch(
      `${this.baseUrl}/${this.spreadsheetId}/values/${encodeURIComponent(fullRange)}:clear`,
      { method: "POST" },
      "write",
    );

    if (!response.ok) throw new Error(`Failed to clear sheet: ${response.statusText}`);
  }

  private async updateSheetValues(sheetName: string, range: string, values: any[][]): Promise<void> {
    if (!this.hasWriteCredentials()) {
      throw new Error("Google Sheets write credentials are missing. Configure service account secrets.");
    }

    await this.clearSheetValues(sheetName);

    const fullRange = `${sheetName}!${range}`;
    const response = await this.authorizedFetch(`${this.baseUrl}/${this.spreadsheetId}/values/${encodeURIComponent(fullRange)}?valueInputOption=RAW`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    }, "write");

    if (!response.ok) throw new Error(`Failed to update sheet: ${response.statusText}`);
  }

  private async addSheet(sheetName: string): Promise<void> {
    if (!this.hasWriteCredentials()) {
      throw new Error("Google Sheets write credentials are missing. Configure service account secrets.");
    }

    const response = await this.authorizedFetch(`${this.baseUrl}/${this.spreadsheetId}:batchUpdate`, {
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
    }, "write");

    if (!response.ok) throw new Error(`Failed to add sheet: ${response.statusText}`);
  }

  private async deleteSheet(sheetId: number): Promise<void> {
    if (!this.hasWriteCredentials()) {
      throw new Error("Google Sheets write credentials are missing. Configure service account secrets.");
    }

    const response = await this.authorizedFetch(`${this.baseUrl}/${this.spreadsheetId}:batchUpdate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            deleteSheet: { sheetId },
          },
        ],
      }),
    }, "write");

    if (!response.ok) throw new Error(`Failed to delete sheet: ${response.statusText}`);
  }

  private async renameSheet(sheetId: number, newTitle: string): Promise<void> {
    if (!this.hasWriteCredentials()) {
      throw new Error("Google Sheets write credentials are missing. Configure service account secrets.");
    }

    const response = await this.authorizedFetch(`${this.baseUrl}/${this.spreadsheetId}:batchUpdate`, {
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
    }, "write");

    if (!response.ok) throw new Error(`Failed to rename sheet: ${response.statusText}`);
  }

  private async authorizedFetch(
    url: string,
    init: RequestInit,
    mode: "read" | "write",
  ): Promise<Response> {
    if (mode === "write") {
      const accessToken = await this.getAccessToken();
      return fetch(url, {
        ...init,
        headers: {
          ...(init.headers || {}),
          Authorization: `Bearer ${accessToken}`,
        },
      });
    }

    if (this.hasWriteCredentials()) {
      const accessToken = await this.getAccessToken();
      return fetch(url, {
        ...init,
        headers: {
          ...(init.headers || {}),
          Authorization: `Bearer ${accessToken}`,
        },
      });
    }

    if (!this.apiKey) {
      throw new Error("Google Sheets read credentials are missing. Configure API key or service account secrets.");
    }

    const separator = url.includes("?") ? "&" : "?";
    return fetch(`${url}${separator}key=${this.apiKey}`, init);
  }

  private async getAccessToken(): Promise<string> {
    if (!this.serviceAccountEmail || !this.serviceAccountPrivateKey) {
      throw new Error("Service account credentials are missing.");
    }

    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 60_000) {
      return this.tokenCache.accessToken;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const jwt = await this.createSignedJwt(nowSeconds);
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to obtain Google access token: ${response.status} ${errorText}`);
    }

    const payload = await response.json() as {
      access_token: string;
      expires_in: number;
    };

    this.tokenCache = {
      accessToken: payload.access_token,
      expiresAt: Date.now() + payload.expires_in * 1000,
    };

    return payload.access_token;
  }

  private async createSignedJwt(nowSeconds: number): Promise<string> {
    const header = {
      alg: "RS256",
      typ: "JWT",
      kid: this.serviceAccountPrivateKeyId,
    };
    const payload = {
      iss: this.serviceAccountEmail,
      sub: this.serviceAccountEmail,
      aud: "https://oauth2.googleapis.com/token",
      scope: "https://www.googleapis.com/auth/spreadsheets",
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;
    const signature = await this.signJwt(unsignedToken);

    return `${unsignedToken}.${signature}`;
  }

  private async signJwt(unsignedToken: string): Promise<string> {
    const pem = (this.serviceAccountPrivateKey || "").replace(/\\n/g, "\n");
    const binaryKey = this.pemToArrayBuffer(pem);
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["sign"],
    );

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      new TextEncoder().encode(unsignedToken),
    );

    return this.base64UrlEncode(signature);
  }

  private pemToArrayBuffer(pem: string): ArrayBuffer {
    const base64 = pem
      .replace("-----BEGIN PRIVATE KEY-----", "")
      .replace("-----END PRIVATE KEY-----", "")
      .replace(/\s+/g, "");

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private base64UrlEncode(value: string | ArrayBuffer): string {
    const bytes = typeof value === "string"
      ? new TextEncoder().encode(value)
      : new Uint8Array(value);

    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }

    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
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
