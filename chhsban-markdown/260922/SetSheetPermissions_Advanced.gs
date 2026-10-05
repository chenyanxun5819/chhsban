// ========================================
// Google Sheet 批量權限設定 - 進階版
// ========================================

const SHEET_ID = "1qiO66ja_NAEk0axmZ3hdRMoHY7eD9QofzNfPdeHln04";
const TARGET_EMAIL = "ecchhs110@chhsban.edu.my";
const RANGE_FIXED_EDITOR_EMAILS = [
  "schhs334@chhsban.edu.my",
  "ecchhs110@chhsban.edu.my"
];
const BATCH_SIZE = 10;
const PROTECTED_RANGE_SPECS = [
  { key: "A:F", description: "欄 A 到 F" },
  { key: "38:975", description: "行 38 到 975" },
  { key: "1:6", description: "行 1 到 6" }
];

/**
 * 主執行函數 - 執行所有權限設定
 * 在 Google Sheet 中開啟 Apps Script，貼上此代碼，執行這個函數
 */
function executePermissionSetup() {
  try {
    Logger.log("🚀 開始批量權限設定流程（只處理範圍保護）...");
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    
    // 步驟 1: 設定全局編輯權限
    addGlobalEditorPermission();
    
    // 步驟 2: 針對每個工作表分批設定特定範圍權限
    setupRangePermissionsForAllSheets(ss);
    
    // 步驟 3: 驗證設定
    verifyPermissions();
    
    Logger.log("✅ 本批次權限設定完成！");
    
  } catch (error) {
    Logger.log(`❌ 錯誤: ${error.message}`);
  }
}

/**
 * 第 1 步：添加全局編輯權限
 */
function addGlobalEditorPermission() {
  try {
    const file = DriveApp.getFileById(SHEET_ID);
    
    // 檢查是否已經是編輯者
    const editors = file.getEditors();
    const isAlreadyEditor = editors.some(e => e.getEmail() === TARGET_EMAIL);
    
    if (!isAlreadyEditor) {
      file.addEditor(TARGET_EMAIL);
      Logger.log(`✅ 已給予 ${TARGET_EMAIL} 整個試算表的編輯權限`);
    } else {
      Logger.log(`ℹ️  ${TARGET_EMAIL} 已經是編輯者`);
    }
  } catch (error) {
    Logger.log(`❌ 設定全局權限失敗: ${error.message}`);
  }
}

/**
 * 第 2 步：為所有工作表設定範圍權限
 */
function setupRangePermissionsForAllSheets(ss) {
  const sheets = ss.getSheets();
  const properties = PropertiesService.getScriptProperties();
  const startIndex = Number(properties.getProperty("RANGE_PERMISSION_NEXT_INDEX") || "0");
  const endIndex = Math.min(startIndex + BATCH_SIZE, sheets.length);
  
  Logger.log(`\n📋 本次處理工作表 ${startIndex + 1} 到 ${endIndex} / ${sheets.length}...`);
  
  for (let index = startIndex; index < endIndex; index++) {
    const sheet = sheets[index];
    const sheetName = sheet.getName();
    Logger.log(`\n工作表 ${index + 1}/${sheets.length}: ${sheetName}`);
    
    // 只重建三個範圍保護，不碰主表保護
    clearRangeProtections(sheet);
    setupProtectedRanges(sheet);

    SpreadsheetApp.flush();
  }

  if (endIndex < sheets.length) {
    properties.setProperty("RANGE_PERMISSION_NEXT_INDEX", String(endIndex));
    Logger.log(`\n⏭️ 尚未完成，下一次請再執行 executePermissionSetup()，會從第 ${endIndex + 1} 張工作表繼續。`);
  } else {
    properties.deleteProperty("RANGE_PERMISSION_NEXT_INDEX");
    Logger.log("\n✅ 所有工作表的範圍保護已處理完成。");
  }
}

/**
 * 重設批次進度，需要從第一張工作表重新處理時使用
 */
function resetBatchProgress() {
  PropertiesService.getScriptProperties().deleteProperty("RANGE_PERMISSION_NEXT_INDEX");
  Logger.log("✅ 已重設批次進度，下次會從第一張工作表開始處理範圍保護。");
}

/**
 * 刪除工作表上的範圍保護，避免重複堆疊
 */
function clearRangeProtections(sheet) {
  const rangeProtections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  rangeProtections.forEach(protection => {
    try {
      protection.remove();
    } catch (error) {
      Logger.log(`  ❌ 刪除範圍保護失敗: ${error.message}`);
    }
  });

  Logger.log(`  🗑️  已清除舊的範圍保護，準備重建 3 個範圍保護`);
}

/**
 * 為單個工作表設定受保護的範圍
 */
function setupProtectedRanges(sheet) {
  PROTECTED_RANGE_SPECS.forEach(spec => {
    try {
      const range = buildRangeFromSpec(sheet, spec.key);
      const protection = range.protect();
      protection.setDescription(`${sheet.getName()} - ${spec.description}`);
      resetProtectionEditors(protection);
      addEditorsToProtection(protection, RANGE_FIXED_EDITOR_EMAILS);
      Logger.log(`  ✅ 已重建範圍保護: ${range.getA1Notation()}`);
    } catch (error) {
      Logger.log(`  ❌ ${spec.description}: ${error.message}`);
    }
  });
}

function addEditorsToProtection(protection, emails) {
  const uniqueEmails = [];

  mergeEditors(uniqueEmails, emails);

  uniqueEmails.forEach(email => {
    if (!email) {
      return;
    }

    try {
      protection.addEditor(email);
    } catch (error) {
      Logger.log(`    ⚠️  無法添加編輯者 ${email}: ${error.message}`);
    }
  });
}

function resetProtectionEditors(protection) {
  try {
    protection.setDomainEdit(false);
  } catch (error) {
    Logger.log(`    ⚠️  無法關閉網域編輯: ${error.message}`);
  }

  protection.getEditors().forEach(editor => {
    try {
      protection.removeEditor(editor);
    } catch (error) {
      Logger.log(`    ⚠️  無法移除編輯者 ${editor.getEmail()}: ${error.message}`);
    }
  });
}

function mergeEditors(targetList, emails) {
  emails.forEach(email => {
    if (!email) {
      return;
    }

    if (targetList.indexOf(email) === -1) {
      targetList.push(email);
    }
  });
}

function buildRangeFromSpec(sheet, specKey) {
  if (specKey === "A:F") {
    return sheet.getRange("A:F");
  }

  if (specKey === "1:6") {
    const lastColumn = Math.max(sheet.getMaxColumns(), 1);
    return sheet.getRange(1, 1, 6, lastColumn);
  }

  if (specKey === "38:975") {
    const lastColumn = Math.max(sheet.getMaxColumns(), 1);
    const maxRows = sheet.getMaxRows();
    const startRow = 38;
    const endRow = Math.min(975, maxRows);

    if (endRow < startRow) {
      throw new Error(`工作表列數不足，無法建立 ${specKey}`);
    }

    return sheet.getRange(startRow, 1, endRow - startRow + 1, lastColumn);
  }

  throw new Error(`未支援的範圍規格: ${specKey}`);
}

function getRangeSpecKey(sheet, range) {
  const startRow = range.getRow();
  const endRow = startRow + range.getNumRows() - 1;
  const startColumn = range.getColumn();
  const endColumn = startColumn + range.getNumColumns() - 1;
  const maxColumns = sheet.getMaxColumns();

  if (startColumn === 1 && endColumn === 6 && startRow === 1 && endRow === sheet.getMaxRows()) {
    return "A:F";
  }

  if (startColumn === 1 && endColumn === maxColumns && startRow === 1 && endRow === 6) {
    return "1:6";
  }

  if (startColumn === 1 && endColumn === maxColumns && startRow === 38 && endRow === Math.min(975, sheet.getMaxRows())) {
    return "38:975";
  }

  return null;
}

/**
 * 第 3 步：驗證所有權限設定
 */
function verifyPermissions() {
  Logger.log("\n========== 權限驗證報告 ==========");
  
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const file = DriveApp.getFileById(SHEET_ID);
    
    // 檢查文件級別的權限
    const editors = file.getEditors();
    Logger.log(`\n📄 檔案級別權限 (編輯者總數: ${editors.length})`);
    const targetIsEditor = editors.some(e => e.getEmail() === TARGET_EMAIL);
    Logger.log(`   ${TARGET_EMAIL}: ${targetIsEditor ? '✅ 有編輯權限' : '❌ 無編輯權限'}`);
    
    ss.getSheets().forEach(sheet => {
      const sheetProtections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
      const rangeProtections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);

      Logger.log(`\n📄 工作表: ${sheet.getName()}`);
      Logger.log(`   主表保護數量: ${sheetProtections.length}`);
      Logger.log(`   範圍保護數量: ${rangeProtections.length}`);

      sheetProtections.forEach(protection => {
        const editors = protection.getEditors().map(editor => editor.getEmail()).join(", ");
        Logger.log(`   主表編輯者: ${editors || "無"}`);
      });

      rangeProtections.forEach(protection => {
        const range = protection.getRange();
        const editors = protection.getEditors().map(editor => editor.getEmail()).join(", ");
        Logger.log(`   - ${range.getA1Notation()} => ${editors || "無"}`);
      });
    });
    
  } catch (error) {
    Logger.log(`❌ 驗證失敗: ${error.message}`);
  }
}

/**
 * 工具函數：取消所有保護（如需復原）
 */
function removeAllProtections() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const protections = ss.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  
  Logger.log(`取消 ${protections.length} 個受保護範圍...`);
  
  protections.forEach((protection, index) => {
    try {
      protection.remove();
      Logger.log(`✅ 已取消: ${index + 1}/${protections.length}`);
    } catch (error) {
      Logger.log(`❌ 取消失敗 (${index + 1}): ${error.message}`);
    }
  });
}

/**
 * 工具函數：移除目標用戶的所有編輯權限
 */
function revokeAllPermissions() {
  try {
    // 移除檔案級別的權限
    const file = DriveApp.getFileById(SHEET_ID);
    file.removeEditor(TARGET_EMAIL);
    Logger.log(`✅ 已移除檔案級別的編輯權限`);
    
    // 移除所有範圍級別的權限
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const protections = ss.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    
    protections.forEach(protection => {
      try {
        protection.removeEditor(TARGET_EMAIL);
      } catch (error) {
        // 忽略移除失敗的情況
      }
    });
    
    Logger.log(`✅ 已移除所有範圍級別的編輯權限`);
    
  } catch (error) {
    Logger.log(`❌ 移除權限失敗: ${error.message}`);
  }
}
