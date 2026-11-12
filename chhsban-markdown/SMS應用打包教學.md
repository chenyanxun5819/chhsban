# SMS 應用打包教學

## 概述
本文檔說明如何從原始 Python 程式碼打包出 Windows 可執行檔 (`.exe`)。

---

## 前置需求

### 1. 安裝 Python
- **版本**: Python 3.13 以上（本專案使用 3.13.2）
- **安裝位置**: `C:\Users\<用戶名>\AppData\Local\Programs\Python\Python313\`
- 下載位置: [python.org](https://www.python.org/)

### 2. 建立虛擬環境
```powershell
cd D:\chhsban\sms_app
python -m venv .venv
```

### 3. 啟動虛擬環境
```powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1

# Windows CMD
.\.venv\Scripts\activate.bat
```

### 4. 安裝專案依賴
```powershell
pip install -r requirements.txt
```

所需套件包含：
- PyQt6：GUI 框架
- openpyxl：Excel 讀寫
- requests：HTTP 請求
- cryptography：加密凭證
- Pillow：圖片處理（用於 icon）
- PyInstaller：打包工具

---

## 打包步驟

### 方法 1: 使用打包腳本（推薦）

#### 步驟 1: 進入專案目錄
```powershell
cd D:\chhsban\sms_app
```

#### 步驟 2: 啟動虛擬環境（如果尚未啟動）
```powershell
.\.venv\Scripts\Activate.ps1
```

#### 步驟 3: 執行打包腳本
```powershell
python build.py
```

腳本會自動執行以下操作：
1. 檢查 PyInstaller 安裝
2. 清理舊的 `build/` 和 `dist/` 目錄
3. 執行 PyInstaller
4. 驗證打包結果

#### 步驟 4: 檢查輸出
打包完成後，可執行檔位置：
```
D:\chhsban\sms_app\dist\SMS成绩上传工具 V3.0.exe
```

---

### 方法 2: 手動使用 PyInstaller

#### 步驟 1: 安裝 PyInstaller（如果尚未安裝）
```powershell
pip install PyInstaller
```

#### 步驟 2: 執行 PyInstaller
```powershell
python -m PyInstaller SMS成绩上传工具.spec --distpath D:\chhsban\sms_app\dist --workpath D:\chhsban\sms_app\build
```

說明：
- `SMS成绩上传工具.spec`: 打包配置檔，包含入口點、圖示、隱藏模組等設定
- `--distpath`: 輸出目錄
- `--workpath`: 臨時工作目錄

---

## 打包配置檔 (`.spec`)

檔案位置: `D:\chhsban\sms_app\SMS成绩上传工具.spec`

### 關鍵設定

#### 1. 入口點
```python
a = Analysis(
    ['main_app.py'],  # 主程式檔案
    ...
)
```

#### 2. 隱藏模組
```python
'hiddenimports': [
    'core.config_manager',
    'core.academic_excel',
    'ui.pages.settings_page',
    'ui.pages.project_input_page',
    'ui.pages.score_upload_page',
    'ui.pages.table_export_page',
    'ui.pages.merit_mapping_page',
    'ui.pages.student_list_download_page',
    'ui.widgets.console_output',
]
```

#### 3. 資料檔案
```python
datas=[
    ('assets/icon.ico', 'assets'),
]
```

#### 4. 排除模組（減小檔案大小）
```python
'excludedimports': [
    'matplotlib',
    'pandas',
    'numpy',
]
```

#### 5. 可執行檔設定
```python
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='SMS成绩上传工具 V3.0',  # exe 名稱
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # True=顯示黑色 console 視窗；False=無視窗
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['assets\\icon.ico'],  # 應用圖示
)
```

---

## 常見問題 & 除錯

### 1. 缺少模組錯誤
**症狀**: `ModuleNotFoundError: No module named 'xxx'`

**解決方案**:
```powershell
# 檢查模組是否安裝
pip list | grep xxx

# 安裝缺少的模組
pip install xxx

# 如果是內部模組，加入 .spec 的 hiddenimports
```

### 2. PyInstaller 打包警告
**症狀**: 打包時出現 `warn-SMS成绩上传工具.txt`

**檢查方法**:
```powershell
cat D:\chhsban\sms_app\build\SMS成绩上传工具\warn-SMS成绩上传工具.txt
```

通常可以安全忽略，但若出現 `Module not found` 則需處理。

### 3. 執行檔啟動緩慢
**原因**: PyInstaller 首次啟動需要解包

**解決方案**:
- 第一次執行時會較慢（需要解包到臨時目錄）
- 後續執行會快一些
- 可使用 UPX 壓縮減小檔案大小

### 4. 無法找到設定檔
**症狀**: 執行時提示「無法讀取凭证」

**原因**: 設定檔儲存在使用者主目錄
```
C:\Users\<用戶名>\.sms_app\config.json
```

**解決方案**:
- 首次執行應用會自動建立
- 若手動刪除，再次執行時會重新生成

---

## 版本控制

### 版本號設定
檔案位置: `D:\chhsban\sms_app\app_version.py`

```python
APP_VERSION = "V3.0"
APP_BUILD_DATE = "2026-10-14"
APP_WINDOW_TITLE = "SMS 学生学术登记上传工具 - V3.0"
```

### 修改版本號
1. 編輯 `app_version.py`
2. 修改 `.spec` 內的 exe 名稱
3. 重新打包

---

## 打包結果驗證

### 檢查清單
- [ ] `.exe` 檔案已生成在 `dist/` 目錄
- [ ] 檔案大小約 39-40 MB
- [ ] 無缺少模組警告（或警告為已知可忽略）
- [ ] 雙擊 `.exe` 能正常啟動應用
- [ ] 首次執行建立 `~/.sms_app/` 設定目錄

### 執行測試
```powershell
# 直接執行 exe
D:\chhsban\sms_app\dist\SMS成绩上传工具 V3.0.exe

# 或從 PowerShell 執行並捕捉錯誤
& "D:\chhsban\sms_app\dist\SMS成绩上传工具 V3.0.exe"
```

---

## 分發與部署

### 分發單個 `.exe`
1. 複製 `dist\SMS成绩上传工具 V3.0.exe` 
2. 傳送給用戶
3. 用戶直接雙擊執行，無需額外安裝

### 卸載
- 直接刪除 `.exe` 檔案即可
- 如需保留使用者資料，保留 `~/.sms_app/` 目錄

### 保留配置
若用戶已配置凭証與記功規則，升級新版本時：
1. 保留舊版本的 `~/.sms_app/config.json`
2. 用新 `.exe` 替換舊版本
3. 執行新版本，設定會自動遷移

---

## 進階設定

### 減小檔案大小

#### 方法 1: 使用 UPX 壓縮
```powershell
# 安裝 UPX
# 下載自: https://upx.github.io/

# 在 .spec 中啟用
upx=True
```

#### 方法 2: 排除不必要的套件
編輯 `.spec` 的 `excludedimports`:
```python
'excludedimports': [
    'matplotlib',
    'numpy',
    'pandas',
    'scipy',
]
```

### 增加詳細日誌
打包時添加 debug 選項：
```python
exe = EXE(
    ...
    debug=True,  # 啟用除錯信息
    console=True,  # 顯示 console 視窗
)
```

---

## 自動化打包 (CI/CD)

### GitHub Actions 範例
```yaml
name: Build SMS App

on: [push, pull_request]

jobs:
  build:
    runs-on: windows-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-python@v4
        with:
          python-version: '3.13'
      
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
      
      - name: Build with PyInstaller
        run: python build.py
      
      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: SMS成绩上传工具
          path: dist/SMS成绩上传工具 V3.0.exe
```

---

## 相關檔案

| 檔案 | 位置 | 說明 |
|------|------|------|
| 主程式 | `main_app.py` | 應用入口點 |
| 打包配置 | `SMS成绩上传工具.spec` | PyInstaller 配置 |
| 打包腳本 | `build.py` | 自動化打包工具 |
| 依賴清單 | `requirements.txt` | 所有 Python 依賴 |
| 版本信息 | `app_version.py` | 版本號與標題 |
| 應用圖示 | `assets/icon.ico` | exe 圖示 |

---

## 技術支持

若打包過程遇到問題，請檢查：

1. **Python 版本**
   ```powershell
   python --version
   ```

2. **虛擬環境啟動狀態**
   ```powershell
   # 虛擬環境啟用時，命令提示前會顯示 (.venv)
   ```

3. **套件完整性**
   ```powershell
   pip check
   ```

4. **PyInstaller 版本**
   ```powershell
   PyInstaller --version
   ```

---

**最後更新**: 2026-10-14
**適用版本**: SMS 成績上傳工具 V3.0
