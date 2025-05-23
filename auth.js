// Supabase 設定
const SUPABASE_URL = 'https://kcvzvhmjdxivfjapdwcg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtjdnp2aG1qZHhpdmZqYXBkd2NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxMzk5ODYsImV4cCI6MjA2MDcxNTk4Nn0.-L5SUEzwMvDamfeivDKiIMHof95EMgIf12nJ8xrFop0';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 確保t()函數存在
if (typeof t !== 'function') {
  console.warn('翻譯函數t()未定義，正在創建臨時實現');
  window.t = function(key, params = {}) {
    console.log('使用臨時翻譯函數，key:', key);
    // 提供一些基本翻譯
    const translations = {
      'fillRequiredFields': '請填寫所有必填欄位',
      'passwordsNotMatch': '密碼和確認密碼不匹配',
      'emailAlreadyExists': '此電子郵件已被註冊',
      'registrationFailed': '註冊失敗',
      'registrationSuccess': '註冊成功，請驗證郵箱後登錄',
      'registrationSuccessProfileFailed': '註冊成功，但創建用戶資料時遇到問題',
      'registrationSuccessWithLimitedData': '註冊成功，但只有部分資料被保存',
      'unknownError': '未知錯誤',
      'rememberMe': '記住我'
    };
    return translations[key] || key;
  };
}

// 當前用戶數據 
let currentUser = null;
let avatarFile = null; // 用於存儲頭像文件

// DOM 載入完成後運行
document.addEventListener('DOMContentLoaded', async function() {
  // 初始化UI
  updateUILanguage(getCurrentLanguage());
  
  // 檢查數據庫設置
  const dbCheckResult = await checkDatabaseSetup();
  console.log('數據庫檢查結果:', dbCheckResult);
  
  // 檢查登錄狀態
  checkLoginStatus();
  
  // 檢查用戶是否已登入
  checkUserSession();
  
  // 綁定登入和註冊功能
  window.loginUser = loginUser;
  window.registerUser = registerUser;
  window.logoutUser = logoutUser;
  window.showLoginForm = showLoginForm;
  window.showRegisterForm = showRegisterForm;
  window.updateUserProfile = updateUserProfile;
  window.previewAvatar = previewAvatar;
  
  // 綁定切換到用戶資料頁面的事件
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('onclick') === "switchPage('profilePage')") {
      item.addEventListener('click', loadUserProfileData);
    }
  });
  
  // 修復存儲桶設置
  fixStorageBucketSettings().then(success => {
    console.log('存儲桶設置修復結果:', success ? '成功' : '失敗');
  });
  
  // 修復profiles表權限
  fixProfilesTablePolicies().then(success => {
    console.log('Profiles表權限檢查結果:', success ? '正常' : '有問題');
  });

  // 在DOM載入完成後更新記住我標籤
  const rememberMeLabel = document.getElementById('rememberMeLabel');
  if (rememberMeLabel) {
    rememberMeLabel.textContent = t('rememberMe');
  }
});

// 檢查用戶是否已登入
async function checkUserSession() {
  try {
    // 獲取當前會話
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session check error:', error.message);
      showAuthContainer();
      return;
    }
    
    if (session) {
      // 如果用戶已登入，獲取用戶數據並顯示主應用
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('User fetch error:', userError.message);
        showAuthContainer();
        return;
      }
      
      if (user) {
        // 確保等待用戶資料完全加載
        const profileData = await fetchUserProfile(user.id);
        if (profileData) {
          currentUser = profileData;
          updateUserDisplay();
          showMainApp();
        } else {
          console.error('Failed to load user profile');
          showAuthContainer();
        }
      } else {
        showAuthContainer();
      }
    } else {
      showAuthContainer();
    }
  } catch (error) {
    console.error('Session check error:', error.message);
    showAuthContainer();
  }
}

// 獲取用戶資料
async function fetchUserProfile(userId) {
  try {
    console.log('Fetching profile for user ID:', userId);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      
      // 檢查是否是因為找不到記錄
      if (error.code === 'PGRST116') {
        console.warn('User profile not found, creating a basic profile');
        
        // 獲取用戶的基本信息
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Error getting auth user:', authError);
          throw authError;
        }
        
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        // 創建基本用戶資料
        const newProfile = {
          id: userId,
          name: user.user_metadata?.name || user.email?.split('@')[0] || '',
          email: user.email || '',
          phone: '',
          team: '',
          bio: '',
          avatar_url: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log('Creating new profile:', newProfile);
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([newProfile]);
        
        if (insertError) {
          console.error('Error creating profile:', insertError);
          throw insertError;
        }
        
        return newProfile;
      } else {
        throw error;
      }
    }
    
    if (data) {
      console.log('Profile data retrieved:', data);
      return data;
    }
    
    return null;
  } catch (error) {
    console.error('Error in fetchUserProfile:', error);
    return null;
  }
}

// 更新用戶顯示信息
async function updateUserDisplay() {
  console.log('更新用戶顯示信息:', currentUser);
  const userNameElement = document.getElementById('currentUserName');
  
  if (userNameElement && currentUser) {
    userNameElement.textContent = currentUser.name || currentUser.email || '用戶';
    
    // 處理頭像顯示
    if (currentUser.avatar_url) {
      // 檢查是否是 Data URL
      if (currentUser.avatar_url.startsWith('data:image/')) {
        // 直接使用 Data URL
        console.log('使用 Data URL 頭像');
        
        // 尋找並更新頭像元素
        document.querySelectorAll('.user-avatar').forEach(avatar => {
          avatar.src = currentUser.avatar_url;
        });
        
        // 更新檔案頁面的頭像預覽
        const profileAvatar = document.getElementById('avatarPreview');
        if (profileAvatar) {
          profileAvatar.src = currentUser.avatar_url;
        }
      }
    }
  }
}

// 登入用戶
async function loginUser() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const rememberMe = document.getElementById('rememberMe').checked;
  const errorMessage = document.getElementById('loginError');
  
  if (!email || !password) {
    errorMessage.textContent = '請輸入電子郵箱和密碼';
    return;
  }
  
  try {
    // 顯示登入中提示
    errorMessage.textContent = '登入中...';
    errorMessage.style.color = '#1565c0';
    
    console.log('嘗試登入帳號:', email, '記住我:', rememberMe);
    
    // 根據"記住我"選項設置會話有效期
    // 默認為瀏覽器會話，選中"記住我"則設為30天
    const sessionOptions = {
      persistSession: true
    };
    
    if (rememberMe) {
      // 設置會話有效期為30天
      sessionOptions.expiresIn = 60 * 60 * 24 * 30; // 30天，單位為秒
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
      options: sessionOptions
    });
    
    if (error) {
      console.error('登入失敗:', error);
      
      // 根據錯誤類型提供更有幫助的訊息
      if (error.message.includes('Invalid login credentials')) {
        errorMessage.textContent = '登入失敗: 電子郵件或密碼不正確';
        // 添加重設密碼連結
        errorMessage.innerHTML += '<br><a href="#" onclick="showResetPasswordForm()">忘記密碼？</a>';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage.textContent = '登入失敗: 請先確認您的電子郵件';
      } else if (error.message.includes('rate limit')) {
        errorMessage.textContent = '登入失敗: 請求次數過多，請稍後再試';
      } else {
        errorMessage.textContent = '登入失敗: ' + error.message;
      }
      
      errorMessage.style.color = '#c62828';
      return;
    }
    
    if (data && data.user) {
      console.log('登入成功，用戶ID:', data.user.id);
      
      // 嘗試獲取用戶資料
      const profileData = await fetchUserProfile(data.user.id);
      if (profileData) {
        currentUser = profileData;
        updateUserDisplay();
        showMainApp();
      } else {
        // 如果無法獲取資料，創建新資料
        console.log('無法取得用戶資料，將創建基本資料');
        const { data: { user } } = await supabase.auth.getUser();
        
        // 創建基本用戶資料
        const newProfile = {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || '',
          email: user.email || '',
          phone: '',
          team: '',
          bio: '',
          avatar_url: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([newProfile]);
        
        if (insertError) {
          console.error('創建用戶資料失敗:', insertError);
          errorMessage.textContent = '登入成功但創建資料失敗';
          errorMessage.style.color = '#c62828';
          return;
        }
        
        currentUser = newProfile;
        updateUserDisplay();
        showMainApp();
      }
    }
  } catch (error) {
    console.error('登入過程中發生錯誤:', error);
    errorMessage.textContent = '登入時發生錯誤: ' + (error.message || '請稍後再試');
    errorMessage.style.color = '#c62828';
  }
}

// 註冊用戶
async function registerUser() {
  // 顯示加載指示器
  document.getElementById('auth-loading').style.display = 'block';
  
  try {
    console.log('====== 開始註冊流程 ======');
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const phone = document.getElementById('registerPhone').value.trim();
    const team = document.getElementById('registerTeam').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    console.log('獲取表單值:', { name, email, phone: '已填寫?', team: '已填寫?' });
    
    // 驗證必填欄位
    if (!name || !email || !password) {
      alert(t('fillRequiredFields'));
      logError('REGISTRATION', '缺少必填欄位', { name: !!name, email: !!email, password: !!password });
      return;
    }
    
    // 確認密碼
    if (password !== confirmPassword) {
      alert(t('passwordsNotMatch'));
      logError('REGISTRATION', '密碼不匹配', null);
      return;
    }
    
    console.log('嘗試註冊用戶:', email);
    
    // 測試Supabase連接
    try {
      console.log('測試Supabase連接...');
      const { data: testData, error: testError } = await supabase.from('profiles').select('count');
      console.log('Supabase連接測試結果:', { data: testData, error: testError });
      
      if (testError) {
        console.error('Supabase連接測試失敗:', testError);
        alert('無法連接到數據庫，請檢查網絡連接');
        return;
      }
    } catch (testErr) {
      console.error('Supabase連接測試異常:', testErr);
    }
    
    // 使用Supabase註冊
    console.log('開始Supabase註冊流程...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone: phone || null,
          team: team || null
        }
      }
    });
    
    console.log('Supabase註冊結果:', { data: authData ? '已獲取' : null, error: authError });
    
    if (authError) {
      console.error('註冊失敗:', authError);
      logError('REGISTRATION', '註冊失敗', authError);
      
      // 更精確地檢測"郵件已被註冊"的錯誤
      if (authError.message.includes('already been registered') || 
          authError.message.includes('already exists') || 
          authError.message.includes('already registered') ||
          (authError.code === '23505' && authError.message.includes('email'))) {
        alert(t('emailAlreadyExists'));
      } else {
        alert(t('registrationFailed') + ': ' + authError.message);
      }
      return;
    }
    
    console.log('註冊成功，用戶ID:', authData.user.id);
    
    // 創建用戶profile
    try {
      console.log('準備創建用戶資料...');
      const profile = {
        id: authData.user.id,
        name,
        email,
        phone: phone || null,
        team: team || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('嘗試創建用戶資料:', profile);
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([profile]);
      
      console.log('創建用戶資料結果:', { error: profileError });
      
      if (profileError) {
        console.error('創建用戶資料時出錯:', profileError);
        logError('REGISTRATION', '創建用戶資料失敗', profileError);
        
        // 嘗試使用最小資料集（不含可能的問題欄位）
        console.log('嘗試使用最小資料集創建用戶資料');
        const minimalProfile = {
          id: authData.user.id,
          name,
          email
        };
        
        console.log('使用最小資料集:', minimalProfile);
        const { error: minProfileError } = await supabase
          .from('profiles')
          .insert([minimalProfile]);
        
        console.log('最小資料集創建結果:', { error: minProfileError });
        
        if (minProfileError) {
          console.error('使用最小資料集創建用戶資料仍然失敗:', minProfileError);
          logError('REGISTRATION', '使用最小資料集創建用戶資料仍然失敗', minProfileError);
          // 添加更詳細的錯誤信息以便診斷
          const errorMessage = `資料庫錯誤：${minProfileError.message || '未知錯誤'} (代碼: ${minProfileError.code || 'N/A'})`;
          alert(t('registrationSuccessProfileFailed') + ': ' + errorMessage);
        } else {
          console.log('使用最小資料集創建用戶資料成功');
          alert(t('registrationSuccessWithLimitedData'));
        }
      } else {
        console.log('創建用戶資料成功');
      }
    } catch (profileCatchError) {
      console.error('創建用戶資料時發生未預期錯誤:', profileCatchError);
      logError('REGISTRATION', '創建用戶資料時發生未預期錯誤', profileCatchError);
      // 繼續處理，不阻止用戶註冊完成
      alert(t('registrationSuccessProfileFailed') + ': ' + (profileCatchError.message || t('unknownError')));
    }
    
    // 清除表單並切換到登錄頁
    document.getElementById('registerName').value = '';
    document.getElementById('registerEmail').value = '';
    document.getElementById('registerPhone').value = '';
    document.getElementById('registerTeam').value = '';
    document.getElementById('registerPassword').value = '';
    document.getElementById('registerConfirmPassword').value = '';
    
    alert(t('registrationSuccess'));
    
    // 切換到登錄頁
    showLoginForm();
    console.log('====== 註冊流程完成 ======');
    
  } catch (error) {
    console.error('註冊過程中發生未預期錯誤:', error);
    logError('REGISTRATION', '註冊過程中發生未預期錯誤', error);
    alert(t('registrationFailed') + ': ' + (error.message || t('unknownError')));
  } finally {
    // 隱藏加載指示器
    document.getElementById('auth-loading').style.display = 'none';
  }
}

// 登出用戶
async function logoutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      throw error;
    }
    
    currentUser = null;
    showAuthContainer();
  } catch (error) {
    console.error('Logout error:', error.message);
    alert('登出時發生錯誤: ' + error.message);
  }
}

// 顯示主應用
function showMainApp() {
  document.getElementById('authContainer').style.display = 'none';
  document.getElementById('mainAppContainer').style.display = 'block';
}

// 顯示認證頁面
function showAuthContainer() {
  document.getElementById('authContainer').style.display = 'flex';
  document.getElementById('mainAppContainer').style.display = 'none';
  showLoginForm(); // 默認顯示登入表單
}

// 顯示登入表單
function showLoginForm() {
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('registerForm').style.display = 'none';
  
  // 隱藏重設密碼表單（如果存在）
  const resetForm = document.getElementById('resetPasswordForm');
  if (resetForm) {
    resetForm.style.display = 'none';
  }
  
  // 清空錯誤訊息
  document.getElementById('loginError').textContent = '';
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPassword').value = '';
}

// 顯示註冊表單
function showRegisterForm() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'block';
  document.getElementById('registerError').textContent = '';
  document.getElementById('registerName').value = '';
  document.getElementById('registerEmail').value = '';
  document.getElementById('registerPassword').value = '';
  document.getElementById('registerConfirmPassword').value = '';
}

// 連接到數據庫功能
async function saveToDatabase(tableName, data) {
  try {
    const { error } = await supabase
      .from(tableName)
      .insert([data]);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error(`Error saving to ${tableName}:`, error.message);
    return false;
  }
}

// 從數據庫獲取資料
async function fetchFromDatabase(tableName, query = {}) {
  try {
    let request = supabase.from(tableName).select('*');
    
    // 添加查詢條件
    if (query.filters) {
      for (const filter of query.filters) {
        request = request.filter(filter.column, filter.operator, filter.value);
      }
    }
    
    // 處理排序
    if (query.order) {
      request = request.order(query.order.column, { ascending: query.order.ascending });
    }
    
    // 處理範圍限制
    if (query.limit) {
      request = request.limit(query.limit);
    }
    
    const { data, error } = await request;
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching from ${tableName}:`, error.message);
    return [];
  }
}

// 載入並顯示用戶資料在設定檔頁面
async function loadUserProfileData() {
  try {
    // 確保用戶已登入
    if (!currentUser || !currentUser.id) {
      console.error('未找到當前用戶資料，可能未登入');
      displayProfileMessage('請先登入再更新資料', 'error');
      return null;
    }
    
    console.log('正在載入用戶資料...');
    
    // 獲取最新的用戶資料
    const { data: userData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();
    
    if (error) {
      console.error('獲取用戶資料失敗:', error);
      displayProfileMessage('無法載入用戶資料', 'error');
      return null;
    }
    
    if (!userData) {
      console.error('無法獲取用戶資料');
      displayProfileMessage('找不到用戶資料', 'error');
      return null;
    }
    
    // 更新當前用戶資料
    currentUser = userData;
    
    // 獲取用戶的電子郵件
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('獲取用戶認證資料失敗:', userError);
    }
    
    // 填入設定檔表單
    document.getElementById('profileName').value = userData.name || '';
    document.getElementById('profileEmail').value = user?.email || '';
    document.getElementById('profilePhone').value = userData.phone || '';
    document.getElementById('profileTeam').value = userData.team || '';
    document.getElementById('profileBio').value = userData.bio || '';
    
    // 處理頭像
    const avatarImg = document.getElementById('avatarPreview');
    // 使用默認SVG數據
    const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIiBmaWxsPSIjYjcxYzFjIj48Y2lyY2xlIGN4PSIxMDAiIGN5PSI4MCIgcj0iNTAiLz48cGF0aCBkPSJNMTAwIDE1MGMtNDYuOSAwLTg1IDMzLjEtODUgNzQuNWgxNzBjMC00MS40LTM4LjEtNzQuNS04NS03NC41eiIvPjwvc3ZnPg==';
    
    console.log('處理頭像，用戶資料:', userData);
    console.log('當前頭像URL:', userData.avatar_url);
    
    if (userData.avatar_url && userData.avatar_url.startsWith('data:image/')) {
      // 直接使用 Data URL
      console.log('頭像是 Data URL 格式');
      avatarImg.src = userData.avatar_url;
    } else {
      console.log('頭像URL不是 Data URL 或不存在，使用默認頭像');
      avatarImg.src = defaultAvatar;
    }
    
    // 隱藏任何先前的更新訊息
    const messageElement = document.getElementById('profileUpdateMessage');
    if (messageElement) {
      messageElement.style.display = 'none';
    }
    
    return userData;
  } catch (error) {
    console.error('載入用戶資料時出錯:', error);
    displayProfileMessage('載入資料失敗', 'error');
    return null;
  }
}

// 預覽頭像圖片
function previewAvatar(input) {
  if (!input.files || !input.files[0]) {
    return;
  }
  
  const file = input.files[0];
  
  // 檢查文件類型
  if (!file.type.match('image.*')) {
    alert('請選擇圖片檔案');
    return;
  }
  
  // 檢查文件大小（限制為 1MB）
  if (file.size > 1048576) {
    alert('圖片大小不能超過 1MB');
    input.value = ''; // 清空輸入
    return;
  }
  
  // 預覽圖片
  const reader = new FileReader();
  reader.onload = function(e) {
    const avatarPreview = document.getElementById('avatarPreview');
    if (avatarPreview) {
      avatarPreview.src = e.target.result;
    }
  };
  reader.readAsDataURL(file);
}

// 更新用戶設定檔
async function updateUserProfile() {
  try {
    console.log('嘗試更新用戶資料，當前用戶：', currentUser);
    
    // 確保用戶已登入
    if (!currentUser || !currentUser.id) {
      console.error('未找到當前用戶資料，可能未登入');
      displayProfileMessage('更新資料失敗', 'error');
      return;
    }
    
    // 獲取表單資料
    const name = document.getElementById('profileName').value.trim();
    const phone = document.getElementById('profilePhone').value.trim();
    const team = document.getElementById('profileTeam').value.trim();
    const bio = document.getElementById('profileBio').value.trim();
    
    // 開始更新資料
    displayProfileMessage('正在更新...', 'info');
    
    // 處理頭像 - 使用直接的 Data URL 方式而不是儲存文件
    let avatarDataUrl = null;
    const avatarInput = document.getElementById('avatarUpload');
    
    if (avatarInput.files && avatarInput.files[0]) {
      const file = avatarInput.files[0];
      
      // 檢查文件大小不超過 1MB (1048576 bytes)
      if (file.size > 1048576) {
        displayProfileMessage('頭像圖片過大，請選擇小於 1MB 的圖片', 'error');
        return;
      }
      
      try {
        // 讀取文件為 Data URL
        avatarDataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target.result);
          reader.onerror = e => reject(e);
          reader.readAsDataURL(file);
        });
        
        console.log('圖片已轉換為 Data URL，長度:', avatarDataUrl.length);
      } catch (error) {
        console.error('讀取頭像文件失敗:', error);
        displayProfileMessage('處理頭像圖片失敗', 'error');
        return;
      }
    }
    
    // 準備更新數據
    const updateData = {
      name: name,
      phone: phone,
      team: team,
      bio: bio,
      updated_at: new Date().toISOString()
    };
    
    // 只有選擇了新頭像時才更新頭像欄位
    if (avatarDataUrl) {
      updateData.avatar_url = avatarDataUrl;
    }
    
    // 更新用戶資料
    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', currentUser.id);
    
    if (error) {
      console.error('更新用戶資料失敗:', error);
      displayProfileMessage('更新資料失敗', 'error');
      return;
    }
    
    // 更新本地用戶對象
    currentUser.name = name;
    currentUser.phone = phone;
    currentUser.team = team;
    currentUser.bio = bio;
    if (avatarDataUrl) {
      currentUser.avatar_url = avatarDataUrl;
      
      // 立即更新頭像預覽
      const avatarPreview = document.getElementById('avatarPreview');
      if (avatarPreview) {
        avatarPreview.src = avatarDataUrl;
      }
    }
    
    // 更新 UI 顯示
    updateUserDisplay();
    
    displayProfileMessage('資料更新成功！', 'success');
    console.log('用戶資料已更新');
  } catch (error) {
    console.error('更新資料時發生錯誤:', error);
    displayProfileMessage('更新資料失敗', 'error');
  }
}

// 顯示個人資料更新訊息
function displayProfileMessage(message, type) {
  const messageElement = document.getElementById('profileUpdateMessage');
  if (!messageElement) return;
  
  // 設置訊息內容和樣式
  messageElement.textContent = message;
  messageElement.className = 'update-message';
  
  // 添加對應的樣式類
  if (type === 'error') {
    messageElement.classList.add('error');
  } else if (type === 'success') {
    messageElement.classList.add('success');
  } else if (type === 'info') {
    messageElement.classList.add('info');
  }
  
  // 顯示訊息
  messageElement.style.display = 'block';
  
  // 如果是成功或錯誤訊息，設置定時隱藏
  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      messageElement.style.display = 'none';
    }, 5000);
  }
}

// 顯示重設密碼表單
function showResetPasswordForm() {
  // 隱藏登入表單
  document.getElementById('loginForm').style.display = 'none';
  
  // 創建重設密碼表單（如果不存在）
  if (!document.getElementById('resetPasswordForm')) {
    const resetForm = document.createElement('div');
    resetForm.id = 'resetPasswordForm';
    resetForm.className = 'auth-form';
    resetForm.innerHTML = `
      <h3>重設密碼</h3>
      <div class="form-group">
        <label for="resetEmail">電子郵件</label>
        <input type="email" id="resetEmail" placeholder="輸入您的電子郵件">
      </div>
      <button class="btn primary-btn" onclick="sendPasswordReset()">發送重設連結</button>
      <p class="auth-switch"><a href="#" onclick="showLoginForm()">返回登入</a></p>
      <div id="resetError" class="error-message"></div>
    `;
    document.querySelector('.auth-card').appendChild(resetForm);
  } else {
    document.getElementById('resetPasswordForm').style.display = 'block';
  }
}

// 發送密碼重設郵件
async function sendPasswordReset() {
  const email = document.getElementById('resetEmail').value;
  const errorMessage = document.getElementById('resetError');
  
  if (!email) {
    errorMessage.textContent = '請輸入電子郵箱';
    return;
  }
  
  try {
    errorMessage.textContent = '發送重設連結中...';
    errorMessage.style.color = '#1565c0';
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });
    
    if (error) {
      console.error('發送密碼重設郵件失敗:', error);
      errorMessage.textContent = '發送失敗: ' + error.message;
      errorMessage.style.color = '#c62828';
      return;
    }
    
    errorMessage.textContent = '重設密碼連結已發送到您的郵箱，請查收';
    errorMessage.style.color = '#2e7d32';
  } catch (error) {
    console.error('重設密碼過程中發生錯誤:', error);
    errorMessage.textContent = '發送失敗: ' + (error.message || '請稍後再試');
    errorMessage.style.color = '#c62828';
  }
}

// 將用戶資料導出為全局變數，以供其他腳本使用
window.currentUser = currentUser;
window.saveToDatabase = saveToDatabase;
window.fetchFromDatabase = fetchFromDatabase;
window.showResetPasswordForm = showResetPasswordForm;
window.sendPasswordReset = sendPasswordReset;
window.loadUserProfileData = loadUserProfileData;

// 檢查Supabase存儲桶設置
async function checkSupabaseStorageBucket() {
  try {
    console.log('正在檢查Supabase存儲桶設置...');
    
    // 檢查'avatars'存儲桶是否存在
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      console.error('無法獲取存儲桶列表:', bucketsError);
      return false;
    }
    
    console.log('現有的存儲桶:', buckets);
    
    const avatarBucket = buckets.find(bucket => bucket.name === 'avatars');
    
    if (!avatarBucket) {
      console.error('avatars存儲桶不存在!');
      
      // 嘗試創建存儲桶
      try {
        const { data: newBucket, error: createError } = await supabase
          .storage
          .createBucket('avatars', {
            public: true
          });
        
        if (createError) {
          console.error('創建avatars存儲桶失敗:', createError);
          return false;
        }
        
        console.log('成功創建avatars存儲桶:', newBucket);
        return true;
      } catch (createError) {
        console.error('創建存儲桶時出錯:', createError);
        return false;
      }
    }
    
    // 檢查存儲桶是否為公共訪問
    console.log('avatars存儲桶存在:', avatarBucket);
    
    // 嘗試創建一個測試文件
    const testContent = new Blob(['test'], { type: 'text/plain' });
    const testPath = `test_${new Date().getTime()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('avatars')
      .upload(testPath, testContent, {
        cacheControl: '0',
        upsert: true
      });
    
    if (uploadError) {
      console.error('上傳測試文件失敗:', uploadError);
      return false;
    }
    
    console.log('上傳測試文件成功:', uploadData);
    
    // 獲取測試文件的公共URL
    const { data: urlData, error: urlError } = await supabase
      .storage
      .from('avatars')
      .getPublicUrl(testPath);
    
    if (urlError) {
      console.error('無法獲取測試文件的公共URL:', urlError);
      return false;
    }
    
    console.log('測試文件的公共URL:', urlData);
    
    // 檢查公共URL是否可訪問
    try {
      const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
      console.log('測試URL訪問結果:', response.status, response.ok);
      
      if (!response.ok) {
        console.error('測試URL無法訪問，可能是權限問題:', response.status);
        return false;
      }
      
      console.log('測試URL可以訪問，存儲桶設置正確');
      
      // 清理測試文件
      await supabase.storage.from('avatars').remove([testPath]);
      
      return true;
    } catch (fetchError) {
      console.error('檢查測試URL時出錯:', fetchError);
      return false;
    }
  } catch (error) {
    console.error('檢查存儲桶設置時出錯:', error);
    return false;
  }
}

// 修復存儲桶設置以確保avatars是公開可訪問的
async function fixStorageBucketSettings() {
  try {
    console.log('嘗試修復存儲桶設置...');
    
    // 檢查avatars存儲桶是否存在
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      console.error('獲取存儲桶列表失敗:', bucketsError);
      return false;
    }
    
    console.log('現有存儲桶:', buckets);
    
    // 如果avatars存儲桶不存在，則創建它
    const avatarBucket = buckets.find(b => b.name === 'avatars');
    if (!avatarBucket) {
      console.log('創建avatars存儲桶');
      const { data: newBucket, error: createError } = await supabase
        .storage
        .createBucket('avatars', { public: true });
      
      if (createError) {
        console.error('創建avatars存儲桶失敗:', createError);
      } else {
        console.log('成功創建avatars存儲桶:', newBucket);
      }
    } else {
      console.log('avatars存儲桶已存在:', avatarBucket);
      
      // 如果存儲桶不是公開的，嘗試更新它
      if (!avatarBucket.public) {
        console.log('更新avatars存儲桶為公開訪問');
        const { data: updateData, error: updateError } = await supabase
          .storage
          .updateBucket('avatars', { public: true });
        
        if (updateError) {
          console.error('更新avatars存儲桶失敗:', updateError);
        } else {
          console.log('成功更新avatars存儲桶:', updateData);
        }
      }
    }
    
    // 測試上傳一個小文件到存儲桶
    const testBlob = new Blob(['test'], { type: 'text/plain' });
    const testPath = 'test_' + new Date().getTime() + '.txt';
    
    console.log('嘗試上傳測試文件到存儲桶:', testPath);
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('avatars')
      .upload(testPath, testBlob, { upsert: true });
    
    if (uploadError) {
      console.error('測試文件上傳失敗:', uploadError);
      return false;
    }
    
    console.log('測試文件上傳成功:', uploadData);
    
    // 獲取並檢查公共URL
    const { data: urlData, error: urlError } = await supabase
      .storage
      .from('avatars')
      .getPublicUrl(testPath);
    
    if (urlError) {
      console.error('獲取測試文件公共URL失敗:', urlError);
      return false;
    }
    
    console.log('測試文件公共URL:', urlData);
    
    // 清理測試文件
    await supabase.storage.from('avatars').remove([testPath]);
    
    return true;
  } catch (error) {
    console.error('修復存儲桶設置時發生錯誤:', error);
    return false;
  }
}

// 修復Profiles表的權限策略
async function fixProfilesTablePolicies() {
  try {
    console.log('嘗試檢查用戶和權限設置...');
    
    // 首先匿名檢查是否可以獲取當前會話
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('無法獲取會話:', sessionError);
      return false;
    }
    
    console.log('當前會話狀態:', session ? '已登入' : '未登入');
    
    // 檢查是否能獲取profiles表結構
    const { data: tableInfo, error: tableError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('無法查詢profiles表:', tableError);
      
      // 如果是權限問題，可能需要使用SQL來添加RLS策略
      console.log('可能是RLS權限問題，請確認SQL設置正確');
      
      // 不能直接執行SQL，這需要在Supabase面板中操作
      console.log('請確認以下SQL已在Supabase執行:');
      console.log(`
        -- 允許匿名用戶創建資料
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow anonymous users to create profiles" ON public.profiles
          FOR INSERT WITH CHECK (true);
        CREATE POLICY "Profiles are viewable by the user who owns it" ON public.profiles
          FOR SELECT USING (auth.uid() = id);
      `);
      
      return false;
    }
    
    console.log('成功查詢profiles表，結構:', tableInfo);
    
    // 嘗試匿名創建一個測試記錄 (如果未登入)
    if (!session) {
      // 創建臨時測試用戶
      const testEmail = `test_${new Date().getTime()}@example.com`;
      const testPassword = 'Test12345678';
      
      console.log('嘗試創建測試用戶:', testEmail);
      
      const { data: testUserData, error: testUserError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: { name: 'Test User' }
        }
      });
      
      if (testUserError) {
        console.error('創建測試用戶失敗:', testUserError);
        return false;
      }
      
      console.log('測試用戶創建結果:', testUserData);
      
      if (testUserData && testUserData.user) {
        // 嘗試插入測試資料
        const testProfileData = {
          id: testUserData.user.id,
          name: 'Test User',
          email: testEmail
        };
        
        console.log('嘗試創建測試用戶資料:', testProfileData);
        
        const { data: testProfileResult, error: testProfileError } = await supabase
          .from('profiles')
          .insert([testProfileData])
          .select();
        
        if (testProfileError) {
          console.error('創建測試用戶資料失敗:', testProfileError);
          return false;
        }
        
        console.log('測試用戶資料創建成功:', testProfileResult);
        return true;
      }
    }
    
    return true;
  } catch (error) {
    console.error('修復profiles表策略時發生錯誤:', error);
    return false;
  }
}

// 檢查數據庫結構
async function checkDatabaseSetup() {
  console.log('檢查數據庫設置...');
  
  try {
    // 測試profiles表查詢
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (profilesError) {
      console.error('無法查詢profiles表:', profilesError);
      logError('DATABASE', '數據庫結構檢查 - 無法查詢profiles表', profilesError);
      return false;
    }
    
    console.log('profiles表可以查詢:', profilesData);
    
    // 測試插入記錄 (測試用戶)
    const testId = 'test-' + Math.random().toString(36).substring(2, 10);
    const testProfile = {
      id: testId,
      name: 'Test User',
      email: 'test@example.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { error: insertError } = await supabase
      .from('profiles')
      .insert([testProfile]);
    
    if (insertError) {
      // 檢查是否是權限錯誤 (正常用戶可能無法直接插入)
      if (insertError.code === '42501' || insertError.message.includes('permission denied')) {
        console.warn('無插入權限，這可能是正常的RLS設置:', insertError);
        // 記錄但不視為錯誤
        return true;
      }
      
      console.error('無法插入測試記錄到profiles表:', insertError);
      logError('DATABASE', '數據庫結構檢查 - 無法插入測試記錄', insertError);
      return false;
    }
    
    // 清理測試數據
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', testId);
    
    if (deleteError) {
      console.warn('無法刪除測試記錄，這可能是正常的RLS設置:', deleteError);
    }
    
    console.log('數據庫結構檢查成功');
    return true;
  } catch (error) {
    console.error('檢查數據庫設置時發生錯誤:', error);
    logError('DATABASE', '數據庫結構檢查 - 未預期的錯誤', error);
    return false;
  }
}

// 錯誤日誌記錄函數
function logError(category, message, errorDetails) {
  const timestamp = new Date().toISOString();
  const error = {
    timestamp,
    category,
    message,
    details: errorDetails ? JSON.stringify(errorDetails) : null
  };
  
  // 寫入控制台
  console.error(`[${timestamp}] [${category}] ${message}`, errorDetails || '');
  
  // 存儲在localStorage中
  try {
    const errorLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
    errorLogs.push(error);
    // 只保留最近100條錯誤
    if (errorLogs.length > 100) {
      errorLogs.shift();
    }
    localStorage.setItem('errorLogs', JSON.stringify(errorLogs));
  } catch (e) {
    console.error('無法寫入錯誤日誌到localStorage:', e);
  }
  
  return error;
} 