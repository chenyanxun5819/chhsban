// Sheet ID - 替換為你的實際 Sheet ID
const SHEET_ID = "1qiO66ja_NAEk0axmZ3hdRMoHY7eD9QofzNfPdeHln04";
const TARGET_EMAIL = "ecchhs110@chhsban.edu.my";

/**
 * 主函數：批量設定所有權限
 */
function setAllPermissions() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  Logger.log("開始設定權限...");
  
  // 1. 設定整個試算表的編輯權限
  setSheetPermission(ss);
  
  // 2. 設定特定範圍的編輯權限
  setRangePermissions(ss);
  
  Logger.log("✅ 所有權限設定完成！");
}

/**
 * 設定整個試算表的編輯權限
 */
function setSheetPermission(ss) {
  try {
    // 取得檔案
    const file = DriveApp.getFileById(SHEET_ID);
    
    // 添加編輯者權限
    file.addEditor(TARGET_EMAIL);
    
    Logger.log(`✅ 已給 ${TARGET_EMAIL} 添加整個試算表的編輯權限`);
  } catch (error) {
    Logger.log(`❌ 設定試算表權限失敗: ${error}`);
  }
}

/**
 * 設定特定範圍的編輯權限
 */
function setRangePermissions(ss) {
  try {
    const sheet = ss.getActiveSheet();
    
    // 定義需要設定權限的範圍
    const rangesToProtect = [
      { range: "A:F", description: "欄 A 到 F" },
      { range: "38:975", description: "行 38 到 975" },
      { range: "1:6", description: "行 1 到 6" }
    ];
    
    for (let i = 0; i < rangesToProtect.length; i++) {
      const rangeInfo = rangesToProtect[i];
      const range = sheet.getRange(rangeInfo.range);
      
      // 創建命名範圍（用於追蹤）
      const namedRange = ss.getRangeByName(`ProtectedRange_${i}`) || 
        ss.setNamedRange(`ProtectedRange_${i}`, range);
      
      // 保護範圍並設定權限
      const protection = range.protect();
      protection.setDescription(`${rangeInfo.description} - ${TARGET_EMAIL} 編輯權限`);
      
      // 設定特定用戶可編輯
      protection.removeEditors(protection.getEditors());
      protection.addEditor(TARGET_EMAIL);
      
      // 所有者保持擁有權
      protection.setDomainEdit(false);
      
      Logger.log(`✅ 已保護範圍: ${rangeInfo.description}，並給予 ${TARGET_EMAIL} 編輯權限`);
    }
  } catch (error) {
    Logger.log(`❌ 設定範圍權限失敗: ${error}`);
  }
}

/**
 * 檢查權限設定狀態
 */
function checkPermissions() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  Logger.log("=== 權限檢查 ===");
  
  // 檢查檔案編輯者
  const file = DriveApp.getFileById(SHEET_ID);
  const editors = file.getEditors();
  
  Logger.log(`檔案編輯者: ${editors.length} 人`);
  for (let i = 0; i < editors.length; i++) {
    Logger.log(`  - ${editors[i].getEmail()}`);
  }
  
  // 檢查受保護的範圍
  const protections = ss.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  Logger.log(`\n受保護的範圍: ${protections.length} 個`);
  
  for (let i = 0; i < protections.length; i++) {
    const protection = protections[i];
    const range = protection.getRange();
    Logger.log(`  範圍: ${range.getA1Notation()}`);
    Logger.log(`  編輯者: ${protection.getEditors().length} 人`);
  }
}

/**
 * 清除特定用戶的受保護範圍權限（如需復原）
 */
function removeUserFromProtectedRanges() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const protections = ss.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  
  Logger.log(`正在移除 ${TARGET_EMAIL} 的保護範圍編輯權限...`);
  
  for (let i = 0; i < protections.length; i++) {
    const protection = protections[i];
    try {
      protection.removeEditor(TARGET_EMAIL);
      Logger.log(`✅ 已移除: ${protection.getRange().getA1Notation()}`);
    } catch (error) {
      Logger.log(`❌ 移除失敗 (${protection.getRange().getA1Notation()}): ${error}`);
    }
  }
}

/**
 * 移除試算表層級的編輯權限（如需復原）
 */
function removeUserFromSheet() {
  try {
    const file = DriveApp.getFileById(SHEET_ID);
    file.removeEditor(TARGET_EMAIL);
    Logger.log(`✅ 已移除 ${TARGET_EMAIL} 的試算表編輯權限`);
  } catch (error) {
    Logger.log(`❌ 移除失敗: ${error}`);
  }
}
