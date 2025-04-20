// Supabase 設定
const SUPABASE_URL = 'https://pnetsexavvkvgnoqprly.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuZXRzZXhhdnZrdmdub3Fwcmx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwODQ4MTksImV4cCI6MjA1OTY2MDgxOX0.-lZKPLfhv-LrBjxQ586uOGMrjh8xS8kc3xH5h5OsppM';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 當前用戶數據 
let currentUser = null;
let avatarFile = null; // 用於存儲頭像文件

// DOM 載入完成後運行
document.addEventListener('DOMContentLoaded', function() {
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
  
  // 檢查Supabase存儲桶設置
  checkSupabaseStorageBucket().then(isValid => {
    console.log('存儲桶檢查結果:', isValid ? '正常' : '有問題');
  });
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
    
    // 在這裡添加頭像處理代碼
    // 將來可以在頁面頂部添加一個小頭像顯示
    if (currentUser.avatar_url) {
      try {
        // 獲取頭像的公共URL
        const { data } = await supabase.storage
          .from('avatars')
          .getPublicUrl(currentUser.avatar_url);
          
        // 添加時間戳防止緩存
        const timestamp = new Date().getTime();
        const avatarUrl = `${data.publicUrl}?t=${timestamp}`;
        
        // 如果在個人資料頁面，也更新預覽頭像
        const profileAvatar = document.getElementById('avatarPreview');
        if (profileAvatar) {
          profileAvatar.src = avatarUrl;
          console.log('在updateUserDisplay中更新了頭像:', avatarUrl);
        }
      } catch (error) {
        console.error('獲取頭像URL失敗:', error);
      }
    }
  }
}

// 登入用戶
async function loginUser() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errorMessage = document.getElementById('loginError');
  
  if (!email || !password) {
    errorMessage.textContent = '請輸入電子郵箱和密碼';
    return;
  }
  
  try {
    // 顯示登入中提示
    errorMessage.textContent = '登入中...';
    errorMessage.style.color = '#1565c0';
    
    console.log('嘗試登入帳號:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
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

// 註冊新用戶
async function registerUser() {
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerConfirmPassword').value;
  const errorMessage = document.getElementById('registerError');
  
  if (!name || !email || !password) {
    errorMessage.textContent = '請填寫所有必填字段';
    return;
  }
  
  if (password !== confirmPassword) {
    errorMessage.textContent = '兩次輸入的密碼不一致';
    return;
  }
  
  if (password.length < 8) {
    errorMessage.textContent = '密碼長度應至少為8個字符';
    return;
  }
  
  try {
    // 1. 註冊用戶
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: { name: name }
      }
    });
    
    if (error) {
      throw error;
    }
    
    if (data && data.user) {
      // 2. 創建用戶資料
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ 
          id: data.user.id, 
          name: name, 
          email: email,
          phone: '',
          team: '',
          bio: '',
          avatar_url: '',
          created_at: new Date()
        }]);
      
      if (profileError) {
        console.error('Error creating profile:', profileError.message);
      }
      
      // 3. 登入成功，獲取用戶資料
      await fetchUserProfile(data.user.id);
      
      // 4. 顯示主應用
      showMainApp();
    }
  } catch (error) {
    console.error('Registration error:', error.message);
    errorMessage.textContent = '註冊失敗: ' + (error.message || '請嘗試使用其他電子郵箱');
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
    // 使用默認SVG數據（來自index.html）而不是無效的文件路徑
    const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIiBmaWxsPSIjYjcxYzFjIj48Y2lyY2xlIGN4PSIxMDAiIGN5PSI4MCIgcj0iNTAiLz48cGF0aCBkPSJNMTAwIDE1MGMtNDYuOSAwLTg1IDMzLjEtODUgNzQuNWgxNzBjMC00MS40LTM4LjEtNzQuNS04NS03NC41eiIvPjwvc3ZnPg==';
    
    console.log('處理頭像，用戶資料:', userData);
    console.log('當前頭像URL:', userData.avatar_url);
    console.log('頭像預覽元素:', avatarImg);
    
    if (userData.avatar_url) {
      try {
        // 獲取頭像的公共URL
        console.log('嘗試獲取頭像公共URL:', userData.avatar_url);
        const { data, error: urlError } = await supabase.storage
          .from('avatars')
          .getPublicUrl(userData.avatar_url);
          
        console.log('Supabase返回的公共URL數據:', data);
        
        if (urlError) {
          console.error('獲取公共URL失敗:', urlError);
          avatarImg.src = defaultAvatar;
          return;
        }
        
        if (!data || !data.publicUrl) {
          console.error('公共URL數據不完整:', data);
          avatarImg.src = defaultAvatar;
          return;
        }
          
        // 添加時間戳防止緩存
        const timestamp = new Date().getTime();
        const avatarUrl = `${data.publicUrl}?t=${timestamp}`;
        
        console.log('最終設置的頭像URL:', avatarUrl);
        
        // 直接檢查URL是否可訪問
        try {
          const checkResponse = await fetch(avatarUrl, { method: 'HEAD' });
          console.log('頭像URL檢查結果:', checkResponse.status, checkResponse.ok);
          
          if (!checkResponse.ok) {
            console.error('頭像URL無法訪問:', checkResponse.status);
            avatarImg.src = defaultAvatar;
            return;
          }
        } catch (fetchError) {
          console.error('檢查頭像URL時出錯:', fetchError);
          // 繼續嘗試設置圖片，讓瀏覽器處理加載錯誤
        }
        
        avatarImg.src = avatarUrl;
        
        // 添加事件監聽器以檢查圖片載入狀態
        avatarImg.onload = function() {
          console.log('頭像圖片成功載入');
        };
        
        avatarImg.onerror = function(e) {
          console.error('頭像圖片載入失敗:', e);
          avatarImg.src = defaultAvatar;
        };
        
        console.log('頭像URL已設置');
      } catch (error) {
        console.error('獲取頭像URL失敗:', error);
        avatarImg.src = defaultAvatar;
      }
    } else {
      console.log('用戶沒有頭像URL，使用默認頭像');
      avatarImg.src = defaultAvatar;
    }
    
    // 隱藏任何先前的更新訊息
    const messageElement = document.getElementById('profileUpdateMessage');
    if (messageElement) {
      messageElement.style.display = 'none';
    }
    
    console.log('用戶資料載入完成');
    
    return userData;
  } catch (error) {
    console.error('載入用戶資料時發生錯誤:', error);
    displayProfileMessage('載入資料時發生錯誤', 'error');
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
  
  // 檢查文件大小（限制為 2MB）
  if (file.size > 2 * 1024 * 1024) {
    alert('圖片大小不能超過 2MB');
    return;
  }
  
  // 保存文件以便稍後上傳
  avatarFile = file;
  
  // 預覽圖片
  const reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('avatarPreview').src = e.target.result;
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
    
    // 處理頭像上傳
    const avatarInput = document.getElementById('avatarUpload');
    let avatarUrl = null;
    
    // 開始更新資料
    displayProfileMessage('正在上傳...', 'info');
    
    // 如果有選擇新頭像，上傳到Supabase
    if (avatarInput.files && avatarInput.files[0]) {
      const avatarFile = avatarInput.files[0];
      
      // 創建唯一的檔案名稱 (用戶ID + 時間戳 + 原檔名)
      const timestamp = new Date().getTime();
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${currentUser.id}_${timestamp}.${fileExt}`;
      // 恢復原始路徑格式
      const filePath = `${currentUser.id}/${fileName}`;
      
      // 上傳頭像到Supabase
      console.log('嘗試上傳頭像到Supabase，路徑:', filePath);
      console.log('上傳文件大小:', avatarFile.size, '類型:', avatarFile.type);
      const uploadOptions = {
        cacheControl: '3600',
        upsert: true
      };
      console.log('上傳選項:', uploadOptions);
      
      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, uploadOptions);
        
        console.log('上傳結果:', uploadData, '上傳錯誤:', uploadError);
        
        if (uploadError) {
          console.error('頭像上傳失敗:', uploadError);
          // 顯示更詳細的錯誤信息
          displayProfileMessage('頭像上傳失敗: ' + (uploadError.message || uploadError.error || '未知錯誤'), 'error');
          return;
        } else {
          console.log('頭像上傳成功，返回數據:', uploadData);
          avatarUrl = filePath;
        }
      } catch (e) {
        console.error('頭像上傳時發生異常:', e);
        displayProfileMessage('頭像上傳過程中出現異常: ' + e.message, 'error');
        return;
      }
    }
    
    console.log('準備更新資料庫中的用戶資料，ID:', currentUser.id);
    
    // 更新用戶資料
    const { data, error } = await supabase
      .from('profiles')  // 使用正確的表格名稱 'profiles'
      .update({
        name: name,
        phone: phone,
        team: team,
        bio: bio,
        ...(avatarUrl && { avatar_url: avatarUrl }), // 只有在成功上傳頭像時才更新
        updated_at: new Date().toISOString()
      })
      .eq('id', currentUser.id);
    
    if (error) {
      console.error('更新用戶資料失敗:', error);
      displayProfileMessage('更新資料失敗', 'error');
      return;
    }
    
    // 更新用戶對象
    currentUser.name = name;
    currentUser.phone = phone;
    currentUser.team = team;
    currentUser.bio = bio;
    if (avatarUrl) currentUser.avatar_url = avatarUrl;
    
    // 更新 UI 顯示
    updateUserDisplay();
    
    // 如果已經成功上傳了新頭像，立即更新頭像顯示
    if (avatarUrl) {
      try {
        // 獲取頭像的公共URL
        console.log('正在獲取上傳頭像的公共URL，路徑:', avatarUrl);
        
        const { data: urlData, error: urlError } = await supabase.storage
          .from('avatars')
          .getPublicUrl(avatarUrl);
          
        console.log('獲取公共URL結果:', urlData);
        
        if (urlError) {
          console.error('獲取公共URL失敗:', urlError);
          displayProfileMessage('無法獲取頭像URL', 'error');
        } else if (!urlData || !urlData.publicUrl) {
          console.error('公共URL數據不完整:', urlData);
          displayProfileMessage('頭像URL無效', 'error');
        } else {
          // 添加時間戳防止緩存
          const timestamp = new Date().getTime();
          const publicAvatarUrl = `${urlData.publicUrl}?t=${timestamp}`;
          
          console.log('最終生成的公共URL:', publicAvatarUrl);
          
          // 更新預覽頭像
          const avatarPreview = document.getElementById('avatarPreview');
          if (avatarPreview) {
            avatarPreview.src = publicAvatarUrl;
            
            // 添加事件監聽器以檢查圖片載入狀態
            avatarPreview.onload = function() {
              console.log('頭像圖片成功載入');
            };
            
            avatarPreview.onerror = function(e) {
              console.error('頭像圖片載入失敗:', e);
              // 使用預設頭像
              avatarPreview.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIiBmaWxsPSIjYjcxYzFjIj48Y2lyY2xlIGN4PSIxMDAiIGN5PSI4MCIgcj0iNTAiLz48cGF0aCBkPSJNMTAwIDE1MGMtNDYuOSAwLTg1IDMzLjEtODUgNzQuNWgxNzBjMC00MS40LTM4LjEtNzQuNS04NS03NC41eiIvPjwvc3ZnPg==';
            };
            
            console.log('已設置頭像預覽元素的src');
          } else {
            console.error('未找到頭像預覽元素');
          }
        }
      } catch (error) {
        console.error('更新頭像顯示失敗:', error);
      }
    }
    
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