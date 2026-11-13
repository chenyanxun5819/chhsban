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
            <button class="tab-btn active" data-tab="m7">
              <span>📝 M7 答案管理</span>
            </button>
            <button class="tab-btn" data-tab="recognize">
              <span>🔍 识别答题纸</span>
            </button>
            <button class="tab-btn" data-tab="results">
              <span>📊 历史记录</span>
            </button>
            <button class="tab-btn" data-tab="quota">
              <span>📈 配额使用</span>
            </button>
          </div>
          
          <!-- M7 答案管理标签页 -->
          <div id="m7-tab" class="tab-content active">
            <h2>📝 M7 答案纸管理</h2>
            <p style="color: #666; font-size: 13px; margin-bottom: 20px;">
              上传或输入标准答案，教师可以进行学生答题纸的自动识别和评分
            </p>
            
            <!-- 上传方式选择 -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
              <button class="m7-method-btn active" data-method="image" style="padding: 20px; border: 2px solid #667eea; background: white; border-radius: 6px; cursor: pointer; transition: all 0.3s ease; text-align: center;">
                <span style="font-size: 28px;">📷</span>
                <span style="display: block; margin-top: 8px; font-weight: 600;">上传图片</span>
                <span style="display: block; font-size: 12px; color: #666; margin-top: 4px;">扫描答案纸</span>
              </button>
              <button class="m7-method-btn" data-method="manual" style="padding: 20px; border: 2px solid #ddd; background: white; border-radius: 6px; cursor: pointer; transition: all 0.3s ease; text-align: center;">
                <span style="font-size: 28px;">✍️</span>
                <span style="display: block; margin-top: 8px; font-weight: 600;">手动输入</span>
                <span style="display: block; font-size: 12px; color: #666; margin-top: 4px;">直接输入答案</span>
              </button>
            </div>
            <style>
              .m7-method-btn.active {
                border-color: #667eea !important;
                background: #f0f4ff !important;
                color: #667eea;
                font-weight: 600;
              }
              .m7-method-btn:hover {
                border-color: #667eea !important;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
              }
            </style>
            
            <!-- 图片上传方式 -->
            <div id="m7-image-method" class="m7-method-content">
              <div style="background: white; padding: 20px; border-radius: 6px; border: 2px dashed #667eea; text-align: center;">
                <div id="m7-file-drop-zone" style="min-height: 150px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <div style="font-size: 32px; margin-bottom: 10px;">📁</div>
                  <p style="font-size: 14px; font-weight: 500; margin-bottom: 5px;">拖拽或点击选择图片</p>
                  <p style="font-size: 12px; color: #999;">支持 PNG、JPG、PDF 格式</p>
                </div>
                <input type="file" id="m7-file-input" accept="image/*,.pdf" style="display: none;" />
              </div>
              
              <div style="margin-top: 15px;">
                <label style="display: block; font-size: 13px; font-weight: 500; margin-bottom: 8px;">考试名称</label>
                <input type="text" id="m7-exam-name-image" placeholder="如：2024年11月月考数学" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; margin-bottom: 15px;" />

                <label style="display: block; font-size: 13px; font-weight: 500; margin-bottom: 8px;">答题纸版型</label>
                <select id="m7-template-select" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px;">
                  <option value="T100-A4">T100-A4 (100 题)</option>
                  <option value="T060-A4">T060-A4 (60 题)</option>
                </select>
              </div>
              
              <button id="m7-upload-image-btn" style="width: 100%; padding: 12px; margin-top: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer;" disabled>
                上传答案图片
              </button>
            </div>
            
            <!-- 手动输入方式 -->
            <div id="m7-manual-method" class="m7-method-content" style="display: none;">
              <div style="background: white; padding: 20px; border-radius: 6px;">
                <label style="display: block; font-size: 13px; font-weight: 500; margin-bottom: 8px;">考试名称</label>
                <input type="text" id="m7-exam-name" placeholder="如：2024年11月月考数学" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; margin-bottom: 15px;" />
                
                <label style="display: block; font-size: 13px; font-weight: 500; margin-bottom: 8px;">答题纸版型</label>
                <select id="m7-template-select-manual" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; margin-bottom: 15px;">
                  <option value="T100-A4">T100-A4 (100 题)</option>
                  <option value="T060-A4">T060-A4 (60 题)</option>
                </select>
                
                <label style="display: block; font-size: 13px; font-weight: 500; margin-bottom: 8px;">标准答案 (逗号分隔，如：A,B,C,A,A,...)</label>
                <textarea id="m7-answers-input" placeholder="输入答案，用逗号分隔。支持：A, B, C, D（单选）或 AB, AC（多选）" style="width: 100%; height: 100px; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; font-family: monospace; margin-bottom: 15px;"></textarea>
                
                <button id="m7-upload-manual-btn" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer;">
                  提交答案
                </button>
              </div>
            </div>
            
            <!-- 上传状态 -->
            <div id="m7-status" style="margin-top: 15px; display: none; padding: 12px; border-radius: 6px; font-size: 13px;"></div>
            
            <!-- 已上传答案信息 -->
            <div id="m7-answer-key-info" style="margin-top: 25px; display: none; background: #f5f5f5; padding: 15px; border-radius: 6px;">
              <h3 style="margin-bottom: 10px;">📋 当前答案纸</h3>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                <div>
                  <p style="font-size: 12px; color: #999;">考试名称</p>
                  <p style="font-size: 14px; font-weight: 600;" id="m7-current-exam"></p>
                </div>
                <div>
                  <p style="font-size: 12px; color: #999;">答题纸版型</p>
                  <p style="font-size: 14px; font-weight: 600;" id="m7-current-template"></p>
                </div>
                <div>
                  <p style="font-size: 12px; color: #999;">上传时间</p>
                  <p style="font-size: 14px; font-weight: 600;" id="m7-current-time"></p>
                </div>
                <div>
                  <p style="font-size: 12px; color: #999;">总题数</p>
                  <p style="font-size: 14px; font-weight: 600;" id="m7-current-count"></p>
                </div>
                <div>
                  <p style="font-size: 12px; color: #999;">状态</p>
                  <p style="font-size: 14px; font-weight: 600;" id="m7-current-status"></p>
                </div>
                <div style="display: flex; align-items: flex-end;">
                  <button id="m7-download-btn" style="width: 100%; padding: 8px; background: white; border: 1px solid #667eea; color: #667eea; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
                    下载答题纸
                  </button>
                </div>
              </div>
            </div>
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
    
    // ===== M7 事件处理 =====
    this.setupM7EventListeners();
    // 加载已上传的答案纸信息
    this.loadM7AnswerKey();
    
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
   * 设置 M7 事件监听
   */
  setupM7EventListeners() {
    // M7 上传方式选择
    const methodBtns = this.container.querySelectorAll('.m7-method-btn');
    methodBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.switchM7Method(e.currentTarget.dataset.method));
    });
    
    // M7 图片上传
    const m7FileDropZone = this.container.querySelector('#m7-file-drop-zone');
    const m7FileInput = this.container.querySelector('#m7-file-input');
    
    if (m7FileDropZone && m7FileInput) {
      m7FileDropZone.addEventListener('click', () => m7FileInput.click());
      m7FileDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        m7FileDropZone.style.background = '#f0f4ff';
      });
      m7FileDropZone.addEventListener('dragleave', () => {
        m7FileDropZone.style.background = '';
      });
      m7FileDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        m7FileDropZone.style.background = '';
        if (e.dataTransfer.files.length > 0) {
          m7FileInput.files = e.dataTransfer.files;
          this.onM7FileSelected();
        }
      });
      
      m7FileInput.addEventListener('change', () => this.onM7FileSelected());
    }
    
    // M7 上传按钮
    const uploadImageBtn = this.container.querySelector('#m7-upload-image-btn');
    if (uploadImageBtn) {
      uploadImageBtn.addEventListener('click', () => this.handleM7ImageUpload());
    }
    
    const uploadManualBtn = this.container.querySelector('#m7-upload-manual-btn');
    if (uploadManualBtn) {
      uploadManualBtn.addEventListener('click', () => this.handleM7ManualUpload());
    }
    
    // M7 下载按钮
    const downloadBtn = this.container.querySelector('#m7-download-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.handleM7Download());
    }
  }

  /**
   * 切换 M7 上传方式
   */
  switchM7Method(method) {
    // 更新按钮状态
    const methodBtns = this.container.querySelectorAll('.m7-method-btn');
    methodBtns.forEach(btn => {
      if (btn.dataset.method === method) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // 显示/隐藏相应的方法内容
    const imageMethod = this.container.querySelector('#m7-image-method');
    const manualMethod = this.container.querySelector('#m7-manual-method');
    
    if (method === 'image') {
      if (imageMethod) imageMethod.style.display = 'block';
      if (manualMethod) manualMethod.style.display = 'none';
    } else {
      if (imageMethod) imageMethod.style.display = 'none';
      if (manualMethod) manualMethod.style.display = 'block';
    }
  }

  /**
   * M7 文件选择处理
   */
  onM7FileSelected() {
    const fileInput = this.container.querySelector('#m7-file-input');
    const uploadBtn = this.container.querySelector('#m7-upload-image-btn');
    
    if (fileInput.files && fileInput.files.length > 0) {
      uploadBtn.disabled = false;
      uploadBtn.textContent = '上传答案图片';
    } else {
      uploadBtn.disabled = true;
    }
  }

  /**
   * 处理 M7 图片上传
   */
  async handleM7ImageUpload() {
    const fileInput = this.container.querySelector('#m7-file-input');
    const templateSelect = this.container.querySelector('#m7-template-select');
    const statusDiv = this.container.querySelector('#m7-status');
    const examNameInput = this.container.querySelector('#m7-exam-name-image');
    
    if (!fileInput.files || fileInput.files.length === 0) {
      alert('请选择一个文件');
      return;
    }
    
    const file = fileInput.files[0];
    const template = templateSelect.value;
    const examName = (examNameInput ? examNameInput.value : '').trim();

    if (!examName) {
      alert('请输入考试名称');
      return;
    }
    
    try {
      statusDiv.textContent = '⏳ 上传中...';
      statusDiv.className = '';
      statusDiv.style.background = '#e3f2fd';
      statusDiv.style.color = '#1565c0';
      statusDiv.style.display = 'block';
      
      // 读取文件为 Base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target.result.split(',')[1];
        
        // 调用 M7Service 上传答案卡
        const m7Service = window.app?.m7Service;
        if (!m7Service) {
          throw new Error('M7Service 未初始化');
        }
        
        // 先建立考试（job），再上传标准答案
        const examResult = await m7Service.createExam(examName, template);
        if (!examResult.success) {
          throw new Error(examResult.error || '建立考试失败');
        }
        const jobId = examResult.data.jobId;

        const result = await m7Service.uploadAnswerKeyByImage(jobId, file, template);
        if (result && result.success === false) {
          throw new Error(result.error || '上传失败');
        }
        
        statusDiv.textContent = '✅ 答案纸上传成功！';
        statusDiv.style.background = '#e8f5e9';
        statusDiv.style.color = '#2e7d32';
        
        // 清空输入
        fileInput.value = '';
        this.onM7FileSelected();
        
        // 刷新答案纸信息
        await this.loadM7AnswerKey();
      };
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error("❌ M7 上传失败:", error);
      statusDiv.textContent = `❌ 上传失败: ${error.message}`;
      statusDiv.style.background = '#ffebee';
      statusDiv.style.color = '#c62828';
    }
  }

  /**
   * 处理 M7 手动输入
   */
  async handleM7ManualUpload() {
    const examName = this.container.querySelector('#m7-exam-name').value;
    const templateSelect = this.container.querySelector('#m7-template-select-manual');
    const answersInput = this.container.querySelector('#m7-answers-input').value;
    const statusDiv = this.container.querySelector('#m7-status');
    
    if (!examName.trim()) {
      alert('请输入考试名称');
      return;
    }
    
    if (!answersInput.trim()) {
      alert('请输入标准答案');
      return;
    }
    
    try {
      statusDiv.textContent = '⏳ 提交中...';
      statusDiv.className = '';
      statusDiv.style.background = '#e3f2fd';
      statusDiv.style.color = '#1565c0';
      statusDiv.style.display = 'block';
      
      // 解析答案
      const answers = answersInput.split(',').map(a => a.trim().toUpperCase());
      
      // 调用 M7Service 上传答案
      const m7Service = window.app?.m7Service;
      if (!m7Service) {
        throw new Error('M7Service 未初始化');
      }
      
      // 先建立考试（job），再上传标准答案
      const examResult = await m7Service.createExam(examName, templateSelect.value);
      if (!examResult.success) {
        throw new Error(examResult.error || '建立考试失败');
      }
      const jobId = examResult.data.jobId;

      const result = await m7Service.uploadAnswerKeyManually(jobId, answers, 'array');
      if (result && result.success === false) {
        throw new Error(result.error || '提交失败');
      }
      
      statusDiv.textContent = '✅ 答案已保存！';
      statusDiv.style.background = '#e8f5e9';
      statusDiv.style.color = '#2e7d32';
      
      // 清空输入
      this.container.querySelector('#m7-exam-name').value = '';
      this.container.querySelector('#m7-answers-input').value = '';
      
      // 刷新答案纸信息
      await this.loadM7AnswerKey();
      
    } catch (error) {
      console.error("❌ M7 提交失败:", error);
      statusDiv.textContent = `❌ 提交失败: ${error.message}`;
      statusDiv.style.background = '#ffebee';
      statusDiv.style.color = '#c62828';
    }
  }

  /**
   * 加载 M7 答案纸信息
   */
  async loadM7AnswerKey() {
    try {
      const m7Service = window.app?.m7Service;
      if (!m7Service) {
        console.warn("M7Service 未初始化");
        return;
      }
      
      // 获取当前用户的最新答案纸
      const user = this.authFlow.auth.currentUser;
      const jobsRef = this.firestore.collection('jobs')
        .where('uid', '==', user.uid)
        .limit(20);
      
      const snapshot = await jobsRef.get();
      
      if (snapshot.empty) {
        const infoDiv = this.container.querySelector('#m7-answer-key-info');
        if (infoDiv) infoDiv.style.display = 'none';
        return;
      }
      
      const sortedDocs = snapshot.docs.slice().sort((a, b) => {
        const ta = (a.data().createdAt && a.data().createdAt.toMillis) ? a.data().createdAt.toMillis() : 0;
        const tb = (b.data().createdAt && b.data().createdAt.toMillis) ? b.data().createdAt.toMillis() : 0;
        return tb - ta;
      });
      const job = sortedDocs[0].data();
      if (!job.answerKey) {
        const infoDiv = this.container.querySelector('#m7-answer-key-info');
        if (infoDiv) infoDiv.style.display = 'none';
        return;
      }
      
      // 显示答案纸信息
      const infoDiv = this.container.querySelector('#m7-answer-key-info');
      if (infoDiv) {
        infoDiv.style.display = 'block';
        this.container.querySelector('#m7-current-exam').textContent = 
          job.examName || job.answerKey.examName || '未命名';
        this.container.querySelector('#m7-current-template').textContent = 
          job.templateId || job.template || '未知';
        this.container.querySelector('#m7-current-time').textContent = 
          new Date(job.answerKey.uploadedAt?.toDate?.() || job.answerKey.uploadedAt).toLocaleString('zh-CN');
        this.container.querySelector('#m7-current-count').textContent = 
          job.answerKey.answers?.length || '未知';
        this.container.querySelector('#m7-current-status').textContent = 
          job.answerKey.frozen ? '🔒 已冻结（不可修改）' : '✅ 可使用';
      }
      
    } catch (error) {
      console.error("❌ 加载 M7 答案纸信息失败:", error);
    }
  }

  /**
   * 处理 M7 下载答题纸
   */
  async handleM7Download() {
    // TODO: 实现答题纸下载功能
    alert('答题纸生成和下载功能即将上线');
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
