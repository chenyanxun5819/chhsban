/**
 * 教師資料遷移脚本
 * 將分組格式的教師資料轉換為 API 期望的格式
 */

// KV 中按部門分組的教師資料（來自附件）
const teachersByDepartment = {
  "华文 Chinese": [
    {
      department: "华文 Chinese",
      "School ID": "T119",
      Name: "谭长咏",
      email: "ecchhs014@chhsban.edu.my",
    },
    {
      department: "华文 Chinese",
      "School ID": "T464",
      Name: "陈静贤",
      email: "ecchhs338@chhsban.edu.my",
    },
    {
      department: "华文 Chinese",
      "School ID": "T027",
      Name: "曾奂焜",
      email: "ecchhs016@chhsban.edu.my",
    },
    {
      department: "华文 Chinese",
      "School ID": "T174",
      Name: "王慧珠",
      email: "ecchhs096@chhsban.edu.my",
    },
    {
      department: "华文 Chinese",
      "School ID": "T206",
      Name: "许雪玲",
      email: "ecchhs198@chhsban.edu.my",
    },
    {
      department: "华文 Chinese",
      "School ID": "T250",
      Name: "杨秀菁",
      email: "ecchhs197@chhsban.edu.my",
    },
    {
      department: "华文 Chinese",
      "School ID": "T344",
      Name: "黄伟琪",
      email: "ecchhs214@chhsban.edu.my",
    },
    {
      department: "华文 Chinese",
      "School ID": "T386",
      Name: "余美娟",
      email: "ecchhs258@chhsban.edu.my",
    },
    {
      department: "华文 Chinese",
      "School ID": "T387",
      Name: "郑云月",
      email: "ecchhs260@chhsban.edu.my",
    },
    {
      department: "华文 Chinese",
      "School ID": "T415",
      Name: "洪宇霜",
      email: "ecchhs288@chhsban.edu.my",
    },
    {
      department: "华文 Chinese",
      "School ID": "T469",
      Name: "王思齐",
      email: "ecchhs344@chhsban.edu.my",
    },
    {
      department: "华文 Chinese",
      "School ID": "T470",
      Name: "林俊梁",
      email: "ecchhs343@chhsban.edu.my",
    },
    {
      department: "华文 Chinese",
      "School ID": "T475",
      Name: "周紫馨",
      email: "ecchhs352@chhsban.edu.my",
    },
    {
      department: "华文 Chinese",
      "School ID": "T499",
      Name: "方映红",
      email: "ecchhs380@chhsban.edu.my",
    },
    {
      department: "华文 Chinese",
      "School ID": "T504",
      Name: "林宇洁",
      email: "ecchhs389@chhsban.edu.my",
    },
    {
      department: "华文 Chinese",
      "School ID": "S250",
      Name: "李殷乐",
      email: "schhs276@chhsban.edu.my",
    },
  ],
  "英文 English": [
    {
      department: "英文 English",
      "School ID": "T148",
      Name: "关凤玲",
      email: "ecchhs019@chhsban.edu.my",
    },
    {
      department: "英文 English",
      "School ID": "T177",
      Name: "关凤燕",
      email: "ecchhs085@chhsban.edu.my",
    },
    {
      department: "英文 English",
      "School ID": "T225",
      Name: "曾凡容",
      email: "ecchhs088@chhsban.edu.my",
    },
    {
      department: "英文 English",
      "School ID": "T328",
      Name: "SYUHADA",
      email: "ecchhs106@chhsban.edu.my",
    },
    {
      department: "英文 English",
      "School ID": "T389",
      Name: "林启盛",
      email: "ecchhs266@chhsban.edu.my",
    },
    {
      department: "英文 English",
      "School ID": "T443",
      Name: "庄翠美",
      email: "ecchhs317@chhsban.edu.my",
    },
    {
      department: "英文 English",
      "School ID": "T454",
      Name: "林美靖",
      email: "ecchhs328@chhsban.edu.my",
    },
    {
      department: "英文 English",
      "School ID": "T484",
      Name: "AINI",
      email: "ecchhs361@chhsban.edu.my",
    },
    {
      department: "英文 English",
      "School ID": "T488",
      Name: "NISHANTINI",
      email: "ecchhs368@chhsban.edu.my",
    },
    {
      department: "英文 English",
      "School ID": "T492",
      Name: "SHALINI",
      email: "ecchhs373@chhsban.edu.my",
    },
    {
      department: "英文 English",
      "School ID": "T506",
      Name: "NISHA",
      email: "schhs344@chhsban.edu.my ",
    },
    {
      department: "英文 English",
      "School ID": "T497",
      Name: "JONATHAN",
      email: "ecchhs382@chhsban.edu.my",
    },
    {
      department: "英文 English",
      "School ID": "T500",
      Name: "KEHSYNEELATHA",
      email: "ecchhs398@chhsban.edu.my",
    },
    {
      department: "英文 English",
      "School ID": "T510",
      Name: "HASVINI",
      email: "ecchhs399@chhsban.edu.my",
    },
    {
      department: "英文 English",
      "School ID": "T511",
      Name: "TATCHAYINI",
      email: "ecchhs406@chhsban.edu.my",
    },
    {
      department: "英文 English",
      "School ID": "T526",
      Name: "黄于玲",
      email: "ecchhs417@chhsban.edu.my",
    },
  ],
  "国文 Malay": [
    {
      department: "国文 Malay",
      "School ID": " T274  ",
      Name: "JUMARNI",
      email: "ecchhs081@chhsban.edu.my",
    },
    {
      department: "国文 Malay",
      "School ID": "T317",
      Name: "钟佩利",
      email: "ecchhs124@chhsban.edu.my",
    },
    {
      department: "国文 Malay",
      "School ID": "T045",
      Name: "傅渼珽",
      email: "ecchhs054@chhsban.edu.my",
    },
    {
      department: "国文 Malay",
      "School ID": "T144",
      Name: "朱健虹",
      email: "ecchhs052@chhsban.edu.my",
    },
    {
      department: "国文 Malay",
      "School ID": "T151",
      Name: "ADIBAH",
      email: "ecchhs018@chhsban.edu.my",
    },
    {
      department: "国文 Malay",
      "School ID": "T303",
      Name: "NORLINA",
      email: "ecchhs053@chhsban.edu.my",
    },
    {
      department: "国文 Malay",
      "School ID": "T342",
      Name: "AZLINDA",
      email: "ecchhs209@chhsban.edu.my",
    },
    {
      department: "国文 Malay",
      "School ID": "T346",
      Name: "ROHAYA",
      email: "ecchhs215@chhsban.edu.my",
    },
    {
      department: "国文 Malay",
      "School ID": " T351  ",
      Name: "LIYANA",
      email: "ecchhs223@chhsban.edu.my",
    },
    {
      department: "国文 Malay",
      "School ID": "T361",
      Name: "蔡凯伦",
      email: "ecchhs232@chhsban.edu.my",
    },
    {
      department: "国文 Malay",
      "School ID": " T391  ",
      Name: "黄晓莹",
      email: "ecchhs262@chhsban.edu.my",
    },
    {
      department: "国文 Malay",
      "School ID": "T491",
      Name: "温启胜",
      email: "ecchhs372@chhsban.edu.my",
    },
    {
      department: "国文 Malay",
      "School ID": "T509",
      Name: "FAIRUZ",
      email: "ecchhs395@chhsban.edu.my",
    },
    {
      department: "国文 Malay",
      "School ID": "S309",
      Name: "陈诗宜",
      email: "ecchhs408@chhsban.edu.my",
    },
    {
      department: "国文 Malay",
      "School ID": "T519",
      Name: "AZIRAH",
      email: "ecchhs409@chhsban.edu.my",
    },
  ],
};

/**
 * 轉換教師資料格式
 * 從 { dept: [{...}] } 轉換為 API 期望的格式
 */
function transformTeachers() {
  const transformedTeachers = [];

  for (const [department, teachers] of Object.entries(teachersByDepartment)) {
    for (const teacher of teachers) {
      transformedTeachers.push({
        teacher_id: teacher["School ID"].trim(),
        name_cn: teacher.Name,
        name_en: "", // 英文名未在源數據中
        department: teacher.department,
        email: teacher.email,
        phone: "", // 電話未在源數據中
        permission: "teacher", // 默認權限
      });
    }
  }

  return transformedTeachers;
}

// 生成批量導入的 API 請求
function generateBatchImportScript() {
  const teachers = transformTeachers();

  console.log("📋 總共 " + teachers.length + " 位教師");
  console.log("\n🔧 下面是批量導入的 curl 命令：\n");

  teachers.forEach((teacher, index) => {
    console.log(
      `# 導入教師 ${index + 1}/${teachers.length}: ${teacher.name_cn} (${teacher.teacher_id})`,
    );
    console.log(
      `curl -X POST https://teacher-management.astcws.workers.dev/api/teachers \\`,
    );
    console.log(`  -H "Authorization: Bearer test_key" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '${JSON.stringify(teacher)}'`);
    console.log();
  });
}

// 導出為 JSON 文件
function exportAsJson() {
  const teachers = transformTeachers();
  const json = JSON.stringify(teachers, null, 2);
  console.log(json);
}

// 執行導出
console.log("✅ 教師資料轉換完成\n");
exportAsJson();
