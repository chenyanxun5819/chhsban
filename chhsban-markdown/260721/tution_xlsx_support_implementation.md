# Tution Portal - XLSX 支持實施總結

## 修改日期
2026-07-21

## 問題背景
1. ApplicationForm.tsx 第583~588行的CSV文件是否只需要學生學號？**是的**
2. 需求：在CSV基礎上添加XLSX格式支持

## 實施內容

### 1️⃣ 確認 CSV 格式
- **當前CSV格式**: 僅需要學生學號，每行一個
- **位置**: [ApplicationForm.tsx](d:\chhsban\tution-portal\src\pages\ApplicationManagement\ApplicationForm.tsx#L349) 第349行的 `accept=".csv,.txt"`
- **提示文本**: "格式: 每行一個學生 ID"
- **解析函數**: `parseCSV()` 在 [validators.ts](d:\chhsban\tution-portal\src\utils\validators.ts#L4-L10)

### 2️⃣ 安裝 XLSX 依賴
```bash
npm install xlsx
```
✅ 已安裝到 tution-portal/package.json

### 3️⃣ 修改 validators.ts
**添加 XLSX 解析函數**:
```typescript
export async function parseXLSX(file: File): Promise<string[]>
```

功能:
- 讀取XLSX文件的第一列作為學生學號
- 支持非連續行的學號
- 異步處理，返回Promise<string[]>
- 錯誤處理：檔案損壞時返回拒絕

### 4️⃣ 修改 ApplicationForm.tsx

#### 導入更新
```typescript
// 新增 parseXLSX
import { parseXLSX } from "@/utils/validators";
```

#### 類型更新
```typescript
// 舊: type StudentInputMethod = "csv" | "manual";
// 新: type StudentInputMethod = "csv" | "xlsx" | "manual";
```

#### 狀態管理更新
```typescript
// 新增: 存儲上傳的文件對象
const [uploadedFile, setUploadedFile] = useState<File | null>(null);
```

#### 文件上傳處理
```typescript
// 舊: handleCsvUpload() - 僅處理CSV
// 新: handleFileUpload() - 同時處理CSV和XLSX

功能:
- CSV: 讀取為文本內容，用於預覽
- XLSX: 存儲文件對象，延遲解析（提交時）
```

#### 驗證邏輯更新
```typescript
if (studentInputMethod === "xlsx" && uploadedFile) {
  studentIds = await parseXLSX(uploadedFile);
}
```

#### UI 更新
- ✅ 新增 "上傳 XLSX 文件" 選項
- ✅ 動態 accept 屬性: `.csv,.txt` 或 `.xlsx`
- ✅ XLSX文件預覽: "✓ 已選擇文件: {filename}"
- ✅ 更新提示文本: "格式: 第一列為學生 ID (一行一個)"

## 技術細節

### XLSX 格式支持
- 📄 支持 `.xlsx` 文件
- 📋 讀取方式：第一列作為學生學號
- ⚠️ 其他列會被忽略（未來可擴展）
- 🔄 異步解析，不阻塞UI

### CSV 格式保持不變
- 📄 支持 `.csv` 和 `.txt` 格式
- 📋 每行一個學生學號
- 🔄 同步解析，支持實時預覽

### 手動輸入保持不變
- ✏️ 逐個輸入學生ID
- 🔍 實時驗證

## 測試建議

### CSV 測試文件
```
10001
10002
10003
```

### XLSX 測試文件
| 學號 | 姓名 | 其他列 |
|-----|------|------|
| 10001 | 張三 | (忽略) |
| 10002 | 李四 | (忽略) |
| 10003 | 王五 | (忽略) |

## 完成清單
- [x] 安裝 xlsx 庫
- [x] 在 validators.ts 中添加 parseXLSX 函數
- [x] 更新 ApplicationForm.tsx 類型定義
- [x] 實現 handleFileUpload 函數
- [x] 更新驗證邏輯支持XLSX
- [x] 更新UI顯示XLSX選項
- [x] 更新提示文本和預覽

## 備註
- XLSX解析為異步操作，避免大文件阻塞UI
- CSV繼續使用同步解析以支持實時預覽
- 錯誤処理已包含在validateStudentList函數中
