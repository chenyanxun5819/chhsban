/**
 * 认证流程模块
 * 处理 Google 登入、权限检查、自定义声明设置
 */

class AuthFlow {
  constructor(auth, firestore, functions) {
    this.auth = auth;
    this.firestore = firestore;
    this.functions = functions;
    this.currentUser = null;
  }

  /**
   * 使用 Google Sign-In 登录
   */
  async googleSignIn() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      
      const result = await this.auth.signInWithPopup(provider);
      console.log("✅ Google sign-in successful:", result.user.email);
      
      return result.user;
    } catch (error) {
      console.error("❌ Google sign-in failed:", error);
      throw error;
    }
  }

  /**
   * 发起 claimAccess 请求（获取权限）
   * 返回 { role, orgId } 或 { error: 'NOT_APPROVED' }
   */
  async claimAccess(idToken) {
    try {
      const claimAccessCallable = this.functions.httpsCallable('claimAccess');
      const result = await claimAccessCallable({ token: idToken });
      
      console.log("✅ claimAccess result:", result.data);
      return result.data;
    } catch (error) {
      console.error("❌ claimAccess failed:", error);
      
      // 提取错误消息
      const errorCode = error.code;
      const errorMessage = error.message;
      
      return {
        error: errorCode || 'UNKNOWN_ERROR',
        message: errorMessage || 'Unknown error'
      };
    }
  }

  /**
   * 获取当前用户的 custom claims
   */
  async getCurrentUserClaims() {
    const user = this.auth.currentUser;
    if (!user) {
      return null;
    }

    const idTokenResult = await user.getIdTokenResult(true);
    return idTokenResult.claims;
  }

  /**
   * 检查用户角色
   */
  async hasRole(expectedRole) {
    const claims = await this.getCurrentUserClaims();
    return claims && claims.role === expectedRole;
  }

  /**
   * 获取用户所属组织
   */
  async getUserOrgId() {
    const claims = await this.getCurrentUserClaims();
    return claims ? claims.orgId : null;
  }

  /**
   * 登出
   */
  async logout() {
    try {
      await this.auth.signOut();
      console.log("✅ Logged out");
    } catch (error) {
      console.error("❌ Logout failed:", error);
      throw error;
    }
  }

  /**
   * 监听认证状态变化
   */
  onAuthStateChanged(callback) {
    return this.auth.onAuthStateChanged(async (user) => {
      this.currentUser = user;
      
      if (user) {
        const claims = await this.getCurrentUserClaims();
        callback({
          user,
          claims,
          isAuthenticated: true,
          isSuperAdmin: claims && claims.role === 'super_admin',
          isTeacher: claims && claims.role === 'teacher'
        });
      } else {
        callback({
          user: null,
          claims: null,
          isAuthenticated: false,
          isSuperAdmin: false,
          isTeacher: false
        });
      }
    });
  }
}
