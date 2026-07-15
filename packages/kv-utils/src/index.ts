/**
 * @chhsban/kv-utils
 * 
 * Cloudflare Workers KV 操作层统一导出
 * 提供认证、学生、教师数据的管理接口
 */

// Types
export * from "./types/index.js";

// Auth Manager
export { AuthKVManager, createAuthKVManager } from "./auth/index.js";

// Teacher Email Verification (OAuth Helper)
export * from "./teacher-verify.js";

// Student Manager
export { StudentKVManager, createStudentKVManager } from "./student/index.js";

// Teacher Manager
export { TeacherKVManager, createTeacherKVManager } from "./teacher/index.js";

/**
 * 便捷导入示例：
 *
 * import {
 *   createAuthKVManager,
 *   createStudentKVManager,
 *   createTeacherKVManager,
 *   type SessionToken,
 *   type StudentRecord,
 *   type TeacherRecord,
 *   KV_CONFIG
 * } from '@chhsban/kv-utils';
 *
 * // 在 Worker 中使用
 * export default {
 *   async fetch(request: Request, env: Env): Promise<Response> {
 *     const authManager = createAuthKVManager(env.AUTH_KV);
 *     const studentManager = createStudentKVManager(env.STUDENT_KV);
 *     const teacherManager = createTeacherKVManager(env.TEACHER_KV);
 *
 *     // 创建会话
 *     const session = await authManager.createSession(
 *       'T001',
 *       'John Doe',
 *       'teacher'
 *     );
 *
 *     // 获取学生列表
 *     const students = await studentManager.getStudentsByClass('J1A');
 *
 *     return new Response(JSON.stringify({ session, students }));
 *   }
 * };
 */
