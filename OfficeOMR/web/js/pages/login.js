/**
 * 登入页面模块
 */

class LoginPage {
  constructor(container, authFlow) {
    this.container = container;
    this.authFlow = authFlow;
  }

  /**
   * 渲染登入页面
   */
  render() {
    this.container.innerHTML = `
      <div class="page login-page">
        <div class="header">
          <h1>OfficeOMR</h1>
          <p>答题纸识别系统</p>
        </div>
        
        <div class="content">
          <div id="login-section">
            <div class="login-description">
              <p>欢迎使用 OfficeOMR 管理系统</p>
              <p style="font-size: 12px; color: #999; margin-top: 8px;">
                使用 Google 账号登录后，系统将检查您是否已获得授权
              </p>
            </div>
            
            <button id="google-signin-btn" class="google-btn">
              <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18">
                <path fill="#1f2937" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              使用 Google 登录
            </button>
            
            <div id="login-message" style="display: none; margin-top: 15px; padding: 12px; border-radius: 6px; text-align: center; font-size: 14px;"></div>
          </div>
        </div>
      </div>
    `;
    
    // 事件监听
    const signInBtn = this.container.querySelector('#google-signin-btn');
    signInBtn.addEventListener('click', () => this.handleSignIn());
  }

  /**
   * 处理登录
   */
  async handleSignIn() {
    const btn = this.container.querySelector('#google-signin-btn');
    const messageDiv = this.container.querySelector('#login-message');
    
    try {
      btn.disabled = true;
      btn.textContent = '正在登录...';
      messageDiv.style.display = 'none';
      
      const user = await this.authFlow.googleSignIn();
      
      // 获取 ID Token 并调用 claimAccess
      const idToken = await user.getIdToken();
      const accessResult = await this.authFlow.claimAccess(idToken);
      
      if (accessResult.error) {
        // 若已具备有效角色（例如以 tools/bootstrap_admin.py 建立的 super_admin），
        // 千万不要登出 —— 交给 app.js 依 claims 显示对应页面
        const existingClaims = await this.authFlow.getCurrentUserClaims();
        if (existingClaims && existingClaims.role) {
          messageDiv.innerHTML = '<span style="color: #2e7d32;">✅ 登录成功，正在加载...</span>';
          messageDiv.style.display = 'block';
          btn.disabled = false;
          btn.textContent = '使用 Google 登录';
          if (window.app && typeof window.app.refreshRouting === 'function') {
            await window.app.refreshRouting();
          }
          return;
        }

        // 权限被拒
        this.showNotApprovedMessage(user.email, messageDiv);
        
        // 自动登出
        setTimeout(() => {
          this.authFlow.logout();
          btn.disabled = false;
          btn.textContent = '使用 Google 登录';
        }, 3000);
      } else {
        // 权限已获准：强制刷新 ID token，让 claimAccess 刚写入的 custom claims 生效，
        // 然后重新路由 —— 否则 Firebase 不会再触发 onAuthStateChanged，会一直停在登录页
        messageDiv.innerHTML = '<span style="color: #2e7d32;">✅ 登录成功，正在加载...</span>';
        messageDiv.style.display = 'block';

        try {
          await user.getIdToken(true);
        } catch (e) {
          console.warn('ID token refresh failed:', e);
        }
        if (window.app && typeof window.app.refreshRouting === 'function') {
          await window.app.refreshRouting();
        }
      }
    } catch (error) {
      console.error("登录失败:", error);
      messageDiv.innerHTML = `<span style="color: #c62828;">❌ 登录失败: ${error.message}</span>`;
      messageDiv.style.display = 'block';
      
      btn.disabled = false;
      btn.textContent = '使用 Google 登录';
    }
  }

  /**
   * 显示"未授权"消息
   */
  showNotApprovedMessage(email, messageDiv) {
    messageDiv.innerHTML = `
      <div>
        <strong>❌ 账户未授权</strong>
        <p style="margin-top: 8px; font-size: 13px;">
          您使用的邮箱 <strong>${email}</strong> 尚未在系统中获得授权。
        </p>
        <p style="margin-top: 8px; font-size: 13px;">
          请向管理员申请开通权限，然后重新登录。
        </p>
      </div>
    `;
    messageDiv.style.display = 'block';
    messageDiv.style.background = '#ffebee';
    messageDiv.style.borderLeft = '4px solid #c62828';
  }
}
