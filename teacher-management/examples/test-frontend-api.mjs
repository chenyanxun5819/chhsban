#!/usr/bin/env node

/**
 * 前端 API 連接測試
 */

async function testFrontendApiConnection() {
  console.log("🔍 測試前端 API 連接...\n");

  // 1. 測試 API 直連
  console.log("1️⃣ 測試 API 直連:");
  try {
    const response = await fetch(
      "https://teacher-management.astcws.workers.dev/api/health",
      {
        headers: {
          Authorization: "Bearer test_key",
        },
      },
    );
    const data = await response.json();
    console.log(`   ✅ API 健康檢查: ${data.success ? "正常" : "異常"}\n`);
  } catch (error) {
    console.log(`   ❌ API 連接失敗: ${error.message}\n`);
  }

  // 2. 測試獲取教師
  console.log("2️⃣ 測試獲取教師:");
  try {
    const response = await fetch(
      "https://teacher-management.astcws.workers.dev/api/teachers",
      {
        headers: {
          Authorization: "Bearer test_key",
        },
      },
    );
    const data = await response.json();
    console.log(`   ✅ 獲取教師: ${data.data.length} 位教師\n`);

    if (data.data.length > 0) {
      console.log("   前 3 位教師:");
      data.data.slice(0, 3).forEach((teacher, i) => {
        console.log(
          `   ${i + 1}. ${teacher.name_cn} (${teacher.teacher_id}) - ${teacher.department}`,
        );
      });
    }
  } catch (error) {
    console.log(`   ❌ 獲取教師失敗: ${error.message}\n`);
  }

  // 3. 檢查 CORS
  console.log("\n3️⃣ CORS 檢查:");
  try {
    const response = await fetch(
      "https://teacher-management.astcws.workers.dev/api/teachers?department=华文%20Chinese",
      {
        headers: {
          Authorization: "Bearer test_key",
        },
      },
    );
    const corsHeader = response.headers.get("Access-Control-Allow-Origin");
    console.log(`   CORS Header: ${corsHeader || "未設置"}`);
    const data = await response.json();
    console.log(`   ✅ 部門篩選成功: ${data.data.length} 位華文教師\n`);
  } catch (error) {
    console.log(`   ❌ CORS 檢查失敗: ${error.message}\n`);
  }
}

testFrontendApiConnection().catch(console.error);
