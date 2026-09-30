/**
 * 依「學號」（student_no，例如 "20258"）查詢學生。
 *
 * 資料來源是學生名錄：students_KV 的 students_by_no（student-sync Worker 從 SMS 定期同步、並經官方名單核對，
 * 見 packages/kv-utils 的 StudentDirectory）。整份名錄只讀 1 次 KV，Worker 內快取 60 秒，
 * 批次加人時幾百個學號也只需要 1 次讀取。
 *
 * 學生不會被刪除：離校的 status 為 "left"（呼叫端擋下，不能再加入名冊）、STAR 班為 "excluded"（照常可加入）。
 * 只用學號查，避免輸入內部編號時誤把 student_id 當成學號存進名冊。
 */
import { createStudentDirectory, isLeftSchool, studentStatus, type DirectoryStudent } from "@chhsban/kv-utils";

export type FullStudentRecord = DirectoryStudent;

export { isLeftSchool, studentStatus };

export async function findStudentByNo(
  studentKV: KVNamespace,
  studentNo: string,
): Promise<FullStudentRecord | null> {
  const student = await createStudentDirectory(studentKV as any).getByNo(studentNo);
  if (!student || !student.student_id) return null;
  return student;
}

/** 學生名錄的班級欄位是 real_class_name */
export function getStudentClass(student: Partial<FullStudentRecord>): string {
  return student.real_class_name || (student as any).class || student.input_class_name || "-";
}
