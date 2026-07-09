#!/usr/bin/env node

/**
 * 教師管理系統 - 命令行測試工具
 *
 * 用法:
 * node test-cli.mjs --url http://localhost:8787 --api-key your_key [command] [args]
 *
 * 命令:
 *   health              測試連接
 *   list                列出所有教師
 *   get <id>            查詢單個教師
 *   create <id> <name>  新增教師
 *   delete <id>         刪除教師
 */

import https from "https";
import http from "http";

const args = process.argv.slice(2);

function printUsage() {
  console.log(`
教師管理系統 - 命令行測試工具

用法: node test-cli.mjs [選項] [命令] [參數]

選項:
  --url <url>          Worker URL (預設: http://localhost:8787)
  --api-key <key>      API Key (預設: test_key)
  --help               顯示此訊息

命令:
  health               測試連接
  list                 列出所有教師
  list-dept <dept>     按部門查詢教師
  get <id>             查詢單個教師
  create <id> <name>   新增教師
  update <id> <phone>  修改教師電話
  delete <id>          刪除教師

範例:
  node test-cli.mjs health
  node test-cli.mjs list
  node test-cli.mjs create T001 '王老師'
  node test-cli.mjs delete T001
  `);
}

function parseArgs(args) {
  const options = {
    url: "http://localhost:8787",
    apiKey: "test_key",
    command: null,
    params: [],
  };

  let i = 0;
  while (i < args.length) {
    if (args[i] === "--url" && i + 1 < args.length) {
      options.url = args[++i];
    } else if (args[i] === "--api-key" && i + 1 < args.length) {
      options.apiKey = args[++i];
    } else if (args[i] === "--help") {
      printUsage();
      process.exit(0);
    } else if (!options.command) {
      options.command = args[i];
    } else {
      options.params.push(args[i]);
    }
    i++;
  }

  return options;
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === "https:";
    const client = isHttps ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.apiKey && { Authorization: `Bearer ${options.apiKey}` }),
        ...options.headers,
      },
    };

    const req = client.request(requestOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
            headers: res.headers,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers,
          });
        }
      });
    });

    req.on("error", reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function main() {
  const options = parseArgs(args);

  if (!options.command) {
    printUsage();
    process.exit(1);
  }

  console.log(`🚀 連接: ${options.url}`);
  console.log(`📝 命令: ${options.command}\n`);

  try {
    switch (options.command) {
      case "health":
        {
          const result = await makeRequest(`${options.url}/api/health`, {
            apiKey: options.apiKey,
          });
          console.log(`狀態碼: ${result.status}`);
          console.log("回應:", JSON.stringify(result.data, null, 2));
        }
        break;

      case "list":
        {
          const result = await makeRequest(`${options.url}/api/teachers`, {
            apiKey: options.apiKey,
          });
          console.log(`狀態碼: ${result.status}`);
          if (result.data.success) {
            console.log(`\n✓ 查詢 ${result.data.data.length} 位教師:\n`);
            result.data.data.forEach((teacher) => {
              console.log(
                `  ${teacher.teacher_id}: ${teacher.name_cn}${teacher.name_en ? ` (${teacher.name_en})` : ""}`,
              );
              console.log(
                `    部門: ${teacher.department}, 電郵: ${teacher.email}`,
              );
            });
          } else {
            console.log("✗ 查詢失敗:", result.data.error);
          }
        }
        break;

      case "list-dept":
        {
          const dept = options.params[0];
          if (!dept) {
            console.log("❌ 請提供部門名稱");
            process.exit(1);
          }
          const result = await makeRequest(
            `${options.url}/api/teachers?department=${encodeURIComponent(dept)}`,
            {
              apiKey: options.apiKey,
            },
          );
          console.log(`狀態碼: ${result.status}`);
          if (result.data.success) {
            console.log(
              `\n✓ 查詢部門 "${dept}" 的 ${result.data.data.length} 位教師:\n`,
            );
            result.data.data.forEach((teacher) => {
              console.log(`  ${teacher.teacher_id}: ${teacher.name_cn}`);
            });
          } else {
            console.log("✗ 查詢失敗:", result.data.error);
          }
        }
        break;

      case "get":
        {
          const id = options.params[0];
          if (!id) {
            console.log("❌ 請提供教師 ID");
            process.exit(1);
          }
          const result = await makeRequest(
            `${options.url}/api/teachers/${id}`,
            {
              apiKey: options.apiKey,
            },
          );
          console.log(`狀態碼: ${result.status}`);
          if (result.data.success) {
            const t = result.data.data;
            console.log(`\n✓ 教師資料:\n`);
            console.log(`  ID: ${t.teacher_id}`);
            console.log(
              `  姓名: ${t.name_cn}${t.name_en ? ` (${t.name_en})` : ""}`,
            );
            console.log(`  部門: ${t.department}`);
            console.log(`  電郵: ${t.email}`);
            if (t.phone) console.log(`  電話: ${t.phone}`);
            console.log(`  權限: ${t.permission}`);
          } else {
            console.log("✗ 查詢失敗:", result.data.error);
          }
        }
        break;

      case "create":
        {
          const id = options.params[0];
          const name = options.params[1];
          if (!id || !name) {
            console.log("❌ 用法: create <id> <name>");
            process.exit(1);
          }
          const result = await makeRequest(`${options.url}/api/teachers`, {
            method: "POST",
            apiKey: options.apiKey,
            body: {
              teacher_id: id,
              name_cn: name,
              email: `${id}@chhsban.edu.my`,
              department: "教務處",
              permission: "teacher",
            },
          });
          console.log(`狀態碼: ${result.status}`);
          if (result.data.success) {
            console.log("✓ 教師新增成功");
            console.log(JSON.stringify(result.data.data, null, 2));
          } else {
            console.log("✗ 新增失敗:", result.data.error);
          }
        }
        break;

      case "update":
        {
          const id = options.params[0];
          const phone = options.params[1];
          if (!id || !phone) {
            console.log("❌ 用法: update <id> <phone>");
            process.exit(1);
          }
          const result = await makeRequest(
            `${options.url}/api/teachers/${id}`,
            {
              method: "PUT",
              apiKey: options.apiKey,
              body: { phone },
            },
          );
          console.log(`狀態碼: ${result.status}`);
          if (result.data.success) {
            console.log("✓ 教師修改成功");
          } else {
            console.log("✗ 修改失敗:", result.data.error);
          }
        }
        break;

      case "delete":
        {
          const id = options.params[0];
          if (!id) {
            console.log("❌ 用法: delete <id>");
            process.exit(1);
          }
          const result = await makeRequest(
            `${options.url}/api/teachers/${id}`,
            {
              method: "DELETE",
              apiKey: options.apiKey,
            },
          );
          console.log(`狀態碼: ${result.status}`);
          if (result.data.success) {
            console.log(`✓ 教師 ${id} 刪除成功`);
          } else {
            console.log("✗ 刪除失敗:", result.data.error);
          }
        }
        break;

      default:
        console.log(`❌ 未知命令: ${options.command}`);
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error("❌ 錯誤:", error.message);
    process.exit(1);
  }
}

main();
