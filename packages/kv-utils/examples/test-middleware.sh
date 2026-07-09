#!/bin/bash

# =============================================================================
# @chhsban/kv-utils Middleware 測試腳本
# 
# 使用方式：
#   bash test-middleware.sh http://localhost:8787
#
# 前置條件：
#   1. 啟動 Wrangler 本地開發服務器：wrangler dev
#   2. 運行此腳本測試各個端點和權限場景
# =============================================================================

set -e

# 服務器 URL（默認本地開發服務器）
SERVER_URL="${1:-http://localhost:8787}"

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 計數器
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

# ============================================================================
# 輔助函數
# ============================================================================

log_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

log_success() {
  echo -e "${GREEN}✓ $1${NC}"
  ((TESTS_PASSED++))
}

log_error() {
  echo -e "${RED}✗ $1${NC}"
  ((TESTS_FAILED++))
}

log_test() {
  echo -e "\n${YELLOW}[TEST] $1${NC}"
  ((TESTS_TOTAL++))
}

# 發送請求並檢查結果
test_request() {
  local method=$1
  local path=$2
  local expected_status=$3
  local data=$4
  local auth_token=$5
  
  local curl_args=("-s" "-w" "\n%{http_code}" "-X" "$method")
  
  if [ -n "$auth_token" ]; then
    curl_args+=("-H" "Authorization: Bearer $auth_token")
  fi
  
  curl_args+=("-H" "Content-Type: application/json")
  
  if [ -n "$data" ]; then
    curl_args+=("-d" "$data")
  fi
  
  curl_args+=("$SERVER_URL$path")
  
  local response=$(curl "${curl_args[@]}")
  local status=$(echo "$response" | tail -n1)
  local body=$(echo "$response" | head -n-1)
  
  if [ "$status" = "$expected_status" ]; then
    log_success "$method $path (HTTP $status)"
    echo "$body"
    return 0
  else
    log_error "$method $path - Expected $expected_status, got $status"
    echo "Response: $body"
    return 1
  fi
}

# ============================================================================
# 測試開始
# ============================================================================

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     @chhsban/kv-utils Middleware 集成測試                   ║${NC}"
echo -e "${BLUE}║     Server: $SERVER_URL${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"

# 1. 健康檢查
log_test "健康檢查"
HEALTH_RESPONSE=$(test_request "GET" "/health" "200" "" "")
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status')
if [ "$HEALTH_STATUS" = "ok" ]; then
  log_success "服務器健康檢查通過"
else
  log_error "服務器健康檢查失敗"
fi

# 2. 認證測試 - 缺少 Token
log_test "沒有 Token 的認證請求應返回 401"
test_request "GET" "/api/auth/me" "401" "" "" > /dev/null 2>&1 || true

# 3. 登錄測試 - Admin 角色
log_test "使用 Admin 角色登錄"
ADMIN_LOGIN_DATA='{
  "teacherId":"T001",
  "teacherName":"Admin User",
  "permission":"admin",
  "redirectUrl":"/dashboard"
}'
ADMIN_LOGIN_RESPONSE=$(test_request "POST" "/api/auth/login" "200" "$ADMIN_LOGIN_DATA" "")
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN_RESPONSE" | jq -r '.token')
ADMIN_PERMISSION=$(echo "$ADMIN_LOGIN_RESPONSE" | jq -r '.user.permission')

if [ -n "$ADMIN_TOKEN" ] && [ "$ADMIN_PERMISSION" = "admin" ]; then
  log_success "Admin 登錄成功，Token: ${ADMIN_TOKEN:0:10}..."
else
  log_error "Admin 登錄失敗"
  exit 1
fi

# 4. 登錄測試 - Teacher 角色
log_test "使用 Teacher 角色登錄"
TEACHER_LOGIN_DATA='{
  "teacherId":"T002",
  "teacherName":"Teacher User",
  "permission":"teacher"
}'
TEACHER_LOGIN_RESPONSE=$(test_request "POST" "/api/auth/login" "200" "$TEACHER_LOGIN_DATA" "")
TEACHER_TOKEN=$(echo "$TEACHER_LOGIN_RESPONSE" | jq -r '.token')
TEACHER_PERMISSION=$(echo "$TEACHER_LOGIN_RESPONSE" | jq -r '.user.permission')

if [ -n "$TEACHER_TOKEN" ] && [ "$TEACHER_PERMISSION" = "teacher" ]; then
  log_success "Teacher 登錄成功，Token: ${TEACHER_TOKEN:0:10}..."
else
  log_error "Teacher 登錄失敗"
  exit 1
fi

# 5. 獲取當前用戶信息 - Admin
log_test "Admin 獲取當前用戶信息"
ADMIN_ME=$(test_request "GET" "/api/auth/me" "200" "" "$ADMIN_TOKEN" | head -n1)
ADMIN_ID=$(echo "$ADMIN_ME" | jq -r '.user.teacherId')
if [ "$ADMIN_ID" = "T001" ]; then
  log_success "Admin 用戶信息檢索成功"
else
  log_error "Admin 用戶信息檢索失敗"
fi

# 6. 獲取當前用戶信息 - Teacher
log_test "Teacher 獲取當前用戶信息"
TEACHER_ME=$(test_request "GET" "/api/auth/me" "200" "" "$TEACHER_TOKEN" | head -n1)
TEACHER_ID=$(echo "$TEACHER_ME" | jq -r '.user.teacherId')
if [ "$TEACHER_ID" = "T002" ]; then
  log_success "Teacher 用戶信息檢索成功"
else
  log_error "Teacher 用戶信息檢索失敗"
fi

# 7. 權限測試 - Admin 訪問 Admin 端點
log_test "Admin 訪問需要 Admin 權限的端點"
ADMIN_TEACHERS=$(test_request "GET" "/api/admin/teachers" "200" "" "$ADMIN_TOKEN" | head -n1)
ADMIN_TEACHERS_COUNT=$(echo "$ADMIN_TEACHERS" | jq -r '.count')
if [ "$ADMIN_TEACHERS_COUNT" != "null" ]; then
  log_success "Admin 成功訪問 /api/admin/teachers (數據條數: $ADMIN_TEACHERS_COUNT)"
else
  log_error "Admin 訪問 /api/admin/teachers 失敗"
fi

# 8. 權限測試 - Teacher 訪問 Admin 端點（應被拒絕）
log_test "Teacher 嘗試訪問需要 Admin 權限的端點（應返回 403）"
TEACHER_ADMIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X "GET" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  "$SERVER_URL/api/admin/teachers")
TEACHER_ADMIN_STATUS=$(echo "$TEACHER_ADMIN_RESPONSE" | tail -n1)

if [ "$TEACHER_ADMIN_STATUS" = "403" ]; then
  log_success "Teacher 被正確拒絕訪問 Admin 端點 (HTTP 403)"
else
  log_error "Teacher 訪問 Admin 端點返回 $TEACHER_ADMIN_STATUS，預期 403"
fi

# 9. 獲取學生列表 - Admin
log_test "Admin 訪問學生列表"
ADMIN_STUDENTS=$(test_request "GET" "/api/students" "200" "" "$ADMIN_TOKEN" | head -n1)
ADMIN_STUDENTS_COUNT=$(echo "$ADMIN_STUDENTS" | jq -r '.count')
if [ "$ADMIN_STUDENTS_COUNT" != "null" ]; then
  log_success "Admin 成功獲取學生列表 (數據條數: $ADMIN_STUDENTS_COUNT)"
else
  log_error "Admin 獲取學生列表失敗"
fi

# 10. 獲取班級學生 - Teacher
log_test "Teacher 訪問班級學生"
TEACHER_CLASS_STUDENTS=$(test_request "GET" "/api/students/class/J1A" "200" "" "$TEACHER_TOKEN" | head -n1)
TEACHER_CLASS_COUNT=$(echo "$TEACHER_CLASS_STUDENTS" | jq -r '.count')
if [ "$TEACHER_CLASS_COUNT" != "null" ]; then
  log_success "Teacher 成功獲取班級 J1A 的學生 (數據條數: $TEACHER_CLASS_COUNT)"
else
  log_error "Teacher 獲取班級學生失敗"
fi

# 11. 登出測試 - Admin
log_test "Admin 登出"
LOGOUT_RESPONSE=$(test_request "POST" "/api/auth/logout" "200" "" "$ADMIN_TOKEN" | head -n1)
LOGOUT_SUCCESS=$(echo "$LOGOUT_RESPONSE" | jq -r '.success')

if [ "$LOGOUT_SUCCESS" = "true" ]; then
  log_success "Admin 成功登出"
else
  log_error "Admin 登出失敗"
fi

# 12. 使用已登出的 Token 訪問（應被拒絕）
log_test "使用已登出的 Token 訪問端點（應返回 401）"
EXPIRED_TOKEN_RESPONSE=$(curl -s -w "\n%{http_code}" -X "GET" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$SERVER_URL/api/auth/me")
EXPIRED_TOKEN_STATUS=$(echo "$EXPIRED_TOKEN_RESPONSE" | tail -n1)

if [ "$EXPIRED_TOKEN_STATUS" = "401" ]; then
  log_success "已登出的 Token 被正確拒絕 (HTTP 401)"
else
  log_error "已登出的 Token 返回 $EXPIRED_TOKEN_STATUS，預期 401"
fi

# 13. 無效的 Token
log_test "使用無效 Token 訪問"
INVALID_TOKEN_RESPONSE=$(curl -s -w "\n%{http_code}" -X "GET" \
  -H "Authorization: Bearer invalid_token_12345" \
  -H "Content-Type: application/json" \
  "$SERVER_URL/api/auth/me")
INVALID_TOKEN_STATUS=$(echo "$INVALID_TOKEN_RESPONSE" | tail -n1)

if [ "$INVALID_TOKEN_STATUS" = "401" ]; then
  log_success "無效的 Token 被正確拒絕 (HTTP 401)"
else
  log_error "無效的 Token 返回 $INVALID_TOKEN_STATUS，預期 401"
fi

# 14. 404 Not Found
log_test "訪問不存在的端點"
NOT_FOUND_RESPONSE=$(curl -s -w "\n%{http_code}" -X "GET" \
  -H "Content-Type: application/json" \
  "$SERVER_URL/api/nonexistent")
NOT_FOUND_STATUS=$(echo "$NOT_FOUND_RESPONSE" | tail -n1)

if [ "$NOT_FOUND_STATUS" = "404" ]; then
  log_success "不存在的端點返回 404"
else
  log_error "不存在的端點返回 $NOT_FOUND_STATUS，預期 404"
fi

# ============================================================================
# 測試總結
# ============================================================================

echo -e "\n${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                      測試總結                                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"

echo -e "總測試數: ${YELLOW}$TESTS_TOTAL${NC}"
echo -e "通過: ${GREEN}$TESTS_PASSED${NC}"
echo -e "失敗: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "\n${GREEN}✓ 所有測試通過！${NC}"
  exit 0
else
  echo -e "\n${RED}✗ 有 $TESTS_FAILED 個測試失敗${NC}"
  exit 1
fi
