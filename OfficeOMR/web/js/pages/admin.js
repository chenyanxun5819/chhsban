/**
 * Super Admin 管理员页面 - 完整功能版
 */

class AdminPage {
  constructor(container, authFlow, firestore) {
    this.container = container;
    this.authFlow = authFlow;
    this.firestore = firestore;
    this.currentTab = 'orgs';
  }

  /**
   * 渲染管理员页面
   */
  async render() {
    const user = this.authFlow.auth.currentUser;
    
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
          <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <div style="font-size: 13px; color: #666;">
              <p>📧 邮箱: <strong>${user.email}</strong></p>
              <p>👤 角色: <strong>Super Admin</strong></p>
              <p>🆔 UID: <strong>${user.uid}</strong></p>
            </div>
          </div>
          
          <div class="tabs">
            <button class="tab-btn active" data-tab="orgs">🏢 组织管理</button>
            <button class="tab-btn" data-tab="teachers">👨‍🏫 教师管理</button>
            <button class="tab-btn" data-tab="settings">⚙️ 系统设置</button>
            <button class="tab-btn" data-tab="usage">📊 用量统计</button>
          </div>
          
          <div id="orgs-tab" class="tab-content active">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
              <div>
                <h2 style="margin: 0;">组织管理</h2>
                <p style="color: #666; font-size: 13px; margin: 5px 0 0 0;">查看和管理系统中的所有组织</p>
              </div>
              <button id="add-org-btn" class="btn-primary" style="padding: 8px 16px; background: #5e7ce0; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">+ 新增组织</button>
            </div>
            <div id="orgs-list" style="background: white; border-radius: 6px; border: 1px solid #ddd; overflow: hidden;">
              <div style="padding: 15px; text-align: center; color: #999;">加载中...</div>
            </div>
          </div>
          
          <div id="teachers-tab" class="tab-content" style="display: none;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
              <div>
                <h2 style="margin: 0;">教师管理</h2>
                <p style="color: #666; font-size: 13px; margin: 5px 0 0 0;">管理教师账户和权限</p>
              </div>
              <button id="add-teacher-btn" class="btn-primary" style="padding: 8px 16px; background: #5e7ce0; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">+ 新增教师</button>
            </div>
            <div id="teachers-list" style="background: white; border-radius: 6px; border: 1px solid #ddd; overflow: hidden;">
              <div style="padding: 15px; text-align: center; color: #999;">加载中...</div>
            </div>
          </div>
          
          <div id="settings-tab" class="tab-content" style="display: none;">
            <h2>系统设置</h2>
            <p style="color: #666; font-size: 13px; margin-bottom: 15px;">全局配置参数</p>
            <div id="settings-form" style="background: white; border-radius: 6px; border: 1px solid #ddd; padding: 20px;">
              <div style="padding: 15px; text-align: center; color: #999;">加载中...</div>
            </div>
          </div>
          
          <div id="usage-tab" class="tab-content" style="display: none;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
              <div>
                <h2 style="margin: 0;">用量统计</h2>
                <p style="color: #666; font-size: 13px; margin: 5px 0 0 0;">今日各教师的使用情况</p>
              </div>
              <button id="refresh-usage-btn" class="btn-primary" style="padding: 8px 16px; background: #5e7ce0; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">🔄 刷新</button>
            </div>
            <div id="usage-list" style="background: white; border-radius: 6px; border: 1px solid #ddd; overflow: hidden;">
              <div style="padding: 15px; text-align: center; color: #999;">加载中...</div>
            </div>
          </div>
        </div>
        
        <div id="modal-container"></div>
      </div>
    `;
    
    this.container.querySelector('#admin-logout-btn').addEventListener('click', () => this.handleLogout());
    this.container.querySelector('#add-org-btn').addEventListener('click', () => this.showAddOrgModal());
    this.container.querySelector('#add-teacher-btn').addEventListener('click', () => this.showAddTeacherModal());
    this.container.querySelector('#refresh-usage-btn').addEventListener('click', () => this.loadUsage());
    
    this.container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.currentTarget.dataset.tab));
    });
    
    await this.loadOrgs();
    await this.loadTeachers();
    await this.loadSettings();
    await this.loadUsage();
  }

  /**
   * 加载组织列表
   */
  async loadOrgs() {
    try {
      const snapshot = await this.firestore.collection('orgs').get();
      const orgsList = this.container.querySelector('#orgs-list');
      
      if (snapshot.empty) {
        orgsList.innerHTML = '<div style="padding: 15px; text-align: center; color: #999;">暂无组织</div>';
        return;
      }
      
      let html = '<table style="width: 100%; border-collapse: collapse;"><thead><tr style="background: #f5f5f5; border-bottom: 1px solid #ddd;">';
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
      console.error('Failed to load orgs:', error);
      this.showError('加载组织失败: ' + error.message);
    }
  }

  /**
   * 加载教师列表
   */
  async loadTeachers() {
    try {
      const snapshot = await this.firestore.collection('allowedUsers')
        .where('role', '==', 'teacher').get();
      const teachersList = this.container.querySelector('#teachers-list');
      
      if (snapshot.empty) {
        teachersList.innerHTML = '<div style="padding: 15px; text-align: center; color: #999;">暂无教师</div>';
        return;
      }
      
      let html = '<table style="width: 100%; border-collapse: collapse;"><thead><tr style="background: #f5f5f5; border-bottom: 1px solid #ddd;">';
      html += '<th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600;">邮箱</th>';
      html += '<th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600;">所属组织</th>';
      html += '<th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600;">状态</th>';
      html += '<th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600;">配额</th>';
      html += '<th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 600;">操作</th>';
      html += '</tr></thead><tbody>';
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const status = data.active ? '✅ 活跃' : '❌ 停用';
        const quota = data.dailyQuota || '-';
        html += `<tr style="border-bottom: 1px solid #eee;">`;
        html += `<td style="padding: 12px; font-size: 13px;">${data.email}</td>`;
        html += `<td style="padding: 12px; font-size: 13px;"><code>${data.orgId || '-'}</code></td>`;
        html += `<td style="padding: 12px; font-size: 13px;">${status}</td>`;
        html += `<td style="padding: 12px; font-size: 13px;"><strong>${quota}</strong></td>`;
        html += `<td style="padding: 12px; text-align: center; font-size: 13px;">`;
        html += `<button class="edit-teacher-btn" data-uid="${doc.id}" style="padding: 4px 12px; margin-right: 4px; background: #667eea; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">编辑</button>`;
        html += `<button class="delete-teacher-btn" data-uid="${doc.id}" style="padding: 4px 12px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">删除</button>`;
        html += `</td></tr>`;
      });
      
      html += '</tbody></table>';
      teachersList.innerHTML = html;
      
      this.container.querySelectorAll('.edit-teacher-btn').forEach(btn => {
        btn.addEventListener('click', (e) => this.showEditTeacherModal(e.currentTarget.dataset.uid));
      });
      this.container.querySelectorAll('.delete-teacher-btn').forEach(btn => {
        btn.addEventListener('click', (e) => this.deleteTeacher(e.currentTarget.dataset.uid));
      });
    } catch (error) {
      console.error('Failed to load teachers:', error);
      this.showError('加载教师列表失败: ' + error.message);
    }
  }

  /**
   * 加载系统设置
   */
  async loadSettings() {
    try {
      const doc = await this.firestore.collection('settings').doc('global').get();
      const settingsForm = this.container.querySelector('#settings-form');
      
      if (!doc.exists) {
        settingsForm.innerHTML = '<div style="padding: 15px; text-align: center; color: #999;">暂无设置</div>';
        return;
      }
      
      const data = doc.data();
      const fields = [
        { key: 'defaultDailySheetsPerUser', label: '每日默认限额（张）', type: 'number' },
        { key: 'studentDataRetentionHours', label: '学生数据保留时长（小时）', type: 'number' },
        { key: 'maxPagesPerUpload', label: '单次上传最多页数', type: 'number' },
        { key: 'maxFileMB', label: '最大文件大小（MB）', type: 'number' },
        { key: 'maxExamsPerTeacher', label: '教师最多考试数', type: 'number' },
        { key: 'maxPaperFileMB', label: '试卷文件最大大小（MB）', type: 'number' }
      ];
      
      let html = '<div style="display: grid; gap: 15px;">';
      fields.forEach(field => {
        const value = data[field.key] || '';
        html += `<div style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; align-items: center;">`;
        html += `<label style="font-size: 13px; font-weight: 500; color: #333;">${field.label}</label>`;
        html += `<input type="number" class="settings-input" data-key="${field.key}" value="${value}" style="padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;" />`;
        html += `</div>`;
      });
      html += '</div>';
      html += `<button id="save-settings-btn" style="margin-top: 20px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600;">保存设置</button>`;
      html += `<div id="settings-status" style="margin-top: 10px; display: none; padding: 10px; border-radius: 4px; font-size: 13px;"></div>`;
      
      settingsForm.innerHTML = html;
      
      this.container.querySelector('#save-settings-btn').addEventListener('click', () => this.saveSettings());
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.showError('加载设置失败: ' + error.message);
    }
  }

  /**
   * 加载用量统计
   */
  async loadUsage() {
    try {
      const usageList = this.container.querySelector('#usage-list');
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      
      const teachersSnapshot = await this.firestore.collection('allowedUsers')
        .where('role', '==', 'teacher').get();
      
      if (teachersSnapshot.empty) {
        usageList.innerHTML = '<div style="padding: 15px; text-align: center; color: #999;">暂无教师</div>';
        return;
      }
      
      let html = '<table style="width: 100%; border-collapse: collapse;"><thead><tr style="background: #f5f5f5; border-bottom: 1px solid #ddd;">';
      html += '<th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600;">教师邮箱</th>';
      html += '<th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600;">所属组织</th>';
      html += '<th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 600;">今日已用</th>';
      html += '<th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 600;">每日限额</th>';
      html += '<th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 600;">剩余</th>';
      html += '<th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 600;">使用率</th>';
      html += '</tr></thead><tbody>';
      
      for (const doc of teachersSnapshot.docs) {
        const teacher = doc.data();
        const uid = doc.id;
        const usageDocId = `${uid}_${today}`;
        
        try {
          const usageDoc = await this.firestore.collection('usage').doc(usageDocId).get();
          const usageData = usageDoc.exists ? usageDoc.data() : { sheetsCount: 0 };
          const used = usageData.sheetsCount || 0;
          const limit = teacher.dailyQuota || 100;
          const remaining = Math.max(0, limit - used);
          const percentage = Math.round((used / limit) * 100);
          
          html += `<tr style="border-bottom: 1px solid #eee;">`;
          html += `<td style="padding: 12px; font-size: 13px;">${teacher.email}</td>`;
          html += `<td style="padding: 12px; font-size: 13px;"><code>${teacher.orgId || '-'}</code></td>`;
          html += `<td style="padding: 12px; text-align: center; font-size: 13px; font-weight: 600;">${used}</td>`;
          html += `<td style="padding: 12px; text-align: center; font-size: 13px;">${limit}</td>`;
          html += `<td style="padding: 12px; text-align: center; font-size: 13px;">${remaining}</td>`;
          html += `<td style="padding: 12px; text-align: center;">`;
          html += `<div style="background: #f0f0f0; border-radius: 4px; overflow: hidden; height: 20px; position: relative;">`;
          html += `<div style="background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); height: 100%; width: ${percentage}%;"></div>`;
          html += `<div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: #333;">${percentage}%</div>`;
          html += `</div></td></tr>`;
        } catch (err) {
          console.error(`Error loading usage for ${uid}:`, err);
          html += `<tr style="border-bottom: 1px solid #eee;">`;
          html += `<td style="padding: 12px; font-size: 13px;">${teacher.email}</td>`;
          html += `<td style="padding: 12px; font-size: 13px;"><code>${teacher.orgId || '-'}</code></td>`;
          html += `<td colspan="4" style="padding: 12px; text-align: center; color: #999;">加载失败</td></tr>`;
        }
      }
      
      html += '</tbody></table>';
      usageList.innerHTML = html;
    } catch (error) {
      console.error('Failed to load usage:', error);
      this.showError('加载用量统计失败: ' + error.message);
    }
  }

  /**
   * 显示新增组织模态框
   */
  showAddOrgModal() {
    const modal = this.createModal('新增组织', `
      <form id="org-form">
        <div style="margin-bottom: 15px;">
          <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 5px;">组织名称 *</label>
          <input type="text" id="org-name" placeholder="例：北京高中" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;" required />
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 5px;">组织代号 *</label>
          <input type="text" id="org-code" placeholder="例：BJHS (3-10字符，字母数字)" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;" required />
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 5px;">学号位数 *</label>
          <input type="number" id="org-digits" placeholder="例：6" min="3" max="12" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;" required />
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 5px;">学号前置码</label>
          <input type="text" id="org-prefix" placeholder="可选，例：2024" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;" />
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 5px;">选项数 *</label>
          <select id="org-options" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;" required>
            <option value="">--请选择--</option>
            <option value="4">4 选项</option>
            <option value="5">5 选项</option>
          </select>
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 8px;">可用版型 *</label>
          <div style="display: flex; gap: 10px;">
            <label style="display: flex; align-items: center; font-size: 13px;">
              <input type="checkbox" value="T100" class="template-check" style="margin-right: 5px;" /> T100
            </label>
            <label style="display: flex; align-items: center; font-size: 13px;">
              <input type="checkbox" value="T060" class="template-check" style="margin-right: 5px;" /> T060
            </label>
          </div>
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: flex; align-items: center; font-size: 13px;">
            <input type="checkbox" id="org-active" checked style="margin-right: 5px;" />
            <span>激活此组织</span>
          </label>
        </div>
      </form>
    `);
    
    const form = modal.querySelector('#org-form');
    modal.querySelector('.modal-submit').addEventListener('click', async () => {
      if (!form.checkValidity()) {
        this.showError('请填写所有必填项');
        return;
      }
      
      const templates = Array.from(modal.querySelectorAll('.template-check:checked')).map(c => c.value);
      if (templates.length === 0) {
        this.showError('请至少选择一个版型');
        return;
      }
      
      const orgData = {
        name: modal.querySelector('#org-name').value,
        code: modal.querySelector('#org-code').value,
        studentIdDigits: parseInt(modal.querySelector('#org-digits').value),
        studentIdPrefix: modal.querySelector('#org-prefix').value || '',
        optionsCount: parseInt(modal.querySelector('#org-options').value),
        templates: templates,
        active: modal.querySelector('#org-active').checked,
        createdAt: new Date()
      };
      
      try {
        const btn = modal.querySelector('.modal-submit');
        btn.disabled = true;
        btn.textContent = '保存中...';
        
        await this.firestore.collection('orgs').add(orgData);
        
        this.showSuccess('组织已添加');
        this.closeModal(modal);
        await this.loadOrgs();
      } catch (error) {
        this.showError('保存组织失败: ' + error.message);
      }
    });
  }

  /**
   * 显示新增教师模态框
   */
  showAddTeacherModal() {
    const modal = this.createModal('新增教师', `
      <form id="teacher-form">
        <div style="margin-bottom: 15px;">
          <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 5px;">教师邮箱 *</label>
          <input type="email" id="teacher-email" placeholder="例：teacher@school.com" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;" required />
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 5px;">所属组织 *</label>
          <select id="teacher-org" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;" required>
            <option value="">加载中...</option>
          </select>
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 5px;">每日限额（张）</label>
          <input type="number" id="teacher-quota" placeholder="留空则使用组织默认值" min="0" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;" />
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: flex; align-items: center; font-size: 13px;">
            <input type="checkbox" id="teacher-active" checked style="margin-right: 5px;" />
            <span>激活此教师</span>
          </label>
        </div>
      </form>
    `);
    
    this.firestore.collection('orgs').get().then(snapshot => {
      const select = modal.querySelector('#teacher-org');
      select.innerHTML = '<option value="">--请选择--</option>';
      snapshot.forEach(doc => {
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = doc.data().name;
        select.appendChild(opt);
      });
    });
    
    const form = modal.querySelector('#teacher-form');
    modal.querySelector('.modal-submit').addEventListener('click', async () => {
      if (!form.checkValidity()) {
        this.showError('请填写所有必填项');
        return;
      }
      
      const email = modal.querySelector('#teacher-email').value;
      const orgId = modal.querySelector('#teacher-org').value;
      
      const teacherData = {
        email: email,
        uid: email.replace(/@.*/, '').replace(/\./g, '_'),
        role: 'teacher',
        orgId: orgId,
        dailyQuota: modal.querySelector('#teacher-quota').value ? parseInt(modal.querySelector('#teacher-quota').value) : null,
        active: modal.querySelector('#teacher-active').checked,
        createdAt: new Date()
      };
      
      try {
        const btn = modal.querySelector('.modal-submit');
        btn.disabled = true;
        btn.textContent = '保存中...';
        
        await this.firestore.collection('allowedUsers').add(teacherData);
        
        this.showSuccess('教师已添加');
        this.closeModal(modal);
        await this.loadTeachers();
      } catch (error) {
        this.showError('保存教师失败: ' + error.message);
      }
    });
  }

  /**
   * 显示编辑教师模态框
   */
  async showEditTeacherModal(uid) {
    try {
      const doc = await this.firestore.collection('allowedUsers').doc(uid).get();
      if (!doc.exists) {
        this.showError('教师不存在');
        return;
      }
      
      const teacher = doc.data();
      
      const modal = this.createModal('编辑教师', `
        <form id="edit-teacher-form">
          <div style="margin-bottom: 15px;">
            <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 5px;">教师邮箱（只读）</label>
            <input type="email" value="${teacher.email}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; background: #f5f5f5;" disabled />
          </div>
          <div style="margin-bottom: 15px;">
            <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 5px;">所属组织</label>
            <select id="edit-teacher-org" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
              <option value="">加载中...</option>
            </select>
          </div>
          <div style="margin-bottom: 15px;">
            <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 5px;">每日限额（张）</label>
            <input type="number" id="edit-teacher-quota" placeholder="留空则使用组织默认值" min="0" value="${teacher.dailyQuota || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;" />
          </div>
          <div style="margin-bottom: 15px;">
            <label style="display: flex; align-items: center; font-size: 13px;">
              <input type="checkbox" id="edit-teacher-active" ${teacher.active ? 'checked' : ''} style="margin-right: 5px;" />
              <span>激活此教师</span>
            </label>
          </div>
        </form>
      `);
      
      const orgsSnapshot = await this.firestore.collection('orgs').get();
      const select = modal.querySelector('#edit-teacher-org');
      select.innerHTML = '<option value="">--请选择--</option>';
      orgsSnapshot.forEach(orgDoc => {
        const opt = document.createElement('option');
        opt.value = orgDoc.id;
        opt.textContent = orgDoc.data().name;
        if (orgDoc.id === teacher.orgId) opt.selected = true;
        select.appendChild(opt);
      });
      
      const form = modal.querySelector('#edit-teacher-form');
      modal.querySelector('.modal-submit').addEventListener('click', async () => {
        const updateData = {
          orgId: modal.querySelector('#edit-teacher-org').value,
          dailyQuota: modal.querySelector('#edit-teacher-quota').value ? parseInt(modal.querySelector('#edit-teacher-quota').value) : null,
          active: modal.querySelector('#edit-teacher-active').checked,
          updatedAt: new Date()
        };
        
        try {
          const btn = modal.querySelector('.modal-submit');
          btn.disabled = true;
          btn.textContent = '保存中...';
          
          await this.firestore.collection('allowedUsers').doc(uid).update(updateData);
          
          this.showSuccess('教师信息已更新');
          this.closeModal(modal);
          await this.loadTeachers();
        } catch (error) {
          this.showError('更新教师失败: ' + error.message);
        }
      });
    } catch (error) {
      console.error('Error loading teacher:', error);
      this.showError('加载教师信息失败: ' + error.message);
    }
  }

  /**
   * 删除教师
   */
  async deleteTeacher(uid) {
    if (!confirm('确定要删除此教师吗？')) return;
    
    try {
      await this.firestore.collection('allowedUsers').doc(uid).delete();
      this.showSuccess('教师已删除');
      await this.loadTeachers();
    } catch (error) {
      this.showError('删除教师失败: ' + error.message);
    }
  }

  /**
   * 保存设置
   */
  async saveSettings() {
    try {
      const inputs = this.container.querySelectorAll('.settings-input');
      const updates = {};
      
      inputs.forEach(input => {
        const key = input.dataset.key;
        const value = input.value;
        updates[key] = value ? parseInt(value) : 0;
      });
      
      const btn = this.container.querySelector('#save-settings-btn');
      btn.disabled = true;
      btn.textContent = '保存中...';
      
      await this.firestore.collection('settings').doc('global').update(updates);
      
      btn.disabled = false;
      btn.textContent = '保存设置';
      this.showSuccess('设置已保存');
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showError('保存设置失败: ' + error.message);
    }
  }

  /**
   * 切换标签页
   */
  switchTab(tabName) {
    const tabContents = this.container.querySelectorAll('.tab-content');
    tabContents.forEach(tab => tab.style.display = 'none');
    
    const tabBtns = this.container.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => btn.classList.remove('active'));
    
    const selectedTab = this.container.querySelector(`#${tabName}-tab`);
    if (selectedTab) selectedTab.style.display = 'block';
    
    const selectedBtn = this.container.querySelector(`[data-tab="${tabName}"]`);
    if (selectedBtn) selectedBtn.classList.add('active');
    
    this.currentTab = tabName;
  }

  /**
   * 处理登出
   */
  async handleLogout() {
    try {
      await this.authFlow.logout();
    } catch (error) {
      console.error('Logout failed:', error);
      alert('登出失败: ' + error.message);
    }
  }

  /**
   * 创建模态框
   */
  createModal(title, content) {
    const container = this.container.querySelector('#modal-container');
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    modal.innerHTML = `
      <div style="background: white; border-radius: 8px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
        <div style="padding: 20px; border-bottom: 1px solid #eee; display: flex; align-items: center; justify-content: space-between;">
          <h2 style="margin: 0; font-size: 16px; font-weight: 600;">${title}</h2>
          <button class="modal-close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">&times;</button>
        </div>
        <div style="padding: 20px;">${content}</div>
        <div style="padding: 15px 20px; border-top: 1px solid #eee; display: flex; gap: 10px; justify-content: flex-end;">
          <button class="modal-cancel" style="padding: 8px 16px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 13px;">取消</button>
          <button class="modal-submit" style="padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600;">确定</button>
        </div>
      </div>
    `;
    
    container.appendChild(modal);
    
    modal.querySelector('.modal-close').addEventListener('click', () => this.closeModal(modal));
    modal.querySelector('.modal-cancel').addEventListener('click', () => this.closeModal(modal));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeModal(modal);
    });
    
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.closeModal(modal);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
    
    return modal;
  }

  /**
   * 关闭模态框
   */
  closeModal(modal) {
    modal.remove();
  }

  /**
   * 显示错误信息
   */
  showError(message) {
    const container = this.container.querySelector('#modal-container');
    const msg = document.createElement('div');
    msg.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ffebee;
      color: #c62828;
      border: 1px solid #ffcdd2;
      border-radius: 6px;
      padding: 15px 20px;
      font-size: 13px;
      z-index: 10001;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    msg.textContent = message;
    container.appendChild(msg);
    
    setTimeout(() => msg.remove(), 4000);
  }

  /**
   * 显示成功信息
   */
  showSuccess(message) {
    const container = this.container.querySelector('#modal-container');
    const msg = document.createElement('div');
    msg.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #e8f5e9;
      color: #2e7d32;
      border: 1px solid #c8e6c9;
      border-radius: 6px;
      padding: 15px 20px;
      font-size: 13px;
      z-index: 10001;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    msg.textContent = message;
    container.appendChild(msg);
    
    setTimeout(() => msg.remove(), 3000);
  }
}
