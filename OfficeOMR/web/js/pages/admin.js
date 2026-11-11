/**
 * Super Admin 管理员页面
 */

class AdminPage {
  constructor(container, authFlow, firestore) {
    this.container = container;
    this.authFlow = authFlow;
    this.firestore = firestore;
    this.currentTab = 'orgs'; // 默认标签页
  }

  /**
   * 渲染管理员页面
   */
  async render() {
    const user = this.authFlow.auth.currentUser;
    const claims = await this.authFlow.getCurrentUserClaims();
    
    this.container.innerHTML = `
      <div class="page admin-page">
        <div class="header">
          <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
            <div>
              <h1>OfficeOMR 管理后台</h1>
              <p>Super Admin 权限</p>
            </div>
            <button id="admin-logout-btn" class="logout-btn">退出登录</button>
          </div>
        </div>
        
        <div class="content">
          <!-- 用户信息 -->
          <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <div style="font-size: 13px; color: #666;">
              <p>📧 邮箱: <strong>${user.email}</strong></p>
              <p>👤 角色: <strong>Super Admin</strong></p>
              <p>🆔 UID: <strong>${user.uid}</strong></p>
            </div>
          </div>
          
          <!-- 标签页导航 -->
          <div class="tabs">
            <button class="tab-btn active" data-tab="orgs">
              <span>🏢 组织管理</span>
            </button>
            <button class="tab-btn" data-tab="teachers">
              <span>👨‍🏫 教师管理</span>
            </button>
            <button class="tab-btn" data-tab="settings">
              <span>⚙️ 系统设置</span>
            </button>
          </div>
          
          <!-- 组织管理标签页 -->
          <div id="orgs-tab" class="tab-content active">
            <h2>组织管理</h2>
            <p style="color: #666; font-size: 13px; margin-bottom: 15px;">
              查看和管理系统中的所有组织
            </p>
            
            <div id="orgs-list" style="background: white; border-radius: 6px; border: 1px solid #ddd; overflow: hidden;">
              <div style="padding: 15px; text-align: center; color: #999;">
                加载中...
              </div>
            </div>
          </div>
          
          <!-- 教师管理标签页 -->
          <div id="teachers-tab" class="tab-content" style="display: none;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
              <div>
                <h2 style="margin: 0;">教师管理</h2>
                <p style="color: #666; font-size: 13px; margin: 5px 0 0 0;">
                  管理教师账户和权限
                </p>
              </div>
              <button id="add-teacher-btn" class="btn-primary" style="padding: 8px 16px; background: #5e7ce0; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">
                + 新增教师
              </button>
            </div>
            
            <div id="teachers-list" style="background: white; border-radius: 6px; border: 1px solid #ddd; overflow: hidden;">
              <div style="padding: 15px; text-align: center; color: #999;">
                加载中...
              </div>
            </div>
          </div>
          
          <!-- 系统设置标签页 -->
          <div id="settings-tab" class="tab-content" style="display: none;">
            <h2>系统设置</h2>
            <p style="color: #666; font-size: 13px; margin-bottom: 15px;">
              全局配置参数
            </p>
            
            <div id="settings-list" style="background: white; border-radius: 6px; border: 1px solid #ddd; overflow: hidden;">
              <div style="padding: 15px; text-align: center; color: #999;">
                加载中...
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // 事件监听
    const logoutBtn = this.container.querySelector('#admin-logout-btn');
    logoutBtn.addEventListener('click', () => this.handleLogout());
    
    // 标签页切换
    const tabBtns = this.container.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.currentTarget.dataset.tab));
    });
    
    // 新增教师按钮
    const addTeacherBtn = this.container.querySelector('#add-teacher-btn');
    if (addTeacherBtn) {
      addTeacherBtn.addEventListener('click', () => this.showAddTeacherModal());
    }
    
    // 加载数据
    await this.loadOrgs();
    await this.loadTeachers();
    await this.loadSettings();
  }

  /**
   * 加载组织列表
   */
  async loadOrgs() {
    try {
      const orgsRef = this.firestore.collection('orgs');
      const snapshot = await orgsRef.get();
      
      const orgsList = this.container.querySelector('#orgs-list');
      
      if (snapshot.empty) {
        orgsList.innerHTML = '<div style="padding: 15px; text-align: center; color: #999;">暂无组织</div>';
        return;
      }
      
      let html = '<table style="width: 100%; border-collapse: collapse;">';
      html += '<thead><tr style="background: #f5f5f5; border-bottom: 1px solid #ddd;">';
      html += '<th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600;">组织名称</th>';
      html += '<th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600;">代号</th>';
      html += '<th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600;">状态</th>';
      html += '</tr></thead><tbody>';
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const status = data.active ? '✅ 活跃' : '❌ 停用';
        html += `<tr style="border-bottom: 1px solid #eee;">`;
        html += `<td style="padding: 12px; font-size: 13px;">${data.name}</td>`;
        html += `<td style="padding: 12px; font-size: 13px;"><code>${data.code}</code></td>`;
        html += `<td style="padding: 12px; font-size: 13px;">${status}</td>`;
        html += `</tr>`;
      });
      
      html += '</tbody></table>';
      orgsList.innerHTML = html;
    } catch (error) {
      console.error("❌ Failed to load orgs:", error);
      this.container.querySelector('#orgs-list').innerHTML = 
        `<div style="padding: 15px; color: #c62828;">❌ 加载失败: ${error.message}</div>`;
    }
  }

  /**
   * 加载教师列表
   */
  async loadTeachers() {
    try {
      const allowedUsersRef = this.firestore.collection('allowedUsers')
        .where('role', '==', 'teacher');
      const snapshot = await allowedUsersRef.get();
      
      const teachersList = this.container.querySelector('#teachers-list');
      
      if (snapshot.empty) {
        teachersList.innerHTML = '<div style="padding: 15px; text-align: center; color: #999;">暂无教师</div>';
        return;
      }
      
      let html = '<table style="width: 100%; border-collapse: collapse;">';
      html += '<thead><tr style="background: #f5f5f5; border-bottom: 1px solid #ddd;">';
      html += '<th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600;">邮箱</th>';
      html += '<th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600;">所属组织</th>';
      html += '<th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600;">状态</th>';
      html += '</tr></thead><tbody>';
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const status = data.active ? '✅ 活跃' : '❌ 停用';
        html += `<tr style="border-bottom: 1px solid #eee;">`;
        html += `<td style="padding: 12px; font-size: 13px;">${data.email}</td>`;
        html += `<td style="padding: 12px; font-size: 13px;"><code>${data.orgId}</code></td>`;
        html += `<td style="padding: 12px; font-size: 13px;">${status}</td>`;
        html += `</tr>`;
      });
      
      html += '</tbody></table>';
      teachersList.innerHTML = html;
    } catch (error) {
      console.error("❌ Failed to load teachers:", error);
      this.container.querySelector('#teachers-list').innerHTML = 
        `<div style="padding: 15px; color: #c62828;">❌ 加载失败: ${error.message}</div>`;
    }
  }

  /**
   * 加载系统设置
   */
  async loadSettings() {
    try {
      const settingsRef = this.firestore.collection('settings').doc('global');
      const doc = await settingsRef.get();
      
      const settingsList = this.container.querySelector('#settings-list');
      
      if (!doc.exists) {
        settingsList.innerHTML = '<div style="padding: 15px; text-align: center; color: #999;">暂无设置</div>';
        return;
      }
      
      const data = doc.data();
      
      let html = '<table style="width: 100%; border-collapse: collapse;">';
      html += '<thead><tr style="background: #f5f5f5; border-bottom: 1px solid #ddd;">';
      html += '<th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600;">参数</th>';
      html += '<th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600;">值</th>';
      html += '</tr></thead><tbody>';
      
      for (const [key, value] of Object.entries(data)) {
        const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        html += `<tr style="border-bottom: 1px solid #eee;">`;
        html += `<td style="padding: 12px; font-size: 13px; font-weight: 500;">${key}</td>`;
        html += `<td style="padding: 12px; font-size: 13px;"><code>${displayValue}</code></td>`;
        html += `</tr>`;
      }
      
      html += '</tbody></table>';
      settingsList.innerHTML = html;
    } catch (error) {
      console.error("❌ Failed to load settings:", error);
      this.container.querySelector('#settings-list').innerHTML = 
        `<div style="padding: 15px; color: #c62828;">❌ 加载失败: ${error.message}</div>`;
    }
  }

  /**
   * 切换标签页
   */
  switchTab(tabName) {
    // 隐藏所有标签页
    const tabContents = this.container.querySelectorAll('.tab-content');
    tabContents.forEach(tab => {
      tab.style.display = 'none';
    });
    
    // 移除所有标签页按钮的活跃状态
    const tabBtns = this.container.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.classList.remove('active');
    });
    
    // 显示选中的标签页
    const selectedTab = this.container.querySelector(`#${tabName}-tab`);
    if (selectedTab) {
      selectedTab.style.display = 'block';
    }
    
    // 标记选中的按钮
    const selectedBtn = this.container.querySelector(`[data-tab="${tabName}"]`);
    if (selectedBtn) {
      selectedBtn.classList.add('active');
    }
    
    this.currentTab = tabName;
  }

  /**
   * 处理登出
   */
  async handleLogout() {
    try {
      await this.authFlow.logout();
    } catch (error) {
      console.error("❌ Logout failed:", error);
      alert("登出失败: " + error.message);
    }
  }

  /**
   * 显示新增教师模态框
   */
  showAddTeacherModal() {
    // 创建模态框 HTML
    const modalHtml = `
      <div id="add-teacher-modal" class="modal" style="display: flex; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
        <div class="modal-content" style="background: white; border-radius: 8px; padding: 24px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; font-size: 18px;">新增教师</h3>
            <button id="modal-close-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
          </div>
          
          <form id="add-teacher-form" style="display: flex; flex-direction: column; gap: 15px;">
            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 5px;">邮箱 *</label>
              <input type="email" id="teacher-email" placeholder="teacher@example.com" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; box-sizing: border-box;">
            </div>
            
            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 5px;">所属组织 *</label>
              <select id="teacher-orgId" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; box-sizing: border-box;">
                <option value="">-- 选择组织 --</option>
              </select>
            </div>
            
            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 5px;">状态</label>
              <select id="teacher-active" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; box-sizing: border-box;">
                <option value="true">✅ 活跃</option>
                <option value="false">❌ 停用</option>
              </select>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
              <button type="button" id="modal-cancel-btn" style="padding: 8px 16px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 13px;">取消</button>
              <button type="submit" style="padding: 8px 16px; background: #5e7ce0; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">添加</button>
            </div>
          </form>
          
          <div id="modal-error" style="margin-top: 15px; padding: 10px; border-radius: 4px; color: #c62828; background: #ffebee; display: none; font-size: 13px;"></div>
        </div>
      </div>
    `;
    
    // 插入模态框到页面
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = document.getElementById('add-teacher-modal');
    const closeBtn = document.getElementById('modal-close-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');
    const form = document.getElementById('add-teacher-form');
    const orgSelect = document.getElementById('teacher-orgId');
    
    // 加载组织列表到下拉框
    this.loadOrgsToSelect(orgSelect);
    
    // 关闭模态框
    const closeModal = () => {
      modal.remove();
    };
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    
    // 提交表单
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddTeacher();
    });
  }

  /**
   * 加载组织列表到下拉框
   */
  async loadOrgsToSelect(selectElement) {
    try {
      const snapshot = await this.firestore.collection('orgs').get();
      
      selectElement.innerHTML = '<option value="">-- 选择组织 --</option>';
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const option = document.createElement('option');
        option.value = data.code;
        option.textContent = `${data.name} (${data.code})`;
        selectElement.appendChild(option);
      });
    } catch (error) {
      console.error("❌ Failed to load orgs:", error);
    }
  }

  /**
   * 处理添加教师
   */
  async handleAddTeacher() {
    const email = document.getElementById('teacher-email').value.trim();
    const orgId = document.getElementById('teacher-orgId').value;
    const active = document.getElementById('teacher-active').value === 'true';
    const errorDiv = document.getElementById('modal-error');
    
    // 验证
    if (!email || !orgId) {
      errorDiv.textContent = '❌ 邮箱和组织不能为空';
      errorDiv.style.display = 'block';
      return;
    }
    
    try {
      errorDiv.style.display = 'none';
      
      // 添加到 allowedUsers 集合
      await this.firestore.collection('allowedUsers').add({
        email: email,
        role: 'teacher',
        orgId: orgId,
        active: active,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // 关闭模态框并刷新列表
      document.getElementById('add-teacher-modal').remove();
      await this.loadTeachers();
      alert('✅ 教师添加成功！');
    } catch (error) {
      console.error("❌ Failed to add teacher:", error);
      errorDiv.textContent = `❌ 添加失败: ${error.message}`;
      errorDiv.style.display = 'block';
    }
  }
}
