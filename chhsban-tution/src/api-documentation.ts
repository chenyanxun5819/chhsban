/**
 * 補習班系統 API 端點文檔
 * Base URL: https://tution-system.chhsban-acadoc.workers.dev/api/v1
 */

// ========================================
// 補習班主表 API
// ========================================

/**
 * 建立新補習班 (僅教師)
 * POST /api/v1/classes
 * 
 * Headers:
 *   Authorization: Bearer {token}
 *   Content-Type: application/json
 * 
 * Body:
 * {
 *   "form": "F4",
 *   "subject": "數學",
 *   "day_of_week": "Monday",
 *   "start_date": "2026-07-15",
 *   "fees": 70,
 *   "venue": "教室 A101"
 * }
 * 
 * Response (201 Created):
 * {
 *   "class_id": "class_1720503600000_abc123",
 *   "teacher_id": "T001",
 *   "form": "F4",
 *   "subject": "數學",
 *   "day_of_week": "Monday",
 *   "time_start": "19:00",
 *   "time_end": "21:00",
 *   "start_date": "2026-07-15",
 *   "fees": 70,
 *   "venue": "教室 A101",
 *   "approval_status": "pending",
 *   "created_at": 1720503600000,
 *   "updated_at": 1720503600000
 * }
 */

/**
 * 取得補習班詳情 (教師/管理員)
 * GET /api/v1/classes/{classId}
 * 
 * Headers:
 *   Authorization: Bearer {token}
 * 
 * Response (200 OK):
 * {
 *   "class_id": "class_1720503600000_abc123",
 *   "teacher_id": "T001",
 *   ...
 * }
 */

/**
 * 更新補習班 (僅創建者或管理員)
 * PUT /api/v1/classes/{classId}
 * 
 * Headers:
 *   Authorization: Bearer {token}
 *   Content-Type: application/json
 * 
 * Body (支持部分更新):
 * {
 *   "fees": 75,
 *   "venue": "教室 A102",
 *   "approval_status": "active"
 * }
 * 
 * Response (200 OK): 更新後的完整物件
 */

/**
 * 刪除補習班 (僅創建者或管理員)
 * DELETE /api/v1/classes/{classId}
 * 
 * Headers:
 *   Authorization: Bearer {token}
 * 
 * Response (204 No Content)
 */

/**
 * 生成補習班申請表 PDF
 * GET /api/v1/classes/{classId}/pdf
 * 
 * Headers:
 *   Authorization: Bearer {token}
 * 
 * Response (200 OK):
 *   Content-Type: application/pdf
 *   Body: PDF 二進制文件
 * 
 * 下載檔名: tution_{classId}.pdf
 */

/**
 * 列表查詢教師的補習班
 * GET /api/v1/classes?teacher={teacherId}
 * 
 * Headers:
 *   Authorization: Bearer {token}
 * 
 * Response (200 OK):
 * [
 *   { "class_id": "...", ... },
 *   { "class_id": "...", ... }
 * ]
 */

// ========================================
// Google Sheets 同步 API
// ========================================

/**
 * 初始化 Google Sheet 結構
 * GET /api/sync?action=init
 * 
 * Headers:
 *   Authorization: Bearer {token}
 * 
 * Response (200 OK):
 * {
 *   "success": true,
 *   "message": "Google Sheet initialized with 3 worksheets"
 * }
 * 
 * 建立的工作表:
 *   - Classes: 補習班主表
 *   - Roster: 學生名單 (暫未實現)
 *   - Attendance: 出勤紀錄 (暫未實現)
 */

/**
 * 同步所有數據到 Google Sheet
 * GET /api/sync?action=sync-all
 * 
 * Headers:
 *   Authorization: Bearer {token}
 * 
 * Response (200 OK):
 * {
 *   "success": true,
 *   "message": "All data synced to Google Sheet",
 *   "stats": {
 *     "classes": 5,
 *     "roster": 0,
 *     "attendance": 0
 *   }
 * }
 */

/**
 * 同步補習班主表
 * GET /api/sync?action=sync-classes
 * 
 * Headers:
 *   Authorization: Bearer {token}
 * 
 * Response (200 OK):
 * {
 *   "success": true,
 *   "message": "Classes synced to Google Sheet",
 *   "count": 5
 * }
 */

// ========================================
// 健康檢查 API
// ========================================

/**
 * 系統健康檢查
 * GET /api/health
 * 
 * 無需認證
 * 
 * Response (200 OK):
 * {
 *   "status": "ok",
 *   "service": "tution-system"
 * }
 */

// ========================================
// 錯誤回應示例
// ========================================

/**
 * 未認證 (401 Unauthorized)
 * {
 *   "error": "Unauthorized"
 * }
 */

/**
 * 無效令牌 (401 Unauthorized)
 * {
 *   "error": "Invalid token"
 * }
 */

/**
 * 無權限訪問 (403 Forbidden)
 * {
 *   "error": "Forbidden"
 * }
 */

/**
 * 資源不存在 (404 Not Found)
 * {
 *   "error": "Class not found"
 * }
 */

/**
 * 缺少必填欄位 (400 Bad Request)
 * {
 *   "error": "Missing required fields"
 * }
 */

/**
 * 伺服器錯誤 (500 Internal Server Error)
 * {
 *   "error": "Internal server error"
 * }
 */

// ========================================
// cURL 測試示例
// ========================================

/*
# 1. 取得認證令牌（假設已有）
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 2. 健康檢查
curl -X GET "https://tution-system.chhsban-acadoc.workers.dev/api/health"

# 3. 建立新補習班
curl -X POST "https://tution-system.chhsban-acadoc.workers.dev/api/v1/classes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "form": "F4",
    "subject": "數學",
    "day_of_week": "Monday",
    "start_date": "2026-07-15",
    "fees": 70,
    "venue": "教室 A101"
  }'

# 4. 查詢教師的補習班
curl -X GET "https://tution-system.chhsban-acadoc.workers.dev/api/v1/classes?teacher=T001" \
  -H "Authorization: Bearer $TOKEN"

# 5. 取得補習班詳情
curl -X GET "https://tution-system.chhsban-acadoc.workers.dev/api/v1/classes/class_1720503600000_abc123" \
  -H "Authorization: Bearer $TOKEN"

# 6. 生成 PDF
curl -X GET "https://tution-system.chhsban-acadoc.workers.dev/api/v1/classes/class_1720503600000_abc123/pdf" \
  -H "Authorization: Bearer $TOKEN" \
  -o tution_application.pdf

# 7. 初始化 Google Sheet
curl -X GET "https://tution-system.chhsban-acadoc.workers.dev/api/sync?action=init" \
  -H "Authorization: Bearer $TOKEN"

# 8. 同步數據
curl -X GET "https://tution-system.chhsban-acadoc.workers.dev/api/sync?action=sync-all" \
  -H "Authorization: Bearer $TOKEN"
*/

export {};
