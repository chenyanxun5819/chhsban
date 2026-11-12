先回答你的三个疑问，再说检查结果，后者比原本的问题严重。

## 关于 admin.html 和 index.html

- **admin.html**：你说得对，这个文件和旧版 `index.html` 几乎一模一样，是一个完整的入口页，不是什么「管理员专用页」。之前那段跳转代码只适合在确定要弃用 admin.html 时使用。更稳妥的做法是只加一行，在 `js/config.js` 那行下面插入：

```html
  <script src="js/config.js"></script>

  <!-- M7 服务模块（必须在 app.js 之前） -->
  <script src="js/services/m7-service.js"></script>
```

  其余保持不动。

- **index.html**：它没有问题。它已经加载了 `m7-service.js`，还多了模块检查。我之前给的两条 PowerShell 命令，index.html 会同时出现在两个清单里，那是正常的。只有 admin.html 出现在第一个清单、不在第二个清单，才算有问题。

## 「只开放给管理员」其实来自 app.js 的分流

- 你的 `firestore.rules` 和 `callables_m7.py` 都没有限制只有管理员能用，教师本来就能进。
- 管理员反而看不到 M7，因为 `app.js` 把 super_admin 导向 `AdminPage`，而 M7 界面只在 `teacher.js` 里。
- 如果要让管理员也能测试 M7，可以在 `app.js` 里加一个入口：

```javascript
} else if (authState.isSuperAdmin) {
  if (location.hash === '#teacher') this.showTeacherPage();
  else this.showAdminPage();
}
```

  然后在管理页放一个 `<a href="#teacher">教师视图</a>`，再加 `window.addEventListener('hashchange', ...)` 重新路由。`admin.js` 我没看到，`TeacherPage` 对没有 orgId 的账号能不能正常渲染也没测过，请当作草稿。

## 检查结果：callables_m7.py 有两个大问题

你的搜索结果只命中注释，说明这个文件里没有任何角色或身份检查。

1. **没有任何身份验证。**
   - 每个函数都没验证调用者是谁，也没检查 teacher 是否 active。
   - 前端传来的 `userId` 被直接信任。
   - 任何人只要拿到 URL 就能读写任意 job 的答案，这和 PLAN.md 的「所有函数先验身份」相矛盾。

2. **函数类型不对，前端根本调不通。**
   - 5 个函数都写成了 `@functions_framework.cloud_event`（事件触发型），前端的 `firebase.functions()` 调用的是 callable，两者不兼容。
   - 参数也对不上：后端要 `jobId`，前端传的是 `(examName, template, answers)`。
   - `uploadAnswerKeyByImage` 的识别还是占位空数组，校验会失败。
   - 这些函数也没有在 `main.py` 里导出（至少我没看到），需要确认。

所以即使修好登录和 `M7Service`，按钮点下去大概率还是失败。

建议改成 `firebase_functions` 的 callable，开头统一做检查，例如：

```python
from firebase_functions import https_fn

def require_user(req: https_fn.CallableRequest):
    if req.auth is None:
        raise https_fn.HttpsError(https_fn.FunctionsErrorCode.UNAUTHENTICATED, "请先登录")
    role = req.auth.token.get("role")
    if role not in ("teacher", "super_admin"):
        raise https_fn.HttpsError(https_fn.FunctionsErrorCode.PERMISSION_DENIED, "无权限")
    if role == "teacher":
        email = (req.auth.token.get("email") or "").lower()
        snap = get_db().collection("allowedUsers").document(email).get()
        if not snap.exists or not snap.to_dict().get("active"):
            raise https_fn.HttpsError(https_fn.FunctionsErrorCode.PERMISSION_DENIED, "账号已停用")
    return req.auth.uid, role, req.auth.token.get("orgId")

@https_fn.on_call(region="us-central1")
def getAnswerKey(req: https_fn.CallableRequest):
    uid, role, org_id = require_user(req)
    job = get_db().collection("jobs").document(req.data["jobId"]).get()
    if not job.exists or (role != "super_admin" and job.to_dict().get("uid") != uid):
        raise https_fn.HttpsError(https_fn.FunctionsErrorCode.NOT_FOUND, "找不到")
    ...
```

`uploadAnswerKeyManually` 等函数同理，`uploadedBy` 改用 `uid`，不要信任前端传来的值。`cleanupJobStudentData` 是 HTTP 函数，Cloud Scheduler 调用时需要用服务账号 OIDC 验证。

## firestore.rules 有一个漏洞

```javascript
allow update: if isTeacherActive()
  && !('answerKey' in request.resource.data.diff(resource.data).affectedKeys());
allow create, write: if false;
```

Firestore 的多条 `allow` 是「或」的关系，后面的 `write: if false` 不会覆盖前面的 `update`。结果是：任何 active 教师都能直接从浏览器修改**任何人**的 job，只要不碰 `answerKey`，包括改 `uid`、`result`、`frozen` 之类的字段。

因为所有写入都走 Cloud Functions（Admin SDK 会绕过 rules），前端根本不需要 update 权限。直接改成：

```javascript
match /jobs/{jobId} {
  allow read: if isTeacherActive() && resource.data.uid == request.auth.uid;
  allow create, update, delete: if false;
}
```

这样前端连 answerKey 都改不了，保护比原来的更强。

## 建议的处理顺序

1. 先改 admin.html（加一行）和 firestore.rules，这两处最小且安全。
2. 在 Firebase Console 加上授权域名 `omr.mybazaar.my`。
3. 之后我可以帮你把 `callables_m7.py` 重写成 callable 版本，请一并上传 `main.py` 和 `js/services/m7-service.js`，这样前后端的参数能对齐。