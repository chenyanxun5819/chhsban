/**
 * 教师工作流页面
 */

class TeacherPage {
  constructor(container, authFlow, firestore, functions) {
    this.container = container;
    this.authFlow = authFlow;
    this.firestore = firestore;
    this.functions = functions;
    this.orgId = null;
    this.orgData = null;
  }

  /**
   * 渲染教师页面
   */
  async render() {
    const user = this.authFlow.auth.currentUser;
    this.orgId = await this.authFlow.getUserOrgId();
    
    // 获取组织信息
    if (this.orgId) {
      try {
        const orgRef = this.firestore.collection('orgs').doc(this.orgId);
        const doc = await orgRef.get();
        if (doc.exists) {
          this.orgData = doc.data();
        }
      } catch (error) {
        console.error("Failed to load org data:", error);
      }
    }
    
    this.container.innerHTML = `
      <div class="page teacher-page">
        <div class="header">
          <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
            <div>
              <h1>OfficeOMR 教师工作台</h1>
              <p>${this.orgData ? this.orgData.name : '加载中...'}</p>
            </div>
            <button id="teacher-logout-btn" class="logout-btn">退出登录</button>
          </div>
        </div>
        
        <div class="content">
          <!-- 用户信息 -->
          <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <div style="font-size: 13px; color: #666;">
              <p>📧 邮箱: <strong>${user.email}</strong></p>
              <p>👤 角色: <strong>Teacher</strong></p>
              <p>🏢 组织: <strong>${this.orgData ? this.orgData.name : '加载中...'}</strong></p>
            </div>
          </div>
          
          <!-- 快速操作 -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px;">
            <button class="quick-action-btn" id="download-sheet-btn">
              <span style="font-size: 24px;">📄</span>
              <span>下载答题纸</span>
            </button>
            <button class="quick-action-btn" id="recognize-btn">
              <span style="font-size: 24px;">🔍</span>
              <span>识别答题纸</span>
            </button>
            <button class="quick-action-btn" id="view-results-btn">
              <span style="font-size: 24px;">📊</span>
              <span>查看识别结果</span>
            </button>
          </div>
          
          <!-- 标签页导航 -->
          <div class="tabs">
            <button class="tab-btn active" data-tab="recognize">
              <span>🔍 识别答题纸</span>
            </button>
            <button class="tab-btn" data-tab="results">
              <span>📊 历史记录</span>
            </button>
            <button class="tab-btn" data-tab="quota">
              <span>📈 配额使用</span>
            </button>
          </div>
          
          <!-- 识别标签页 -->
          <div id="recognize-tab" class="tab-content active">
            <h2>识别答题纸</h2>
            <p style="color: #666; font-size: 13px; margin-bottom: 15px;">
              上传答题纸图片或 PDF 进行自动识别
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 6px; border: 2px dashed #667eea;">
              <div id="file-drop-zone" style="text-align: center; min-height: 150px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div style="font-size: 32px; margin-bottom: 10px;">📁</div>
                <p style="font-size: 14px; font-weight: 500; margin-bottom: 5px;">拖拽文件到此，或点击选择</p>
                <p style="font-size: 12px; color: #999;">支持图片（JPG、PNG）或 PDF</p>
              </div>
              <input type="file" id="recognize-file-input" accept="image/*,.pdf" style="display: none;" />
            </div>
            
            <!-- 模板选择 -->
            <div style="margin-top: 15px;">
              <label style="display: block; font-size: 13px; font-weight: 500; margin-bottom: 8px;">答题纸版型</label>
              <select id="template-select" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px;">
                <option value="T100-A4-v1">T100-A4-v1 (100 题)</option>
                <option value="T060-A4-v1">T060-A4-v1 (60 题)</option>
              </select>
            </div>
            
            <!-- 识别按钮 -->
            <button id="submit-recognize-btn" style="width: 100%; padding: 12px; margin-top: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer;" disabled>
              开始识别
            </button>
            
            <!-- 状态信息 -->
            <div id="recognize-status" style="margin-top: 15px; display: none; padding: 12px; border-radius: 6px; font-size: 13px;"></div>
            
            <!-- 识别结果 -->
            <div id="recognize-result" style="margin-top: 20px; display: none;">
              <h3>识别结果</h3>
              <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #ddd; margin-top: 10px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                  <div>
                    <p style="font-size: 12px; color: #999;">学号</p>
                    <p style="font-size: 16px; font-weight: 600;" id="result-student-id">-</p>
                  </div>
                  <div>
                    <p style="font-size: 12px; color: #999;">单选正确</p>
                    <p style="font-size: 16px; font-weight: 600;" id="result-single">-</p>
                  </div>
                  <div>
                    <p style="font-size: 12px; color: #999;">空白</p>
                    <p style="font-size: 16px; font-weight: 600;" id="result-blank">-</p>
                  </div>
                  <div>
                    <p style="font-size: 12px; color: #999;">多选</p>
                    <p style="font-size: 16px; font-weight: 600;" id="result-multi">-</p>
                  </div>
                  <div>
                    <p style="font-size: 12px; color: #999;">需复核</p>
                    <p style="font-size: 16px; font-weight: 600;" id="result-ambiguous">-</p>
                  </div>
                  <div>
                    <p style="font-size: 12px; color: #999;">状态</p>
                    <p style="font-size: 16px; font-weight: 600;" id="result-status">-</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 历史记录标签页 -->
          <div id="results-tab" class="tab-content" style="display: none;">
            <h2>识别历史</h2>
            <div id="results-list" style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #ddd;">
              <p style="text-align: center; color: #999;">加载中...</p>
            </div>
          </div>
          
          <!-- 配额标签页 -->
          <div id="quota-tab" class="tab-content" style="display: none;">
            <h2>每日配额</h2>
            <div id="quota-info" style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #ddd;">
              <p style="text-align: center; color: #999;">加载中...</p>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.setupEventListeners();
    await this.loadQuotaInfo();
  }

  /**
   * 设置事件监听
   */
  setupEventListeners() {
    // 登出
    const logoutBtn = this.container.querySelector('#teacher-logout-btn');
    logoutBtn.addEventListener('click', () => this.handleLogout());
    
    // 快速操作按钮
    this.container.querySelector('#download-sheet-btn').addEventListener('click', () => this.handleDownloadSheet());
    this.container.querySelector('#recognize-btn').addEventListener('click', () => this.switchTab('recognize'));
    this.container.querySelector('#view-results-btn').addEventListener('click', () => this.switchTab('results'));
    
    // 标签页切换
    const tabBtns = this.container.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.currentTarget.dataset.tab));
    });
    
    // 文件选择
    const fileDropZone = this.container.querySelector('#file-drop-zone');
    const fileInput = this.container.querySelector('#recognize-file-input');
    
    fileDropZone.addEventListener('click', () => fileInput.click());
    fileDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileDropZone.style.background = '#f0f4ff';
    });
    fileDropZone.addEventListener('dragleave', () => {
      fileDropZone.style.background = '';
    });
    fileDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      fileDropZone.style.background = '';
      if (e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        this.onFileSelected();
      }
    });
    
    fileInput.addEventListener('change', () => this.onFileSelected());
    
    // 识别按钮
    this.container.querySelector('#submit-recognize-btn').addEventListener('click', () => this.handleRecognize());
  }

  /**
   * 文件选择处理
   */
  onFileSelected() {
    const fileInput = this.container.querySelector('#recognize-file-input');
    const btn = this.container.querySelector('#submit-recognize-btn');
    
    if (fileInput.files && fileInput.files.length > 0) {
      btn.disabled = false;
      btn.textContent = '开始识别';
    } else {
      btn.disabled = true;
    }
  }

  /**
   * 处理下载答题纸
   */
  async handleDownloadSheet() {
    // TODO: 实现答题纸生成和下载
    alert('答题纸生成功能将在后续版本实现');
  }

  /**
   * 处理识别
   */
  async handleRecognize() {
    // TODO: 实现识别功能
    const statusDiv = this.container.querySelector('#recognize-status');
    statusDiv.textContent = '识别功能即将上线';
    statusDiv.style.background = '#e3f2fd';
    statusDiv.style.color = '#1565c0';
    statusDiv.style.display = 'block';
  }

  /**
   * 加载配额信息
   */
  async loadQuotaInfo() {
    try {
      const quotaDiv = this.container.querySelector('#quota-info');
      
      // 从 usage 集合查询当前用户的配额
      const usageRef = this.firestore.collection('usage')
        .doc(this.authFlow.auth.currentUser.uid);
      const doc = await usageRef.get();
      
      if (!doc.exists) {
        quotaDiv.innerHTML = `
          <div style="padding: 15px;">
            <p>📊 每日配额: <strong>100 张</strong></p>
            <p style="margin-top: 10px; font-size: 12px; color: #999;">已用: <strong>0 张</strong></p>
            <p style="margin-top: 5px; font-size: 12px; color: #999;">剩余: <strong>100 张</strong></p>
          </div>
        `;
      } else {
        const usage = doc.data();
        quotaDiv.innerHTML = `
          <div style="padding: 15px;">
            <p>📊 每日配额: <strong>${usage.dailyLimit || 100} 张</strong></p>
            <p style="margin-top: 10px; font-size: 12px; color: #999;">已用: <strong>${usage.usedToday || 0} 张</strong></p>
            <p style="margin-top: 5px; font-size: 12px; color: #999;">剩余: <strong>${(usage.dailyLimit || 100) - (usage.usedToday || 0)} 张</strong></p>
          </div>
        `;
      }
    } catch (error) {
      console.error("Failed to load quota:", error);
      this.container.querySelector('#quota-info').innerHTML = 
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
}
