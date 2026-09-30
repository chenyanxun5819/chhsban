/**
 * Cloudflare Worker: SMS 学生数据自动同步到 KV（students_KV，binding 名 STUDENT_KV）
 * 流程：登录 SMS → 翻页抓全校学生名单 → 合并 Excel 住宿数据 → 与上一版比对算出学生状态 → 写入 KV
 *
 * 重要发现：SMS 的 ajax=student-grid 接口的 class_id 参数并不会真正过滤数据，
 * 不论传哪个 class_id，回传的都是"分页后的全校学生名单"（每页 1000 笔），
 * 学生实际所属班级要看回传数据里的 data-class_name。
 * 因此不需要对每个班级各发一次请求，只要翻完全校的分页（约 3 页）即可，
 * 一次 Worker 调用总共约 5-8 个 fetch，远低于 Workers 免费版 50 个子请求的上限。
 *
 * 触发方式：
 *   - 定时：wrangler.toml 的 cron（每周一、三凌晨，马来西亚时间）
 *   - 手动：行政管理站 → tution-system Worker → Service Binding 调用 SyncService.runSync()
 *     （RPC 只能经由 Service Binding 调用，不对外公开；公开网址不再提供触发同步）
 *
 * 学生状态（写在 students_by_no 每位学生身上，离校学生永久保留、不删除）：
 *   status: "active" | "left"
 *   left_reason: "leave_class"（SMS 移到 *_LEAVE 班）| "removed"（从 SMS 名单消失）
 *   class_history / boarding_history：每次调班、住宿代码变动追加一笔 { from, to, date }
 *
 * 每次同步的 KV 用量：读 2（excel_gender_boarding_map、上一版 students_by_no）+ 1（sync_status），
 * 写 4（students_by_no、classes、metadata、sync_status）。
 *
 * 必需的密钥（用 `wrangler secret put` 设置，不要写在代码或 wrangler.toml 里）：
 *   wrangler secret put SMS_USER
 *   wrangler secret put SMS_PASS
 *
 * 前置条件：KV 中需已存在 `excel_gender_boarding_map`
 * （由 sms_sync/downloader/prepare_excel_for_worker.py 上传；住宿名单有变动时要重跑）。
 */

import { WorkerEntrypoint } from 'cloudflare:workers';

const MAX_PAGES = 10; // 全校学生分页安全上限（实测约 3 页 = 2893 人/1000 每页），留足成长空间
const MAX_DROP_RATIO = 0.03; // 本次抓到的人数比上次在 SMS 上的人数少超过 3% 就视为异常、不写入
const MAX_RUNS_KEPT = 20; // sync_status 保留最近几次同步记录
const LEAVE_CLASS_PATTERN = /_LEAVE$/i; // SMS 把离校学生移到 S2_LEAVE、J2_LEAVE 这类班

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS 设置
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // 处理 preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 查询学生接口：/api/student/:student_no
    if (pathname.startsWith('/api/student/')) {
      if (request.method === 'GET') {
        const studentNo = decodeURIComponent(pathname.replace('/api/student/', ''));
        return await handleGetStudent(env, studentNo, corsHeaders);
      }
    }

    // 查询教师接口：/api/teacher/:teacher_name
    if (pathname.startsWith('/api/teacher/')) {
      if (request.method === 'GET') {
        const teacherName = decodeURIComponent(pathname.replace('/api/teacher/', ''));
        return await handleGetTeacher(env, teacherName, corsHeaders);
      }
    }

    // 同步状态（只回传摘要，不含日志）；手动触发改由行政管理站经 Service Binding 调用
    if (request.method === 'GET' && pathname === '/') {
      return await handleStatus(env, corsHeaders);
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runSync(env, { trigger: 'cron' }));
  },
};

/**
 * 供 tution-system Worker 经 Service Binding（entrypoint = "SyncService"）调用的 RPC 入口
 */
export class SyncService extends WorkerEntrypoint {
  /**
   * @param {{ triggered_by?: string, force?: boolean }} options
   *   force：跳过「人数骤降」保险（只在管理员确认 SMS 名单无误后使用）
   */
  async runSync(options = {}) {
    return runSync(this.env, {
      trigger: 'manual',
      triggered_by: options.triggered_by || '',
      force: Boolean(options.force),
    });
  }
}

/**
 * 查询单个学生信息
 */
async function handleGetStudent(env, studentNo, corsHeaders = {}) {
  try {
    const studentsData = await env.STUDENT_KV.get('students_by_no', 'json');

    if (!studentsData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '暂无学生数据，请稍后再试'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders }
        }
      );
    }

    const student = studentsData[studentNo];

    if (!student) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `未找到学号为 "${studentNo}" 的学生`
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: student
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `查询出错: ${error.message}`
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders }
      }
    );
  }
}

/**
 * 查询单个教师信息
 */
async function handleGetTeacher(env, teacherName, corsHeaders = {}) {
  try {
    const teachersData = await env.TEACHER_KV.get('teachers_by_name', 'json');

    if (!teachersData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '暂无教师数据，请稍后再试'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders }
        }
      );
    }

    const teacher = teachersData[teacherName];

    if (!teacher) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `未找到姓名为 "${teacherName}" 的教师`
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: teacher
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `查询出错: ${error.message}`
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders }
      }
    );
  }
}

async function handleStatus(env, corsHeaders = {}) {
  const metadata = await env.STUDENT_KV.get('metadata', 'json');

  return new Response(JSON.stringify({ metadata: metadata || null }, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders }
  });
}

/**
 * 完整同步流程：登录 → 抓全校学生 → 合并 Excel → 与上一版比对 → 写入 KV。
 * 不论成功、失败或被保险挡下，都会在 sync_status 追加一笔记录，并回传这笔记录。
 */
async function runSync(env, { trigger, triggered_by = '', force = false }) {
  const startTime = Date.now();
  const log = [];
  const run = {
    started_at: new Date(startTime).toISOString(),
    finished_at: null,
    duration_ms: 0,
    trigger,
    triggered_by,
    forced: force,
    result: 'failed', // 'success' | 'failed' | 'blocked'
    error: null,
    total_fetched: 0,
    active_students: 0,
    left_students: 0,
    total_classes: 0,
    changes: emptyChanges(),
    log,
  };

  try {
    log.push('🚀 开始 SMS 数据同步流程...');

    log.push('\n1️⃣ 登录 SMS 系统...');
    const cookies = await loginSMS(env, log);

    log.push('\n2️⃣ 抓取全校学生名单（翻页）...');
    const fetched = await fetchAllStudents(env, cookies, log);
    if (fetched.length === 0) {
      throw new Error('未抓到任何学生数据，可能登录失败或页面结构变更');
    }
    run.total_fetched = fetched.length;
    log.push(`   ✅ 共抓到 ${fetched.length} 名学生（已去重）`);

    log.push('\n3️⃣ 合并 Excel 性别/宿舍数据...');
    const excelData = await loadExcelMap(env, log);

    log.push('\n4️⃣ 与上一版比对学生状态...');
    const previous = (await env.STUDENT_KV.get('students_by_no', 'json')) || {};
    const prevInSms = Object.values(previous).filter(s => s.left_reason !== 'removed').length;
    log.push(`   上一版: ${Object.keys(previous).length} 笔（上次仍在 SMS 上 ${prevInSms} 人）`);

    if (!force && prevInSms > 0 && fetched.length < prevInSms * (1 - MAX_DROP_RATIO)) {
      run.result = 'blocked';
      run.error = `本次只抓到 ${fetched.length} 人，比上次 ${prevInSms} 人少了 ${prevInSms - fetched.length} 人`
        + `（超过 ${MAX_DROP_RATIO * 100}%），可能是 SMS 暂时异常，已停止写入。`
        + '请确认 SMS 名单无误后，再用「强制同步」执行。';
      log.push(`\n⛔ ${run.error}`);
      return await finishRun(env, run, startTime);
    }

    const today = localDateString();
    const { studentsByNo, changes } = computeStudentStatuses(previous, fetched, excelData, today);
    run.changes = changes;
    log.push(`   新增 ${changes.joined.length}、离校 ${changes.left.length}、复学 ${changes.rejoined.length}、`
      + `调班 ${changes.transferred.length}、住宿变动 ${changes.boarding.length}`);

    log.push('\n5️⃣ 写入 Cloudflare KV...');
    const summary = await writeToKV(env, studentsByNo, run.started_at);
    run.active_students = summary.active;
    run.left_students = summary.left;
    run.total_classes = summary.classes;
    log.push(`   ✅ 在校 ${summary.active} 人、离校 ${summary.left} 人、${summary.classes} 个班`);

    run.result = 'success';
    log.push('\n✅ 同步完成！');
  } catch (error) {
    run.result = 'failed';
    run.error = error.message;
    log.push(`\n❌ 错误: ${error.message}`);
  }

  return await finishRun(env, run, startTime);
}

async function finishRun(env, run, startTime) {
  run.finished_at = new Date().toISOString();
  run.duration_ms = Date.now() - startTime;
  run.log.push(`   耗时: ${Math.round(run.duration_ms / 1000)} 秒`);

  try {
    const status = (await env.STUDENT_KV.get('sync_status', 'json')) || { runs: [] };
    // 只有最新一笔保留完整日志，旧记录去掉日志以控制大小
    const olderRuns = (status.runs || []).map(({ log, ...rest }) => rest);
    const runs = [run, ...olderRuns].slice(0, MAX_RUNS_KEPT);
    await env.STUDENT_KV.put('sync_status', JSON.stringify({
      last_run: run,
      last_success_at: run.result === 'success' ? run.finished_at : (status.last_success_at || null),
      runs,
    }));
  } catch (error) {
    run.log.push(`⚠️ 写入 sync_status 失败: ${error.message}`);
  }

  return run;
}

function emptyChanges() {
  return { joined: [], left: [], rejoined: [], transferred: [], boarding: [] };
}

/** 学校在 UTC+8，Worker 时钟是 UTC；凌晨同步时要用当地日期 */
function localDateString() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

/**
 * 登录 SMS（Yii LoginForm）：先 GET 登录页拿 session cookie，
 * 再 POST 凭证；通过 302 的 Location 是否仍指向登录页判断成败。
 */
async function loginSMS(env, log) {
  const SMS_BASE_URL = env.SMS_BASE_URL || 'https://sms.chhsban.edu.my';
  const SMS_USER = env.SMS_USER;
  const SMS_PASS = env.SMS_PASS;

  if (!SMS_USER || !SMS_PASS) {
    throw new Error('缺少 SMS_USER / SMS_PASS，请用 `wrangler secret put` 设置');
  }

  const loginUrl = `${SMS_BASE_URL}/sms/index.php?r=site/login`;
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

  const getResp = await fetch(loginUrl, { headers: { 'User-Agent': userAgent } });
  let cookies = extractCookies(getResp);

  const postResp = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': userAgent,
      'Cookie': cookies,
      'Referer': loginUrl
    },
    body: new URLSearchParams({
      'LoginForm[username]': SMS_USER,
      'LoginForm[password]': SMS_PASS,
      'login-button': 'login'
    }).toString(),
    redirect: 'manual'
  });

  cookies = mergeCookies(cookies, extractCookies(postResp));

  if (postResp.status >= 300 && postResp.status < 400) {
    const location = postResp.headers.get('location') || '';
    if (location.toLowerCase().includes('login')) {
      throw new Error('SMS 登录失败：账号或密码错误，或登录表单字段已变更');
    }
  } else if (postResp.status === 200) {
    throw new Error('SMS 登录失败：未发生跳转，可能账号密码错误（表单原样返回）');
  } else if (!postResp.ok) {
    throw new Error(`SMS 登录请求失败: HTTP ${postResp.status}`);
  }

  log.push('   ✓ SMS 登录成功');
  return cookies;
}

function extractCookies(response) {
  const setCookie = response.headers.getSetCookie?.() || [];
  if (setCookie.length > 0) {
    return setCookie.map(c => c.split(';')[0]).join('; ');
  }
  const single = response.headers.get('set-cookie');
  return single ? single.split(';')[0] : '';
}

function mergeCookies(a, b) {
  const map = {};
  for (const part of `${a}; ${b}`.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    map[trimmed.slice(0, eq)] = trimmed;
  }
  return Object.values(map).join('; ');
}

/**
 * 抓全校学生名单：ajax=student-grid 的 class_id 参数实测不会过滤数据，
 * 每次请求都回传全校（按 1000/页分页），所以只需翻页、用 student_id 去重，
 * 直到某页没有产出新学生为止。class_id 仍需带一个有效值（从班级下拉框取第一个）。
 */
async function fetchAllStudents(env, cookies, log) {
  const SMS_BASE_URL = env.SMS_BASE_URL || 'https://sms.chhsban.edu.my';

  const listUrl = `${SMS_BASE_URL}/sms/index.php?r=transaction/studentPerformance/create`;
  const listResp = await fetch(listUrl, { headers: { Cookie: cookies } });
  const listHtml = await listResp.text();
  const classList = extractClassList(listHtml);
  log.push(`   获取班级列表: ${classList.length} 个班级`);

  if (classList.length === 0) {
    throw new Error('未能解析出班级列表，可能登录失败或页面结构变更');
  }
  const anyClassId = classList[0].id;

  const seen = new Set();
  const students = [];
  let page = 1;

  while (page <= MAX_PAGES) {
    const url = `${SMS_BASE_URL}/sms/index.php?r=transaction/studentPerformance/create&class_id=${anyClassId}&ajax=student-grid&id_page=${page}`;
    const resp = await fetch(url, { headers: { Cookie: cookies } });
    if (!resp.ok) break;

    const html = await resp.text();
    const pageStudents = extractStudents(html);

    let newCount = 0;
    for (const s of pageStudents) {
      if (!seen.has(s.student_id)) {
        seen.add(s.student_id);
        students.push(s);
        newCount++;
      }
    }
    log.push(`   第 ${page} 页: ${pageStudents.length} 条，新增 ${newCount} 个`);

    if (newCount === 0) break;

    const hasNextPageLink = new RegExp(`id_page=${page + 1}\\b`).test(html);
    if (!hasNextPageLink) break;
    page++;
  }

  return students;
}

/**
 * 从"输入校外实习和特殊绩效分数"页面的 class_id 下拉框解析班级列表
 */
function extractClassList(html) {
  const selectMatch = html.match(/<select[^>]*name=["']class_id["'][^>]*>([\s\S]*?)<\/select>/i);
  if (!selectMatch) return [];

  const classes = [];
  const optionPattern = /<option[^>]*value=["']([^"']*)["'][^>]*>([^<]*)<\/option>/g;
  let m;
  while ((m = optionPattern.exec(selectMatch[1])) !== null) {
    const id = m[1].trim();
    const name = m[2].trim();
    if (id) classes.push({ id, name });
  }
  return classes;
}

/**
 * 提取学生数据。真实页面里 data-* 属性的顺序是
 * student_id → student_name → student_cname → class_name → student_no → class_id，
 * 且不保证顺序固定，因此先抓出整个 <a> 标签，再按属性名各自取值
 * （不依赖属性出现的先后顺序）。
 */
function extractStudents(html) {
  const students = [];
  const tagPattern = /<a\b[^>]*data-student_id="[^"]*"[^>]*>/g;

  let tagMatch;
  while ((tagMatch = tagPattern.exec(html)) !== null) {
    const tag = tagMatch[0];
    const getAttr = (name) => {
      const m = tag.match(new RegExp(`data-${name}="([^"]*)"`));
      return m ? m[1] : '';
    };

    const studentId = getAttr('student_id');
    if (!studentId) continue;

    const className = getAttr('class_name');
    students.push({
      student_id: studentId,
      student_no: getAttr('student_no'),
      name_en: getAttr('student_name'),
      name_cn: getAttr('student_cname'),
      input_class_id: getAttr('class_id'),
      input_class_name: className,
      real_class_name: className
    });
  }

  return students;
}

/**
 * 读取 Excel 性别/宿舍对照表（excel_gender_boarding_map 由
 * sms_sync/downloader/prepare_excel_for_worker.py 上传到 KV）。
 * 找不到时回传 null：这次同步就沿用每位学生上一版的住宿代码，不当成「住宿变动」。
 */
async function loadExcelMap(env, log) {
  const excelData = await env.STUDENT_KV.get('excel_gender_boarding_map', 'json');
  if (!excelData || Object.keys(excelData).length === 0) {
    log.push('   ⚠️ 未找到 excel_gender_boarding_map，住宿代码沿用上一版');
    return null;
  }
  log.push(`   ✅ 住宿对照表 ${Object.keys(excelData).length} 笔`);
  return excelData;
}

/**
 * 与上一版 students_by_no 比对，算出本次每位学生的完整记录与变动清单（纯内存计算，不碰 KV）。
 *
 * - 在 SMS 上、班级不是 *_LEAVE：status "active"；班级不同 → class_history 追加一笔
 * - 班级是 *_LEAVE：status "left"、left_reason "leave_class"，real_class_name 保留离校前的班级
 * - 上一版有、这次 SMS 上找不到：status "left"、left_reason "removed"，其余资料原样保留
 * - 上一版是 left、这次又以一般班级出现：改回 active，记录 rejoined_at
 * - 住宿代码（Excel 对照）不同 → boarding_history 追加一笔
 */
function computeStudentStatuses(previous, fetched, excelData, today) {
  const changes = emptyChanges();
  const studentsByNo = {};
  const brief = (s) => ({ student_no: s.student_no, name_cn: s.name_cn, name_en: s.name_en });

  for (const raw of fetched) {
    const no = String(raw.student_no);
    const prev = previous[no];
    const smsClass = raw.real_class_name;
    const inLeaveClass = LEAVE_CLASS_PATTERN.test(smsClass);

    const record = {
      ...(prev || {}),
      student_id: raw.student_id,
      student_no: no,
      name_en: raw.name_en,
      name_cn: raw.name_cn,
      input_class_id: raw.input_class_id,
      input_class_name: raw.input_class_name,
      sms_class_name: smsClass,
      class_history: prev?.class_history || [],
      boarding_history: prev?.boarding_history || [],
      joined_at: prev?.joined_at || today,
      last_seen_at: today,
    };

    // 上一版没有 status 的旧资料（第一次跑新版同步）一律视为 active
    const prevStatus = prev ? (prev.status || 'active') : null;
    const prevClass = prev?.real_class_name;
    const prevClassIsLeave = prevClass ? LEAVE_CLASS_PATTERN.test(prevClass) : false;

    if (inLeaveClass) {
      // 离校：班级保留离校前的真实班级（若上一版本身就是 LEAVE 班，也只能沿用）
      record.real_class_name = prevClass && !prevClassIsLeave ? prevClass : (prevClass || smsClass);
      record.status = 'left';
      if (prevStatus !== 'left') {
        record.left_at = today;
        record.left_reason = 'leave_class';
        record.left_class = smsClass;
        changes.left.push({ ...brief(record), class: record.real_class_name, reason: 'leave_class', left_class: smsClass });
      } else if (record.left_reason === 'removed') {
        // 之前从名单消失，现在出现在 LEAVE 班：离校日不变，原因更新为 LEAVE 班
        record.left_reason = 'leave_class';
        record.left_class = smsClass;
      }
    } else {
      record.real_class_name = smsClass;
      record.status = 'active';
      delete record.left_at;
      delete record.left_reason;
      delete record.left_class;

      if (!prev) {
        changes.joined.push({ ...brief(record), class: smsClass });
      } else if (prevStatus === 'left') {
        record.rejoined_at = today;
        changes.rejoined.push({ ...brief(record), class: smsClass });
      }

      if (prev && prevClass && !prevClassIsLeave && prevClass !== smsClass) {
        record.class_history = [...record.class_history, { from: prevClass, to: smsClass, date: today }];
        changes.transferred.push({ ...brief(record), from: prevClass, to: smsClass });
      }
    }

    // 住宿代码：Excel 对照表不存在时沿用上一版
    const prevBoarding = prev ? (prev.gender_boarding ?? null) : null;
    const newBoarding = excelData ? (excelData[no] ?? null) : prevBoarding;
    record.gender_boarding = newBoarding;
    if (prev && prevBoarding !== newBoarding) {
      record.boarding_history = [...record.boarding_history, { from: prevBoarding, to: newBoarding, date: today }];
      changes.boarding.push({ ...brief(record), from: prevBoarding, to: newBoarding });
    }

    studentsByNo[no] = record;
  }

  // 上一版有、这次 SMS 上找不到的学生：永久保留，标记离校
  for (const [no, prev] of Object.entries(previous)) {
    if (studentsByNo[no]) continue;
    const record = { ...prev, class_history: prev.class_history || [], boarding_history: prev.boarding_history || [] };
    if ((prev.status || 'active') !== 'left') {
      record.status = 'left';
      record.left_at = today;
      record.left_reason = 'removed';
      changes.left.push({ ...brief(record), class: record.real_class_name, reason: 'removed' });
    } else if (prev.left_reason !== 'removed') {
      // 之前在 LEAVE 班，现在连 LEAVE 班都没有了：离校日不变
      record.left_reason = 'removed';
    }
    studentsByNo[no] = record;
  }

  return { studentsByNo, changes };
}

/**
 * 写入 KV（共 3 次写入，sync_status 另外 1 次）：
 *   students_by_no：全校学生（含离校）按学号索引的大物件
 *   classes：在校学生的班级清单
 *   metadata：人数摘要
 * 不再写 students:{班级}（没有任何系统读取），避免每次同步多写几十个 key。
 */
async function writeToKV(env, studentsByNo, syncedAt) {
  const all = Object.values(studentsByNo);
  const active = all.filter(s => s.status === 'active');
  const classNames = [...new Set(active.map(s => s.real_class_name || 'Unknown'))].sort();

  await env.STUDENT_KV.put('students_by_no', JSON.stringify(studentsByNo));
  await env.STUDENT_KV.put('classes', JSON.stringify(classNames));
  await env.STUDENT_KV.put('metadata', JSON.stringify({
    total_students: active.length,
    left_students: all.length - active.length,
    total_classes: classNames.length,
    updated_at: syncedAt,
  }));

  return { active: active.length, left: all.length - active.length, classes: classNames.length };
}
