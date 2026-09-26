/**
 * 依「學號」（student_no，例如 "20258"）查詢學生。
 *
 * STUDENT_KV 對同一位學生存在兩種 key 慣例（見 chhsban-tution/src/index.ts 的說明）：
 * - student:{student_no}：SMS 同步寫入的原始完整資料，含 student_no / real_class_name 等欄位
 * - student:{student_id}：另一批只含核心欄位的精簡資料（沒有 student_no，student_id 是內部編號如 "4775"）
 *
 * 老師輸入的是學號，所以直接 get `student:{學號}` 一次即可拿到完整資料，
 * 不需要（也不能）全表掃描建索引——STUDENT_KV 有數千筆 key，逐筆 get 會超過
 * Worker 單次請求的 subrequest 上限，導致 Worker 直接崩潰、回應不帶 CORS header。
 *
 * 只接受 record.student_no 與輸入完全相符的資料，避免輸入內部編號時誤命中精簡版記錄，
 * 把 student_id 當成學號存進名冊。
 */
import type { StudentRecord } from "@chhsban/kv-utils";

export interface FullStudentRecord extends StudentRecord {
  student_no: string;
  real_class_name?: string;
  input_class_name?: string;
}

export async function findStudentByNo(
  studentKV: KVNamespace,
  studentNo: string,
): Promise<FullStudentRecord | null> {
  const raw = await studentKV.get(`student:${studentNo}`);
  if (!raw) return null;

  try {
    const student = JSON.parse(raw) as Partial<FullStudentRecord>;
    if (student.student_no !== studentNo || !student.student_id) return null;
    return student as FullStudentRecord;
  } catch {
    return null;
  }
}

/** 完整資料的班級欄位是 real_class_name，精簡版才有 class */
export function getStudentClass(student: Partial<FullStudentRecord>): string {
  return student.real_class_name || student.class || student.input_class_name || "-";
}
