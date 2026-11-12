/**
 * M7 教师流程 - 前端 API 调用模块
 * 
 * 提供与 M7 Cloud Functions 通信的接口
 * 功能: 答案上传、自动评分、数据清理
 */

class M7Service {
  constructor(functions, firestore) {
    this.functions = functions;
    this.firestore = firestore;
    
    // 设置 Firebase Functions 区域
    if (location.hostname === 'localhost') {
      this.functions.region = 'us-central1';
      console.log('🔧 M7Service: 开发模式 (localhost)');
    } else {
      this.functions.region = 'us-central1';
      console.log('🔧 M7Service: 生产模式');
    }
  }

  /**
   * 上传标准答案 - 扫描模式
   * 
   * @param {string} jobId - 工作 ID
   * @param {Blob} imageBlob - 标准答案卡图片
   * @returns {Promise<Object>} {success, answerKey, scanConfidence, error}
   */
  async uploadAnswerKeyByImage(jobId, imageBlob) {
    try {
      console.log('📷 M7Service: uploadAnswerKeyByImage', { jobId });
      
      // 转换图片为 Base64
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });
      reader.readAsArrayBuffer(imageBlob);
      
      const arrayBuffer = await base64Promise;
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const imageBase64 = btoa(binary);
      
      // 调用 Cloud Function
      const callable = this.functions.httpsCallable('uploadAnswerKeyByImage');
      const result = await callable({
        jobId: jobId,
        imageBytes: imageBase64
      });
      
      console.log('✅ uploadAnswerKeyByImage 成功:', result.data);
      return result.data;
      
    } catch (error) {
      console.error('❌ uploadAnswerKeyByImage 失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 上传标准答案 - 手动模式
   * 
   * @param {string} jobId - 工作 ID
   * @param {Array<string>} answers - 答案数组 ['A', 'C', 'B', ...]
   * @param {string} format - 格式: 'array' | 'json' | 'csv'
   * @returns {Promise<Object>} {success, answerKey, error}
   */
  async uploadAnswerKeyManually(jobId, answers, format = 'array') {
    try {
      console.log('📝 M7Service: uploadAnswerKeyManually', { jobId, count: answers.length });
      
      // 调用 Cloud Function
      const callable = this.functions.httpsCallable('uploadAnswerKeyManually');
      const result = await callable({
        jobId: jobId,
        answers: answers,
        format: format
      });
      
      console.log('✅ uploadAnswerKeyManually 成功:', result.data);
      return result.data;
      
    } catch (error) {
      console.error('❌ uploadAnswerKeyManually 失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 查询标准答案
   * 
   * @param {string} jobId - 工作 ID
   * @returns {Promise<Object>} {success, answerKey, frozen, uploadedAt, error}
   */
  async getAnswerKey(jobId) {
    try {
      console.log('🔍 M7Service: getAnswerKey', { jobId });
      
      // 调用 Cloud Function
      const callable = this.functions.httpsCallable('getAnswerKey');
      const result = await callable({
        jobId: jobId
      });
      
      console.log('✅ getAnswerKey 成功:', {
        answerCount: result.data.answerKey?.data?.length,
        frozen: result.data.frozen
      });
      return result.data;
      
    } catch (error) {
      console.error('❌ getAnswerKey 失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 识别并评分学生答案卡
   * 
   * @param {string} jobId - 工作 ID
   * @param {Blob} imageBlob - 学生答案卡图片
   * @returns {Promise<Object>} {success, studentId, score, correctness, gradedAt, error}
   */
  async recognizeAndGradeSheet(jobId, imageBlob) {
    try {
      console.log('✏️  M7Service: recognizeAndGradeSheet', { jobId });
      
      // 转换图片为 Base64
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });
      reader.readAsArrayBuffer(imageBlob);
      
      const arrayBuffer = await base64Promise;
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const imageBase64 = btoa(binary);
      
      // 调用 Cloud Function
      const callable = this.functions.httpsCallable('recognizeAndGradeSheet');
      const result = await callable({
        jobId: jobId,
        imageBytes: imageBase64
      });
      
      console.log('✅ recognizeAndGradeSheet 成功:', {
        studentId: result.data.studentId,
        score: result.data.score,
        correct: result.data.correctness?.filter(c => c === 'correct').length
      });
      return result.data;
      
    } catch (error) {
      console.error('❌ recognizeAndGradeSheet 失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 批量识别并评分
   * 
   * @param {string} jobId - 工作 ID
   * @param {Array<Blob>} imageBlobs - 多张答案卡图片
   * @returns {Promise<Object>} {success, results, succeeded, failed, error}
   */
  async batchRecognizeSheets(jobId, imageBlobs) {
    try {
      console.log('📦 M7Service: batchRecognizeSheets', { 
        jobId, 
        imageCount: imageBlobs.length 
      });
      
      // 转换所有图片为 Base64
      const base64Images = await Promise.all(
        imageBlobs.map(blob => this.blobToBase64(blob))
      );
      
      // 调用 Cloud Function
      const callable = this.functions.httpsCallable('batchRecognizeSheets');
      const result = await callable({
        jobId: jobId,
        imageBytesList: base64Images
      });
      
      console.log('✅ batchRecognizeSheets 成功:', {
        succeeded: result.data.succeeded,
        failed: result.data.failed
      });
      return result.data;
      
    } catch (error) {
      console.error('❌ batchRecognizeSheets 失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 手动触发 24 小时清理
   * (通常由 Cloud Scheduler 自动触发，仅用于测试)
   * 
   * @param {string} jobId - 工作 ID
   * @returns {Promise<Object>} {success, deletedPaths, answerKeyVerified, error}
   */
  async cleanupJobStudentData(jobId) {
    try {
      console.log('🗑️  M7Service: cleanupJobStudentData', { jobId });
      
      // 调用 Cloud Function
      const callable = this.functions.httpsCallable('cleanupJobStudentData');
      const result = await callable({
        jobId: jobId
      });
      
      console.log('✅ cleanupJobStudentData 成功:', {
        deletedPaths: result.data.deletedPaths?.length,
        answerKeyVerified: result.data.answerKeyVerified
      });
      return result.data;
      
    } catch (error) {
      console.error('❌ cleanupJobStudentData 失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 辅助方法：将 Blob 转换为 Base64
   */
  async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result;
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        resolve(btoa(binary));
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }

  /**
   * 获取工作相关的学生成绩列表
   */
  async getJobResults(jobId) {
    try {
      const jobDoc = await this.firestore
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        return { success: false, error: 'Job not found' };
      }
      
      const results = jobDoc.data().result?.sheets || [];
      return {
        success: true,
        results: results
      };
      
    } catch (error) {
      console.error('❌ getJobResults 失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取工作信息（包括 answerKey 元数据）
   */
  async getJobInfo(jobId) {
    try {
      const jobDoc = await this.firestore
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        return { success: false, error: 'Job not found' };
      }
      
      const data = jobDoc.data();
      return {
        success: true,
        jobId: jobId,
        examName: data.examName,
        subject: data.subject,
        grade: data.grade,
        answerKeyMetadata: {
          frozen: data.answerKey?.frozen,
          source: data.answerKey?.source,
          uploadedAt: data.answerKey?.uploadedAt,
          scanConfidence: data.answerKey?.scanConfidence
        },
        studentCount: data.result?.sheets?.length || 0,
        expiresAt: data.expiresAt
      };
      
    } catch (error) {
      console.error('❌ getJobInfo 失败:', error);
      return { success: false, error: error.message };
    }
  }
}

// 导出服务
if (typeof module !== 'undefined' && module.exports) {
  module.exports = M7Service;
}
