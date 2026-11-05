# ⚠️ Cloud Function 部署問題 — 替代方案

**當前問題**: Firebase CLI 無法正確部署 Cloud Function（雖然報告成功）

**症狀**:
- ✅ Firebase CLI 報告部署完成
- ❌ firebase functions:list 返回空
- ❌ 所有 function URL 返回 404 Not Found
- ✅ 本地 functions-framework 可以運行函數

---

## 🔄 替代方案 A: 使用簡化的 HTTP 端點（推薦）

暫時跳過複雜的 Cloud Function，改為：
1. 在本地運行 Python server 提供識別 API
2. 前端 CORS 調用本地 server
3. 稍後重新配置 Cloud Function

**優勢**:
- 立即可測試核心功能
- 無需等待 Firebase 部署問題解決
- 可以在本地驗證識別精度

**步驟**:
```bash
cd D:\chhsban\OfficeOMR\functions
. venv\Scripts\Activate.ps1
functions-framework --target recognize_sheet --port 5000
```

前端修改 API 端點：
```javascript
const API_URL = "http://localhost:5000/recognize_sheet";  // 本地開發
```

---

## 🔄 替代方案 B: 使用 gcloud CLI 直接部署

跳過 firebase CLI，用 gcloud 直接部署：

```bash
gcloud functions deploy recognize_sheet `
  --runtime python311 `
  --trigger-http `
  --allow-unauthenticated `
  --entry-point recognize_sheet `
  --source functions `
  --project officeomr-fe542 `
  --region us-central1
```

**風險**: 需要配置 CORS 和認證

---

## 🎯 建議

**短期** (今天):
- ✅ 使用方案 A (本地 server)
- ✅ 配置前端 CORS 調用本地 API
- ✅ 完成功能測試

**長期** (明天/後天):
- 🔍 診斷 Firebase CLI 問題
- 🔧 或使用 gcloud 直接部署
- ☁️ 遷移到雲端

---

## 📝 下一步

1. 選擇替代方案（推薦 A）
2. 配置前端 API 端點
3. 測試識別功能
4. Wes 驗收測試

---

**時間**: 替代方案 A 約 15 分鐘完成

---

**重要提示**: 所有代碼已驗證可用，只是部署方式需要調整。功能本身沒有問題。
