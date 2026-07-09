#!/usr/bin/env node

/**
 * 測試部門篩選功能
 */

async function testDepartmentFiltering() {
  console.log("🧪 測試部門篩選功能...\n");

  const API_URL = "https://teacher-management.astcws.workers.dev/api/teachers";
  const headers = { Authorization: "Bearer test_key" };

  try {
    // 1. 獲取所有教師並提取部門列表
    console.log("1️⃣ 獲取所有部門:");
    const allResponse = await fetch(API_URL, { headers });
    const allData = await allResponse.json();
    const allTeachers = allData.data || [];

    const departments = new Set(allTeachers.map((t) => t.department));
    const deptArray = Array.from(departments).sort();

    console.log(`   ✅ 找到 ${deptArray.length} 個部門\n`);
    deptArray.forEach((dept, i) => {
      console.log(`   ${i + 1}. ${dept}`);
    });

    // 2. 測試部門篩選
    console.log("\n2️⃣ 測試部門篩選:\n");
    for (const dept of deptArray.slice(0, 5)) {
      // 只測試前 5 個
      try {
        const response = await fetch(
          `${API_URL}?department=${encodeURIComponent(dept)}`,
          { headers },
        );
        const data = await response.json();
        const teachers = data.data || [];
        console.log(`   ✅ ${dept}: ${teachers.length} 位教師`);

        // 驗證所有教師都屬於該部門
        const allMatch = teachers.every((t) => t.department === dept);
        if (!allMatch) {
          console.log(`      ⚠️ 警告：部分教師部門不匹配！`);
        }
      } catch (error) {
        console.log(`   ❌ ${dept}: 篩選失敗 - ${error.message}`);
      }
    }

    // 3. 驗證教師總數
    console.log(`\n3️⃣ 驗證教師總數:`);
    let totalTeachers = 0;
    for (const dept of deptArray) {
      const response = await fetch(
        `${API_URL}?department=${encodeURIComponent(dept)}`,
        { headers },
      );
      const data = await response.json();
      totalTeachers += (data.data || []).length;
    }
    console.log(`   📊 所有部門教師合計: ${totalTeachers} 位`);
    console.log(`   📋 API 返回總數: ${allTeachers.length} 位`);
    console.log(
      `   ${totalTeachers === allTeachers.length ? "✅ 數字匹配" : "⚠️ 數字不匹配"}`,
    );
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
  }
}

testDepartmentFiltering();
