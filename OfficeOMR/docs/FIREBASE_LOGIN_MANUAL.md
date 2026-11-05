# 🔐 Firebase 登入步驟 (手動)

**當前問題**: Firebase 帳戶權限不足

**解決方案**: 用正確的帳戶登入

---

## 步驟 1: 在 PowerShell 中執行

打開 PowerShell，進入專案目錄：

```powershell
cd D:\chhsban\OfficeOMR
firebase logout
firebase login
```

---

## 步驟 2: 在瀏覽器中授權

1. `firebase login` 命令會打開瀏覽器
2. **選擇帳戶**: **weschen@mybazaar.my** (這是擁有 officeomr-fe542 專案的帳戶)
3. 點擊 "授權" 或 "允許"
4. 可能會被問 "Enable Gemini in Firebase features?" → 輸入 `n` 或 `Y` (你的選擇)
5. 完成後，瀏覽器會顯示成功訊息

---

## 步驟 3: 驗證登入成功

在 PowerShell 中運行：

```powershell
firebase projects:list
```

**預期輸出**: 應該看到 officeomr-fe542 專案

```
✓ officeomr-fe542 officeomr-fe542
```

---

## 步驟 4: 驗證 gcloud 配置

```powershell
gcloud config get-value project
gcloud auth list
```

**預期**:
- `gcloud config get-value project` 應該返回: `officeomr-fe542`
- `gcloud auth list` 應該顯示 weschen@mybazaar.my 為活躍帳戶

---

## 問題排查

### 如果登入後仍看到權限錯誤

運行：
```powershell
gcloud projects get-iam-policy officeomr-fe542 --flatten="bindings[].members" --format="table(bindings.role)"
```

檢查 weschen@mybazaar.my 是否有以下角色之一：
- `roles/editor`
- `roles/compute.admin`
- `roles/iam.serviceAccountUser`

---

### 如果瀏覽器沒有打開

**手動授權方式**:

1. 打開終端輸出中的 URL (通常是 `https://...`)
2. 複製授權碼
3. 貼回 PowerShell 中

---

## 完成後

完成登入後，回到這裡，我們繼續進行：

✅ 部署 Cloud Function  
✅ 配置前端  
✅ 測試系統

---

**時間**: 約 2-3 分鐘

完成後，在這裡告訴我 "登入完成" 👈
