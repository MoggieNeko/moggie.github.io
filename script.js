// Global translation function
function t(key, params = {}) {
  // Default to Traditional Chinese if translations is not defined yet
  if (typeof window.translations === 'undefined') {
    console.warn("Translations not loaded yet");
    return key;
  }
  
  // Use currentLanguage from window or default to zh-TW
  const lang = window.currentLanguage || "zh-TW";
  const translation = window.translations[lang]?.[key] || key;
  
  // 處理參數替換
  if (Object.keys(params).length > 0) {
    return translation.replace(/{(\w+)}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }
  
  return translation;
}

// 安全初始化音效
let soundStart = null;
let soundPause = null;
let soundEnd = null;

// 安全的音效播放函數
function playSound(sound) {
  try {
    if (sound && typeof sound.play === 'function') {
      // 重置音效時間，確保每次都從頭播放
      try {
        sound.currentTime = 0;
      } catch (e) {
        console.warn("無法重置音效時間:", e);
      }
      
      // 使用 Promise 處理音效播放
      sound.play().catch(e => {
        console.warn("音效播放被瀏覽器拒絕（可能是用戶尚未與頁面互動）:", e);
      });
    }
  } catch (e) {
    console.warn("播放音效時發生錯誤:", e);
  }
}

// 音效初始化函數
function initSounds() {
  try {
    soundStart = new Audio("sounds/start.mp3");
    soundPause = new Audio("sounds/pause.mp3");
    soundEnd = new Audio("sounds/end.mp3");
    
    // 添加錯誤處理
    soundStart.onerror = function() { console.warn("無法載入開始音效"); };
    soundPause.onerror = function() { console.warn("無法載入暫停音效"); };
    soundEnd.onerror = function() { console.warn("無法載入結束音效"); };
    
    console.log("音效檔案已初始化");
  } catch (e) {
    console.warn("初始化音效時發生錯誤:", e);
    // 確保即使出錯，音效變數也至少是有效的物件，避免後續使用時出現錯誤
    soundStart = { play: function() { return Promise.resolve(); } };
    soundPause = { play: function() { return Promise.resolve(); } };
    soundEnd = { play: function() { return Promise.resolve(); } };
  }
}

// Make openSettingsPage globally accessible
function openSettingsPage() {
  switchPage('settingsPage');
  
  // Update active nav item
  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.remove("active");
  });
  
  // Find the settings nav item and mark it active
  const settingsNavItem = document.querySelector('.nav-item:last-child');
  if (settingsNavItem) {
    settingsNavItem.classList.add("active");
  }
}

// Function to view knockout bracket
function viewKnockoutBracket() {
  if (!knockoutBracket) {
    alert(t("noKnockoutData"));
    return;
  }
  
  switchPage("knockoutPage");
}

// Function to restart a new match/tournament
function restartNewMatch() {
  console.log("Restarting new match...");
  if (confirm("確定要重新開始新的比賽嗎？所有目前比賽資料將被清除。")) {
    resetAllData();
    switchPage("homePage");
  }
}

// Initialize knockoutBracket if undefined
if (typeof knockoutBracket === 'undefined') {
  knockoutBracket = { rounds: [] };
}

// Export functions to global scope
window.openSettingsPage = openSettingsPage;
window.viewKnockoutBracket = viewKnockoutBracket;
window.restartNewMatch = restartNewMatch;
window.knockoutBracket = knockoutBracket;

// 全局函數 - 進入淘汰賽
function startKnockoutMatch(roundIndex, matchIndex) {
  console.log("Starting knockout match globally:", roundIndex, matchIndex);
  
  try {
    // 獲取對應的比賽和選手數據
    if (!window.knockoutBracket || !window.knockoutBracket.rounds) {
      console.error("No knockout bracket data available");
      alert("無法進入比賽：比賽數據不存在");
      return;
    }
    
    let round = window.knockoutBracket.rounds[roundIndex];
    if (!round) {
      console.error("Round not found:", roundIndex);
      alert(`無法進入比賽：輪次 ${roundIndex} 不存在`);
      return;
    }
    
    let match = round[matchIndex];
    if (!match) {
      console.error("Match not found:", matchIndex);
      alert(`無法進入比賽：比賽 ${matchIndex} 不存在`);
      return;
    }
    
    console.log("Match data:", JSON.stringify(match));
    
    // 嘗試使用 window.enterKnockoutMatch 函數
    if (typeof window.enterKnockoutMatch === 'function') {
      console.log("Found global enterKnockoutMatch function, calling it...");
      window.enterKnockoutMatch(roundIndex, matchIndex);
      return;
    }
    
    // 如果沒有全局函數，則嘗試自己實現主要功能
    console.log("No global enterKnockoutMatch function, implementing locally...");
    
    // 處理 BYE 情況
    if (match.player1 && match.player1.name === "BYE" || match.player2 && match.player2.name === "BYE") {
      let winner = (match.player1 && match.player1.name === "BYE") ? match.player2 : match.player1;
      alert(t("byeAutoAdvance", {name: winner.name}));
      match.winner = winner;
      match.score1 = 0; match.score2 = 0;
      
      if (roundIndex < window.knockoutBracket.rounds.length - 1) {
        let nextRound = window.knockoutBracket.rounds[roundIndex + 1];
        let nextMatchIndex = Math.floor(matchIndex / 2);
        if (!nextRound[nextMatchIndex].player1) {
          nextRound[nextMatchIndex].player1 = winner;
        } else {
          nextRound[nextMatchIndex].player2 = winner;
        }
        
        // 重新顯示淘汰賽對陣表
        let displayKnockoutBracket = window.displayKnockoutBracket;
        if (typeof displayKnockoutBracket === 'function') {
          displayKnockoutBracket();
        }
        
        // 切換回淘汰賽頁面
        let switchPage = window.switchPage;
        if (typeof switchPage === 'function') {
          switchPage("knockoutPage");
        }
      } else {
        // 如果是決賽，顯示最終結果
        let generateFinalResults = window.generateFinalResults;
        if (typeof generateFinalResults === 'function') {
          generateFinalResults();
        }
      }
      return;
    }
    
    // 確保雙方選手都已確認
    if (!match.player1 || !match.player2) {
      alert(t("matchNotConfirmed"));
      return;
    }
    
    // 重置比賽數據
    let resetMatchData = window.resetMatchData;
    if (typeof resetMatchData === 'function') {
      resetMatchData();
    }
    
    // 設置當前比賽數據
    window.currentMatchData = { 
      knockoutRound: roundIndex, 
      matchIndex: matchIndex, 
      player1: match.player1, 
      player2: match.player2 
    };
    
    // 更新 UI
    document.getElementById("matchPlayer1Name").textContent = match.player1.name;
    document.getElementById("matchPlayer2Name").textContent = match.player2.name;
    document.getElementById("matchScore1").value = "0";
    document.getElementById("matchScore2").value = "0";
    
    // 設置計時器
    window.remainingTime = window.totalMatchTime || 180;
    let updateTimerDisplay = window.updateTimerDisplay;
    if (typeof updateTimerDisplay === 'function') {
      updateTimerDisplay();
    }
    
    // 重置卡牌
    window.leftCard = "none";
    window.rightCard = "none";
    document.getElementById("cardDisplayLeft").textContent = t("currentCard") + "：" + t("noCard");
    document.getElementById("cardDisplayRight").textContent = t("currentCard") + "：" + t("noCard");
    
    // 設置返回按鈕文字
    document.getElementById("backButton").textContent = t("backToKnockout");
    
    // 切換到比賽頁面
    let switchPage = window.switchPage;
    if (typeof switchPage === 'function') {
      switchPage("matchPage");
    }
  } catch (e) {
    console.error("Error in startKnockoutMatch:", e);
    alert("進入比賽時發生錯誤：" + e.message);
  }
}

// 將函數導出到全局 window 對象，確保在頁面任何地方都可以訪問
window.startKnockoutMatch = startKnockoutMatch;

document.addEventListener("DOMContentLoaded", function() {
  // 初始化音效
  initSounds();
  
  // ================= 語言系統 =================
  window.translations = {
    "zh-TW": { // 繁體中文（默認）
      // 導航和標題
      "home": "首頁",
      "pool": "小組賽",
      "seeding": "排名",
      "knockout": "淘汰賽",
      "results": "成績",
      "settings": "設定",
      "tournament": "比賽",
      "tournamentSetup": "比賽設定",
      "configTournament": "配置您的比賽設定",
      
      // 首頁設定
      "tournamentName": "比賽名稱",
      "numberOfPools": "小組數量",
      "qualifiersMethod": "晉級選擇方式",
      "byCount": "按數量",
      "byPercentage": "按百分比",
      "qualifiersPerPool": "每組晉級人數",
      "playersAdvance": "從每組晉級到淘汰賽階段的選手數量",
      "startTournament": "開始比賽",
      
      // 小組賽
      "poolEvent": "小組賽",
      "pool": "小組",
      "player": "選手",
      "players": "人",
      "completePoolCalc": "輸入完成",
      "pendingMatch": "待賽",
      
      // 對戰
      "match": "對決",
      "score": "比分",
      "matchTime": "比賽時間",
      "countdownTimer": "比賽倒計時 (MM:SS)",
      "start": "開始",
      "pause": "暫停",
      "reset": "重設",
      "resetCards": "重置發牌",
      "leftCards": "左方發牌",
      "rightCards": "右方發牌",
      "noCard": "無牌",
      "yellowCard": "黃牌",
      "redCard": "紅牌",
      "blackCard": "黑牌",
      "currentCard": "目前牌",
      "submitResult": "送出比賽結果",
      "returnToPool": "返回對戰表",
      
      // Tie-Break
      "tieBreak": "平局決勝",
      "tieBreakPriority": "Tie-Break！優先權",
      "left": "左方",
      "right": "右方",
      "startTieBreak": "開始 Tie-Break",
      "selectingPriority": "抽選中...",
      "drawPriority": "平手！抽取優先權，{side}獲得優先權！",
      "pressTieBreakBtn": "，請按下「開始 Tie-Break」開始計時",
      
      // 排名和結果
      "overallSeeding": "總體排名和結果",
      "normalPlayers": "正常選手",
      "dqPlayers": "被DQ選手",
      "enterKnockout": "進入淘汰賽",
      "rank": "排名",
      "victory": "勝",
      "touchesScored": "得分",
      "touchesReceived": "失分",
      "index": "指數",
      "placement": "名次",
      "status": "狀態",
      "advanced": "晉級",
      "eliminated": "淘汰",
      
      // 淘汰賽
      "knockoutMatches": "淘汰賽對陣表",
      "final": "決賽",
      "semifinals": "半決賽",
      "quarterfinals": "四分之一決賽",
      "round": "輪次",
      "vs": "對戰",
      "enterMatch": "進入比賽",
      "byeAutoAdvance": "輪空！{name} 自動晉級！",
      "matchNotConfirmed": "此比賽對陣尚未確定！",
      
      // 最終結果
      "finalResults": "最終成績",
      "downloadResults": "下載最終成績表",
      "viewKnockout": "查看淘汰賽對陣表",
      "restartNew": "重新開始新比賽",
      
      // 設定
      "language": "語言 / Language",
      "about": "關於",
      "version": "版本",
      "copyright": "© 2023 EAF. 保留所有權利。",
      
      // 警告和通知
      "playerNotFound": "找不到對應的選手資料！",
      "fillPlayerName": "請先填寫選手姓名！",
      "matchTimeUp": "比賽時間到！",
      "leftDisqualified": "左側被取消資格！",
      "rightDisqualified": "右側被取消資格！",
      "noQualifiedPlayers": "沒有有效的晉級選手！",
      "noPoolData": "尚未有小組賽資料！",
      "noKnockoutData": "尚未有淘汰賽資料！",
      "resetError": "重置時發生錯誤，請刷新頁面重試。",
      "poolCompleted": "Pool {poolID} 已完成",
      "backToKnockout": "返回淘汰賽",
      "bye": "輪空",
      "fillAllNames": "請填寫所有選手名稱！未填寫: 選手 {fields}",
      "allMatchesCompleted": "所有比賽已完成",
      "tbd": "待定",
      "final": "決賽",
      "semifinals": "準決賽",
      "quarterfinals": "四分之一決賽",
      "round": "第 {round} 輪",
      "enterMatch": "進入比賽"
    },
    
    "zh-CN": { // 簡體中文
      // 導航和標題
      "home": "首页",
      "pool": "小组赛",
      "seeding": "排名",
      "knockout": "淘汰赛",
      "results": "成绩",
      "settings": "设置",
      "tournament": "比赛",
      "tournamentSetup": "比赛设置",
      "configTournament": "配置您的比赛设置",
      
      // 首頁設定
      "tournamentName": "比赛名称",
      "numberOfPools": "小组数量",
      "qualifiersMethod": "晋级选择方式",
      "byCount": "按数量",
      "byPercentage": "按百分比",
      "qualifiersPerPool": "每组晋级人数",
      "playersAdvance": "从每组晋级到淘汰赛阶段的选手数量",
      "startTournament": "开始比赛",
      
      // 小組賽
      "poolEvent": "小组赛",
      "pool": "小组",
      "player": "选手",
      "players": "人",
      "completePoolCalc": "完成小组赛，计算晋级",
      "pendingMatch": "待赛",
      
      // 對戰
      "match": "对决",
      "score": "比分",
      "matchTime": "比赛时间",
      "countdownTimer": "比赛倒计时 (MM:SS)",
      "start": "开始",
      "pause": "暂停",
      "reset": "重设",
      "resetCards": "重置发牌",
      "leftCards": "左方发牌",
      "rightCards": "右方发牌",
      "noCard": "无牌",
      "yellowCard": "黄牌",
      "redCard": "红牌",
      "blackCard": "黑牌",
      "currentCard": "当前牌",
      "submitResult": "提交比赛结果",
      "returnToPool": "返回小组赛",
      
      // Tie-Break
      "tieBreak": "平局决胜",
      "tieBreakPriority": "Tie-Break！优先权",
      "left": "左方",
      "right": "右方",
      "startTieBreak": "开始 Tie-Break",
      "selectingPriority": "抽选中...",
      "drawPriority": "平手！抽取优先权，{side}获得优先权！",
      "pressTieBreakBtn": "，请按下「开始 Tie-Break」开始计时",
      
      // 排名和結果
      "overallSeeding": "总体排名和结果",
      "normalPlayers": "正常选手",
      "dqPlayers": "被DQ选手",
      "enterKnockout": "进入淘汰赛",
      "rank": "排名",
      "victory": "胜",
      "touchesScored": "得分",
      "touchesReceived": "失分",
      "index": "指数",
      "placement": "名次",
      "status": "状态",
      "advanced": "晋级",
      "eliminated": "淘汰",
      
      // 淘汰賽
      "knockoutMatches": "淘汰赛对阵表",
      "final": "决赛",
      "semifinals": "半决赛",
      "quarterfinals": "四分之一决赛",
      "round": "轮次",
      "vs": "对战",
      "enterMatch": "进入比赛",
      "byeAutoAdvance": "轮空！{name} 自动晋级！",
      "matchNotConfirmed": "此比赛对阵尚未确定！",
      
      // 最終結果
      "finalResults": "最终成绩",
      "downloadResults": "下载最终成绩表",
      "viewKnockout": "查看淘汰赛对阵表",
      "restartNew": "重新开始新比赛",
      
      // 設定
      "language": "语言 / Language",
      "about": "关于",
      "version": "版本",
      "copyright": "© 2023 EAF. 保留所有权利。",
      
      // 警告和通知
      "playerNotFound": "找不到对应的选手资料！",
      "fillPlayerName": "请先填写选手姓名！",
      "matchTimeUp": "比赛时间到！",
      "leftDisqualified": "左侧被取消资格！",
      "rightDisqualified": "右侧被取消资格！",
      "noQualifiedPlayers": "没有有效的晋级选手！",
      "noPoolData": "尚未有小组赛资料！",
      "noKnockoutData": "尚未有淘汰赛资料！",
      "resetError": "重置时发生错误，请刷新页面重试。",
      "poolCompleted": "Pool {poolID} 已完成",
      "backToKnockout": "返回淘汰赛",
      "bye": "轮空",
      "fillAllNames": "请填写所有选手名称！未填写: 选手 {fields}",
      "allMatchesCompleted": "所有比赛已完成",
      "tbd": "待定",
      "final": "决赛",
      "semifinals": "半决赛",
      "quarterfinals": "四分之一决赛",
      "round": "第 {round} 轮",
      "enterMatch": "进入比赛"
    },
    
    "en": { // 英文
      // 導航和標題
      "home": "Home",
      "pool": "Pool",
      "seeding": "Seeding",
      "knockout": "Knockout",
      "results": "Results",
      "settings": "Settings",
      "tournament": "Tournament",
      "tournamentSetup": "Tournament Setup",
      "configTournament": "Configure your tournament settings",
      
      // 首頁設定
      "tournamentName": "Tournament Name",
      "numberOfPools": "Number of Pools",
      "qualifiersMethod": "Qualifiers Selection Method",
      "byCount": "By Count",
      "byPercentage": "By Percentage",
      "qualifiersPerPool": "Qualifiers Per Pool",
      "playersAdvance": "Number of players who advance from each pool to the knockout stage",
      "startTournament": "Start Tournament",
      
      // 小組賽
      "poolEvent": "Pool Event",
      "pool": "Pool",
      "player": "Player",
      "players": "Players",
      "completePoolCalc": "Complete Pool Event, Calculate Qualification",
      "pendingMatch": "Pending",
      
      // 對戰
      "match": "Match",
      "score": "Score",
      "matchTime": "Match Time",
      "countdownTimer": "Countdown Timer (MM:SS)",
      "start": "Start",
      "pause": "Pause",
      "reset": "Reset",
      "resetCards": "Reset Cards",
      "leftCards": "Left Cards",
      "rightCards": "Right Cards",
      "noCard": "No Card",
      "yellowCard": "Yellow Card",
      "redCard": "Red Card",
      "blackCard": "Black Card",
      "currentCard": "Current Card",
      "submitResult": "Submit Result",
      "returnToPool": "Return to Pool",
      
      // Tie-Break
      "tieBreak": "Tie-Break",
      "tieBreakPriority": "Tie-Break! Priority",
      "left": "Left",
      "right": "Right",
      "startTieBreak": "Start Tie-Break",
      "selectingPriority": "Selecting...",
      "drawPriority": "Tie! Priority drawn, {side} gets priority!",
      "pressTieBreakBtn": ", press \"Start Tie-Break\" to begin countdown",
      
      // 排名和結果
      "overallSeeding": "Overall Seeding & Results",
      "normalPlayers": "Normal Players",
      "dqPlayers": "Disqualified Players",
      "enterKnockout": "Enter Knockout Stage",
      "rank": "Rank",
      "victory": "V",
      "touchesScored": "TS",
      "touchesReceived": "TR",
      "index": "IND",
      "placement": "Place",
      "status": "Status",
      "advanced": "Advanced",
      "eliminated": "Eliminated",
      
      // 淘汰賽
      "knockoutMatches": "Knockout Bracket",
      "final": "Final",
      "semifinals": "Semifinals",
      "quarterfinals": "Quarterfinals",
      "round": "Round",
      "vs": "vs",
      "enterMatch": "Enter Match",
      "byeAutoAdvance": "Bye! {name} advances automatically!",
      "matchNotConfirmed": "This match is not yet confirmed!",
      
      // 最終結果
      "finalResults": "Final Results",
      "downloadResults": "Download Final Results",
      "viewKnockout": "View Knockout Bracket",
      "restartNew": "Start New Tournament",
      
      // 設定
      "language": "Language / 語言",
      "about": "About",
      "version": "Version",
      "copyright": "© 2023 EAF. All rights reserved.",
      
      // 警告和通知
      "playerNotFound": "Could not find player data!",
      "fillPlayerName": "Please enter player names first!",
      "matchTimeUp": "Time's up!",
      "leftDisqualified": "Left player disqualified!",
      "rightDisqualified": "Right player disqualified!",
      "noQualifiedPlayers": "No qualified players!",
      "noPoolData": "No pool data available!",
      "noKnockoutData": "No knockout data available!",
      "resetError": "Error during reset. Please refresh the page and try again.",
      "poolCompleted": "Pool {poolID} completed",
      "backToKnockout": "Back to Knockout",
      "bye": "Bye",
      "allMatchesCompleted": "All matches completed",
      "fillAllNames": "Please fill in all player names! Missing: Player {fields}",
      "tbd": "TBD",
      "final": "Final",
      "semifinals": "Semifinals",
      "quarterfinals": "Quarterfinals",
      "round": "Round {round}",
      "enterMatch": "Enter Match"
    }
  };
  
  window.currentLanguage = "zh-TW"; // 默認為繁體中文
  
  // 根據當前語言獲取翻譯文本
  // function t(key, params = {}) {
  //   const translation = translations[currentLanguage]?.[key] || key;
  //   
  //   // 處理參數替換
  //   if (Object.keys(params).length > 0) {
  //     return translation.replace(/{(\w+)}/g, (match, key) => {
  //       return params[key] !== undefined ? params[key] : match;
  //     });
  //   }
  //   
  //   return translation;
  // }
  
  // 更新所有頁面的UI文本
  function updateUIText() {
    // 底部導航
    document.querySelectorAll('#bottomNav .nav-item span').forEach((item, index) => {
      const keys = ['home', 'pool', 'seeding', 'knockout', 'results', 'settings'];
      if (index < keys.length) {
        item.textContent = t(keys[index]);
      }
    });
    
    // 首頁
    const homePage = document.getElementById('homePage');
    if (homePage) {
      homePage.querySelector('h2').textContent = t('tournamentSetup');
      homePage.querySelector('.setup-subtitle').textContent = t('configTournament');
      
      const labels = homePage.querySelectorAll('.form-group label');
      if (labels.length >= 4) {
        labels[0].textContent = t('tournamentName');
        labels[1].textContent = t('numberOfPools');
        labels[2].textContent = t('qualifiersMethod');
        labels[3].textContent = t('qualifiersPerPool');
      }
      
      const tabOptions = homePage.querySelectorAll('.tab-option');
      if (tabOptions.length >= 2) {
        tabOptions[0].textContent = t('byCount');
        tabOptions[1].textContent = t('byPercentage');
      }
      
      homePage.querySelector('.help-text').textContent = t('playersAdvance');
      homePage.querySelector('.primary-btn').textContent = t('startTournament');
    }
    
    // Pool 賽頁面
    const poolPage = document.getElementById('poolPage');
    if (poolPage) {
      const poolEventName = document.getElementById('poolEventName');
      if (poolEventName) {
        // First check if there's a tournament name in brackets
        const matches = poolEventName.textContent.match(/【(.+)】/);
        let tournName = matches ? matches[1] : t('tournament');
        
        // Set the full text correctly with the tournament name and proper translation
        poolEventName.textContent = `【${tournName}】 ${t('poolEvent')}`;
      }
      
      const tabBtns = document.querySelectorAll('.pool-tab');
      tabBtns.forEach(btn => {
        const poolId = btn.getAttribute('data-pool');
        btn.textContent = `${t('pool')} ${poolId}`;
      });
      
      // Pool 表格中的待賽文本
      document.querySelectorAll('.match-cell').forEach(cell => {
        if (cell.textContent === '待賽') {
          cell.textContent = t('pendingMatch');
        }
      });
      
      const calcBtn = poolPage.querySelector('button.btn');
      if (calcBtn) {
        calcBtn.textContent = t('completePoolCalc');
      }
      
      // 更新選手數量下拉選單
      document.querySelectorAll('.pool-player-select option').forEach(option => {
        const count = option.value;
        option.textContent = `${count} ${t('players')}`;
      });
    }
    
    // 排名頁面
    const seedingPage = document.getElementById('seedingPage');
    if (seedingPage) {
      seedingPage.querySelector('h2').textContent = t('overallSeeding');
      
      const normalHeader = document.querySelector('#normalResultsContainer h3');
      if (normalHeader) {
        normalHeader.textContent = t('normalPlayers');
      }
      
      const dqHeader = document.querySelector('#dqResultsContainer h3');
      if (dqHeader) {
        dqHeader.textContent = t('dqPlayers');
      }
      
      // 表格標題
      const tableHeaders = document.querySelectorAll('#seedingResultsSection th, #normalResultsContainer th, #dqResultsContainer th');
      tableHeaders.forEach(th => {
        const text = th.textContent.trim();
        if (text === 'Rank') th.textContent = t('rank');
        else if (text === '選手') th.textContent = t('player');
        else if (text === 'V') th.textContent = t('victory');
        else if (text === 'TS') th.textContent = t('touchesScored');
        else if (text === 'TR') th.textContent = t('touchesReceived');
        else if (text === 'IND') th.textContent = t('index');
        else if (text === 'Status') th.textContent = t('status');
      });
      
      // 狀態文本
      document.querySelectorAll('#seedingResultsSection td, #normalResultsContainer td, #dqResultsContainer td').forEach(td => {
        if (td.textContent === 'Advanced') {
          td.textContent = t('advanced');
        } else if (td.textContent === 'Eliminated') {
          td.textContent = t('eliminated');
        }
      });
      
      const enterKnockoutBtn = seedingPage.querySelector('button.btn');
      if (enterKnockoutBtn) {
        enterKnockoutBtn.textContent = t('enterKnockout');
      }
    }
    
    // 淘汰賽頁面
    const knockoutPage = document.getElementById('knockoutPage');
    if (knockoutPage) {
      knockoutPage.querySelector('h2').textContent = t('knockoutMatches');
      
      // 更新淘汰賽輪次標題
      document.querySelectorAll('.bracket-round h3').forEach(h3 => {
        if (h3.textContent === 'Final') {
          h3.textContent = t('final');
        } else if (h3.textContent === 'Semifinals') {
          h3.textContent = t('semifinals');
        } else if (h3.textContent === 'Quarterfinals') {
          h3.textContent = t('quarterfinals');
        } else if (h3.textContent.startsWith('Round')) {
          const roundNum = h3.textContent.split(' ')[1];
          h3.textContent = `${t('round')} ${roundNum}`;
        }
      });
      
      // 更新對陣表按鈕
      document.querySelectorAll('.bracket-match button').forEach(btn => {
        if (btn.textContent === '進入比賽') {
          btn.textContent = t('enterMatch');
        }
      });
      
      // 更新vs文本
      document.querySelectorAll('.bracket-match').forEach(match => {
        const html = match.innerHTML;
        match.innerHTML = html.replace(/ vs /g, ` ${t('vs')} `);
      });
    }
    
    // 最終結果頁面
    const finalResultsPage = document.getElementById('finalResultsPage');
    if (finalResultsPage) {
      const finalTitle = document.getElementById('finalTitle');
      if (finalTitle) {
        // Extract tournament name from brackets if present
        const matches = finalTitle.textContent.match(/【(.+)】/);
        let tournName = matches ? matches[1] : t('tournament');
        
        // Set the full text with the tournament name and proper translation
        finalTitle.innerHTML = `<h2>【${tournName}】 ${t('finalResults')}</h2>`;
      }
      
      // 表格列標題
      const finalTable = document.querySelector('#finalResultsContainer table');
      if (finalTable) {
        const headerRow = finalTable.querySelector('thead tr');
        if (headerRow) {
          const headers = headerRow.querySelectorAll('th');
          if (headers.length >= 2) {
            headers[0].textContent = t('rank');
            headers[1].textContent = t('player');
          }
        }
      }
      
      // Fix translation for the download button - select it directly
      const downloadBtn = document.querySelector('#finalResultsPage button[onclick="downloadFinalResults()"]');
      if (downloadBtn) {
        downloadBtn.textContent = t('downloadResults');
      }
      
      const viewBracketBtn = finalResultsPage.querySelector('.final-btns button:first-child');
      if (viewBracketBtn) {
        viewBracketBtn.textContent = t('viewKnockout');
      }
      
      const restartBtn = finalResultsPage.querySelector('.final-btns button:last-child');
      if (restartBtn) {
        restartBtn.textContent = t('restartNew');
      }
    }
    
    // 比賽頁面
    const matchPage = document.getElementById('matchPage');
    if (matchPage) {
      matchPage.querySelector('h2').textContent = t('match');
      
      // 計時器相關
      document.querySelector('.match-timer h3').textContent = t('countdownTimer');
      
      const timerBtns = document.querySelectorAll('.timer-controls button');
      if (timerBtns.length >= 3) {
        timerBtns[0].textContent = t('start');
        timerBtns[1].textContent = t('pause');
        timerBtns[2].textContent = t('reset');
      }
      
      // 比賽時間
      document.querySelector('.custom-time label').textContent = `${t('matchTime')}:`;
      
      // 發牌區
      document.querySelector('.card-controls button').textContent = t('resetCards');
      
      document.querySelector('.left-group h3').textContent = t('leftCards');
      document.querySelector('.right-group h3').textContent = t('rightCards');
      
      const cardBtns = document.querySelectorAll('.card-buttons .card-btn');
      cardBtns.forEach(btn => {
        if (btn.textContent === '無牌') {
          btn.textContent = t('noCard');
        } else if (btn.textContent === '黃牌') {
          btn.textContent = t('yellowCard');
        } else if (btn.textContent === '紅牌') {
          btn.textContent = t('redCard');
        } else if (btn.textContent === '黑牌') {
          btn.textContent = t('blackCard');
        }
      });
      
      // 卡牌顯示
      const cardDisplays = document.querySelectorAll('.card-display');
      cardDisplays.forEach(display => {
        display.textContent = display.textContent.replace(/目前牌：/, `${t('currentCard')}：`);
      });
      
      // Tie-Break
      const tieBreakBtn = document.querySelector('#tieBreakStartContainer button');
      if (tieBreakBtn) {
        tieBreakBtn.textContent = t('startTieBreak');
      }
      
      // 提交按鈕
      const submitBtns = document.querySelectorAll('.match-submit button');
      if (submitBtns.length >= 2) {
        submitBtns[0].textContent = t('submitResult');
        submitBtns[1].textContent = t('returnToPool');
      }
    }
    
    // 設定頁面
    const settingsPage = document.getElementById('settingsPage');
    if (settingsPage) {
      // Update settings page title
      const settingsTitle = document.getElementById('settingsTitle');
      if (settingsTitle) {
        settingsTitle.textContent = t('settings');
      }
      
      // Update about section header
      const aboutTitle = document.getElementById('aboutTitle');
      if (aboutTitle) {
        aboutTitle.textContent = t('about');
      }
      
      // Update version and copyright text
      const versionText = document.getElementById('versionText');
      if (versionText) {
        versionText.textContent = `${t('version')} 1.0.0`;
      }
      
      const copyrightText = document.getElementById('copyrightText');
      if (copyrightText) {
        copyrightText.textContent = t('copyright');
      }
    }
  }
  
  // Initialize UI with default language
  updateUIText();
  
  // ================= 全域變數 =================
  let currentMatchData = null; // 當前比賽資料（Pool 或淘汰賽）
  let leftCard = "none";
  let rightCard = "none";
  let knockoutBracket = null; // 淘汰賽對陣表
  let qualifiedPlayersForKnockout = []; // 全場晉級選手（依照全局設定）
  window.tieBreakInterval = null;
  let tieBreakRemainingTime = 60;
  let globalPoolPlayers = []; // Add missing array to store all pool players
  
  // 全局設定（首頁設定後賦值）
  let globalTournamentName = "";
  let globalPoolTotal = 1;
  let globalQualType = "fixed"; // "fixed" 或 "ratio"
  let globalQualValue = 4;
  
  // 提示音
  const soundStart = new Audio("sounds/start.mp3");
  const soundPause = new Audio("sounds/pause.mp3");
  const soundEnd = new Audio("sounds/end.mp3");
  
  // Add error handling for sound files
  // soundStart.onerror = () => console.log("Warning: start.mp3 sound file not found");
  // soundPause.onerror = () => console.log("Warning: pause.mp3 sound file not found");
  // soundEnd.onerror = () => console.log("Warning: end.mp3 sound file not found");
  
  // Safe function to play sounds with error handling
  function playSound(sound) {
    try {
      if (sound && sound.readyState >= 2) { // HAVE_CURRENT_DATA or better
        sound.currentTime = 0; // 重置音效時間，確保每次都從頭播放
        sound.play().catch(e => {
          console.log("音效播放被瀏覽器拒絕（可能是用戶尚未與頁面互動）:", e);
        });
      }
    } catch (e) {
      console.log("Error playing sound:", e);
    }
  }
  
  function changeLanguage(lang) {
    window.currentLanguage = lang;
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`.lang-btn[onclick="changeLanguage('${lang}')"]`).classList.add('active');
    
    // 更新頁面文本
    updateUIText();
    
    // Reload any dynamic content that might have been generated
    // If we're on the pool page, regenerate the pool tabs
    if (document.getElementById('poolPage').classList.contains('active')) {
      generatePoolTabs();
    }
    
    // If we're on the knockout page, reload the bracket display
    if (document.getElementById('knockoutPage').classList.contains('active') && knockoutBracket) {
      displayKnockoutBracket();
    }
    
    // If we're on the final results page, reload the results
    if (document.getElementById('finalResultsPage').classList.contains('active')) {
      const downloadBtn = document.querySelector('#finalResultsPage button[onclick="downloadFinalResults()"]');
      if (downloadBtn) {
        downloadBtn.textContent = t('downloadResults');
      }
    }
    
    console.log("Language changed to:", lang);
  }
  
  // ================= 首頁設定 =================
  function selectQualMethod(element, method) {
    // Remove active class from all tab options
    document.querySelectorAll('.tab-option').forEach(tab => {
      tab.classList.remove('active');
    });
    
    // Add active class to the clicked tab
    element.classList.add('active');
    
    // Update the hidden input with the selected method
    document.getElementById('globalQualType').value = method;
    
    // Update the label based on the method
    const qualValueLabel = document.querySelector('label[for="globalQualValue"]');
    const helpText = document.querySelector('.help-text');
    
    if (method === 'fixed') {
      qualValueLabel.textContent = '每組晉級人數';
      helpText.textContent = '從每組晉級到淘汰賽階段的選手數量';
      document.getElementById('globalQualValue').value = '8';
    } else {
      qualValueLabel.textContent = '晉級百分比 (%)';
      helpText.textContent = '從每組晉級到淘汰賽階段的選手百分比';
      document.getElementById('globalQualValue').value = '50';
    }
  }
  
  function startPoolTournament() {
    globalTournamentName = document.getElementById("globalTournamentName").value || "賽事名稱未設定";
    globalPoolTotal = parseInt(document.getElementById("globalPoolTotal").value) || 1;
    globalQualType = document.getElementById("globalQualType").value;
    globalQualValue = parseFloat(document.getElementById("globalQualValue").value) || 0;
    document.getElementById("poolEventName").textContent = "【" + globalTournamentName + "】 Pool 賽";
    switchPage("poolPage");
    generatePoolTabs();
  }
  
  // ================= Pool 賽功能 =================
  function generatePoolTabs() {
    let poolTotal = globalPoolTotal;
    let tabsContainer = document.getElementById("poolTabs");
    let contentsContainer = document.getElementById("poolContents");
    tabsContainer.innerHTML = "";
    contentsContainer.innerHTML = "";
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    
    // 創建所有Pool標籤和內容
    for (let i = 0; i < poolTotal; i++) {
      let poolID = letters[i];
      let tab = document.createElement("button");
      tab.className = "pool-tab";
      if (i === 0) tab.classList.add("active");
      tab.setAttribute("data-pool", poolID);
      tab.textContent = t("pool") + " " + poolID;
      tab.onclick = function() { showPool(poolID); };
      tabsContainer.appendChild(tab);
      
      let poolDiv = document.createElement("div");
      poolDiv.className = "pool-content";
      poolDiv.id = "pool-" + poolID;
      if (i !== 0) poolDiv.style.display = "none";
      let h3 = document.createElement("h3");
      h3.textContent = t("pool") + " " + poolID;
      poolDiv.appendChild(h3);
      
      // 加入可選參賽人數（4 至 8 人）
      let selectElem = document.createElement("select");
      selectElem.className = "pool-player-select";
      for (let num = 4; num <= 8; num++) {
        let option = document.createElement("option");
        option.value = num;
        option.textContent = num + " " + t("players");
        if (num === 8) option.selected = true;
        selectElem.appendChild(option);
      }
      // 當人數改變時，重新生成該 Pool 表格
      selectElem.onchange = function() {
        createPoolTable(poolID, parseInt(this.value), poolDiv);
      };
      poolDiv.appendChild(selectElem);
      
      // 初次生成 Pool 表格 (預設 8 人)
      createPoolTable(poolID, 8, poolDiv);
      contentsContainer.appendChild(poolDiv);
    }
    
    // 確保顯示Pool A並進入選手輸入模式
    setTimeout(() => {
      showPool("A");
    }, 100);
  }
  
  function showPool(poolID) {
    document.querySelectorAll(".pool-content").forEach(pc => { pc.style.display = "none"; });
    document.querySelectorAll(".pool-tab").forEach(tab => { tab.classList.remove("active"); });
    let poolDiv = document.getElementById("pool-" + poolID);
    if (poolDiv) {
      poolDiv.style.display = "block";
      
      // 檢查當前Pool是否已經開始比賽或完成輸入
      const hasStartedMatches = poolDiv.getAttribute("data-matches-started") === "true";
      const hasCompletedInput = poolDiv.getAttribute("data-input-completed") === "true";
      
      // 更新當前Pool狀態
      currentPoolState.poolID = poolID;
      
      // 如果該Pool已完成輸入，獲取其設定
      if (hasCompletedInput) {
        // 獲取該Pool的選手數
        const playerSelect = poolDiv.querySelector(".pool-player-select");
        const playerCount = playerSelect ? parseInt(playerSelect.value) : 8;
        
        // 更新當前Pool狀態
        currentPoolState.playerCount = playerCount;
        currentPoolState.matchOrder = [...matchOrders[playerCount]];
        
        // 從Pool表格確定當前比賽進度
        const completedMatches = poolDiv.querySelectorAll(".match-cell.completed-match").length;
        const totalMatches = currentPoolState.matchOrder.length;
        
        // 根據已完成比賽數更新當前比賽索引
        currentPoolState.matchIndex = Math.min(completedMatches, totalMatches);
        currentPoolState.completed = completedMatches >= totalMatches;
        
        // 如果尚未開始比賽，進入選手輸入模式
        if (!hasStartedMatches) {
          showPlayerInputMode(poolID, playerCount);
        } else {
          // 顯示比賽進度
          document.getElementById("playerInputMode").style.display = "none";
          document.getElementById("matchScheduleArea").style.display = "block";
          updateMatchScheduleDisplay();
        }
      } else {
        // 尚未完成選手輸入，進入輸入模式
        const playerSelect = poolDiv.querySelector(".pool-player-select");
        const playerCount = playerSelect ? parseInt(playerSelect.value) : 8;
        showPlayerInputMode(poolID, playerCount);
      }
    }
    
    let tab = document.querySelector(`.pool-tab[data-pool='${poolID}']`);
    if (tab) tab.classList.add("active");
  }
  
  // 定義不同人數的對戰順序
  const matchOrders = {
    4: [ [1,4], [2,3], [1,3], [2,4], [3,4], [1,2] ],
    5: [ [1,2], [3,4], [5,1], [2,3], [5,4], [1,3], [2,5], [4,1], [3,5], [4,2] ],
    6: [ [1,2], [4,5], [2,3], [5,6], [3,1], [6,4], [2,5], [1,4], [5,3], [1,6], [4,2], [3,6], [5,1], [3,4], [6,2] ],
    7: [ [1,4], [2,5], [3,6], [7,1], [5,4], [2,3], [6,7], [5,1], [4,3], [6,2], [5,7], [3,1], [4,6], [7,2], [3,5], [1,6], [2,4], [7,3], [6,5], [1,2], [4,7] ],
    8: [ [2,3], [1,5], [7,4], [6,8], [1,2], [3,4], [5,6], [8,7], [4,1], [5,2], [8,3], [6,7], [4,2], [8,1], [7,5], [3,6], [2,8], [5,4], [6,1], [3,7], [4,8], [2,6], [3,5], [1,7], [4,6], [8,5], [7,2], [1,3] ]
  };
  
  // 目前正在進行的 Pool 比賽狀態
  let currentPoolState = {
    poolID: null,     // 當前小組ID
    playerCount: 0,   // 選手人數
    matchIndex: -1,   // 當前比賽序號 (-1 表示尚未開始)
    matchOrder: [],   // 當前輪次的對戰順序
    completed: false  // 是否已完成所有比賽
  };
  
  // 修改 createPoolTable 以支持自動進入選手輸入模式
  function createPoolTable(poolID, count, poolDiv) {
    if (!poolDiv) poolDiv = document.getElementById("pool-" + poolID);
    if (!poolDiv) return;
    // 若已存在表格，則移除
    let oldTable = poolDiv.querySelector(".pool-table");
    if (oldTable) oldTable.remove();
    let table = document.createElement("table");
    table.className = "pool-table";
    let thead = document.createElement("thead");
    let headerRow = document.createElement("tr");
    headerRow.innerHTML = `<th>#</th><th>${t("player")}</th>`;
    for (let c = 1; c <= count; c++) {
      headerRow.innerHTML += `<th>${t("match")}${c}</th>`;
    }
    headerRow.innerHTML += `<th>${t("victory").charAt(0)}</th><th>${t("touchesScored")}</th><th>${t("touchesReceived")}</th><th>${t("index")}</th><th>${t("placement")}</th>`;
    thead.appendChild(headerRow);
    table.appendChild(thead);
    let tbody = document.createElement("tbody");
    for (let r = 1; r <= count; r++) {
      let tr = document.createElement("tr");
      tr.setAttribute("data-index", r);
      tr.innerHTML = `<td>${r}</td><td><input type="text" class="player-name" placeholder="${t("player")}"></td>`;
      for (let c = 1; c <= count; c++) {
        let td = document.createElement("td");
        if (r === c) {
          td.className = "self-cell";
          td.innerHTML = "-";
        } else {
          td.className = "match-cell";
          td.setAttribute("data-row", r);
          td.setAttribute("data-col", c);
          td.innerHTML = t("pendingMatch");
          td.onclick = function() { selectPoolMatch(this, poolID); };
        }
        tr.appendChild(td);
      }
      let stats = ["v-cell", "ts-cell", "tr-cell", "ind-cell", "pi-cell"];
      stats.forEach(cls => {
        let td = document.createElement("td");
        td.className = cls;
        td.textContent = "0";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    poolDiv.appendChild(table);
    
    // 重置該Pool的輸入和比賽狀態標記
    poolDiv.removeAttribute("data-input-completed");
    poolDiv.removeAttribute("data-matches-started");
    
    // 如果當前正在顯示的是這個Pool，則立即顯示選手輸入模式
    if (poolDiv.style.display !== "none") {
      showPlayerInputMode(poolID, count);
    }
  }
  
  // 顯示選手輸入模式
  function showPlayerInputMode(poolID, count) {
    // 隱藏比賽進度顯示區域
    document.getElementById("matchScheduleArea").style.display = "none";
    
    // 顯示選手輸入模式區域
    let inputModeDiv = document.getElementById("playerInputMode");
    inputModeDiv.style.display = "block";
    
    // 設置當前 Pool 狀態
    currentPoolState = {
      poolID: poolID,
      playerCount: count,
      matchIndex: -1,
      matchOrder: matchOrders[count] || [],
      completed: false
    };
    
    // 高亮顯示選手名稱輸入區域
    let poolDiv = document.getElementById("pool-" + poolID);
    if (poolDiv) {
      let inputs = poolDiv.querySelectorAll(".player-name");
      inputs.forEach(input => {
        input.style.backgroundColor = "#fff3cd";
        input.style.boxShadow = "0 0 0 3px rgba(255, 193, 7, 0.3)";
      });
      
      // 自動聚焦第一個輸入框
      if (inputs.length > 0) {
        inputs[0].focus();
      }
    }
  }
  
  // 完成選手輸入，進入比賽階段
  function finishPlayerInput() {
    if (!currentPoolState.poolID) return;
    
    // 獲取 Pool div
    const poolDiv = document.getElementById("pool-" + currentPoolState.poolID);
    if (!poolDiv) return;
    
    // 驗證所有選手名稱都已填寫
    const playerInputs = poolDiv.querySelectorAll('.player-name');
    let allFilled = true;
    let emptyFields = [];
    
    playerInputs.forEach((input, index) => {
      if (!input.value.trim()) {
        allFilled = false;
        emptyFields.push(index + 1);
      }
      // 取消高亮顯示
      input.style.backgroundColor = "";
      input.style.boxShadow = "";
    });
    
    if (!allFilled) {
      alert(t("fillAllNames", {fields: emptyFields.join(", ")}));
      
      // 將未填寫的輸入框高亮顯示
      emptyFields.forEach(idx => {
        const input = poolDiv.querySelector(`tr[data-index="${idx}"] .player-name`);
        if (input) {
          input.style.backgroundColor = "#fff3cd";
          input.style.boxShadow = "0 0 0 3px rgba(255, 193, 7, 0.3)";
          // 將焦點設置在第一個未填寫的輸入框
          if (idx === emptyFields[0]) input.focus();
        }
      });
      return;
    }
    
    // 標記當前Pool為已完成輸入
    poolDiv.setAttribute("data-input-completed", "true");
    
    // 隱藏輸入模式區域並顯示比賽進度區域
    document.getElementById("playerInputMode").style.display = "none";
    document.getElementById("matchScheduleArea").style.display = "block";
    
    // 設置該Pool的比賽順序
    let playerSelect = poolDiv.querySelector(".pool-player-select");
    let count = parseInt(playerSelect.value);
    
    // 重置該Pool的比賽狀態
    currentPoolState = {
      poolID: currentPoolState.poolID,
      playerCount: count,
      matchIndex: 0,
      matchOrder: [...matchOrders[count]],
      completed: false
    };
    
    // 更新比賽進度顯示
    updateMatchScheduleDisplay();
  }
  
  // 開始當前比賽
  function startCurrentMatch() {
    if (!currentPoolState.poolID || currentPoolState.completed) return;
    
    if (currentPoolState.matchIndex >= currentPoolState.matchOrder.length) {
      alert(t("allMatchesCompleted"));
      return;
    }
    
    const poolDiv = document.getElementById("pool-" + currentPoolState.poolID);
    if (!poolDiv) return;
    
    // 標記當前Pool為已開始比賽
    poolDiv.setAttribute("data-matches-started", "true");
    
    // 獲取當前比賽配對
    const currentMatchPair = currentPoolState.matchOrder[currentPoolState.matchIndex];
    const player1Input = poolDiv.querySelector(`tr[data-index='${currentMatchPair[0]}'] .player-name`);
    const player2Input = poolDiv.querySelector(`tr[data-index='${currentMatchPair[1]}'] .player-name`);
    
    if (!player1Input || !player2Input) return;
    
    const player1Name = player1Input.value.trim() || `選手 ${currentMatchPair[0]}`;
    const player2Name = player2Input.value.trim() || `選手 ${currentMatchPair[1]}`;
    
    // 獲取比賽單元格引用，以便在比賽結束時更新
    const cell1 = poolDiv.querySelector(
      `tr[data-index='${currentMatchPair[0]}'] td.match-cell[data-col='${currentMatchPair[1]}']`
    );
    const cell2 = poolDiv.querySelector(
      `tr[data-index='${currentMatchPair[1]}'] td.match-cell[data-col='${currentMatchPair[0]}']`
    );
    
    resetMatchData();
    currentMatchData = {
      poolID: currentPoolState.poolID,
      row: currentMatchPair[0],
      col: currentMatchPair[1],
      player1: {
        name: player1Name,
        score: 0,
        DQ: false
      },
      player2: {
        name: player2Name,
        score: 0,
        DQ: false
      },
      tieBreakActive: false,
      inProgress: true,
      cell1: cell1,  // 儲存玩家1的比賽格
      cell2: cell2   // 儲存玩家2的比賽格
    };
    
    document.getElementById("matchPlayer1Name").textContent = player1Name;
    document.getElementById("matchPlayer2Name").textContent = player2Name;
    document.getElementById("matchScore1").value = "0";
    document.getElementById("matchScore2").value = "0";
    
    // 隱藏 Tie-Break 區域
    document.getElementById("tieBreakStartContainer").style.display = "none";
    
    // 重置計時器顯示
    resetTimer();
    
    // 切換到比賽頁面
    switchPage("matchPage");
  }
  
  // 開始 Pool 比賽流程
  function startPoolMatches() {
    if (!currentPoolState.poolID || currentPoolState.completed) return;
    
    // 顯示比賽進度顯示區域
    document.getElementById("matchScheduleArea").style.display = "block";
    
    // 移動到第一場比賽
    currentPoolState.matchIndex = 0;
    
    // 更新顯示
    updateMatchScheduleDisplay();
  }
  
  // 更新比賽進度顯示
  function updateMatchScheduleDisplay() {
    if (!currentPoolState.poolID || currentPoolState.completed) return;
    
    const poolDiv = document.getElementById("pool-" + currentPoolState.poolID);
    if (!poolDiv) return;
    
    const hasCompletedInput = poolDiv.getAttribute("data-input-completed") === "true";
    
    // 如果該Pool尚未完成輸入，則顯示輸入模式
    if (!hasCompletedInput) {
      document.getElementById("playerInputMode").style.display = "block";
      document.getElementById("matchScheduleArea").style.display = "none";
      return;
    }
    
    // 顯示比賽進度區域
    document.getElementById("playerInputMode").style.display = "none";
    document.getElementById("matchScheduleArea").style.display = "block";
    
    const scheduleArea = document.getElementById("matchScheduleArea");
    const currentMatchEl = document.getElementById("currentMatchDisplay");
    const nextMatchesEl = document.getElementById("upcomingMatchesDisplay");
    const calculateResultsBtn = document.getElementById("calculateResultsBtn");
    
    // 清空顯示區域
    currentMatchEl.innerHTML = "";
    nextMatchesEl.innerHTML = "";
    
    // 獲取當前比賽和選手名稱
    if (currentPoolState.matchIndex < currentPoolState.matchOrder.length) {
      const currentMatchPair = currentPoolState.matchOrder[currentPoolState.matchIndex];
      const player1Input = poolDiv.querySelector(`tr[data-index='${currentMatchPair[0]}'] .player-name`);
      const player2Input = poolDiv.querySelector(`tr[data-index='${currentMatchPair[1]}'] .player-name`);
      
      if (player1Input && player2Input) {
        const player1Name = player1Input.value.trim() || `選手 ${currentMatchPair[0]}`;
        const player2Name = player2Input.value.trim() || `選手 ${currentMatchPair[1]}`;
        
        // 顯示當前比賽 - 使用更視覺化的樣式
        currentMatchEl.innerHTML = `
          <div class="current-match-card">
            <h3>當前比賽</h3>
            <div class="vs-container">
              <div class="player">${player1Name}</div>
              <div class="vs">VS</div>
              <div class="player">${player2Name}</div>
            </div>
            <button class="btn primary-btn" onclick="startCurrentMatch()">開始比賽</button>
          </div>
        `;
      }
      
      // 隱藏計算結果按鈕（還有比賽未完成）
      if (calculateResultsBtn) calculateResultsBtn.style.display = "none";
    }
    
    // 顯示接下來的比賽
    let upcomingCount = 0;
    for (let i = currentPoolState.matchIndex + 1; i < currentPoolState.matchOrder.length && upcomingCount < 3; i++) {
      const matchPair = currentPoolState.matchOrder[i];
      const player1Input = poolDiv.querySelector(`tr[data-index='${matchPair[0]}'] .player-name`);
      const player2Input = poolDiv.querySelector(`tr[data-index='${matchPair[1]}'] .player-name`);
      
      if (player1Input && player2Input) {
        const player1Name = player1Input.value.trim() || `選手 ${matchPair[0]}`;
        const player2Name = player2Input.value.trim() || `選手 ${matchPair[1]}`;
        
        nextMatchesEl.innerHTML += `
          <div class="next-match-item">
            <span class="next-match-number">比賽 ${i + 1}:</span> 
            <span class="next-match-players">${player1Name} vs ${player2Name}</span>
          </div>
        `;
        upcomingCount++;
      }
    }
    
    // 如果已經完成所有比賽
    if (currentPoolState.matchIndex >= currentPoolState.matchOrder.length) {
      currentMatchEl.innerHTML = `
        <div class="current-match-card completed">
          <h3>比賽完成</h3>
          <p>Pool ${currentPoolState.poolID} 所有比賽已完成</p>
        </div>
      `;
      nextMatchesEl.innerHTML = "";
      
      // 顯示計算結果按鈕（所有比賽已完成）
      if (calculateResultsBtn) calculateResultsBtn.style.display = "block";
    }
  }
  
  // ================= 單挑比賽功能 =================
  function selectPoolMatch(cell, poolID) {
    let row = parseInt(cell.getAttribute("data-row"));
    let col = parseInt(cell.getAttribute("data-col"));
    let poolDiv = document.getElementById("pool-" + poolID);
    let rowInp = poolDiv.querySelector(`tr[data-index='${row}'] .player-name`);
    let colInp = poolDiv.querySelector(`tr[data-index='${col}'] .player-name`);
    if (!rowInp || !colInp) { alert(t("playerNotFound")); return; }
    let p1 = rowInp.value.trim();
    let p2 = colInp.value.trim();
    if (!p1 || !p2) { alert(t("fillPlayerName")); return; }
    
    // 重置比賽數據，避免數據殘留
    resetMatchData();
    
    currentMatchData = { poolID, row, col, cell, player1: { name: p1 }, player2: { name: p2 } };
    document.getElementById("matchPlayer1Name").textContent = p1;
    document.getElementById("matchPlayer2Name").textContent = p2;
    document.getElementById("matchScore1").value = "0";
    document.getElementById("matchScore2").value = "0";
    remainingTime = totalMatchTime;
    updateTimerDisplay();
    leftCard = "none";
    rightCard = "none";
    document.getElementById("cardDisplayLeft").textContent = t("currentCard") + "：" + t("noCard");
    document.getElementById("cardDisplayRight").textContent = t("currentCard") + "：" + t("noCard");
    switchPage("matchPage");
  }
  
  function backToPool() {
    // 檢查當前比賽類型
    if (currentMatchData && currentMatchData.hasOwnProperty("knockoutRound")) {
      // 如果是淘汰賽比賽，返回淘汰賽頁面
      switchPage("knockoutPage");
    } else {
      // 如果是小組賽比賽，返回小組賽頁面
    switchPage("poolPage");
    }
  }
  
 function updateMatchScore(id, delta) {
  let elem = document.getElementById(id);
  let val = parseInt(elem.value) || 0;
  elem.value = Math.max(0, val + delta);
  if (currentMatchData && currentMatchData.tieBreakActive) {
    if (parseInt(elem.value) > 0) {
        clearInterval(window.tieBreakInterval);
      if (id === "matchScore1") {
        document.getElementById("matchScore2").value = "0";
      } else {
        document.getElementById("matchScore1").value = "0";
      }
      finishMatch();
    }
  }
}
  
  let timerInterval = null;
  let totalMatchTime = 180;
  let remainingTime = totalMatchTime;
  function updateTimerDisplay() {
    let m = Math.floor(remainingTime / 60);
    let s = remainingTime % 60;
    document.getElementById("timerDisplay").textContent =
      (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
  }
  function startTimer() {
    if (timerInterval) return;
    playSound(soundStart);
    timerInterval = setInterval(() => {
      remainingTime--;
      if (remainingTime <= 0) {
        remainingTime = 0;
        stopTimer();
        playSound(soundEnd);
        alert(t("matchTimeUp"));
      }
      updateTimerDisplay();
    }, 1000);
  }
  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    playSound(soundPause);
  }
  function resetTimer() {
    stopTimer();
    remainingTime = totalMatchTime;
    updateTimerDisplay();
  }
  function changeMatchTime(sel) {
    totalMatchTime = parseInt(sel.value);
    remainingTime = totalMatchTime;
    updateTimerDisplay();
  }
  
  // ================= 裁判發牌與重置 =================
  let leftCards = { yellow: 0, red: 0, black: 0 };
  let rightCards = { yellow: 0, red: 0, black: 0 };
  function updateCardDisplay(side) {
    if (side === "left") {
      const disp = document.getElementById("cardDisplayLeft");
      disp.textContent = `${t("currentCard")}：${t("yellowCard")} ${leftCards.yellow}，${t("redCard")} ${leftCards.red}，${t("blackCard")} ${leftCards.black}`;
    } else if (side === "right") {
      const disp = document.getElementById("cardDisplayRight");
      disp.textContent = `${t("currentCard")}：${t("yellowCard")} ${rightCards.yellow}，${t("redCard")} ${rightCards.red}，${t("blackCard")} ${rightCards.black}`;
    }
  }
  function resetCardSelection() {
    leftCards = { yellow: 0, red: 0, black: 0 };
    rightCards = { yellow: 0, red: 0, black: 0 };
    updateCardDisplay("left");
    updateCardDisplay("right");
  }
  
  function selectCard(side, type) {
    if (side === "left") {
      leftCard = type;
      if (type === "yellow") {
        leftCards.yellow++;
        if (leftCards.yellow >= 2) {
          leftCards.yellow = 0;
          leftCards.red++;
          let scoreElem = document.getElementById("matchScore2");
          let currentScore = parseInt(scoreElem.value) || 0;
          scoreElem.value = currentScore + 1;
        }
      } else if (type === "red") {
        leftCards.red++;
        let scoreElem = document.getElementById("matchScore2");
        let currentScore = parseInt(scoreElem.value) || 0;
        scoreElem.value = currentScore + 1;
      } else if (type === "black") {
        leftCards.black++;
        alert(t("leftDisqualified"));
        currentMatchData.player1.DQ = true;
        
        // 處理淘汰賽中的黑牌 DQ
        if (currentMatchData.hasOwnProperty("knockoutRound")) {
          // 右方直接獲勝
          let roundIndex = currentMatchData.knockoutRound;
          let matchIndex = currentMatchData.matchIndex;
          let round = knockoutBracket.rounds[roundIndex];
          let match = round[matchIndex];
          
          match.winner = currentMatchData.player2;
          match.loser = currentMatchData.player1;
          match.score1 = "DQ";
          match.score2 = "WIN";
          
          if (match.loser) {
            match.loser.eliminatedRound = roundIndex;
          }
          
          finishMatch();
          return;
        }
        
        // 僅在 pool 賽中執行 disqualify 處理
        if (currentMatchData.poolID) {
          let poolDiv = document.getElementById("pool-" + currentMatchData.poolID);
          if (poolDiv) {
            // DQ 選手的行
            let rowElement = poolDiv.querySelector(`tr[data-index='${currentMatchData.row}']`);
            if (rowElement) {
              // 標記選手為 DQ
              let inputElem = rowElement.querySelector(".player-name");
              if (inputElem) {
                inputElem.classList.add("dq");
                if (!inputElem.value.includes("(DQ)")) {
                inputElem.value = inputElem.value + " (DQ)";
                }
                inputElem.disabled = true;
              }
              
              // 將該選手的所有對戰格全部標記為 DQ（不論是否已經比賽過）
              rowElement.querySelectorAll(".match-cell").forEach(cell => {
                cell.innerHTML = "DQ";
                cell.classList.add("dq-disabled");
                cell.style.pointerEvents = "none";
              });
              
              // 設置所有統計欄位為 0
              rowElement.querySelector(".v-cell").textContent = "0";
              rowElement.querySelector(".ts-cell").textContent = "0";
              rowElement.querySelector(".tr-cell").textContent = "0";
              rowElement.querySelector(".ind-cell").textContent = "0";
            }
            
            // 處理對手的比賽格與分數 - 使用 "BYE" 機制
            poolDiv.querySelectorAll("tr").forEach(function(r) {
              // 跳過當前 DQ 選手的行
              if (r.getAttribute("data-index") === currentMatchData.row.toString()) return;
              
              // 找到對戰格
              let cell = r.querySelector(`td.match-cell[data-col='${currentMatchData.row}']`);
              if (cell) {
                // 檢查是否已經有比賽結果
                if (cell.classList.contains("completed-match")) {
                  // 如果已有結果，不修改
                  return;
                }
                
                // 未完成的比賽：對手獲得輪空，但不計入勝場和分數
                cell.innerHTML = `<span class="pool-bye">${t("bye")}</span>`;
                cell.classList.add("completed-match");
                cell.style.pointerEvents = "none";
                
                // 對輪空比賽不計算統計數據
                // 不再調用 recalcPoolStats(currentPoolState.poolID, parseInt(opponentIndex));
              }
            });
            
            // 重新計算排名
            recalcPoolRanking(currentPoolState.poolID);
            
            // 從賽程中過濾掉包含該 DQ 選手的未來比賽
            filterOutDQMatches();
          }
        }
        
        finishMatch();
        return;
      } else if (type === "none") {
        leftCards = { yellow: 0, red: 0, black: 0 };
      }
      updateCardDisplay("left");
    } else if (side === "right") {
      rightCard = type;
      if (type === "yellow") {
        rightCards.yellow++;
        if (rightCards.yellow >= 2) {
          rightCards.yellow = 0;
          rightCards.red++;
          let scoreElem = document.getElementById("matchScore1");
          let currentScore = parseInt(scoreElem.value) || 0;
          scoreElem.value = currentScore + 1;
        }
      } else if (type === "red") {
        rightCards.red++;
        let scoreElem = document.getElementById("matchScore1");
        let currentScore = parseInt(scoreElem.value) || 0;
        scoreElem.value = currentScore + 1;
      } else if (type === "black") {
        rightCards.black++;
        alert(t("rightDisqualified"));
        currentMatchData.player2.DQ = true;
        
        // 處理淘汰賽中的黑牌 DQ
        if (currentMatchData.hasOwnProperty("knockoutRound")) {
          // 左方直接獲勝
          let roundIndex = currentMatchData.knockoutRound;
          let matchIndex = currentMatchData.matchIndex;
          let round = knockoutBracket.rounds[roundIndex];
          let match = round[matchIndex];
          
          match.winner = currentMatchData.player1;
          match.loser = currentMatchData.player2;
          match.score1 = "WIN";
          match.score2 = "DQ";
          
          if (match.loser) {
            match.loser.eliminatedRound = roundIndex;
          }
          
          finishMatch();
          return;
        }
        
        if (currentMatchData.poolID) {
          let poolDiv = document.getElementById("pool-" + currentMatchData.poolID);
          if (poolDiv) {
            // DQ 選手的行
            let rowElement = poolDiv.querySelector(`tr[data-index='${currentMatchData.col}']`);
            if (rowElement) {
              // 標記選手為 DQ
              let inputElem = rowElement.querySelector(".player-name");
              if (inputElem) {
                inputElem.classList.add("dq");
                if (!inputElem.value.includes("(DQ)")) {
                inputElem.value = inputElem.value + " (DQ)";
                }
                inputElem.disabled = true;
              }
              
              // 將該選手的所有對戰格全部標記為 DQ（不論是否已經比賽過）
              rowElement.querySelectorAll(".match-cell").forEach(cell => {
                cell.innerHTML = "DQ";
                cell.classList.add("dq-disabled");
                cell.style.pointerEvents = "none";
              });
              
              // 設置所有統計欄位為 0
              rowElement.querySelector(".v-cell").textContent = "0";
              rowElement.querySelector(".ts-cell").textContent = "0";
              rowElement.querySelector(".tr-cell").textContent = "0";
              rowElement.querySelector(".ind-cell").textContent = "0";
            }
            
            // 處理對手的比賽格與分數 - 使用 "BYE" 機制
            poolDiv.querySelectorAll("tr").forEach(function(r) {
              // 跳過當前 DQ 選手的行
              if (r.getAttribute("data-index") === currentMatchData.col.toString()) return;
              
              // 找到對戰格
              let cell = r.querySelector(`td.match-cell[data-col='${currentMatchData.col}']`);
              if (cell) {
                // 檢查是否已經有比賽結果
                if (cell.classList.contains("completed-match")) {
                  // 如果已有結果，不修改
                  return;
                }
                
                // 未完成的比賽：對手獲得輪空，但不計入勝場和分數
                cell.innerHTML = `<span class="pool-bye">${t("bye")}</span>`;
                cell.classList.add("completed-match");
                cell.style.pointerEvents = "none";
                
                // 對輪空比賽不計算統計數據
                // 不再調用 recalcPoolStats(currentPoolState.poolID, parseInt(opponentIndex));
              }
            });
            
            // 重新計算排名
            recalcPoolRanking(currentPoolState.poolID);
            
            // 從賽程中過濾掉包含該 DQ 選手的未來比賽
            filterOutDQMatches();
          }
        }
        
        finishMatch();
        return;
      } else if (type === "none") {
        rightCards = { yellow: 0, red: 0, black: 0 };
      }
      updateCardDisplay("right");
    }
  }
  
  // ================= Tie-Break 功能 =================
  function startTieBreak() {
    let prioritySide = (Math.random() < 0.5) ? "left" : "right";
    let tieBreakAnim = document.createElement("div");
    tieBreakAnim.className = "roulette";
    tieBreakAnim.textContent = t("selectingPriority");
    document.getElementById("matchSection").appendChild(tieBreakAnim);
    setTimeout(() => {
      tieBreakAnim.remove();
      const side = prioritySide === "left" ? t("left") : t("right");
      alert(t("drawPriority", {side: side}));
      let header = document.getElementById("matchSection").querySelector("h2");
      header.innerHTML = `${t("tieBreakPriority")}：${side}${t("pressTieBreakBtn")}`;
      document.getElementById("tieBreakStartContainer").style.display = "block";
      currentMatchData.prioritySide = prioritySide;
    }, 3000);
  }
  
  function startTieBreakTimer() {
    document.getElementById("tieBreakStartContainer").style.display = "none";
    tieBreakRemainingTime = 60;
    window.tieBreakInterval = setInterval(() => {
      tieBreakRemainingTime--;
      updateTieBreakTimerDisplay();
      if (tieBreakRemainingTime <= 0) {
        clearInterval(window.tieBreakInterval);
        window.tieBreakInterval = null;
        if (currentMatchData.prioritySide === "left") {
          document.getElementById("matchScore2").value = "0";
          document.getElementById("matchScore1").value = "999";
        } else {
          document.getElementById("matchScore1").value = "0";
          document.getElementById("matchScore2").value = "999";
        }
        finishMatch();
      }
    }, 1000);
    currentMatchData.tieBreakActive = true;
  }
  
  function updateTieBreakTimerDisplay() {
    document.getElementById("timerDisplay").textContent = "Tie-Break: " + (tieBreakRemainingTime < 10 ? "0" + tieBreakRemainingTime : tieBreakRemainingTime) + "秒";
  }
  
  // ================= Pool 統計與排名 =================
  function recalcPoolStats(poolID, rowIndex) {
    let poolDiv = document.getElementById("pool-" + poolID);
    let select = poolDiv.querySelector("select.pool-player-select");
    let count = select ? parseInt(select.value) : 8;
    let tr = poolDiv.querySelector(`tr[data-index='${rowIndex}']`);
    if (!tr) return;
    let totalV = 0, totalTS = 0, totalTR = 0;
    for (let c = 0; c < count; c++) {
      let cell = tr.children[2 + c];
      if (!cell) continue;
      let txt = cell.textContent.trim();
      let { isVictory, touches } = parseResultText(txt);
      if (isVictory) { totalV++; totalTS += touches; }
      else { totalTS += touches; }
      let oppIndex = c + 1;
      if (oppIndex === rowIndex) continue;
      let symTr = poolDiv.querySelector(`tr[data-index='${oppIndex}']`);
      if (symTr) {
        let symCell = symTr.children[2 + (rowIndex - 1)];
        if (symCell) {
          let oppTxt = symCell.textContent.trim();
          let { touches: oppTouch } = parseResultText(oppTxt);
          totalTR += oppTouch;
        }
      }
    }
    let ind = totalTS - totalTR;
    tr.querySelector(".v-cell").textContent = totalV;
    tr.querySelector(".ts-cell").textContent = totalTS;
    tr.querySelector(".tr-cell").textContent = totalTR;
    tr.querySelector(".ind-cell").textContent = ind;
  }
  
  function recalcPoolRanking(poolID) {
    let poolDiv = document.getElementById("pool-" + poolID);
    let select = poolDiv.querySelector("select.pool-player-select");
    let count = select ? parseInt(select.value) : 8;
    let rows = poolDiv.querySelectorAll("tbody tr");
    let players = [];
    rows.forEach(r => {
      let idx = parseInt(r.getAttribute("data-index"));
      if (idx > count) return;
      let inputElem = r.querySelector(".player-name");
      let name = inputElem.value.trim();
      if (!name) return;
      let v = parseInt(r.querySelector(".v-cell").textContent) || 0;
      let ts = parseInt(r.querySelector(".ts-cell").textContent) || 0;
      let trVal = parseInt(r.querySelector(".tr-cell").textContent) || 0;
      let ind = parseInt(r.querySelector(".ind-cell").textContent) || 0;
      players.push({ row: r, idx, name, v, ts, tr: trVal, ind, DQ: inputElem.disabled });
    });
    // 非DQ選手排前，DQ 選手排後
    players.sort((a, b) => {
      if (a.DQ !== b.DQ) return a.DQ ? 1 : -1;
      if (b.v !== a.v) return b.v - a.v;
      if (b.ind !== a.ind) return b.ind - a.ind;
      return b.ts - a.ts;
    });
    for (let rank = 0; rank < players.length; rank++) {
      let p = players[rank];
      let piCell = p.row.querySelector(".pi-cell");
      if (piCell) {
        if (p.DQ) {
          piCell.textContent = "DQ";
          piCell.style.backgroundColor = "#ffcccc";
        } else {
          piCell.textContent = rank + 1;
          piCell.style.backgroundColor = "#d4edda";
        }
      }
    }
  }
  
  // ================= Seeding & Pool Results =================
 function calculatePoolResults() {
    let globalPoolPlayers = []; // 存放所有 Pool 選手數據
    
    // 遍歷所有 Pool，獲取選手數據並添加到 globalPoolPlayers
    for (let i = 1; i <= globalPoolTotal; i++) {
      let poolID = String.fromCharCode(64 + i); // 將數字轉為字母 (1->A, 2->B, etc.)
    let poolDiv = document.getElementById("pool-" + poolID);
    if (!poolDiv) continue;
      
      // 先確保最終排名已經計算完成
      recalcPoolRanking(poolID);
      
      // 標記當前 pool 為已完成
      if (currentPoolState && currentPoolState.poolID === poolID) {
        currentPoolState.completed = true;
      }
      
      // 獲取當前 Pool 選手數據，包含姓名、成績等
    let rows = poolDiv.querySelectorAll("tbody tr");
      rows.forEach(row => {
        let inputElem = row.querySelector(".player-name");
        if (!inputElem || !inputElem.value.trim()) return; // 跳過空白選手
        
        // 檢查是否被 DQ
        let isDQ = inputElem.classList.contains("dq");
        // 省略 DQ 選手
        if (isDQ) return;
        
        // 收集選手數據
        let victoryElem = row.querySelector(".v-cell");
        let touchScoredElem = row.querySelector(".ts-cell");
        let touchReceivedElem = row.querySelector(".tr-cell");
        let indexElem = row.querySelector(".ind-cell");
        let placeElem = row.querySelector(".pi-cell");
        
        if (!victoryElem || !touchScoredElem || !touchReceivedElem || !indexElem || !placeElem) return;
        
        let playerData = {
          name: inputElem.value.trim(),
          pool: poolID,
          victory: parseInt(victoryElem.textContent) || 0,
          touchScored: parseInt(touchScoredElem.textContent) || 0,
          touchReceived: parseInt(touchReceivedElem.textContent) || 0,
          index: parseInt(indexElem.textContent) || 0,
          place: parseInt(placeElem.textContent) || 0,
          DQ: false
        };
        
        globalPoolPlayers.push(playerData);
      });
      
      // 再次尋找被 DQ 的選手（放在列表末尾）
      rows.forEach(row => {
        let inputElem = row.querySelector(".player-name");
        if (!inputElem || !inputElem.value.trim()) return;
        let isDQ = inputElem.classList.contains("dq");
        if (!isDQ) return; // 僅處理 DQ 選手
        
        globalPoolPlayers.push({
          name: inputElem.value.trim().replace(" (DQ)", ""), // 移除 DQ 標記
          pool: poolID,
          victory: 0,
          touchScored: 0,
          touchReceived: 0,
          index: 0,
          place: 0,
          DQ: true
        });
      });
    }
    
    // 按照以下順序排序：
    // 1. 非 DQ 選手先
    // 2. Pool 賽排名（數字越小越優先）
    // 3. 同排名按照得分指數（越大越優先）
    // 4. 同指數按照勝場（越多越優先）
    globalPoolPlayers.sort((a, b) => {
      if (a.DQ && !b.DQ) return 1; // DQ 選手放後面
      if (!a.DQ && b.DQ) return -1;
      if (a.place !== b.place) return a.place - b.place; // 排名小的在前
      if (a.index !== b.index) return b.index - a.index; // 指數大的在前
      return b.victory - a.victory; // 勝場多的在前
    });
    
    // 顯示排名和結果
    let normalTable = document.createElement("table");
    normalTable.className = "results-table";
    let headerRow = document.createElement("tr");
    headerRow.innerHTML = `
      <th>#</th>
      <th>${t("pool")}</th>
      <th>${t("player")}</th>
      <th>${t("victory")}</th>
      <th>${t("touchesScored")}</th>
      <th>${t("touchesReceived")}</th>
      <th>${t("index")}</th>
    `;
    normalTable.appendChild(headerRow);
    
    // 根據晉級人數或比例決定哪些選手有資格進入淘汰賽
    let normalPlayerCount = globalPoolPlayers.filter(p => !p.DQ).length;
    let qualCount = 0;
    
  if (globalQualType === "fixed") {
      // 固定晉級人數
      qualCount = Math.min(normalPlayerCount, globalQualValue);
  } else {
      // 比例晉級
      qualCount = Math.ceil(normalPlayerCount * (globalQualValue / 100));
    }
    
    // 儲存晉級選手
    qualifiedPlayersForKnockout = [];
    
    // 添加正常選手表格
    let rank = 1;
    globalPoolPlayers.forEach((player, index) => {
      if (player.DQ) return; // 跳過 DQ 選手
      
    let tr = document.createElement("tr");
      tr.className = index < qualCount ? "qualified" : "eliminated";
      tr.innerHTML = `
        <td>${rank}</td>
        <td>${player.pool}</td>
        <td>${player.name}</td>
        <td>${player.victory}</td>
        <td>${player.touchScored}</td>
        <td>${player.touchReceived}</td>
        <td>${player.index}</td>
      `;
      normalTable.appendChild(tr);
      
      // 添加到晉級選手列表
      if (index < qualCount) {
        qualifiedPlayersForKnockout.push({
          name: player.name,
          pool: player.pool,
          seeding: rank,
          qualified: true,
          eliminated: false
        });
      }
      
      rank++;
    });
    
    document.getElementById("normalResultsContainer").innerHTML = "";
    document.getElementById("normalResultsContainer").appendChild(normalTable);
    
    // 添加 DQ 選手表格（如果有）
    let dqPlayers = globalPoolPlayers.filter(p => p.DQ);
  if (dqPlayers.length > 0) {
      let dqTable = document.createElement("table");
      dqTable.className = "results-table";
      let dqHeader = document.createElement("tr");
      dqHeader.innerHTML = `
        <th colspan="3">已被取消資格選手</th>
      `;
      dqTable.appendChild(dqHeader);
      
      dqPlayers.forEach((player, index) => {
      let tr = document.createElement("tr");
        tr.className = "dq";
        tr.innerHTML = `
          <td>${index + 1}</td>
          <td>${player.pool}</td>
          <td>${player.name}</td>
        `;
        dqTable.appendChild(tr);
      });
      
      document.getElementById("dqResultsContainer").innerHTML = "";
      document.getElementById("dqResultsContainer").appendChild(dqTable);
    } else {
      document.getElementById("dqResultsContainer").innerHTML = "";
    }
    
    // 切換到排名頁面
  switchPage("seedingPage");
}

  // ================= Final Results =================
function generateFinalResults() {
  console.log("Generating final results...");
  // 檢查必需資料是否存在
  if (!knockoutBracket || !knockoutBracket.rounds) {
    alert(t("noKnockoutData"));
    return;
  }
  
  // 從淘汰賽對陣表收集所有選手資料
  let players = [];
  let totalRounds = knockoutBracket.rounds.length;
  
  // 找出冠軍（最後一輪的勝者）
  let champion = null;
  let finalMatch = knockoutBracket.rounds[totalRounds-1][0];
  if (finalMatch && finalMatch.winner) {
    champion = finalMatch.winner;
    champion.eliminatedRound = totalRounds + 1; // 特殊值，表示冠軍
  }
  
  // 遍歷所有輪次查找選手
  knockoutBracket.rounds.forEach((round, roundIndex) => {
    round.forEach(match => {
      // 將選手添加到列表，包含他們被淘汰的輪次
      if (match.player1 && match.player1.name !== "BYE") {
        let existingPlayer = players.find(p => p.name === match.player1.name);
        if (!existingPlayer) {
          players.push({...match.player1});
        }
      }
      
      if (match.player2 && match.player2.name !== "BYE") {
        let existingPlayer = players.find(p => p.name === match.player2.name);
        if (!existingPlayer) {
          players.push({...match.player2});
        }
      }
      
      // 記錄敗者的淘汰輪次
      if (match.loser && match.loser.name !== "BYE") {
        let loser = players.find(p => p.name === match.loser.name);
        if (loser) {
          loser.eliminatedRound = roundIndex;
        }
      }
    });
  });
  
  // 按照淘汰輪次排序（越晚被淘汰排名越高）
  players.sort((a, b) => {
    // 首先，考慮是否選手被 DQ（DQ 的選手排最後）
    if (a.DQ && !b.DQ) return 1;
    if (!a.DQ && b.DQ) return -1;
    
    // 接著按照淘汰輪次排序
    let aRound = a.eliminatedRound !== undefined ? a.eliminatedRound : -1;
    let bRound = b.eliminatedRound !== undefined ? b.eliminatedRound : -1;
    
    if (aRound !== bRound) {
      return bRound - aRound; // 較晚淘汰的排前面
    }
    
    // 如果淘汰輪次相同，則按種子順序
    return (a.seeding || 999) - (b.seeding || 999);
  });
  
  // 生成最終成績表
  let container = document.getElementById("finalResultsContainer");
  container.innerHTML = "";
  let finalTitle = document.getElementById("finalTitle");
  finalTitle.innerHTML = `<h2>【${globalTournamentName}】 ${t("finalResults")}</h2>`;
  
  let table = document.createElement("table");
  let thead = document.createElement("thead");
  thead.innerHTML = `<tr>
          <th>${t("rank")}</th>
          <th>${t("player")}</th>
    </tr>`;
  table.appendChild(thead);
  let tbody = document.createElement("tbody");
  
  // 為每位選手創建表格行
  players.forEach((player, index) => {
    let tr = document.createElement("tr");
    // 如果玩家被DQ，Rank顯示 "DQ"，否則顯示排名
    let rankText = player.DQ ? "DQ" : (index + 1);
    
    // 設定表格行的背景色
    let bg;
    if (player.DQ) {
      bg = "#ffcccc"; // DQ 選手用紅色
    } else if (player.eliminatedRound === totalRounds + 1) {
      bg = "#ffd700"; // 冠軍用金色
    } else if (player.eliminatedRound === totalRounds) {
      bg = "#c0c0c0"; // 亞軍用銀色
    } else if (player.eliminatedRound === totalRounds - 1) {
      bg = "#cd7f32"; // 季軍用銅色
    } else if (player.eliminatedRound > 0) {
      bg = "#d4edda"; // 其他淘汰賽選手用淺綠色
    } else {
      bg = "#d0e7ff"; // 未參加淘汰賽的選手用淺藍色
    }
    
    tr.innerHTML = `<td>${rankText}</td><td>${player.name}</td>`;
    tr.style.backgroundColor = bg;
    tbody.appendChild(tr);
  });
  
  table.appendChild(tbody);
  container.appendChild(table);
  
  // 切換到結果頁面
  switchPage("finalResultsPage");
}

  function downloadFinalResults() {
    console.log("Downloading final results...");
    let table = document.getElementById("finalResultsContainer").querySelector("table");
    if (!table) {
      console.error("No results table found!");
      alert("無法找到成績表！");
      return;
    }
    
    let csv = [];
    let rows = table.querySelectorAll("tr");
    
    // Add a header row with the tournament name
    csv.push('"' + globalTournamentName + ' 最終成績"');
    csv.push(''); // Empty line for spacing
    
    rows.forEach(row => {
      let cols = row.querySelectorAll("th, td");
      let rowData = [];
      cols.forEach(col => {
        rowData.push('"' + col.textContent.trim() + '"');
      });
      csv.push(rowData.join(","));
    });
    
    let csvContent = csv.join("\n");
    let csvFile = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    let downloadLink = document.createElement("a");
    
    // Create filename based on tournament name or default
    let filename = (globalTournamentName ? globalTournamentName : "tournament") + "_results.csv";
    downloadLink.download = filename;
    
    // Browser compatibility
    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveBlob(csvFile, filename);
    } else {
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    }
  }
  
  // ================= 淘汰賽功能 =================
  function generateKnockoutBracket() {
    if (!qualifiedPlayersForKnockout || qualifiedPlayersForKnockout.length === 0) {
      alert(t("noQualifiedPlayers"));
      return;
    }
    
    // 確保只使用有資格的選手，並且名稱不是BYE
    let realPlayers = qualifiedPlayersForKnockout.filter(p => p.qualified && p.name && p.name !== "BYE");
    
    console.log("合格選手:", realPlayers);
    
    if (realPlayers.length === 0) {
      alert(t("noQualifiedPlayers"));
      return;
    }
    
    // 計算下一個2的冪次方作為淘汰賽參賽人數
    let bracketSize = nextPowerOf2(realPlayers.length);
    
    // 複製合格選手並填充BYE至所需人數
    let qp = [...realPlayers];
    while (qp.length < bracketSize) {
      qp.push({ name: "BYE", seeding: 999 });
    }
    
    // 按種子排序
    qp.sort((a, b) => (a.seeding || 999) - (b.seeding || 999));
    
    // 創建第一輪對陣
    let firstRound = [];
    for (let i = 0; i < bracketSize / 2; i++) {
      firstRound.push({
        player1: qp[i],
        player2: qp[bracketSize - 1 - i],
        score1: 0,
        score2: 0,
        winner: null
      });
    }
    
    // 建立整個淘汰賽架構
    let rounds = [];
    rounds.push(firstRound);
    let currentRound = firstRound;
    
    // 建立剩餘的輪次
    while (currentRound.length > 1) {
      let nextRound = [];
      for (let i = 0; i < currentRound.length / 2; i++) {
        nextRound.push({
          player1: null,
          player2: null,
          score1: 0,
          score2: 0,
          winner: null
        });
      }
      rounds.push(nextRound);
      currentRound = nextRound;
    }
    
    // 自動處理第一輪的BYE比賽
    firstRound.forEach((match, matchIndex) => {
      // 如果有一方是BYE，則另一方自動晉級
      if (match.player1 && match.player1.name === "BYE" || match.player2 && match.player2.name === "BYE") {
        let winner = (match.player1 && match.player1.name === "BYE") ? match.player2 : match.player1;
        match.winner = winner;
        
        // 如果不是最後一輪，安排進下一輪
        if (rounds.length > 1) {
          let nextRound = rounds[1];
          let nextMatchIndex = Math.floor(matchIndex / 2);
          if (!nextRound[nextMatchIndex].player1) {
            nextRound[nextMatchIndex].player1 = winner;
          } else {
            nextRound[nextMatchIndex].player2 = winner;
          }
        }
      }
    });
    
    // 設置淘汰賽對陣表
    knockoutBracket = { rounds: rounds };
    
    // 顯示淘汰賽對陣表
    displayKnockoutBracket();
    switchPage("knockoutPage");
  }
  
  function displayKnockoutBracket() {
    const container = document.getElementById('bracketContainer');
    if (!container || !knockoutBracket || !knockoutBracket.rounds || knockoutBracket.rounds.length === 0) {
      console.error("Cannot display knockout bracket: missing container or data");
      return;
    }

    container.innerHTML = '';

    // 計算總輪數
    const totalRounds = knockoutBracket.rounds.length;

    // 處理每一輪
    knockoutBracket.rounds.forEach((round, roundIndex) => {
      const roundDiv = document.createElement('div');
      roundDiv.className = 'bracket-round';
      
      // 設置輪次標題
      const roundTitle = document.createElement('h3');
      let roundName = '';
      
      if (roundIndex === totalRounds - 1) {
        roundName = t('final');
      } else if (roundIndex === totalRounds - 2) {
        roundName = t('semifinals');
      } else if (roundIndex === totalRounds - 3) {
        roundName = t('quarterfinals');
      } else {
        roundName = t('round').replace('{round}', totalRounds - roundIndex);
      }
      
      roundTitle.textContent = roundName;
      roundDiv.appendChild(roundTitle);

      // 處理每場比賽
      round.forEach((match, matchIndex) => {
        const matchDiv = document.createElement('div');
        matchDiv.className = 'bracket-match';
        matchDiv.id = `match-${roundIndex}-${matchIndex}`;
        
        // 標題部分 - 顯示輪次和比賽號碼
        const headerDiv = document.createElement('div');
        headerDiv.className = 'match-header';
        headerDiv.textContent = `${roundName} - ${t('match')}${matchIndex + 1}`;
        matchDiv.appendChild(headerDiv);
        
        // 選手部分
        const playersDiv = document.createElement('div');
        playersDiv.className = 'match-players';
        
        // 獲取選手名稱（或使用待定）
        const player1Name = match.player1 && match.player1.name ? match.player1.name : t('tbd');
        const player2Name = match.player2 && match.player2.name ? match.player2.name : t('tbd');
        
        // 創建選手1 div
        const player1Div = document.createElement('div');
        player1Div.className = 'match-player';
        
        // 處理黑牌DQ和勝利情況
        let player1Display = player1Name;
        
        // 檢查是否有比分
        if (match.winner) {
          // 如果有比分，添加到顯示中
          if (match.score1 !== undefined && match.score2 !== undefined) {
            // 檢查是否為DQ情況
            if (match.score1 === "DQ" || match.score1 === "WIN") {
              player1Display = `${player1Name} <span class="${match.score1 === "DQ" ? "pool-loss" : "pool-win"}">${match.score1}</span>`;
            } else {
              // 正常比分
              const isWinner = match.winner === match.player1;
              player1Display = `${player1Name} <span class="${isWinner ? "pool-win" : "pool-loss"}">${isWinner ? "V" : "D"}${match.score1}</span>`;
            }
          }
          
          // 添加勝利標記
          if (match.winner === match.player1) {
            player1Div.classList.add('winner');
          }
        }
        
        player1Div.innerHTML = player1Display;
        playersDiv.appendChild(player1Div);
        
        // 創建選手2 div
        const player2Div = document.createElement('div');
        player2Div.className = 'match-player';
        
        // 處理黑牌DQ和勝利情況
        let player2Display = player2Name;
        
        // 檢查是否有比分
        if (match.winner) {
          // 如果有比分，添加到顯示中
          if (match.score1 !== undefined && match.score2 !== undefined) {
            // 檢查是否為DQ情況
            if (match.score2 === "DQ" || match.score2 === "WIN") {
              player2Display = `${player2Name} <span class="${match.score2 === "DQ" ? "pool-loss" : "pool-win"}">${match.score2}</span>`;
            } else {
              // 正常比分
              const isWinner = match.winner === match.player2;
              player2Display = `${player2Name} <span class="${isWinner ? "pool-win" : "pool-loss"}">${isWinner ? "V" : "D"}${match.score2}</span>`;
            }
          }
          
          // 添加勝利標記
          if (match.winner === match.player2) {
            player2Div.classList.add('winner');
          }
        }
        
        player2Div.innerHTML = player2Display;
        playersDiv.appendChild(player2Div);
        
        matchDiv.appendChild(playersDiv);
        
        // 如果兩個選手都確定且不是輪空，顯示進入比賽按鈕
        if (match.player1 && match.player2 && 
            match.player1.name && match.player2.name && 
            match.player1.name !== "BYE" && match.player2.name !== "BYE" && 
            !match.winner) {
          const buttonDiv = document.createElement('div');
          buttonDiv.className = 'match-button';
          
          // 創建帶有ID的按鈕，以便更容易找到和調試
          const buttonId = `enter-match-${roundIndex}-${matchIndex}`;
          const enterButton = document.createElement('button');
          enterButton.id = buttonId;
          enterButton.className = 'btn primary-btn';
          enterButton.textContent = t('enterMatch');
          
          // 使用HTML屬性來設置onclick，這樣更可靠
          enterButton.setAttribute('onclick', `enterKnockoutMatch(${roundIndex}, ${matchIndex});`);
          
          buttonDiv.appendChild(enterButton);
          matchDiv.appendChild(buttonDiv);
        }
        
        roundDiv.appendChild(matchDiv);
      });
      
      container.appendChild(roundDiv);
    });
  }
  
  // 修改 enterKnockoutMatch 函數來設置返回按鈕文字
  function enterKnockoutMatch(roundIndex, matchIndex) {
    let round = knockoutBracket.rounds[roundIndex];
    if (!round) return;
    let match = round[matchIndex];
    if (!match) return;
    
    // 處理 BYE 情況
    if (match.player1 && match.player1.name === "BYE" || match.player2 && match.player2.name === "BYE") {
      let winner = (match.player1 && match.player1.name === "BYE") ? match.player2 : match.player1;
      alert(t("byeAutoAdvance", {name: winner.name}));
      match.winner = winner;
      match.score1 = 0; match.score2 = 0;
      if (roundIndex < knockoutBracket.rounds.length - 1) {
        let nextRound = knockoutBracket.rounds[roundIndex + 1];
        let nextMatchIndex = Math.floor(matchIndex / 2);
        if (!nextRound[nextMatchIndex].player1) {
          nextRound[nextMatchIndex].player1 = winner;
        } else {
          nextRound[nextMatchIndex].player2 = winner;
        }
        displayKnockoutBracket();
        switchPage("knockoutPage");
      } else {
        generateFinalResults();
      }
      return;
    }
    
    // 確保雙方選手都已確認
    if (!match.player1 || !match.player2) {
      alert(t("matchNotConfirmed"));
      return;
    }
    
    // 重置比賽數據，避免數據殘留
    resetMatchData();
    
    currentMatchData = { knockoutRound: roundIndex, matchIndex: matchIndex, player1: match.player1, player2: match.player2 };
    document.getElementById("matchPlayer1Name").textContent = match.player1.name;
    document.getElementById("matchPlayer2Name").textContent = match.player2.name;
    document.getElementById("matchScore1").value = "0";
    document.getElementById("matchScore2").value = "0";
    remainingTime = totalMatchTime;
    updateTimerDisplay();
    leftCard = "none";
    rightCard = "none";
    document.getElementById("cardDisplayLeft").textContent = t("currentCard") + "：" + t("noCard");
    document.getElementById("cardDisplayRight").textContent = t("currentCard") + "：" + t("noCard");
    
    // 設置返回按鈕文字為"返回淘汰賽"
    document.getElementById("backButton").textContent = t("backToKnockout");
    
    switchPage("matchPage");
  }
  
 // 重置對決區標題
function resetMatchHeader() {
  let header = document.getElementById("matchSection").querySelector("h2");
  if (header) {
    header.textContent = "對決";
  }
}

// 在 finishMatch() 結束前呼叫：
resetMatchHeader();
document.getElementById("tieBreakStartContainer").style.display = "none";


// finishKnockoutMatch 如果需要的話，您也可以在結束後調用 resetMatchHeader()
function finishKnockoutMatch() {
    let s1 = parseInt(document.getElementById("matchScore1").value) || 0;
    let s2 = parseInt(document.getElementById("matchScore2").value) || 0;
    
    // 檢查是否為平局且有黑牌情況
  if (s1 === s2) {
      // 如果有黑牌，則直接判 DQ
      if (leftCard === "black" || rightCard === "black") {
        // 決定贏家，收到黑牌方為輸家
        let winner, loser, resultLeft, resultRight;
        
        if (leftCard === "black") {
          // 左方收到黑牌
          currentMatchData.player1.DQ = true;
          winner = currentMatchData.player2;
          loser = currentMatchData.player1;
          resultLeft = `<span class="pool-loss">DQ</span>`;
          resultRight = `<span class="pool-win">WIN</span>`;
        } else {
          // 右方收到黑牌
          currentMatchData.player2.DQ = true;
          winner = currentMatchData.player1;
          loser = currentMatchData.player2;
          resultLeft = `<span class="pool-win">WIN</span>`;
          resultRight = `<span class="pool-loss">DQ</span>`;
        }
        
        // 更新比賽結果
        let roundIndex = currentMatchData.knockoutRound;
        let matchIndex = currentMatchData.matchIndex;
        let round = knockoutBracket.rounds[roundIndex];
        let match = round[matchIndex];
        
        match.winner = winner;
        match.loser = loser;
        match.score1 = leftCard === "black" ? "DQ" : "WIN";
        match.score2 = rightCard === "black" ? "DQ" : "WIN";
        
        if (match.loser) {
          match.loser.eliminatedRound = roundIndex;
        }
        
        // 晉級下一輪
        if (roundIndex < knockoutBracket.rounds.length - 1) {
          let nextRound = knockoutBracket.rounds[roundIndex + 1];
          let nextMatchIndex = Math.floor(matchIndex / 2);
          if (!nextRound[nextMatchIndex].player1) {
            nextRound[nextMatchIndex].player1 = winner;
          } else {
            nextRound[nextMatchIndex].player2 = winner;
          }
          displayKnockoutBracket();
          resetMatchHeader();
          resetMatchData();
          switchPage("knockoutPage");
        } else {
          // 這是決賽
          displayKnockoutBracket(); // 先顯示淘汰賽對陣表，讓用戶看到最終比分
          resetMatchHeader();
          resetMatchData();
          // 延遲2秒後顯示最終結果頁面
          setTimeout(() => {
            generateFinalResults();
          }, 2000);
          switchPage("knockoutPage");
        }
        
        return;
      }
      
      // 如果沒有黑牌，正常進入 Tie-Break
    startTieBreak();
    return;
  }
    
    // 非平局情況下的正常處理
  let result1 = "", result2 = "";
  if (s1 > s2) {
    result1 = `<span class="pool-win">V${s1}</span>`;
    result2 = `<span class="pool-loss">D${s2}</span>`;
  } else {
    result1 = `<span class="pool-loss">D${s1}</span>`;
    result2 = `<span class="pool-win">V${s2}</span>`;
  }
  if (leftCard !== "none") {
    let iconLeft = leftCard === "yellow" ? "🟨" : (leftCard === "red" ? "🟥" : (leftCard === "black" ? "⚫" : ""));
    result1 += " " + iconLeft;
  }
  if (rightCard !== "none") {
    let iconRight = rightCard === "yellow" ? "🟨" : (rightCard === "red" ? "🟥" : (rightCard === "black" ? "⚫" : ""));
    result2 += " " + iconRight;
  }
  let roundIndex = currentMatchData.knockoutRound;
  let matchIndex = currentMatchData.matchIndex;
  let round = knockoutBracket.rounds[roundIndex];
  let match = round[matchIndex];
  match.score1 = s1;
  match.score2 = s2;
  if (s1 > s2) {
    match.winner = currentMatchData.player1;
    match.loser = currentMatchData.player2;
  } else {
    match.winner = currentMatchData.player2;
    match.loser = currentMatchData.player1;
  }
  if (match.loser) {
    match.loser.eliminatedRound = roundIndex;
  }
  if (roundIndex < knockoutBracket.rounds.length - 1) {
    let nextRound = knockoutBracket.rounds[roundIndex + 1];
    let nextMatchIndex = Math.floor(matchIndex / 2);
    if (!nextRound[nextMatchIndex].player1) {
      nextRound[nextMatchIndex].player1 = match.winner;
    } else {
      nextRound[nextMatchIndex].player2 = match.winner;
    }
    displayKnockoutBracket();
    resetMatchHeader();
    resetMatchData();
    switchPage("knockoutPage");
  } else {
    // 這是決賽
    displayKnockoutBracket(); // 先顯示淘汰賽對陣表，讓用戶看到最終比分
    resetMatchHeader();
    resetMatchData();
    // 延遲2秒後顯示最終結果頁面
    setTimeout(() => {
      generateFinalResults();
    }, 2000);
    switchPage("knockoutPage");
  }
}

// 結束對決，讀取 input 分數
function finishMatch() {
  if (currentMatchData && currentMatchData.hasOwnProperty("knockoutRound")) {
    finishKnockoutMatch();
  } else {
    // 處理小組賽 DQ 情況
    if (currentMatchData.player1.DQ || currentMatchData.player2.DQ) {
      // 標記當前比賽格為 DQ
      if (currentMatchData && currentMatchData.cell1) {
        currentMatchData.cell1.innerHTML = "DQ";
        currentMatchData.cell1.classList.add("dq-disabled");
        currentMatchData.cell1.style.pointerEvents = "none";
      }
      
      // 找到並標記對應的另一方比賽格
      if (currentMatchData && currentMatchData.cell2) {
        currentMatchData.cell2.innerHTML = "DQ";
        currentMatchData.cell2.classList.add("dq-disabled");
        currentMatchData.cell2.style.pointerEvents = "none";
      }
      
      // 確保 DQ 選手被移出未來賽程
      filterOutDQMatches();
      
      resetMatchHeader();
      resetMatchData();
      switchPage("poolPage");
      return;
    }
    
    // 處理平局情況
    let s1 = parseInt(document.getElementById("matchScore1").value) || 0;
    let s2 = parseInt(document.getElementById("matchScore2").value) || 0;
    if (s1 === s2) {
      startTieBreak();
      return;
    }
    
    // 正常比賽結果處理
    let resultLeft = "", resultRight = "";
    if (s1 > s2) {
      resultLeft = `<span class="pool-win">V${s1}</span>`;
      resultRight = `<span class="pool-loss">D${s2}</span>`;
    } else {
      resultLeft = `<span class="pool-loss">D${s1}</span>`;
      resultRight = `<span class="pool-win">V${s2}</span>`;
    }
    
    // 添加牌面圖示
    if (leftCard !== "none") {
      let iconLeft = leftCard === "yellow" ? "🟨" : (leftCard === "red" ? "🟥" : (leftCard === "black" ? "⚫" : ""));
      resultLeft += " " + iconLeft;
    }
    if (rightCard !== "none") {
      let iconRight = rightCard === "yellow" ? "🟨" : (rightCard === "red" ? "🟥" : (rightCard === "black" ? "⚫" : ""));
      resultRight += " " + iconRight;
    }
    
    // 獲取 Pool div
    let poolDiv = document.getElementById("pool-" + currentMatchData.poolID);
    if (!poolDiv) {
      resetMatchHeader();
      resetMatchData();
      switchPage("poolPage");
      return;
    }
    
    // 使用已保存的單元格引用更新比賽結果
    if (currentMatchData.cell1) {
      currentMatchData.cell1.innerHTML = resultLeft;
      currentMatchData.cell1.classList.add("completed-match");
      currentMatchData.cell1.style.pointerEvents = "none";
    }
    
    if (currentMatchData.cell2) {
      currentMatchData.cell2.innerHTML = resultRight;
      currentMatchData.cell2.classList.add("completed-match");
      currentMatchData.cell2.style.pointerEvents = "none";
    }
    
    // 重新計算統計數據和排名
    recalcPoolStats(currentMatchData.poolID, currentMatchData.row);
    recalcPoolStats(currentMatchData.poolID, currentMatchData.col);
    recalcPoolRanking(currentMatchData.poolID);
    
    // 清理其他數據
    resetMatchHeader();
    document.getElementById("tieBreakStartContainer").style.display = "none";
    remainingTime = totalMatchTime;
    updateTimerDisplay();
    currentMatchData.tieBreakActive = false;
    resetMatchData();
    switchPage("poolPage");
  }
}

  // 重置比賽相關數據，避免數據殘留
  function resetMatchData() {
    // 重置比分
    document.getElementById("matchScore1").value = "0";
    document.getElementById("matchScore2").value = "0";
    
    // 重置發牌
    leftCards = { yellow: 0, red: 0, black: 0 };
    rightCards = { yellow: 0, red: 0, black: 0 };
    leftCard = "none";  // Reset global leftCard variable
    rightCard = "none"; // Reset global rightCard variable
    document.getElementById("cardDisplayLeft").textContent = t("currentCard") + "：" + t("noCard");
    document.getElementById("cardDisplayRight").textContent = t("currentCard") + "：" + t("noCard");
    
    // 重置計時器
    stopTimer();
  remainingTime = totalMatchTime;
  updateTimerDisplay();
    
    // 重置 Tie-Break
    if (window.tieBreakInterval) {
      clearInterval(window.tieBreakInterval);
      window.tieBreakInterval = null;
    }
    document.getElementById("tieBreakStartContainer").style.display = "none";
    
    // 不要完全清空 currentMatchData，只清理需要重置的數據
    if (currentMatchData) {
      currentMatchData.tieBreakActive = false;
      delete currentMatchData.prioritySide;
    }
  }

  // ================= 全域暴露 =================
 window.nextPowerOf2 = nextPowerOf2;
  window.parseResultText = parseResultText;
  window.switchPage = switchPage;
  window.startPoolTournament = startPoolTournament;
  window.generatePoolTabs = generatePoolTabs;
  window.calculatePoolResults = calculatePoolResults;
  window.generateKnockoutBracket = generateKnockoutBracket;
  window.generateFinalResults = generateFinalResults;
  window.finishMatch = finishMatch;
  window.downloadFinalResults = downloadFinalResults;
  window.updateMatchScore = updateMatchScore;
  window.startTimer = startTimer;
  window.stopTimer = stopTimer;
  window.resetTimer = resetTimer;
  window.changeMatchTime = changeMatchTime;
  window.selectCard = selectCard;
  window.startTieBreak = startTieBreak;
  window.startTieBreakTimer = startTieBreakTimer;
  window.restartNewMatch = restartNewMatch;
  window.backToPool = backToPool;
  window.enterKnockoutMatch = enterKnockoutMatch;
  window.resetMatchData = resetMatchData;
  window.changeLanguage = changeLanguage;
  window.resetCardSelection = resetCardSelection;
  window.finishPlayerInput = finishPlayerInput;
  window.startCurrentMatch = startCurrentMatch;
  window.filterOutDQMatches = filterOutDQMatches;
  window.viewKnockoutBracket = viewKnockoutBracket;
  window.resetAllData = resetAllData;
  window.openSettingsPage = openSettingsPage; // Make openSettingsPage available globally

  // Initialize knockoutBracket to empty object in global scope if it doesn't exist
  if (typeof window.knockoutBracket === 'undefined') {
    window.knockoutBracket = { rounds: [] };
  }
  
  // 覆蓋 finishMatch 函數，添加自動移至下一場比賽的邏輯
  const originalFinishMatch = window.finishMatch;
  window.finishMatch = function() {
    // 呼叫原始函數
    originalFinishMatch.apply(this, arguments);
    
    // 如果來自 pool 賽且有設定當前 pool state，則更新進度
    if (currentMatchData && currentMatchData.poolID && 
        currentPoolState && currentPoolState.poolID === currentMatchData.poolID) {
      // 移動到下一場比賽
      currentPoolState.matchIndex++;
      
      // 延遲更新顯示，等待回到 pool 頁面
    setTimeout(() => {
        updateMatchScheduleDisplay();
      }, 300);
    }
  };
  
  // ================= 分頁切換 =================
  function switchPage(pageId) {
    document.querySelectorAll(".page").forEach(page => {
      page.classList.remove("active");
      page.style.display = "none";
    });
    let target = document.getElementById(pageId);
    if (target) {
      target.classList.add("active");
      target.style.display = "block";
    }
    
    // Update active nav item
    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.remove("active");
    });
    
    // Find nav item that corresponds to this page and mark it active
    const navMap = {
      'homePage': 0,
      'poolPage': 1,
      'seedingPage': 2,
      'knockoutPage': 3,
      'finalResultsPage': 4,
      'settingsPage': 5
    };
    
    if (navMap.hasOwnProperty(pageId)) {
      const navItems = document.querySelectorAll(".nav-item");
      if (navItems.length > navMap[pageId]) {
        navItems[navMap[pageId]].classList.add("active");
      }
    }
    
    // Update UI text when switching pages to ensure proper translations
    updateUIText();
  }
  
  // 顯示完成的 Pool 最終排名
  function finalizePoolResults(poolID) {
    // 重新計算最終排名
    recalcPoolRanking(poolID);
    
    // 更新當前 pool 狀態為已完成
    if (currentPoolState && currentPoolState.poolID === poolID) {
      currentPoolState.completed = true;
    }
    
    // 顯示一個提示訊息
    alert(t("poolCompleted", { poolID }));
    
    // 如果所有 pool 都完成了，自動觸發計算總成績
    let allPoolsCompleted = true;
    for (let i = 1; i <= globalPoolTotal; i++) {
      let poolDiv = document.getElementById("pool-" + i);
      if (poolDiv && !poolDiv.getAttribute("data-completed")) {
        allPoolsCompleted = false;
        break;
      }
    }
    
    if (allPoolsCompleted) {
      calculatePoolResults();
    }
  }
  
  // 過濾出已被DQ選手的賽程，刪除包含DQ選手的未來比賽
  function filterOutDQMatches() {
    if (!currentPoolState || !currentPoolState.poolID) return;
    
    const poolDiv = document.getElementById("pool-" + currentPoolState.poolID);
    if (!poolDiv) return;
    
    // 找出所有被DQ的選手
    const dqPlayers = [];
    poolDiv.querySelectorAll(".player-name.dq").forEach(input => {
      const row = input.closest("tr");
      if (row) {
        const rowIndex = parseInt(row.getAttribute("data-index"));
        if (!isNaN(rowIndex)) {
          dqPlayers.push(rowIndex);
        }
      }
    });
    
    if (dqPlayers.length === 0) return; // 沒有被DQ的選手
    
    // 過濾掉包含被DQ選手的未來比賽（從當前比賽之後的比賽開始）
    const filteredMatches = [];
    
    // 保留當前已經進行的比賽
    for (let i = 0; i < currentPoolState.matchIndex; i++) {
      filteredMatches.push(currentPoolState.matchOrder[i]);
    }
    
    // 過濾未來的比賽
    for (let i = currentPoolState.matchIndex; i < currentPoolState.matchOrder.length; i++) {
      const matchPair = currentPoolState.matchOrder[i];
      const player1 = matchPair[0];
      const player2 = matchPair[1];
      
      // 如果比賽中有任何一方是被DQ的選手，則跳過該比賽
      if (dqPlayers.includes(player1) || dqPlayers.includes(player2)) {
        continue;
      }
      
      filteredMatches.push(matchPair);
    }
    
    // 更新比賽順序
    currentPoolState.matchOrder = filteredMatches;
    
    // 如果當前比賽因為過濾而被刪除，則移動到下一場有效比賽
    if (currentPoolState.matchIndex >= currentPoolState.matchOrder.length) {
      // 所有比賽已結束
      currentPoolState.matchIndex = currentPoolState.matchOrder.length;
    }
    
    // 更新顯示
    updateMatchScheduleDisplay();
  }
  
  // Add the openSettingsPage function
  function openSettingsPage() {
    switchPage('settingsPage');
    
    // Update active nav item
    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.remove("active");
    });
    
    // Find the settings nav item and mark it active
    const settingsNavItem = document.querySelector('.nav-item:last-child');
    if (settingsNavItem) {
      settingsNavItem.classList.add("active");
    }
  }

  // 將比賽轉發到 enterKnockoutMatch 函數
  function startKnockoutMatch(roundIndex, matchIndex) {
    console.log("Starting knockout match:", roundIndex, matchIndex);
    enterKnockoutMatch(roundIndex, matchIndex);
  }

  // 重置對決區標題
  function resetMatchHeader() {
      let header = document.getElementById("matchSection").querySelector("h2");
    if (header) {
      header.textContent = "對決";
    }
  }
  
  // 導出關鍵函數到全局 window 對象，確保 startKnockoutMatch 可以使用
  window.enterKnockoutMatch = enterKnockoutMatch;
  window.displayKnockoutBracket = displayKnockoutBracket;
  window.resetMatchData = resetMatchData;
  window.resetMatchHeader = resetMatchHeader;
});

// Add these missing helper functions at the end of the file
function nextPowerOf2(n) {
  if (n <= 0) return 1;
  n--;
  n |= n >> 1;
  n |= n >> 2;
  n |= n >> 4;
  n |= n >> 8;
  n |= n >> 16;
  return n + 1;
}

function parseResultText(text) {
  // Default values
  let isVictory = false;
  let touches = 0;
  
  // Return defaults for empty/DQ matches
  if (!text || text === "待賽" || text === "DQ" || text === "Pending") {
    return { isVictory, touches };
  }
  
  // Handle BYE matches - no score, no victory
  if (text === t("bye") || text.includes("BYE") || text.includes("輪空")) {
    return { isVictory: false, touches: 0 };
  }
  
  // Parse victory/defeat and score
  if (text.includes('V')) {
    isVictory = true;
    // Extract number after V
    const match = text.match(/V(\d+)/);
    if (match && match[1]) {
      touches = parseInt(match[1]);
    }
  } else if (text.includes('D')) {
    // Extract number after D
    const match = text.match(/D(\d+)/);
    if (match && match[1]) {
      touches = parseInt(match[1]);
    }
  }
  
  return { isVictory, touches };
}

// Add the missing resetAllData function
function resetAllData() {
  // 清空全域變數
  currentMatchData = null;
  leftCard = "none";
  rightCard = "none";
  knockoutBracket = null;
  qualifiedPlayersForKnockout = [];
  if (tieBreakInterval) clearInterval(tieBreakInterval);
  tieBreakInterval = null;
  tieBreakRemainingTime = 60;
  currentPoolState = null;
  
  // 停止可能的計時器
  // 使用全局方法安全地停止計時器，而不是直接使用 timerInterval 變量
  stopTimer();
  
  // 重置全局設定（依預設值調整）
  globalTournamentName = "";
  globalPoolTotal = 1;
  globalQualType = "fixed";
  globalQualValue = 8; // 晉級人數默認為8
  
  // 重置首頁輸入欄
  let elem = document.getElementById("globalTournamentName");
  if (elem) elem.value = "";
  elem = document.getElementById("globalPoolTotal");
  if (elem) elem.value = "2";
  elem = document.getElementById("globalQualType");
  if (elem) elem.value = "fixed";
  elem = document.getElementById("globalQualValue");
  if (elem) elem.value = "8"; // 在UI中也設為8
  
  // 重置 Tab 選項
  document.querySelectorAll('.tab-option').forEach(tab => {
    tab.classList.remove('active');
  });
  const fixedTab = document.querySelector('.tab-option[data-value="fixed"]');
  if (fixedTab) fixedTab.classList.add('active');
  
  // 重置 Pool 賽相關區域
  const poolContents = document.getElementById("poolContents");
  if (poolContents) poolContents.innerHTML = "";
  
  const poolTabs = document.getElementById("poolTabs");
  if (poolTabs) poolTabs.innerHTML = "";
  
  // 重置 Pool 賽名稱
  const poolEventName = document.getElementById("poolEventName");
  if (poolEventName) poolEventName.textContent = "";
  
  // 重置比賽進度顯示區域
  const currentMatchDisplay = document.getElementById("currentMatchDisplay");
  if (currentMatchDisplay) currentMatchDisplay.innerHTML = "";
  
  const upcomingMatchesDisplay = document.getElementById("upcomingMatchesDisplay");
  if (upcomingMatchesDisplay) upcomingMatchesDisplay.innerHTML = "";
  
  // 重置比賽結果相關區域
  const normalResultsContainer = document.getElementById("normalResultsContainer");
  if (normalResultsContainer) normalResultsContainer.innerHTML = "";
  
  const dqResultsContainer = document.getElementById("dqResultsContainer");
  if (dqResultsContainer) dqResultsContainer.innerHTML = "";
  
  // 重置淘汰賽相關區域
  const bracketContainer = document.getElementById("bracketContainer");
  if (bracketContainer) bracketContainer.innerHTML = "";
  
  // 重置最終結果頁面
  const finalResultsContainer = document.getElementById("finalResultsContainer");
  if (finalResultsContainer) finalResultsContainer.innerHTML = "";
  
  const finalTitle = document.getElementById("finalTitle");
  if (finalTitle) finalTitle.innerHTML = "";
  
  // 重置比賽頁面
  let scoreElem1 = document.getElementById("matchScore1");
  if (scoreElem1) scoreElem1.value = "0";
  
  let scoreElem2 = document.getElementById("matchScore2");
  if (scoreElem2) scoreElem2.value = "0";
  
  let player1Elem = document.getElementById("matchPlayer1Name");
  if (player1Elem) player1Elem.textContent = "選手1";
  
  let player2Elem = document.getElementById("matchPlayer2Name");
  if (player2Elem) player2Elem.textContent = "選手2";
  
  let timerElem = document.getElementById("timerDisplay");
  if (timerElem) timerElem.textContent = "03:00";
  
  let cardLeft = document.getElementById("cardDisplayLeft");
  if (cardLeft) cardLeft.textContent = "目前牌：無牌";
  
  let cardRight = document.getElementById("cardDisplayRight");
  if (cardRight) cardRight.textContent = "目前牌：無牌";
  
  // 重置匹配時間選擇器
  let matchTimeSelect = document.getElementById("matchTimeSelect");
  if (matchTimeSelect) matchTimeSelect.value = "180";
  
  // 重置發牌紀錄
  leftCards = { yellow: 0, red: 0, black: 0 };
  rightCards = { yellow: 0, red: 0, black: 0 };
  
  // 重置計時器相關變數
  remainingTime = totalMatchTime = 180;
  
  // 重置 Pool 頁面顯示隱藏狀態
  let playerInputMode = document.getElementById("playerInputMode");
  if (playerInputMode) playerInputMode.style.display = "none";
  
  let matchScheduleArea = document.getElementById("matchScheduleArea");
  if (matchScheduleArea) matchScheduleArea.style.display = "none";
  
  let calculateResultsBtn = document.getElementById("calculateResultsBtn");
  if (calculateResultsBtn) calculateResultsBtn.style.display = "none";
  
  // 隱藏 Tie-Break 相關元素
  let tieBreakStartContainer = document.getElementById("tieBreakStartContainer");
  if (tieBreakStartContainer) tieBreakStartContainer.style.display = "none";
  
  // 移除所有可能的 data 屬性
  document.querySelectorAll("[data-input-completed]").forEach(el => {
    el.removeAttribute("data-input-completed");
  });
  
  document.querySelectorAll("[data-matches-started]").forEach(el => {
    el.removeAttribute("data-matches-started");
  });
  
  document.querySelectorAll("[data-completed]").forEach(el => {
    el.removeAttribute("data-completed");
  });
  
  // 重置所有底部導航欄項目
  document.querySelectorAll(".nav-item").forEach((item, index) => {
    if (index === 0) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
  
  // 清除可能的本地存儲數據
  try {
    localStorage.removeItem("tournamentData");
    localStorage.removeItem("poolData");
    localStorage.removeItem("knockoutData");
  } catch (e) {
    console.warn("無法清除本地存儲", e);
  }
  
  console.log("所有比賽資料已重置");
}

// 添加 viewKnockoutBracket 函數，讓使用者可以從最終成績頁面查看淘汰賽對陣表
function viewKnockoutBracket() {
  if (knockoutBracket && knockoutBracket.rounds) {
    displayKnockoutBracket();
    switchPage("knockoutPage");
  } else {
    alert("淘汰賽對陣表不存在");
  }
}

// 重新開始新比賽
function restartNewMatch() {
  console.log("Restarting new match...");
  if (confirm("確定要重新開始新的比賽嗎？所有目前比賽資料將被清除。")) {
    resetAllData();
    switchPage("homePage");
  }
}
