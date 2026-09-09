/**
 * 依「學號」（STUDENT_KV 記錄裡的 student_no 欄位，例如 "21342"）查詢學生。
 *
 * STUDENT_KV 的主鍵是 student_id（例如 "5801"，內部編號），student_no 只是記錄裡的
 * 一個普通欄位，並沒有現成的二級索引可以直接查（chhsban-tution 的程式碼裡雖然有
 * `STUDENT_KV.get('student_no:'+x)` 這種查詢，但整個 repo 從來沒有任何地方寫入過
 * `student_no:` 這個 key，等於是從未真正生效過的死代碼）。
 *
 * 為了讓老師能用學校真正發放的學號搜尋學生，這裡在 optional-course 自己的 KV
 * （不寫入共用的 STUDENT_KV，避免影響其他系統／消耗共用的 KV PUT 額度）快取一份
 * { student_no: student_id } 對照表，帶 TTL 定期重建，而不是每次搜尋都全表掃描
 * STUDENT_KV（約 3000 筆記錄）。
 */
import { createStudentKVManager, type StudentRecord } from "@chhsban/kv-utils";

export interface StudentRecordWithNo extends StudentRecord {
  student_no?: string;
}

const STUDENT_NO_INDEX_KEY = "system:student_no_index";
// 12 小時：略短於 SMS 同步的最短間隔（每週日/二各一次），足夠讓新生資料在合理時間內被索引到，
// 又不會頻繁重建整份索引。
const STUDENT_NO_INDEX_TTL_SECONDS = 12 * 60 * 60;

async function buildStudentNoIndex(studentKV: KVNamespace): Promise<Record<string, string>> {
  const index: Record<string, string> = {};
  let cursor: string | undefined;

  do {
    const result: any = await studentKV.list({ prefix: "student:", cursor });
    const values = await Promise.all(result.keys.map((item: any) => studentKV.get(item.name)));

    for (const raw of values) {
      if (!raw) continue;
      try {
        const student: StudentRecordWithNo = JSON.parse(raw);
        if (student.student_no && student.student_id) {
          index[student.student_no] = student.student_id;
        }
      } catch {
        // 忽略無法解析的壞資料，不中斷整個索引重建
      }
    }

    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);

  return index;
}

/**
 * 依學號查詢學生。找不到快取時才會觸發一次全表掃描重建索引（見上方 TTL 說明），
 * 一般情況下都是查快取，一次 KV get 即可。
 */
export async function findStudentByNo(
  studentKV: KVNamespace,
  cacheKV: KVNamespace,
  studentNo: string,
): Promise<StudentRecordWithNo | null> {
  let index: Record<string, string> | null = null;

  const cached = await cacheKV.get(STUDENT_NO_INDEX_KEY);
  if (cached) {
    try {
      index = JSON.parse(cached);
    } catch {
      index = null;
    }
  }

  if (!index) {
    index = await buildStudentNoIndex(studentKV);
    await cacheKV.put(STUDENT_NO_INDEX_KEY, JSON.stringify(index), {
      expirationTtl: STUDENT_NO_INDEX_TTL_SECONDS,
    });
  }

  const studentId = index[studentNo];
  if (!studentId) return null;

  const studentManager = createStudentKVManager(studentKV);
  return (await studentManager.getStudent(studentId)) as StudentRecordWithNo | null;
}
