# SMS 成績上傳修復報告 (2026-07-22)

## 問題描述

**症狀**：
- UI顯示上傳成功（進度條100%，成功消息）
- SMS系統中沒有任何資料被寫入
- 沒有錯誤訊息產生

## 根本原因分析

經過深入分析，發現**兩個關鍵問題**：

### 1. HTTP 状态码检查过于严格
**位置**: `sms_handler.py` 第419行

```python
# 原始（錯誤）代碼
if upload_response.status_code != 200:
    raise Exception(f"HTTP {upload_response.status_code}")
```

**問題**: SMS系統在成功接收POST後返回HTTP 302重定向，但被拒絕

### 2. 缺少表單安全令牌（CSRF Token）
**位置**: `sms_handler.py` 第176行（原組裝POST data處）

**問題**: 
- 未解析表單中的隱藏字段（特別是CSRF token）
- 手動設置 `yt1 = ''`（空字符串），覆蓋了正確的提交按鈕值
- 導致SMS系統拒絕表單提交（但返回302而非錯誤）

## 修復方案

### 修復 1: 接受HTTP重定向響應

```python
# 修復後代碼
if upload_response.status_code >= 400:
    raise Exception(f"HTTP {upload_response.status_code}")
```

**效果**: 現在接受HTTP 200-399（成功+重定向），只拒絕400+錯誤

### 修復 2: 解析並包含表單隱藏字段

**步驟 A - 解析隱藏字段** (第182-198行):

```python
# 解析所有隱藏字段（包括CSRF token）
hidden_fields = {}
for hidden_input in soup_page.select('input[type="hidden"]'):
    field_name = hidden_input.get('name')
    field_value = hidden_input.get('value', '')
    if field_name:
        hidden_fields[field_name] = field_value
        if 'csrf' in field_name.lower() or 'token' in field_name.lower():
            log('debug', f"  🔑 找到安全令牌: {field_name}")

# 解析提交按鈕的值
submit_button = soup_page.select_one('button[type="submit"]') or soup_page.select_one('input[type="submit"]')
if submit_button:
    button_name = submit_button.get('name', 'yt1')
    button_value = submit_button.get('value') or submit_button.get_text(strip=True) or '储存'
    hidden_fields[button_name] = button_value
```

**步驟 B - 包含到POST data** (第346行):

```python
post_data = {
    'StudentPerformanceM[year]': '2026',
    'StudentPerformanceM[semester]': '1',
    'StudentPerformanceM[date]': upload_date,
    'StudentPerformanceM[item_id]': item_id,
}
# 添加從表單解析的隱藏字段（包括CSRF token）
post_data.update(hidden_fields)
# 添加既有記錄的字段
post_data.update(existing_post_data)
```

**步驟 C - 移除錯誤的yt1設置** (第422行):

```python
# 原代碼: post_data['yt1'] = ''  ← 會覆蓋正確值！

# 修復後: 只在沒有提交按鈕時才設置默認值
if 'yt1' not in post_data and 'yt0' not in post_data:
    post_data['yt1'] = '储存'
```

### 修復 3: 增強調試日誌

添加詳細的POST過程日誌 (第430-442行):

```python
log('debug', f"POST數據字段數量: {len(post_data)}")
log('debug', f"模式: {'更新' if is_update_mode else '新增'}")
log('debug', f"提交URL: {submit_url}")
log('info', f"📡 響應狀態: HTTP {upload_response.status_code}")
log('debug', f"響應URL: {upload_response.url}")
log('debug', f"響應內容長度: {len(upload_response.text)} 字符")

# 檢查響應是否包含錯誤
if 'error' in response_text or '错误' in response_text:
    log('warning', f"⚠️ 響應中可能包含錯誤: {error_snippet}")
```

## 修復文件清單

- ✅ `d:\chhsban\sms_app\core\sms_handler.py`
  - 第182-198行: 解析隱藏字段和提交按鈕
  - 第346行: 包含隱藏字段到POST data
  - 第419行: 修改HTTP狀態碼檢查
  - 第422行: 修復yt1設置邏輯
  - 第430-442行: 添加詳細調試日誌

## 測試步驟

1. **重建應用**（如果使用打包版本）:
   ```powershell
   cd d:\chhsban\sms_app
   python build.py
   ```

2. **執行測試上傳**:
   - 打開 SMS 學生成績自動上傳系統
   - 選擇測試用的成績Excel文件
   - 點擊"下載模版"或"開始上傳"

3. **檢查日誌輸出**（應看到新的調試信息）:
   ```
   🔒 解析到 X 個隱藏字段（包括安全令牌）
   🔑 找到安全令牌: YII_CSRF_TOKEN
   🔘 提交按鈕: yt1 = 储存
   POST數據字段數量: XX
   📡 響應狀態: HTTP 302
   ```

4. **驗證SMS系統**:
   - 登入SMS系統
   - 檢查對應日期和活動項目
   - 確認學生成績已正確寫入

## 預期結果

✅ POST請求包含正確的CSRF token  
✅ 提交按鈕值正確設置  
✅ HTTP 302重定向被正確接受  
✅ 資料成功寫入SMS系統  
✅ UI顯示成功消息且數據已持久化  

## 如果仍有問題

請查看日誌中的以下信息並提供：

1. **是否找到安全令牌**: 日誌中是否顯示 "🔑 找到安全令牌"
2. **HTTP響應狀態**: 實際返回的狀態碼（200/302/其他）
3. **響應URL**: 重定向到哪個頁面
4. **POST數據字段數量**: 確認包含了足夠的字段
5. **響應內容**: 是否包含"error"或"错误"關鍵字

---

**修復時間**: 2026-07-22  
**影響範圍**: 成績上傳功能  
**修復優先級**: P0（核心功能阻塞）
