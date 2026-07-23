# Tution Portal 權限系統實施報告

**日期**: 2026-07-15  
**項目**: chhsban-tution-portal  
**狀態**: ✅ 完成

---

## 需求分析

根據用戶要求，對 tution-portal 進行以下權限審核修改：

1. **進入首頁時權限審核**
   - 只有 super_admin 才能看到"審批"、"管理"兩個菜單選項

2. **課程列表權限控制**
   - super_admin 和 admin：查看所有人的課程申請
   - 其他人：只能查看自己的課程申請

---

## 實施方案

### 1️⃣ 導航菜單權限 (Layout.tsx)

```typescript
// ✅ 修改前：所有人都能看到"審批"
const navItems: NavItem[] = [
  { id: "home", label: "首頁", path: "/", icon: "🏠" },
  { id: "apps", label: "申請", path: "/applications", icon: "📋" },
  { id: "classes", label: "課程", path: "/classes", icon: "📚" },
  { id: "admin", label: "審批", path: "/admin", icon: "⚙️" },  // ❌ 移除
];

// ✅ 修改後：條件式顯示
const navItems: NavItem[] = [
  { id: "home", label: "首頁", path: "/", icon: "🏠" },
  { id: "apps", label: "申請", path: "/applications", icon: "📋" },
  { id: "classes", label: "課程", path: "/classes", icon: "📚" },
];

// 只有 super_admin 可以看到
{user?.permission === "super_admin" && (
  <>
    <li>
      <button className="nav-item" onClick={() => handleNavClick("/admin")}>
        <span className="nav-item__icon">⚙️</span>
        <span className="nav-item__label">審批</span>
      </button>
    </li>
    <li>
      <button className="nav-item" onClick={() => handleNavClick("/admin")}>
        <span className="nav-item__icon">🔐</span>
        <span className="nav-item__label">管理</span>
      </button>
    </li>
  </>
)}
```

### 2️⃣ 申請列表權限 (ApplicationList.tsx)

```typescript
const fetchApplications = async () => {
  let url = "/v1/classes";
  
  // ✅ 根據權限決定查詢範圍
  if (user?.permission === "super_admin" || user?.permission === "admin") {
    // super_admin 和 admin 看所有申請
    url = "/v1/classes";
  } else {
    // 其他人只看自己的申請
    url = `/v1/classes?teacher=${user?.teacherId}`;
  }
  
  const response = await apiClient.get(url);
  // ...
};
```

### 3️⃣ 管理面板保護 (AdminPanel.tsx)

```typescript
export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ✅ 權限檢查：只有 super_admin 才能訪問
  useEffect(() => {
    if (user && user.permission !== "super_admin") {
      navigate("/", { replace: true });  // 重定向到首頁
    }
  }, [user, navigate]);

  // 只有 super_admin 會執行此邏輯
  useEffect(() => {
    if (user?.permission !== "super_admin") {
      return;
    }
    // 載入管理員數據
  }, [user?.permission]);
  
  // ...
};
```

### 4️⃣ 課程列表實現 (App.tsx ClassList)

```typescript
const ClassList = () => {
  const { user } = useAuth();

  useEffect(() => {
    let url = "/v1/classes";
    
    // ✅ super_admin/admin 看所有課程
    if (user?.permission !== "super_admin" && user?.permission !== "admin") {
      // 其他人只看自己的課程
      url = `/v1/classes?teacher=${user?.teacherId}`;
    }

    // 只顯示已批准或進行中的課程
    const approvedClasses = classes.filter(
      (c) => c.approval_status === "approved" || c.approval_status === "active"
    );
  }, [user?.teacherId, user?.permission]);
  
  // ...
};
```

---

## 權限等級系統

在 `AuthContext.tsx` 中已定義的權限級別：

| 級別 | 權限名稱 | 權重 | 權利 |
|-----|--------|------|------|
| 1 | `teacher` | 1 | 查看自己的申請和課程 |
| 2 | `viewer` | 2 | 查看權限 |
| 3 | `admin` | 3 | 查看所有申請/課程，管理權限 |
| 4 | `super_admin` | 4 | 完全管理權限（審批、管理） |

---

## 修改文件清單

| 文件 | 修改 | 影響範圍 |
|-----|------|--------|
| `src/components/common/Layout.tsx` | 菜單條件判斷 | 導航菜單顯示 |
| `src/pages/ApplicationManagement/ApplicationList.tsx` | 查詢邏輯 | 申請列表 |
| `src/pages/AdminPanel/AdminPanel.tsx` | 權限檢查 + 重定向 | 管理面板訪問 |
| `src/App.tsx` | 實現 ClassList 組件 | 課程列表功能 |

---

## 測試檢查清單

- [ ] **super_admin 帳號**
  - ✅ 可見"審批"和"管理"菜單
  - ✅ 申請列表顯示所有人的申請
  - ✅ 課程列表顯示所有人的課程
  - ✅ 可訪問管理面板

- [ ] **admin 帳號**
  - ✅ 不可見"審批"和"管理"菜單
  - ✅ 申請列表顯示所有人的申請
  - ✅ 課程列表顯示所有人的課程
  - ❌ 不可訪問管理面板（應被重定向）

- [ ] **teacher/viewer 帳號**
  - ✅ 不可見"審批"和"管理"菜單
  - ✅ 申請列表只顯示自己的申請
  - ✅ 課程列表只顯示自己的課程
  - ❌ 不可訪問管理面板（應被重定向）

---

## 實施依賴

- ✅ 後端 API 需支持 `GET /v1/classes` 查詢所有課程
- ✅ 後端 API 需支持 `GET /v1/classes?teacher={id}` 查詢個人課程
- ✅ teachers_KV 中應包含 `permission` 字段
- ✅ 認證服務需正確解析並傳遞 permission

---

## 相關資源

- **teachers_KV 示例**:
  ```json
  {
    "teacher_id": "S295",
    "name_cn": "区慧莲",
    "department": "辅导  Counseling",
    "email": "schhs346@chhsban.edu.my",
    "permission": "teacher"
  }
  ```

- **權限類型定義** (`src/types/index.ts`):
  ```typescript
  export type Permission = "teacher" | "viewer" | "admin" | "super_admin";
  ```

---

## 後續建議

1. 後端 API 應驗證用戶權限，防止被逆向工程繞過
2. 考慮添加操作日誌，記錄 super_admin 和 admin 的查詢
3. 可根據實際需求細化權限（如某些 admin 只能管理特定部門）
4. 建議定期審核用戶權限配置

---

**完成時間**: 2026-07-15 15:35  
**開發者**: GitHub Copilot  
**狀態**: ✅ 就緒部署
