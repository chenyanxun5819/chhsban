# Copilot 工作规则 —— OfficeOMR 项目

- 先读 docs/PLAN.md。一次只做一个里程碑；完成后更新 docs/STATUS.md 并停止。
- 不确定就问：写入 docs/OPEN_QUESTIONS.md，不要自行决定。偏离计划必须记录在 docs/DECISIONS.md。
- 终端命令一律使用 PowerShell (pwsh) 语法。
- layout.json 是坐标唯一来源：识别与生成代码中不得硬编码任何毫米/像素坐标。
- 所有阈值放在 core/omr_core/config.default.yaml，不得写死在代码里。
- 配额、保留期、教师人数上限等运营参数一律读取 Firestore `settings/global`，不得写死，修改后无需重新部署。
- 答案纸版面（含姓名线、分数框、回印格）一经 Wes 确认，不得擅自更动；更动须记录在 DECISIONS.md 并取得 Wes 同意。
- omr_core 不得 import firebase / google 任何云端库。
- 不得使用任何付费或按次计费的云端 API（见 PLAN.md 第 9.3 节黑名单）。
- 不得使用 PyMuPDF（AGPL）。新增依赖前先确认授权为 MIT/BSD/Apache 并记录。
- 每个函数需有单元测试；每个修复的失败案例需加入 core/tests/regression/。
- 不得把密钥、服务账号 JSON、.env 提交到 git。
- 建用户、改角色/组织、重设密码等权限操作，只能在 Cloud Functions 内用 Admin SDK 完成，并先校验调用者 role；客户端不得直接写 users/orgs。rules 不得放宽，且必须有 Emulator 测试。
- 保持简单：不要实作 PLAN.md 第 1.3 节列为「不做」的功能（目前只有 2 种角色，不要加第三种）。
- 注释与文件说明用简体中文，变量/函数名用英文。
