document.addEventListener("DOMContentLoaded", function() {
  // ================= 全域變數 =================
  let currentMatchData = null; // 當前比賽資料（Pool 或淘汰賽）
  let leftCard = "none";
  let rightCard = "none";
  let knockoutBracket = null; // 淘汰賽對陣表
  let qualifiedPlayersForKnockout = []; // 全場晉級選手（依照全局設定）
  let tieBreakInterval = null;
  let tieBreakRemainingTime = 60;
  
  // 全局設定（首頁設定後賦值）
  let globalTournamentName = "";
  let globalPoolTotal = 1;
  let globalQualType = "fixed"; // "fixed" 或 "ratio"
  let globalQualValue = 4;
  
  // 提示音
  const soundStart = new Audio("sounds/start.mp3");
  const soundPause = new Audio("sounds/pause.mp3");
  const soundEnd = new Audio("sounds/end.mp3");
  
  // ================= Helper 函式 =================
  function nextPowerOf2(n) {
    let p = 1;
    while (p < n) { p *= 2; }
    return p;
  }
  
  function parseResultText(txt) {
    let pattern = /([VD])(\d+)|(\d+)/i;
    let match = pattern.exec(txt);
    if (!match) return { isVictory: false, touches: 0 };
    if (match[1]) {
      let letter = match[1].toUpperCase();
      let num = parseInt(match[2]) || 0;
      return { isVictory: (letter === "V"), touches: num };
    } else if (match[3]) {
      let num = parseInt(match[3]) || 0;
      return { isVictory: false, touches: num };
    }
    return { isVictory: false, touches: 0 };
  }
  
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
  }
  
  // ================= 首頁設定 =================
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
    for (let i = 0; i < poolTotal; i++) {
      let poolID = letters[i];
      let tab = document.createElement("button");
      tab.className = "pool-tab";
      if (i === 0) tab.classList.add("active");
      tab.setAttribute("data-pool", poolID);
      tab.textContent = "Pool " + poolID;
      tab.onclick = function() { showPool(poolID); };
      tabsContainer.appendChild(tab);
      
      let poolDiv = document.createElement("div");
      poolDiv.className = "pool-content";
      poolDiv.id = "pool-" + poolID;
      if (i !== 0) poolDiv.style.display = "none";
      let h3 = document.createElement("h3");
      h3.textContent = "Pool " + poolID;
      poolDiv.appendChild(h3);
      
      // 加入可選參賽人數（4 至 8 人）
      let selectElem = document.createElement("select");
      selectElem.className = "pool-player-select";
      for (let num = 4; num <= 8; num++) {
        let option = document.createElement("option");
        option.value = num;
        option.textContent = num + " 人";
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
  }
  
  function showPool(poolID) {
    document.querySelectorAll(".pool-content").forEach(pc => { pc.style.display = "none"; });
    document.querySelectorAll(".pool-tab").forEach(tab => { tab.classList.remove("active"); });
    let poolDiv = document.getElementById("pool-" + poolID);
    if (poolDiv) poolDiv.style.display = "block";
    let tab = document.querySelector(`.pool-tab[data-pool='${poolID}']`);
    if (tab) tab.classList.add("active");
  }
  
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
    headerRow.innerHTML = `<th>#</th><th>選手姓名</th>`;
    for (let c = 1; c <= count; c++) {
      headerRow.innerHTML += `<th>對戰${c}</th>`;
    }
    headerRow.innerHTML += `<th>V</th><th>TS</th><th>TR</th><th>IND</th><th>PI</th>`;
    thead.appendChild(headerRow);
    table.appendChild(thead);
    let tbody = document.createElement("tbody");
    for (let r = 1; r <= count; r++) {
      let tr = document.createElement("tr");
      tr.setAttribute("data-index", r);
      tr.innerHTML = `<td>${r}</td><td><input type="text" class="player-name" placeholder="選手姓名"></td>`;
      for (let c = 1; c <= count; c++) {
        let td = document.createElement("td");
        if (r === c) {
          td.className = "self-cell";
          td.innerHTML = "-";
        } else {
          td.className = "match-cell";
          td.setAttribute("data-row", r);
          td.setAttribute("data-col", c);
          td.innerHTML = "待賽";
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
  }
  
  // ================= 單挑比賽功能 =================
  function selectPoolMatch(cell, poolID) {
    let row = parseInt(cell.getAttribute("data-row"));
    let col = parseInt(cell.getAttribute("data-col"));
    let poolDiv = document.getElementById("pool-" + poolID);
    let rowInp = poolDiv.querySelector(`tr[data-index='${row}'] .player-name`);
    let colInp = poolDiv.querySelector(`tr[data-index='${col}'] .player-name`);
    if (!rowInp || !colInp) { alert("找不到對應的選手資料！"); return; }
    let p1 = rowInp.value.trim();
    let p2 = colInp.value.trim();
    if (!p1 || !p2) { alert("請先填寫選手姓名！"); return; }
    currentMatchData = { poolID, row, col, cell, player1: { name: p1 }, player2: { name: p2 } };
    document.getElementById("matchPlayer1Name").textContent = p1;
    document.getElementById("matchPlayer2Name").textContent = p2;
    document.getElementById("matchScore1").textContent = "0";
    document.getElementById("matchScore2").textContent = "0";
    remainingTime = totalMatchTime;
    updateTimerDisplay();
    leftCard = "none";
    rightCard = "none";
    document.getElementById("cardDisplayLeft").textContent = "目前牌：無牌";
    document.getElementById("cardDisplayRight").textContent = "目前牌：無牌";
    switchPage("matchPage");
  }
  
  function backToPool() {
    switchPage("poolPage");
  }
  
  function updateMatchScore(id, delta) {
    let elem = document.getElementById(id);
    let val = parseInt(elem.textContent) || 0;
    elem.textContent = Math.max(0, val + delta);
    if (currentMatchData && currentMatchData.tieBreakActive) {
      if (parseInt(elem.textContent) > 0) {
        clearInterval(tieBreakInterval);
        if (id === "matchScore1") {
          document.getElementById("matchScore2").textContent = "0";
        } else {
          document.getElementById("matchScore1").textContent = "0";
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
    soundStart.play();
    timerInterval = setInterval(() => {
      remainingTime--;
      if (remainingTime <= 0) {
        remainingTime = 0;
        stopTimer();
        soundEnd.play();
        alert("比賽時間到！");
      }
      updateTimerDisplay();
    }, 1000);
  }
  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    soundPause.play();
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
      disp.textContent = "目前牌：黃牌 " + leftCards.yellow + "，紅牌 " + leftCards.red + "，黑牌 " + leftCards.black;
    } else if (side === "right") {
      const disp = document.getElementById("cardDisplayRight");
      disp.textContent = "目前牌：黃牌 " + rightCards.yellow + "，紅牌 " + rightCards.red + "，黑牌 " + rightCards.black;
    }
  }
  function resetCardSelection() {
    leftCards = { yellow: 0, red: 0, black: 0 };
    rightCards = { yellow: 0, red: 0, black: 0 };
    updateCardDisplay("left");
    updateCardDisplay("right");
  }
  window.resetCardSelection = resetCardSelection;
  
  function selectCard(side, type) {
    // 黑牌處理：若在 pool 賽中則執行 disqualify，若喺淘汰賽則檢查 poolDiv 是否存在再執行
    if (side === "left") {
      if (type === "yellow") {
        leftCards.yellow++;
        if (leftCards.yellow >= 2) {
          leftCards.yellow = 0;
          leftCards.red++;
          let scoreElem = document.getElementById("matchScore2");
          let currentScore = parseInt(scoreElem.textContent) || 0;
          scoreElem.textContent = currentScore + 1;
        }
      } else if (type === "red") {
        leftCards.red++;
        let scoreElem = document.getElementById("matchScore2");
        let currentScore = parseInt(scoreElem.textContent) || 0;
        scoreElem.textContent = currentScore + 1;
      } else if (type === "black") {
        leftCards.black++;
        alert("左側被取消資格！");
        currentMatchData.player1.DQ = true;
        // 僅在 pool 賽中執行 disqualify 處理
        if (currentMatchData.poolID) {
          let poolDiv = document.getElementById("pool-" + currentMatchData.poolID);
          if (poolDiv) {
            let rowElement = poolDiv.querySelector(`tr[data-index='${currentMatchData.row}']`);
            if (rowElement) {
              let inputElem = rowElement.querySelector(".player-name");
              if (inputElem) {
                inputElem.classList.add("dq");
                inputElem.value = inputElem.value + " (DQ)";
                inputElem.disabled = true;
              }
              rowElement.querySelectorAll(".match-cell").forEach(cell => {
                cell.classList.add("dq-disabled");
                cell.style.pointerEvents = "none";
              });
            }
            poolDiv.querySelectorAll("tr").forEach(function(r) {
              let cell = r.querySelector(`td.match-cell[data-col='${currentMatchData.row}']`);
              if (cell) {
                cell.classList.add("dq-disabled");
                cell.style.pointerEvents = "none";
              }
            });
          }
        }
        finishMatch();
        return;
      }
      updateCardDisplay("left");
    } else if (side === "right") {
      if (type === "yellow") {
        rightCards.yellow++;
        if (rightCards.yellow >= 2) {
          rightCards.yellow = 0;
          rightCards.red++;
          let scoreElem = document.getElementById("matchScore1");
          let currentScore = parseInt(scoreElem.textContent) || 0;
          scoreElem.textContent = currentScore + 1;
        }
      } else if (type === "red") {
        rightCards.red++;
        let scoreElem = document.getElementById("matchScore1");
        let currentScore = parseInt(scoreElem.textContent) || 0;
        scoreElem.textContent = currentScore + 1;
      } else if (type === "black") {
        rightCards.black++;
        alert("右側被取消資格！");
        currentMatchData.player2.DQ = true;
        if (currentMatchData.poolID) {
          let poolDiv = document.getElementById("pool-" + currentMatchData.poolID);
          if (poolDiv) {
            let rowElement = poolDiv.querySelector(`tr[data-index='${currentMatchData.col}']`);
            if (rowElement) {
              let inputElem = rowElement.querySelector(".player-name");
              if (inputElem) {
                inputElem.classList.add("dq");
                inputElem.value = inputElem.value + " (DQ)";
                inputElem.disabled = true;
              }
              rowElement.querySelectorAll(".match-cell").forEach(cell => {
                cell.classList.add("dq-disabled");
                cell.style.pointerEvents = "none";
              });
            }
            poolDiv.querySelectorAll("tr").forEach(function(r) {
              let cell = r.querySelector(`td.match-cell[data-col='${currentMatchData.col}']`);
              if (cell) {
                cell.classList.add("dq-disabled");
                cell.style.pointerEvents = "none";
              }
            });
          }
        }
        finishMatch();
        return;
      }
      updateCardDisplay("right");
    }
  }
  
  // ================= Tie-Break 功能 =================
  function startTieBreak() {
    let prioritySide = (Math.random() < 0.5) ? "left" : "right";
    let tieBreakAnim = document.createElement("div");
    tieBreakAnim.className = "roulette";
    tieBreakAnim.textContent = "抽選中...";
    document.getElementById("matchSection").appendChild(tieBreakAnim);
    setTimeout(() => {
      tieBreakAnim.remove();
      alert("平手！抽取優先權，" + (prioritySide === "left" ? "左方" : "右方") + "獲得優先權！");
      let header = document.getElementById("matchSection").querySelector("h2");
      header.innerHTML = "Tie-Break！優先權：" + (prioritySide === "left" ? "左方" : "右方") + "，請按下「開始 Tie-Break」開始計時";
      document.getElementById("tieBreakStartContainer").style.display = "block";
      currentMatchData.prioritySide = prioritySide;
    }, 3000);
  }
  
  function startTieBreakTimer() {
    document.getElementById("tieBreakStartContainer").style.display = "none";
    tieBreakRemainingTime = 60;
    tieBreakInterval = setInterval(() => {
      tieBreakRemainingTime--;
      updateTieBreakTimerDisplay();
      if (tieBreakRemainingTime <= 0) {
        clearInterval(tieBreakInterval);
        if (currentMatchData.prioritySide === "left") {
          document.getElementById("matchScore2").textContent = "0";
          document.getElementById("matchScore1").textContent = "999";
        } else {
          document.getElementById("matchScore1").textContent = "0";
          document.getElementById("matchScore2").textContent = "999";
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
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let allPlayers = [];
  // 聚合所有 Pool 選手（各 Pool 參賽人數根據下拉選單設定）
  for (let i = 0; i < globalPoolTotal; i++) {
    let poolID = letters[i];
    let poolDiv = document.getElementById("pool-" + poolID);
    if (!poolDiv) continue;
    let select = poolDiv.querySelector("select.pool-player-select");
    let count = select ? parseInt(select.value) : 8;
    let rows = poolDiv.querySelectorAll("tbody tr");
    rows.forEach(r => {
      let idx = parseInt(r.getAttribute("data-index"));
      if (idx > count) return;
      let inputElem = r.querySelector(".player-name");
      let name = inputElem.value.trim();
      if (!name) return;
      let isDQ = inputElem.disabled;
      let v = parseInt(r.querySelector(".v-cell").textContent) || 0;
      let ts = parseInt(r.querySelector(".ts-cell").textContent) || 0;
      let trVal = parseInt(r.querySelector(".tr-cell").textContent) || 0;
      let ind = parseInt(r.querySelector(".ind-cell").textContent) || 0;
      allPlayers.push({
        name: name,
        v: v,
        ts: ts,
        tr: trVal,
        ind: ind,
        DQ: isDQ,
        poolID: poolID
      });
    });
  }
  
  // 全局排序：先將非DQ選手排前，再依 V、IND、TS 排序
  allPlayers.sort((a, b) => {
    if (a.DQ !== b.DQ) return a.DQ ? 1 : -1;
    if (b.v !== a.v) return b.v - a.v;
    if (b.ind !== a.ind) return b.ind - a.ind;
    return b.ts - a.ts;
  });
  
  // 計算全場晉級人數
  let totalPlayers = allPlayers.length;
  let qualNum = 0;
  if (globalQualType === "fixed") {
    qualNum = Math.min(globalQualValue, totalPlayers);
  } else {
    qualNum = Math.floor(totalPlayers * (globalQualValue / 100));
    if (qualNum < 1) qualNum = 1;
  }
  
  // 標記前 qualNum 名為合格
  allPlayers.forEach((p, index) => {
    p.qualified = (index < qualNum);
  });
  
  // 分組：正常選手與 DQ 選手
  let normalPlayers = allPlayers.filter(p => !p.DQ);
  let dqPlayers = allPlayers.filter(p => p.DQ);
  
  // 顯示正常選手表格，合格選手背景設為綠色，淘汰（不合格）設為紅色
  let normalContainer = document.getElementById("normalResultsContainer");
  normalContainer.innerHTML = "<h3>正常選手</h3>";
  let table1 = document.createElement("table");
  let thead1 = document.createElement("thead");
  thead1.innerHTML = `<tr>
    <th>Rank</th>
    <th>選手</th>
    <th>V</th>
    <th>TS</th>
    <th>TR</th>
    <th>IND</th>
    <th>Status</th>
  </tr>`;
  table1.appendChild(thead1);
  let tbody1 = document.createElement("tbody");
  normalPlayers.forEach((p, index) => {
    let tr = document.createElement("tr");
    let statusText = p.qualified ? "Advanced" : "Eliminated";
    tr.innerHTML = `<td>${index + 1}</td>
      <td>${p.name}</td>
      <td>${p.v}</td>
      <td>${p.ts}</td>
      <td>${p.tr}</td>
      <td>${p.ind}</td>
      <td>${statusText}</td>`;
    // 合格選手背景綠色，不合格（Eliminated）設為紅色
    tr.style.backgroundColor = p.qualified ? "#d4edda" : "#ffcccc";
    tbody1.appendChild(tr);
  });
  table1.appendChild(tbody1);
  normalContainer.appendChild(table1);
  
  // 顯示 DQ 選手表格（若有）
  let dqContainer = document.getElementById("dqResultsContainer");
  dqContainer.innerHTML = "";
  if (dqPlayers.length > 0) {
    dqContainer.innerHTML = "<h3>被DQ選手</h3>";
    let table2 = document.createElement("table");
    let thead2 = document.createElement("thead");
    thead2.innerHTML = `<tr>
      <th>Rank</th>
      <th>選手</th>
      <th>V</th>
      <th>TS</th>
      <th>TR</th>
      <th>IND</th>
      <th>Status</th>
    </tr>`;
    table2.appendChild(thead2);
    let tbody2 = document.createElement("tbody");
    dqPlayers.forEach((p, index) => {
      let tr = document.createElement("tr");
      tr.innerHTML = `<td>DQ</td>
        <td>${p.name}</td>
        <td>${p.v}</td>
        <td>${p.ts}</td>
        <td>${p.tr}</td>
        <td>${p.ind}</td>
        <td>DQ</td>`;
      tr.style.backgroundColor = "#ffcccc";
      tbody2.appendChild(tr);
    });
    table2.appendChild(tbody2);
    dqContainer.appendChild(table2);
  }
  
  switchPage("seedingPage");
  
  // 儲存合格（qualified）且非 DQ 選手供淘汰賽使用
  qualifiedPlayersForKnockout = allPlayers.filter(p => p.qualified && !p.DQ);
}

  // ================= Final Results =================
  function generateFinalResults() {
    if (!knockoutBracket || !knockoutBracket.rounds || qualifiedPlayersForKnockout.length === 0) {
      alert("尚未有淘汰賽資料！");
      return;
    }
    // 此處僅簡單示範，實際可根據需求進行排序
    let finalRanking = qualifiedPlayersForKnockout.filter(p => p.qualified && p.name !== "BYE" && !p.DQ);
    let container = document.getElementById("finalResultsContainer");
    container.innerHTML = "";
    let finalTitle = document.getElementById("finalTitle");
    finalTitle.innerHTML = "<h2>【" + globalTournamentName + "】 最終成績</h2>";
    let table = document.createElement("table");
    let thead = document.createElement("thead");
    thead.innerHTML = `<tr>
      <th>Rank</th>
      <th>選手名稱</th>
    </tr>`;
    table.appendChild(thead);
    let tbody = document.createElement("tbody");
    finalRanking.forEach((player, index) => {
      let tr = document.createElement("tr");
      let bg;
      if (index === 0) bg = "#ffd700";
      else if (index === 1) bg = "#c0c0c0";
      else if (index === 2 || index === 3) bg = "#cd7f32";
      else bg = "#d4edda";
      tr.innerHTML = `<td>${index + 1}</td><td>${player.name}</td>`;
      tr.style.backgroundColor = bg;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
    switchPage("finalResultsPage");
  }
  
  function downloadFinalResults() {
    let table = document.getElementById("finalResultsContainer").querySelector("table");
    if (!table) return;
    let csv = [];
    let rows = table.querySelectorAll("tr");
    rows.forEach(row => {
      let cols = row.querySelectorAll("th, td");
      let rowData = [];
      cols.forEach(col => {
        rowData.push('"' + col.textContent.trim() + '"');
      });
      csv.push(rowData.join(","));
    });
    let csvFile = new Blob([csv.join("\n")], { type: "text/csv" });
    let downloadLink = document.createElement("a");
    downloadLink.download = "final_results.csv";
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }
  
  // ================= 淘汰賽功能 =================
  function generateKnockoutBracket() {
    if (qualifiedPlayersForKnockout.length === 0) {
      alert("沒有有效的晉級選手！");
      return;
    }
    let realPlayers = qualifiedPlayersForKnockout.filter(p => p.qualified && p.name !== "BYE");
    let bracketSize = nextPowerOf2(realPlayers.length);
    let qp = realPlayers.slice();
    while (qp.length < bracketSize) {
      qp.push({ name: "BYE", pi: 999 });
    }
    qp.sort((a, b) => a.pi - b.pi);
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
    let rounds = [];
    rounds.push(firstRound);
    let currentRound = firstRound;
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
    knockoutBracket = { rounds: rounds };
    displayKnockoutBracket();
    switchPage("knockoutPage");
  }
  
  function displayKnockoutBracket() {
    let container = document.getElementById("bracketContainer");
    container.innerHTML = "";
    let rounds = knockoutBracket.rounds;
    rounds.forEach((round, roundIndex) => {
      let roundDiv = document.createElement("div");
      roundDiv.className = "bracket-round";
      let title = document.createElement("h3");
      if (round.length === 1) title.textContent = "Final";
      else if (round.length === 2) title.textContent = "Semifinals";
      else if (round.length === 4) title.textContent = "Quarterfinals";
      else title.textContent = "Round " + (roundIndex + 1);
      roundDiv.appendChild(title);
      round.forEach((match, idx) => {
        let mDiv = document.createElement("div");
        mDiv.className = "bracket-match";
        let p1Name = match.player1 ? match.player1.name : "待定";
        let p2Name = match.player2 ? match.player2.name : "待定";
        let scoreStr = "";
        if (match.score1 !== 0 || match.score2 !== 0) {
          scoreStr = ` (${match.score1} - ${match.score2})`;
        }
        mDiv.innerHTML = `<strong>Match ${idx + 1}</strong><br>
          ${p1Name}${scoreStr} vs ${p2Name}${scoreStr}<br>
          <button class="btn" onclick="enterKnockoutMatch(${roundIndex}, ${idx})">進入比賽</button>`;
        roundDiv.appendChild(mDiv);
      });
      container.appendChild(roundDiv);
    });
  }
  
  function enterKnockoutMatch(roundIndex, matchIndex) {
    let round = knockoutBracket.rounds[roundIndex];
    let match = round[matchIndex];
    if (match.player1.name === "BYE" || match.player2.name === "BYE") {
      let winner = (match.player1.name === "BYE") ? match.player2 : match.player1;
      alert("輪空！" + winner.name + " 自動晉級！");
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
    if (!match || !match.player1 || !match.player2) {
      alert("此比賽對陣尚未確定！");
      return;
    }
    currentMatchData = { knockoutRound: roundIndex, matchIndex: matchIndex, player1: match.player1, player2: match.player2 };
    document.getElementById("matchPlayer1Name").textContent = match.player1.name;
    document.getElementById("matchPlayer2Name").textContent = match.player2.name;
    document.getElementById("matchScore1").textContent = "0";
    document.getElementById("matchScore2").textContent = "0";
    remainingTime = totalMatchTime;
    updateTimerDisplay();
    leftCard = "none";
    rightCard = "none";
    document.getElementById("cardDisplayLeft").textContent = "目前牌：無牌";
    document.getElementById("cardDisplayRight").textContent = "目前牌：無牌";
    switchPage("matchPage");
  }
  
 // 用於重置對決區標題為「對決」
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
  let s1 = parseInt(document.getElementById("matchScore1").textContent) || 0;
  let s2 = parseInt(document.getElementById("matchScore2").textContent) || 0;
  if (s1 === s2) {
    startTieBreak();
    return;
  }
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
    resetMatchHeader(); // 重置標題
    switchPage("knockoutPage");
  } else {
    resetMatchHeader(); // 重置標題
    generateFinalResults();
  }
}

// finishMatch 用於 Pool 賽及淘汰賽對決結束後呼叫
function finishMatch() {
  if (currentMatchData && currentMatchData.hasOwnProperty("knockoutRound")) {
    finishKnockoutMatch();
  } else {
    if (currentMatchData.player1.DQ || currentMatchData.player2.DQ) {
      currentMatchData.cell.innerHTML = "DQ";
      let poolDiv = document.getElementById("pool-" + currentMatchData.poolID);
      let otherCell = poolDiv.querySelector(
        `tr[data-index='${currentMatchData.col}'] td.match-cell[data-col='${currentMatchData.row}']`
      );
      if (otherCell) otherCell.innerHTML = "DQ";
      resetMatchHeader(); // 重置標題
      switchPage("poolPage");
      return;
    }
    let s1 = parseInt(document.getElementById("matchScore1").textContent) || 0;
    let s2 = parseInt(document.getElementById("matchScore2").textContent) || 0;
    if (s1 === s2) {
      startTieBreak();
      return;
    }
    let resultLeft = "", resultRight = "";
    if (s1 > s2) {
      resultLeft = `<span class="pool-win">V${s1}</span>`;
      resultRight = `<span class="pool-loss">D${s2}</span>`;
    } else {
      resultLeft = `<span class="pool-loss">D${s1}</span>`;
      resultRight = `<span class="pool-win">V${s2}</span>`;
    }
    if (leftCard !== "none") {
      let iconLeft = leftCard === "yellow" ? "🟨" : (leftCard === "red" ? "🟥" : (leftCard === "black" ? "⚫" : ""));
      resultLeft += " " + iconLeft;
    }
    if (rightCard !== "none") {
      let iconRight = rightCard === "yellow" ? "🟨" : (rightCard === "red" ? "🟥" : (rightCard === "black" ? "⚫" : ""));
      resultRight += " " + iconRight;
    }
    if (currentMatchData && currentMatchData.cell) {
      currentMatchData.cell.innerHTML = resultLeft;
    }
    let poolDiv = document.getElementById("pool-" + currentMatchData.poolID);
    let otherCell = poolDiv.querySelector(
      `tr[data-index='${currentMatchData.col}'] td.match-cell[data-col='${currentMatchData.row}']`
    );
    if (otherCell) otherCell.innerHTML = resultRight;
    recalcPoolStats(currentMatchData.poolID, currentMatchData.row);
    recalcPoolStats(currentMatchData.poolID, currentMatchData.col);
    recalcPoolRanking(currentMatchData.poolID);
    // 重置 Tie-Break 提示及標題
    resetMatchHeader();
    document.getElementById("tieBreakStartContainer").style.display = "none";
    remainingTime = totalMatchTime;
    updateTimerDisplay();
    currentMatchData.tieBreakActive = false;
    switchPage("poolPage");
  }
}

  // ================= Tie-Break 功能 =================
  function startTieBreak() {
    let prioritySide = (Math.random() < 0.5) ? "left" : "right";
    let tieBreakAnim = document.createElement("div");
    tieBreakAnim.className = "roulette";
    tieBreakAnim.textContent = "抽選中...";
    document.getElementById("matchSection").appendChild(tieBreakAnim);
    setTimeout(() => {
      tieBreakAnim.remove();
      alert("平手！抽取優先權，" + (prioritySide === "left" ? "左方" : "右方") + "獲得優先權！");
      let header = document.getElementById("matchSection").querySelector("h2");
      header.innerHTML = "Tie-Break！優先權：" + (prioritySide === "left" ? "左方" : "右方") + "，請按下「開始 Tie-Break」開始計時";
      document.getElementById("tieBreakStartContainer").style.display = "block";
      currentMatchData.prioritySide = prioritySide;
    }, 3000);
  }
  
  function startTieBreakTimer() {
    document.getElementById("tieBreakStartContainer").style.display = "none";
    tieBreakRemainingTime = 60;
    tieBreakInterval = setInterval(() => {
      tieBreakRemainingTime--;
      updateTieBreakTimerDisplay();
      if (tieBreakRemainingTime <= 0) {
        clearInterval(tieBreakInterval);
        if (currentMatchData.prioritySide === "left") {
          document.getElementById("matchScore2").textContent = "0";
          document.getElementById("matchScore1").textContent = "999";
        } else {
          document.getElementById("matchScore1").textContent = "0";
          document.getElementById("matchScore2").textContent = "999";
        }
        finishMatch();
      }
    }, 1000);
    currentMatchData.tieBreakActive = true;
  }
  
  function updateTieBreakTimerDisplay() {
    document.getElementById("timerDisplay").textContent = "Tie-Break: " + (tieBreakRemainingTime < 10 ? "0" + tieBreakRemainingTime : tieBreakRemainingTime) + "秒";
  }
  
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
  
  // 重置全局設定（依預設值調整）
  globalTournamentName = "";
  globalPoolTotal = 1;
  globalQualType = "fixed";
  globalQualValue = 4;
  
  // 重置首頁輸入欄
  let elem = document.getElementById("globalTournamentName");
  if (elem) elem.value = "";
  elem = document.getElementById("globalPoolTotal");
  if (elem) elem.value = "2";
  elem = document.getElementById("globalQualType");
  if (elem) elem.value = "fixed";
  elem = document.getElementById("globalQualValue");
  if (elem) elem.value = "30";
  
  // 重置 Pool 賽相關區域
  elem = document.getElementById("poolEventName");
  if (elem) elem.textContent = "";
  elem = document.getElementById("poolTabs");
  if (elem) elem.innerHTML = "";
  elem = document.getElementById("poolContents");
  if (elem) elem.innerHTML = "";
  
  // 重置 Overall Seeding 區域
  elem = document.getElementById("seedingResultsContainer");
  if (elem) elem.innerHTML = "";
  elem = document.getElementById("normalResultsContainer");
  if (elem) elem.innerHTML = "";
  elem = document.getElementById("dqResultsContainer");
  if (elem) elem.innerHTML = "";
  
  // 重置 淘汰賽區域
  elem = document.getElementById("bracketContainer");
  if (elem) elem.innerHTML = "";
  
  // 重置 Final Results 區域
  elem = document.getElementById("finalResultsContainer");
  if (elem) elem.innerHTML = "";
  elem = document.getElementById("finalTitle");
  if (elem) elem.innerHTML = "";
  
  // 重置計時器與 Tie-Break 提示
  remainingTime = totalMatchTime;
  updateTimerDisplay();
  elem = document.getElementById("tieBreakStartContainer");
  if (elem) elem.style.display = "none";
  
  // 最後跳回首頁
  switchPage("homePage");
}

 // 監聽箭頭的點擊事件
  let navArrow = document.getElementById("navArrow");
  navArrow.addEventListener("click", function() {
    let nav = document.getElementById("bottomNav");
    if (nav.classList.contains("open")) {
      nav.classList.remove("open");
      // 變回上箭頭符號
      this.innerHTML = "&#9650;";
    } else {
      nav.classList.add("open");
      // 變下箭頭符號
      this.innerHTML = "&#9660;";
    }
  });

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
  window.viewKnockoutBracket = function() { switchPage("knockoutPage"); };
  window.restartNewMatch = function() { window.location.reload(); };
  window.backToPool = backToPool;
  window.enterKnockoutMatch = enterKnockoutMatch;
});
