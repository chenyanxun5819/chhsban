#!/usr/bin/env node

/**
 * 配置生成腳本
 * 根據 src/ 中的配置，自動生成各個 Worker 的 wrangler.toml
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 動態導入配置（需要編譯後的 JS）
const configPath = path.join(__dirname, "../dist/index.js");

if (!fs.existsSync(configPath)) {
  console.error(
    `❌ 配置文件未找到: ${configPath}\n請先執行 npm run build`
  );
  process.exit(1);
}

try {
  const config = await import(`file://${configPath}`);
  const {
    CLOUDFLARE_ACCOUNT_ID,
    KV_NAMESPACES,
    WORKERS,
    generateWranglerKVConfig,
  } = config;

  /**
   * 生成 KV namespace 配置片段
   */
  function generateKVNamespacesConfig(kvNames) {
    return kvNames
      .map((name) => {
        const kv = KV_NAMESPACES[name];
        if (!kv) {
          console.warn(`⚠️  警告: 未知的 KV 命名空間: ${name}`);
          return "";
        }
        return `[[kv_namespaces]]\nbinding = "${kv.binding}"\nid = "${kv.id}"`;
      })
      .filter((x) => x)
      .join("\n\n");
  }

  /**
   * 生成環境變數配置片段
   */
  function generateVarsConfig(vars) {
    if (!vars || Object.keys(vars).length === 0) {
      return "# 無環境變數";
    }
    return (
      "# 環境變數\n[vars]\n" +
      Object.entries(vars)
        .map(([key, value]) => `${key} = "${value}"`)
        .join("\n")
    );
  }

  /**
   * 生成 Cron 觸發器配置片段
   */
  function generateCronConfig(triggers) {
    if (!triggers || triggers.length === 0) {
      return "# 無 Cron 觸發器";
    }
    const cronArray = triggers.map((t) => `"${t}"`).join(", ");
    return `# Cron 觸發器\n[triggers]\ncrons = [${cronArray}]`;
  }

  /**
   * 生成單個 Worker 的 wrangler.toml
   */
  function generateWranglerToml(workerKey, workerConfig) {
    const kvNamespacesConfig = generateKVNamespacesConfig(
      workerConfig.kvNamespaces
    );
    const varsConfig = generateVarsConfig(workerConfig.environmentVariables);
    const cronConfig = generateCronConfig(workerConfig.cronTriggers);

    return `# Cloudflare Worker 配置 - 自動生成
# 由 packages/cloudflare-config 管理
# 勿直接編輯此文件！修改請見: packages/cloudflare-config/src/

name = "${workerConfig.name}"
account_id = "${CLOUDFLARE_ACCOUNT_ID}"
workers_dev = true
main = "${workerConfig.mainFile}"
compatibility_date = "2026-06-30"

# KV 綁定配置
${kvNamespacesConfig}

# 環境變數
${varsConfig}

# Cron 觸發器
${cronConfig}

# 敏感信息使用 wrangler secret 設置（不寫在此文件中）
# SMS_USER, SMS_PASS 等敏感值應執行:
# wrangler secret put SMS_USER
# wrangler secret put SMS_PASS
`;
  }

  /**
   * 主程序
   */
  function main() {
    console.log("🔧 Cloudflare 配置生成工具");
    console.log(
      "━".repeat(60)
    );

    // 檢查目標目錄
    const projectRoots = {
      acadoc: path.join(__dirname, "../../../chhsban-acadoc"),
      tution: path.join(__dirname, "../../../chhsban-tution"),
    };

    for (const [workerKey, workerConfig] of Object.entries(WORKERS)) {
      const projectRoot = projectRoots[workerKey];

      if (!fs.existsSync(projectRoot)) {
        console.warn(
          `⚠️  目錄未找到: ${projectRoot}，跳過 ${workerKey} Worker`
        );
        continue;
      }

      const wranglerPath = path.join(projectRoot, "wrangler.toml");
      const content = generateWranglerToml(workerKey, workerConfig);

      try {
        fs.writeFileSync(wranglerPath, content, "utf-8");
        console.log(`✅ ${workerKey}: ${wranglerPath}`);
      } catch (error) {
        console.error(`❌ 寫入失敗 ${wranglerPath}:`);
        console.error(`   ${error.message}`);
      }
    }

    console.log("━".repeat(60));
    console.log("✨ 配置生成完成!");
    console.log(
      "\n💡 提示："
    );
    console.log(
      "  1. 請檢查生成的 wrangler.toml 是否正確"
    );
    console.log(
      "  2. 執行 wrangler secret put SMS_USER 和 SMS_PASS"
    );
    console.log(
      "  3. 部署: wrangler deploy"
    );
  }

  main();
} catch (error) {
  console.error("❌ 執行出錯:");
  console.error(error);
  process.exit(1);
}
