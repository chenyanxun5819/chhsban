#!/usr/bin/env node
/**
 * 將 Template_tution.pdf 轉成 base64 字串，寫入 src/template-tution-base64.ts
 * Worker 執行環境無法直接讀取檔案系統，故以此方式將模板內嵌進程式碼。
 *
 * 模板更新後請重新執行： node scripts/embed-template.js
 */
const fs = require("fs");
const path = require("path");

const srcPath = path.join(__dirname, "..", "Template_tution.pdf");
const outPath = path.join(__dirname, "..", "src", "template-tution-base64.ts");

const bytes = fs.readFileSync(srcPath);
const b64 = bytes.toString("base64");

const out =
  "// 由 scripts/embed-template.js 自動生成，請勿手動編輯\n" +
  "// 來源: Template_tution.pdf（若模板更新，重新執行: node scripts/embed-template.js）\n" +
  `export const TEMPLATE_TUTION_PDF_BASE64 = "${b64}";\n`;

fs.writeFileSync(outPath, out);
console.log(`已寫入 ${outPath}（base64 長度 ${b64.length}）`);
