#!/usr/bin/env node

/**
 * 学生信息查询系统 - 本地测试脚本
 * 用法：node test-setup.js
 */

const http = require('http');
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testEndpoint(host, port, path, description) {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port: port,
      path: path,
      method: 'GET',
      timeout: 3000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 404) {
          try {
            const result = JSON.parse(data);
            log(colors.green, `✓ ${description}`);
            resolve({ success: true, data: result });
          } catch {
            if (res.statusCode === 404) {
              log(colors.yellow, `⚠ ${description} (404 未找到，可能正常)`);
              resolve({ success: true, data: null });
            } else {
              log(colors.red, `✗ ${description} (响应格式错误)`);
              resolve({ success: false });
            }
          }
        } else {
          log(colors.red, `✗ ${description} (状态码: ${res.statusCode})`);
          resolve({ success: false });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      log(colors.red, `✗ ${description} (连接超时)`);
      resolve({ success: false });
    });

    req.on('error', (error) => {
      log(colors.red, `✗ ${description} (${error.message})`);
      resolve({ success: false });
    });

    req.end();
  });
}

async function main() {
  console.log('\n');
  log(colors.blue, '╔════════════════════════════════════════╗');
  log(colors.blue, '║ 学生信息查询系统 - 本地测试           ║');
  log(colors.blue, '╚════════════════════════════════════════╝\n');

  log(colors.blue, '检查本地服务...\n');

  // 测试 Worker 开发服务器
  log(colors.yellow, '1️⃣  测试 Worker (localhost:8787)');
  const workerStatus = await testEndpoint('localhost', 8787, '/', '  Worker 状态检查');
  
  if (!workerStatus.success) {
    log(colors.yellow, '\n  ⚠️  请先运行: npm run worker:dev\n');
  }

  await delay(500);

  // 测试 Worker 学生查询端点
  if (workerStatus.success) {
    log(colors.yellow, '2️⃣  测试 Worker API 端点');
    await testEndpoint('localhost', 8787, '/api/student/test', '  测试查询 API (student_no: test)');
    console.log();
  }

  await delay(500);

  // 测试前端开发服务器
  log(colors.yellow, '3️⃣  测试前端开发服务器 (localhost:5173)');
  const frontendStatus = await testEndpoint('localhost', 5173, '/', '  前端服务器检查');
  
  if (!frontendStatus.success) {
    log(colors.yellow, '\n  ⚠️  请先运行: npm run dev\n');
  }

  // 汇总
  console.log();
  log(colors.blue, '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (workerStatus.success && frontendStatus.success) {
    log(colors.green, '✅ 所有服务正在运行！');
    log(colors.green, '\n📝 接下来：');
    log(colors.green, '  1. 打开浏览器访问: http://localhost:5173');
    log(colors.green, '  2. 在查询框输入学号（如：J1A001）');
    log(colors.green, '  3. 点击查询按钮\n');
  } else {
    log(colors.yellow, '⚠️  部分服务未运行\n');
    if (!workerStatus.success) {
      log(colors.yellow, '请打开终端 1 并运行:');
      log(colors.yellow, '  npm run worker:dev\n');
    }
    if (!frontendStatus.success) {
      log(colors.yellow, '请打开终端 2 并运行:');
      log(colors.yellow, '  npm run dev\n');
    }
  }

  log(colors.blue, '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(error => {
  log(colors.red, `错误: ${error.message}`);
  process.exit(1);
});
