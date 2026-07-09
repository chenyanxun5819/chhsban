#!/usr/bin/env node

/**
 * Cloudflare 配置驗證腳本
 * 用於驗證 P0 基礎設施配置是否正確
 * 
 * 使用：node scripts/verify-config.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(type, message) {
  switch (type) {
    case 'success':
      console.log(`${colors.green}✅${colors.reset} ${message}`);
      break;
    case 'error':
      console.log(`${colors.red}❌${colors.reset} ${message}`);
      break;
    case 'warning':
      console.log(`${colors.yellow}⚠️ ${colors.reset} ${message}`);
      break;
    case 'info':
      console.log(`${colors.blue}ℹ️ ${colors.reset} ${message}`);
      break;
    case 'title':
      console.log(`\n${colors.cyan}━━━ ${message} ━━━${colors.reset}\n`);
      break;
    default:
      console.log(message);
  }
}

async function verify() {
  let passed = 0;
  let failed = 0;
  let warnings = 0;

  log('title', '驗證 P0 基礎設施配置');

  // 1. 檢查目錄結構
  log('title', '1. 檢查目錄結構');

  const dirs = [
    { path: 'packages/cloudflare-config/src', name: 'cloudflare-config' },
    { path: 'packages/kv-utils/src', name: 'kv-utils' },
    { path: 'chhsban-acadoc', name: 'chhsban-acadoc' },
    { path: 'chhsban-tution/src', name: 'chhsban-tution' },
  ];

  for (const dir of dirs) {
    const fullPath = path.join(rootDir, dir.path);
    if (fs.existsSync(fullPath)) {
      log('success', `目錄存在: ${dir.name}`);
      passed++;
    } else {
      log('error', `目錄不存在: ${fullPath}`);
      failed++;
    }
  }

  // 2. 檢查配置文件
  log('title', '2. 檢查配置文件');

  const files = [
    { path: 'packages/cloudflare-config/src/kv-namespace.ts', name: 'KV 命名空間配置' },
    { path: 'packages/cloudflare-config/src/workers.ts', name: 'Worker 配置' },
    { path: 'chhsban-acadoc/wrangler.toml', name: 'chhsban-acadoc wrangler.toml' },
    { path: 'chhsban-tution/wrangler.toml', name: 'chhsban-tution wrangler.toml' },
    { path: 'chhsban.code-workspace', name: 'VS Code Workspace' },
  ];

  for (const file of files) {
    const fullPath = path.join(rootDir, file.path);
    if (fs.existsSync(fullPath)) {
      log('success', `文件存在: ${file.name}`);
      passed++;
    } else {
      log('error', `文件不存在: ${fullPath}`);
      failed++;
    }
  }

  // 3. 檢查 wrangler.toml 內容
  log('title', '3. 檢查 wrangler.toml 配置');

  const wranglerFiles = [
    { path: 'chhsban-acadoc/wrangler.toml', name: 'chhsban-acadoc' },
    { path: 'chhsban-tution/wrangler.toml', name: 'chhsban-tution' },
  ];

  const requiredKVs = ['STUDENT_KV', 'TEACHER_KV', 'AUTH_KV'];
  const requiredIds = {
    STUDENT_KV: '9d870e2344c84c74a1ed2f2851c93408',
    TEACHER_KV: '8892dc8c30984f4591850521a1b57ed8',
    AUTH_KV: '8ddeccbeeae9440fafba384d35205a81',
  };

  for (const file of wranglerFiles) {
    const fullPath = path.join(rootDir, file.path);
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');

      for (const kv of requiredKVs) {
        if (content.includes(`binding = "${kv}"`)) {
          log('success', `${file.name}: 找到 KV 綁定 ${kv}`);
          passed++;

          // 檢查 ID 是否正確
          if (content.includes(requiredIds[kv])) {
            log('success', `${file.name}: KV ID 正確 (${requiredIds[kv]})`);
            passed++;
          } else {
            log('warning', `${file.name}: KV ID 可能不匹配 ${kv}`);
            warnings++;
          }
        } else {
          log('error', `${file.name}: 未找到 KV 綁定 ${kv}`);
          failed++;
        }
      }
    } catch (error) {
      log('error', `無法讀取 ${file.name}: ${error.message}`);
      failed++;
    }
  }

  // 4. 檢查 package.json 配置
  log('title', '4. 檢查 package.json 依賴');

  const packageFiles = [
    { path: 'chhsban-acadoc/package.json', name: 'chhsban-acadoc', deps: ['@chhsban/kv-utils'] },
    { path: 'chhsban-tution/package.json', name: 'chhsban-tution', deps: ['@chhsban/kv-utils', '@chhsban/cloudflare-config'] },
  ];

  for (const pkgFile of packageFiles) {
    const fullPath = path.join(rootDir, pkgFile.path);
    try {
      const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
      for (const dep of pkgFile.deps) {
        if (content.dependencies && content.dependencies[dep]) {
          log('success', `${pkgFile.name}: 依賴 ${dep} 已配置`);
          passed++;
        } else {
          log('warning', `${pkgFile.name}: 缺少依賴 ${dep}`);
          warnings++;
        }
      }
    } catch (error) {
      log('error', `無法讀取 ${pkgFile.name} package.json: ${error.message}`);
      failed++;
    }
  }

  // 5. 檢查 root package.json 中的 workspaces
  log('title', '5. 檢查 npm workspaces 配置');

  try {
    const rootPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
    if (rootPkg.workspaces) {
      log('success', `根目錄 package.json 已配置 workspaces`);
      passed++;
    } else {
      log('warning', `根目錄 package.json 未配置 workspaces`);
      warnings++;
    }
  } catch (error) {
    log('error', `無法讀取根目錄 package.json: ${error.message}`);
    failed++;
  }

  // 總結
  log('title', '驗證結果');
  console.log(`${colors.green}✅ 通過：${passed}${colors.reset}`);
  console.log(`${colors.red}❌ 失敗：${failed}${colors.reset}`);
  console.log(`${colors.yellow}⚠️ 警告：${warnings}${colors.reset}`);

  if (failed === 0) {
    log('success', 'P0 基礎設施配置完整！');
    return 0;
  } else {
    log('error', '部分配置不完整，請根據上述信息修正');
    return 1;
  }
}

verify().then(code => process.exit(code)).catch(error => {
  log('error', `驗證出錯: ${error.message}`);
  process.exit(1);
});
