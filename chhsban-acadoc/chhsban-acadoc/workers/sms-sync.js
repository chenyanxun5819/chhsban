/**
 * Cloudflare Worker: SMS 学生数据自动同步到 KV
 * 流程：登录 SMS → 翻页抓全校学生名单 → 合并 Excel 数据 → 写入 KV
 *
 * 重要发现：SMS 的 ajax=student-grid 接口的 class_id 参数并不会真正过滤数据，
 * 不论传哪个 class_id，回传的都是"分页后的全校学生名单"（每页 1000 笔），
 * 学生实际所属班级要看回传数据里的 data-class_name。
 * 因此不需要对每个班级各发一次请求，只要翻完全校的分页（约 3 页）即可，
 * 一次 Worker 调用总共约 5-8 个 fetch，远低于 Workers 免费版 50 个子请求的上限，
 * 不需要跨多次触发的状态机。
 *
 * 必需的密钥（用 `wrangler secret put` 设置，不要写在代码或 wrangler.toml 里）：
 *   wrangler secret put SMS_USER
 *   wrangler secret put SMS_PASS
 *
 * 前置条件：KV 中需已存在 `excel_gender_boarding_map`
 * （由 download_student/prepare_excel_for_worker.py 一次性上传）。
 */

const MAX_PAGES = 10; // 全校学生分页安全上限（实测约 3 页 = 2893 人/1000 每页），留足成长空间

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS 设置
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    // 同步状态和手动触发接口
    if (request.method === 'GET' && pathname === '/') {
      return await handleStatus(env, corsHeaders);
    }

    if (request.method === 'POST' && pathname === '/') {
      const log = [];
      const result = await runSync(env, log);
      return new Response(log.join('\n'), {
        status: result.success ? 200 : 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', ...corsHeaders }
      });
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runSync(env, []));
  },
};

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
  const errorLog = await env.STUDENT_KV.get('sync_error_log', 'json');

  return new Response(JSON.stringify({
    metadata: metadata || null,
    lastError: errorLog || null
  }, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders }
  });
}

/**
 * 完整同步流程：登录 → 抓全校学生 → 合并 Excel → 写入 KV
 */
async function runSync(env, log) {
  const startTime = Date.now();

  try {
    log.push('🚀 开始 SMS 数据同步流程...');

    log.push('\n1️⃣ 登录 SMS 系统...');
    const cookies = await loginSMS(env, log);

    log.push('\n2️⃣ 抓取全校学生名单（翻页）...');
    const students = await fetchAllStudents(env, cookies, log);
    if (students.length === 0) {
      throw new Error('未抓到任何学生数据，可能登录失败或页面结构变更');
    }
    log.push(`   ✅ 共抓到 ${students.length} 名学生（已去重）`);

    log.push('\n3️⃣ 合并 Excel 性别/宿舍数据...');
    const matchCount = await enrichWithExcel(env, students, log);
    log.push(`   ✅ 匹配 ${matchCount}/${students.length}`);

    log.push('\n4️⃣ 写入 Cloudflare KV...');
    const writeCount = await writeToKV(env, students, log);
    log.push(`   ✅ 写入完成: ${writeCount} 个 key`);

    await env.STUDENT_KV.put('last_sync_date', new Date().toISOString().slice(0, 10));

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    log.push(`\n✅ 同步完成！总耗时: ${elapsed} 秒`);

    return { success: true };

  } catch (error) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    log.push(`\n❌ 错误: ${error.message}`);
    log.push(`   耗时: ${elapsed} 秒`);

    await env.STUDENT_KV.put(
      'sync_error_log',
      JSON.stringify({
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
        logs: log
      }),
      { expirationTtl: 7 * 24 * 60 * 60 }
    );

    return { success: false };
  }
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
 * 合并 Excel 性别/宿舍数据（excel_gender_boarding_map 由
 * download_student/prepare_excel_for_worker.py 一次性上传到 KV）
 */
async function enrichWithExcel(env, students, log) {
  const excelData = (await env.STUDENT_KV.get('excel_gender_boarding_map', 'json')) || {};
  if (Object.keys(excelData).length === 0) {
    log.push('   ⚠️ 未找到 excel_gender_boarding_map，gender_boarding 字段将为空');
  }

  let matchCount = 0;
  for (const student of students) {
    const studentNo = String(student.student_no);
    if (excelData[studentNo]) {
      student.gender_boarding = excelData[studentNo];
      matchCount++;
    } else {
      student.gender_boarding = null;
    }
  }
  return matchCount;
}

/**
 * 写入精简后的 KV 结构：
 * 1(classes) + 班级数(students:{班级}) + 1(students_by_no 合并大物件) + 2(metadata/updated_time)
 * 而不是"每个学生一个 key"，避免免费版 KV 每日 1000 次写入额度被打爆。
 */
async function writeToKV(env, students, log) {
  const classMap = {};
  for (const student of students) {
    const className = student.real_class_name || 'Unknown';
    if (!classMap[className]) classMap[className] = [];
    classMap[className].push(student);
  }
  const classNames = Object.keys(classMap);

  await env.STUDENT_KV.put('classes', JSON.stringify(classNames));

  for (const className of classNames) {
    const simplified = classMap[className].map(s => ({
      student_no: s.student_no,
      student_id: s.student_id,
      name_en: s.name_en,
      name_cn: s.name_cn,
      gender_boarding: s.gender_boarding
    }));
    await env.STUDENT_KV.put(`students:${className}`, JSON.stringify(simplified));
  }

  const studentsByNo = {};
  for (const student of students) {
    studentsByNo[student.student_no] = student;
  }
  await env.STUDENT_KV.put('students_by_no', JSON.stringify(studentsByNo));

  await env.STUDENT_KV.put('metadata', JSON.stringify({
    total_students: students.length,
    total_classes: classNames.length,
    updated_at: new Date().toISOString()
  }));
  await env.STUDENT_KV.put('updated_time', new Date().toISOString());

  return classNames.length + 4;
}
