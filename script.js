const MATCH_KEY = "badminton_matches_v8";
const SET_KEY = "badminton_settings_v8";
const FOLDER_KEY = "badminton_folders_v8";

let matches = load(MATCH_KEY, []);
let folders = load(FOLDER_KEY, ["練習"]);

let settings = {
  playerName: "",
  games: 3,
  target: 21,
  soundEnabled: true,
  volume: 70,
  ...load(SET_KEY, {})
};

let current = null;
let lastDetailId = null;

/* 現在表示している英語アナウンス */
let lastAnnouncement = "";

/* 得点連打防止 */
let pointLocked = false;

const $ = id => document.getElementById(id);


/* =========================
   基本
========================= */

function load(key, fallback){
  try{
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  }catch{
    return fallback;
  }
}

function save(){
  localStorage.setItem(MATCH_KEY, JSON.stringify(matches));
  localStorage.setItem(SET_KEY, JSON.stringify(settings));
  localStorage.setItem(FOLDER_KEY, JSON.stringify(folders));
}

function today(){
  const d = new Date();

  return `${d.getFullYear()}-${
    String(d.getMonth()+1).padStart(2,"0")
  }-${
    String(d.getDate()).padStart(2,"0")
  }`;
}

function esc(x){
  return String(x ?? "").replace(
    /[&<>"']/g,
    c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c])
  );
}

function toast(t){
  const e = $("toast");

  if(!e) return;

  e.textContent = t;
  e.classList.add("show");

  setTimeout(()=>{
    e.classList.remove("show");
  },1300);
}


/* =========================
   ページ
========================= */

function page(id){

  document
    .querySelectorAll(".page")
    .forEach(x =>
      x.classList.toggle("active", x.id === id)
    );

  document
    .querySelectorAll(".nav button")
    .forEach(x =>
      x.classList.toggle(
        "active",
        x.dataset.page === id
      )
    );

  document.body.classList.toggle(
    "live-mode",
    id === "live"
  );

  window.scrollTo(0,0);

  if(id === "home") home();
  if(id === "matches") list();
  if(id === "stats") stats();
  if(id === "settings") settingsForm();
  if(id === "folders") renderFolders();
}


/* =========================
   HOME
========================= */

function home(){

  const w =
    matches.filter(
      x => x.result === "win"
    ).length;

  const l =
    matches.filter(
      x => x.result === "loss"
    ).length;

  if($("wins"))
    $("wins").textContent = w;

  if($("losses"))
    $("losses").textContent = l;

  if($("rate")){
    $("rate").textContent =
      `勝率 ${
        matches.length
          ? Math.round(w / matches.length * 100)
          : 0
      }%`;
  }

  const a = [...matches]
    .sort((x,y) => y.createdAt - x.createdAt)
    .slice(0,5);

  if($("recentMatches")){
    $("recentMatches").innerHTML =
      a.length
        ? a.map(item).join("")
        : `<div class="empty">
             まだ試合がありません🏸
           </div>`;
  }
}


/* =========================
   MATCH ITEM
========================= */

function item(m){

  return `
    <button class="match-item" data-id="${esc(m.id)}">

      <span>

        <strong>
          ${esc(m.event || "試合")}
        </strong>

        <small>
          ${esc(m.date)}
          ・
          ${esc(m.folder || "練習")}
          ・
          ${esc(m.opName || "相手")}
          vs
          ${esc(m.meName || "自分")}
        </small>

      </span>

      <span class="match-result ${
        m.result === "win" ? "blue" : "red"
      }">

        ${esc(m.gameScore)}

        <small>
          ${m.result === "win" ? "WIN" : "LOSS"}
        </small>

      </span>

    </button>
  `;
}


/* =========================
   NEW MATCH
========================= */

function newMatch(){

  $("date").value = today();

  $("games").value = settings.games;
  $("target").value = settings.target;

  $("meName").value =
    settings.playerName || "";

  $("opName").value = "";

  $("event").value = "";
  $("place").value = "";

  renderFolderSelect();

  if(folders.length){
    $("folderSelect").value = folders[0];
  }

  page("setup");
}


/* =========================
   FOLDERS
========================= */

function renderFolderSelect(){

  const select = $("folderSelect");

  if(!select) return;

  select.innerHTML =
    folders.map(f =>
      `<option value="${esc(f)}">
        ${esc(f)}
      </option>`
    ).join("");
}

function renderFolders(){

  const list = $("folderList");

  if(!list) return;

  if(!folders.length){
    list.innerHTML =
      `<div class="empty">
        フォルダがありません
      </div>`;
    return;
  }

  list.innerHTML = folders.map(folder => {

    const a = matches.filter(
      m => (m.folder || "練習") === folder
    );

    const w = a.filter(
      m => m.result === "win"
    ).length;

    const rate = a.length
      ? Math.round(w / a.length * 100)
      : 0;

    return `
      <div class="card folder-card">

        <button
          class="folder-main"
          data-folder="${esc(folder)}"
        >

          <span class="folder-name">
            🗂️ ${esc(folder)}
          </span>

          <span class="folder-count">
            ${a.length}試合　${w}勝 ${a.length-w}敗
          </span>

        </button>

        <span class="folder-rate">
          ${rate}%
        </span>

        ${
          folder !== "練習"
          ? `<button
              class="folder-delete"
              data-delete-folder="${esc(folder)}"
            >🗑️</button>`
          : ""
        }

      </div>
    `;
  }).join("");
}

function addFolder(){

  const input = $("newFolderName");

  if(!input) return;

  const name = input.value.trim();

  if(!name){
    toast("フォルダ名を入力してください");
    return;
  }

  if(folders.includes(name)){
    toast("同じ名前のフォルダがあります");
    return;
  }

  folders.push(name);

  input.value = "";

  save();
  renderFolders();
  renderFolderSelect();

  toast("フォルダを作りました");
}


/* =========================
   START
========================= */

function start(){

  current = {
    id: String(Date.now()),
    createdAt: Date.now(),

    date: $("date").value || today(),

    folder:
      $("folderSelect").value || "練習",

    type:
      $("type").value,

    gamesMax:
      +$("games").value,

    target:
      +$("target").value,

    meName:
      $("meName").value.trim() || "自分",

    opName:
      $("opName").value.trim() || "相手",

    meLabel:
      $("meSide").value +
      " " +
      $("meSR").value,

    opLabel:
      $("opSide").value +
      " " +
      $("opSR").value,

    event:
      $("event").value.trim(),

    place:
      $("place").value.trim(),

    weather:
      $("weather").value,

    games: [],

    game: makeGame(),

    spokenGameStart: false
  };

  lastAnnouncement = "";
  pointLocked = false;

  updateLive();

  page("live");

  /* ブラウザの音声許可を取得 */
  unlockAudio();

  setTimeout(()=>{
    speak("Love all, play");
  },250);

  toast("試合開始！");
}


/* =========================
   GAME
========================= */

function makeGame(){
  return {
    me: 0,
    op: 0,
    points: []
  };
}


/* =========================
   AUDIO
========================= */

let audioContext = null;

function unlockAudio(){

  try{

    if(!audioContext){
      audioContext =
        new (
          window.AudioContext ||
          window.webkitAudioContext
        )();
    }

    if(audioContext.state === "suspended"){
      audioContext.resume();
    }

  }catch(e){}
}


/* シャトルがラケットに当たる音 */

function hitSound(){

  if(!settings.soundEnabled) return;

  unlockAudio();

  if(!audioContext) return;

  const now =
    audioContext.currentTime;

  const osc =
    audioContext.createOscillator();

  const gain =
    audioContext.createGain();

  osc.type = "triangle";

  osc.frequency.setValueAtTime(
    1200,
    now
  );

  osc.frequency.exponentialRampToValueAtTime(
    250,
    now + 0.07
  );

  gain.gain.setValueAtTime(
    0.0001,
    now
  );

  gain.gain.exponentialRampToValueAtTime(
    0.25 * settings.volume / 100,
    now + 0.005
  );

  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + 0.09
  );

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.start(now);
  osc.stop(now + 0.1);
}


/* 英語音声 */

function speak(text){

  if(!settings.soundEnabled) return;

  if(!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const u =
    new SpeechSynthesisUtterance(text);

  u.lang = "en-US";

  u.volume =
    Math.max(
      0,
      Math.min(
        1,
        settings.volume / 100
      )
    );

  u.rate = 0.9;
  u.pitch = 1;

  window.speechSynthesis.speak(u);
}


/* =========================
   POINT
========================= */

function point(who){

  if(!current) return;

  /* 連打防止 */
  if(pointLocked) return;

  pointLocked = true;

  setTimeout(()=>{
    pointLocked = false;
  },260);

  const g = current.game;

  if(who === "me"){
    g.me++;
  }else{
    g.op++;
  }

  g.points.push(who);

  hitSound();

  updateLive();

  announceSituation();

  if(finished(g)){

    setTimeout(()=>{

      if(current && current.game === g){
        endGame(true);
      }

    },700);
  }
}


/* =========================
   GAME / MATCH POINT 判定
========================= */

/*
  ここが今回の重要部分。

  target = 21 の場合
    20-19 → Game Point
    20-20 → Deuce
    21-20 → Game Point
    21-21 → Deuce
    22-21 → Game Point
    23-21 → 終了

  target = 15 の場合
    14-13 → Game Point
    14-14 → Deuce
    15-14 → Game Point
    15-15 → Deuce
    16-15 → Game Point
    17-15 → 終了

  つまり「目標点の1点前」から
  Game Point を判定する。
*/

function getSituation(){

  if(!current) return "";

  const g = current.game;

  const t =
    Number(current.target) || 21;

  const me = g.me;
  const op = g.op;

  /*
    同点で、両方とも目標点以上ならDeuce。
  */
  if(
    me === op &&
    me >= t
  ){
    return "Deuce";
  }

  /*
    マッチポイント判定用。
    先に「ゲームポイント状態」か確認する。
  */
  const need =
    Math.floor(
      current.gamesMax / 2
    ) + 1;

  const myGames =
    current.games.filter(
      x => x.winner === "me"
    ).length;

  const opGames =
    current.games.filter(
      x => x.winner === "op"
    ).length;

  /*
    目標点の1点前以上、
    かつ相手より1点以上リードしていたら
    Game Point。
  */
  const meGamePoint =
    me >= t - 1 &&
    me > op;

  const opGamePoint =
    op >= t - 1 &&
    op > me;

  /*
    マッチポイントは
    「次のゲームポイントを取れば
    試合に勝てる」状態。
  */

  if(
    myGames === need - 1 &&
    meGamePoint
  ){
    return "Match point";
  }

  if(
    opGames === need - 1 &&
    opGamePoint
  ){
    return "Match point";
  }

  /*
    マッチポイントではない場合は
    Game Point。
  */

  if(meGamePoint){
    return "Game point";
  }

  if(opGamePoint){
    return "Game point";
  }

  return "";
}


/* =========================
   STATUS
========================= */

function announceSituation(){

  if(!current) return;

  const message =
    getSituation();

  if($("statusMessage")){
    $("statusMessage").textContent =
      message;
  }

  /*
    同じ状態で何回も喋らせない。

    例：
    20-19 → Game point
    21-19 → Game point
    のように状態が続いている場合、
    毎回音声を繰り返さない。

    20-20 → Deuce
    21-20 → Game point
    のように状態が変わったら喋る。
  */

  if(message !== lastAnnouncement){

    lastAnnouncement = message;

    if(message){
      speak(message);
    }

  }
}


/* =========================
   FINISH RULE
========================= */

function finished(g){

  const t =
    Number(current.target) || 21;

  /*
    バドミントンの通常のゲーム終了条件。

    まず目標点以上になっていること。
    そして2点差がついたら終了。

    例：
    21-20 → まだ終了しない
    22-20 → 終了

    15点でも同じ。
    15-14 → まだ
    16-14 → 終了
  */

  if(
    g.me >= t &&
    g.me - g.op >= 2
  ){
    return true;
  }

  if(
    g.op >= t &&
    g.op - g.me >= 2
  ){
    return true;
  }

  /*
    30点到達時は終了。
  */
  if(g.me >= 30 || g.op >= 30){
    return true;
  }

  return false;
}


/* =========================
   END GAME
========================= */

function endGame(force=false){

  if(!current) return;

  const g = current.game;

  if(!g.points.length){
    toast("得点を入れてください");
    return;
  }

  if(
    !force &&
    !finished(g) &&
    !confirm(
      "このゲームを現在の得点で終了しますか？"
    )
  ){
    return;
  }

  const winner =
    g.me > g.op
      ? "me"
      : g.op > g.me
      ? "op"
      : "draw";

  current.games.push({

    number:
      current.games.length + 1,

    me:
      g.me,

    op:
      g.op,

    points:
      [...g.points],

    winner
  });

  const need =
    Math.floor(
      current.gamesMax / 2
    ) + 1;

  const m =
    current.games.filter(
      g => g.winner === "me"
    ).length;

  const o =
    current.games.filter(
      g => g.winner === "op"
    ).length;

  /*
    マッチ終了判定
  */

  if(
    m >= need ||
    o >= need ||
    current.games.length >= current.gamesMax
  ){

    finishMatch();
    return;
  }

  /*
    次のゲームへ
  */

  current.game = makeGame();

  lastAnnouncement = "";

  $("statusMessage").textContent = "";

  updateLive();

  toast(
    `第${current.games.length + 1}ゲーム開始`
  );
}


/* =========================
   UNDO
========================= */

function undo(){

  const g = current?.game;

  if(!g?.points.length){
    toast("取り消せる得点がありません");
    return;
  }

  g.points.pop();

  g.me =
    g.points.filter(
      x => x === "me"
    ).length;

  g.op =
    g.points.filter(
      x => x === "op"
    ).length;

  /*
    得点を戻したので、
    状況アナウンスも現在の状態に合わせる。
  */
  lastAnnouncement = "";

  $("statusMessage").textContent = "";

  updateLive();

  announceSituation();
}


/* =========================
   LIVE UPDATE
========================= */

function updateLive(){

  if(!current) return;

  const g = current.game;

  const gn =
    current.games.length + 1;

  const m =
    current.games.filter(
      x => x.winner === "me"
    ).length;

  const o =
    current.games.filter(
      x => x.winner === "op"
    ).length;

  if($("gameTitle")){
    $("gameTitle").textContent =
      `第${gn}ゲーム`;
  }

  if($("gameSub")){
    $("gameSub").textContent =
      `GAME ${gn}`;
  }

  if($("liveType")){
    $("liveType").textContent =
      current.type;
  }

  if($("liveRule")){
    $("liveRule").textContent =
      `${current.target}点`;
  }

  if($("matchGamesScore")){
    $("matchGamesScore").textContent =
      `${m}-${o}`;
  }

  if($("opLabel")){
    $("opLabel").textContent =
      current.opLabel;
  }

  if($("meLabel")){
    $("meLabel").textContent =
      current.meLabel;
  }

  if($("opNameLive")){
    $("opNameLive").textContent =
      current.opName;
  }

  if($("meNameLive")){
    $("meNameLive").textContent =
      current.meName;
  }

  if($("opScore")){
    $("opScore").textContent =
      g.op;
  }

  if($("meScore")){
    $("meScore").textContent =
      g.me;
  }

  if($("gameScore")){
    $("gameScore").textContent =
      `${m} - ${o}`;
  }

  if($("nowScore")){
    $("nowScore").textContent =
      `${g.op} - ${g.me}`;
  }

  if($("rallyCount")){
    $("rallyCount").textContent =
      `${g.points.length}回`;
  }

  renderTable();
}


/* =========================
   TABLE
========================= */

function renderTable(){

  if(!$("scoreTable") || !current) return;

  const p =
    current.game.points;

  const head =
    `<thead><tr>
      <th></th>

      ${p.map((_,i)=>
        `<th>${i+1}</th>`
      ).join("")}

    </tr></thead>`;

  const op =
    `<tr>

      <th class="op">
        🔴 相手
      </th>

      ${
        p.map((x,i)=>

          x === "op"

            ? `<td class="op">${
                p.slice(0,i+1)
                .filter(
                  y => y === "op"
                ).length
              }</td>`

            : `<td></td>`

        ).join("")
      }

    </tr>`;

  const me =
    `<tr>

      <th class="me">
        🔵 自分
      </th>

      ${
        p.map((x,i)=>

          x === "me"

            ? `<td class="me">${
                p.slice(0,i+1)
                .filter(
                  y => y === "me"
                ).length
              }</td>`

            : `<td></td>`

        ).join("")
      }

    </tr>`;

  $("scoreTable").className =
    "score-table";

  $("scoreTable").innerHTML =
    head +
    "<tbody>" +
    op +
    me +
    "</tbody>";
}


/* =========================
   MATCH FINISH
========================= */

function finishMatch(){

  const m =
    current.games.filter(
      g => g.winner === "me"
    ).length;

  const o =
    current.games.filter(
      g => g.winner === "op"
    ).length;

  current.gameScore =
    `${o} - ${m}`;

  current.result =
    m > o
      ? "win"
      : "loss";

  /*
    最後だけ英語で読み上げ。
    ゲーム途中の通常得点は読み上げない。
  */

  setTimeout(()=>{

    speak("Game");

  },200);

  renderResult();

  page("result");
}


/* =========================
   RESULT
========================= */

function renderResult(){

  $("resultTop").innerHTML = `

    <div class="result-box">

      <div class="result ${
        current.result === "win"
          ? "blue"
          : "red"
      }">

        ${
          current.result === "win"
            ? "🏆 WIN"
            : "● LOSS"
        }

      </div>

      <div class="score">
        ${esc(current.gameScore)}
      </div>

      <b>
        🔴 ${esc(current.opName)}
        　
        VS
        　
        🔵 ${esc(current.meName)}
      </b>

      <p>
        ${esc(current.date)}
        ・
        ${esc(current.weather)}
      </p>

      <p>
        🗂️ ${esc(current.folder || "練習")}
      </p>

    </div>
  `;

  $("resultGames").innerHTML =
    current.games.map(g => `

      <div class="game-row">

        <span>
          第${g.number}ゲーム
        </span>

        <strong>
          ${g.op} - ${g.me}
        </strong>

      </div>

    `).join("");

  document
    .querySelectorAll(".tag")
    .forEach(x =>
      x.classList.remove("selected")
    );

  $("improve").value = "";
  $("memo").value = "";
}


/* =========================
   SAVE MATCH
========================= */

function saveMatch(){

  current.good =
    [...document.querySelectorAll(
      ".tag.selected"
    )].map(
      x => x.dataset.tag
    );

  current.improve =
    $("improve").value;

  current.memo =
    $("memo").value;

  delete current.game;

  delete current.spokenGameStart;

  matches.push(current);

  save();

  current = null;

  toast("保存しました");

  setTimeout(()=>{
    page("home");
  },250);
}


/* =========================
   MATCH LIST
========================= */

function list(){

  const q =
    $("search").value.toLowerCase();

  const a =
    [...matches]
      .sort(
        (x,y) =>
          y.createdAt - x.createdAt
      )
      .filter(m =>
        [
          m.event,
          m.opName,
          m.meName,
          m.place,
          m.date,
          m.folder
        ]
        .join(" ")
        .toLowerCase()
        .includes(q)
      );

  $("matchList").innerHTML =
    a.length
      ? a.map(item).join("")
      : `<div class="empty">
          試合がありません
        </div>`;
}


/* =========================
   DETAIL
========================= */

function detail(id){

  const m =
    matches.find(
      x => x.id === id
    );

  if(!m) return;

  lastDetailId = id;

  $("detailBody").innerHTML = `

    <div class="result-box">

      <div class="result ${
        m.result === "win"
          ? "blue"
          : "red"
      }">

        ${
          m.result === "win"
            ? "🏆 WIN"
            : "● LOSS"
        }

      </div>

      <div class="score">
        ${esc(m.gameScore)}
      </div>

      <b>
        🔴 ${esc(m.opName)}
        　
        VS
        　
        🔵 ${esc(m.meName)}
      </b>

    </div>

    <div class="card detail-meta">

      日付：${esc(m.date)}<br>
      フォルダ：${esc(m.folder || "練習")}<br>
      種目：${esc(m.type)}<br>
      大会：${esc(m.event || "-")}<br>
      場所：${esc(m.place || "-")}<br>
      天気：${esc(m.weather)}

    </div>

    ${
      m.games
        .map(g => gameDetail(m,g))
        .join("")
    }

    <div class="card">

      <h3>⭐ 良かったところ</h3>

      <p>
        ${
          esc(
            (m.good || []).join(" ・ ")
            || "なし"
          )
        }
      </p>

      <h3>🔧 改善点</h3>

      <p>
        ${esc(m.improve || "なし")}
      </p>

      <h3>📝 メモ</h3>

      <p>
        ${esc(m.memo || "なし")}
      </p>

      <button
        class="sub-btn"
        id="editNotes"
      >
        ✏️ メモ・改善点を編集
      </button>

      <div
        id="editNotesArea"
        style="display:none;margin-top:12px"
      >

        <label>
          ⭐ 良かったところ
        </label>

        <div
          class="tags"
          id="detailTags"
        >

          ${[
            "サーブ",
            "レシーブ",
            "スマッシュ",
            "クリア",
            "ドロップ",
            "ラリー",
            "フットワーク",
            "集中力"
          ].map(x=>`
            <button
              class="tag"
              data-tag="${x}"
            >
              ${x}
            </button>
          `).join("")}

        </div>

        <label>
          🔧 改善したいところ

          <textarea
            id="detailImprove"
            rows="4"
          >${esc(m.improve || "")}</textarea>

        </label>

        <label>
          📝 メモ

          <textarea
            id="detailMemo"
            rows="4"
          >${esc(m.memo || "")}</textarea>

        </label>

        <button
          class="main-btn"
          id="saveNotes"
        >
          💾 変更を保存
        </button>

      </div>

    </div>

    <button
      class="danger"
      id="deleteMatch"
    >
      🗑️ この試合を削除
    </button>
  `;


  $("editNotes").onclick = ()=>{

    $("editNotesArea").style.display =
      "block";

    document
      .querySelectorAll(
        "#detailTags .tag"
      )
      .forEach(t=>{

        t.classList.toggle(
          "selected",
          (m.good || [])
            .includes(t.dataset.tag)
        );

        t.onclick = () =>
          t.classList.toggle(
            "selected"
          );
      });

    $("editNotesArea")
      .scrollIntoView({
        behavior:"smooth",
        block:"center"
      });
  };


  $("saveNotes").onclick = ()=>{

    const found =
      matches.find(
        x => x.id === id
      );

    if(!found) return;

    found.good =
      [
        ...document.querySelectorAll(
          "#detailTags .tag.selected"
        )
      ].map(
        t => t.dataset.tag
      );

    found.improve =
      $("detailImprove").value;

    found.memo =
      $("detailMemo").value;

    save();

    toast(
      "メモ・改善点を更新しました"
    );

    detail(id);
  };


  $("deleteMatch").onclick = ()=>{

    if(
      confirm(
        "この試合を削除しますか？"
      )
    ){

      matches =
        matches.filter(
          x => x.id !== id
        );

      save();

      page("matches");

      toast("削除しました");
    }

  };


  page("detail");
}


/* =========================
   GAME DETAIL
========================= */

function gameDetail(m,g){

  const head =
    `<thead>
      <tr>
        <th></th>

        ${
          g.points.map((_,i)=>
            `<th>${i+1}</th>`
          ).join("")
        }

      </tr>
    </thead>`;

  const op =
    `<tr>

      <th class="op">
        🔴 相手
      </th>

      ${
        g.points.map((x,i)=>

          x === "op"

            ? `<td class="op">${
                g.points
                  .slice(0,i+1)
                  .filter(
                    y => y === "op"
                  ).length
              }</td>`

            : "<td></td>"

        ).join("")
      }

    </tr>`;

  const me =
    `<tr>

      <th class="me">
        🔵 自分
      </th>

      ${
        g.points.map((x,i)=>

          x === "me"

            ? `<td class="me">${
                g.points
                  .slice(0,i+1)
                  .filter(
                    y => y === "me"
                  ).length
              }</td>`

            : "<td></td>"

        ).join("")
      }

    </tr>`;

  return `

    <div class="card detail-game">

      <h2>
        第${g.number}ゲーム
        　
        ${g.op} - ${g.me}
      </h2>

      <div class="score-scroll">

        <table class="score-table">

          ${head}

          <tbody>
            ${op}
            ${me}
          </tbody>

        </table>

      </div>

    </div>

  `;
}


/* =========================
   STATS
========================= */

function stats(){

  const w =
    matches.filter(
      x => x.result === "win"
    ).length;

  const l =
    matches.length - w;

  $("sMatches").textContent =
    matches.length;

  $("sWins").textContent = w;

  $("sLosses").textContent = l;

  $("sRate").textContent =
    `${
      matches.length
        ? Math.round(
            w / matches.length * 100
          )
        : 0
    }%`;


  const a =
    [...matches]
      .sort(
        (x,y) =>
          x.createdAt - y.createdAt
      )
      .slice(-15);

  $("chart").innerHTML =
    a.length
      ? `
        <div class="chart-bars">

          ${a.map(x=>`

            <div class="bar ${
              x.result === "win"
                ? "win"
                : "loss"
            }">

              ${
                x.result === "win"
                  ? "○"
                  : "×"
              }

            </div>

          `).join("")}

        </div>
      `
      : `
        <div class="empty">
          まだありません
        </div>
      `;


  let c = {};

  matches.forEach(m =>
    (m.good || []).forEach(x =>
      c[x] = (c[x] || 0) + 1
    )
  );

  $("goodStats").innerHTML =
    Object.entries(c)
      .sort(
        (a,b) => b[1] - a[1]
      )
      .map(x=>
        `<p>
          <b>${esc(x[0])}</b>
          　
          ${x[1]}回
        </p>`
      )
      .join("")
      ||
      `<div class="empty">
        まだありません
      </div>`;


  /* フォルダ別 */

  $("folderStats").innerHTML =
    folders.map(folder=>{

      const a =
        matches.filter(
          m =>
            (m.folder || "練習")
            === folder
        );

      const wins =
        a.filter(
          m => m.result === "win"
        ).length;

      const rate =
        a.length
          ? Math.round(
              wins / a.length * 100
            )
          : 0;

      return `

        <div class="game-row">

          <span>
            🗂️ ${esc(folder)}

            <small>
              ${a.length}試合
            </small>

          </span>

          <strong>
            ${rate}%
          </strong>

        </div>

      `;

    }).join("");
}


/* =========================
   SETTINGS
========================= */

function settingsForm(){

  if(!$("settingName")) return;

  $("settingName").value =
    settings.playerName || "";

  $("settingGames").value =
    settings.games;

  $("settingTarget").value =
    settings.target;

  $("soundEnabled").checked =
    settings.soundEnabled !== false;

  $("soundVolume").value =
    settings.volume ?? 70;

  $("volumeValue").textContent =
    `${settings.volume ?? 70}%`;
}


/* =========================
   BACKUP
========================= */

function backup(){

  const b =
    new Blob(
      [
        JSON.stringify(
          {
            settings,
            matches,
            folders
          },
          null,
          2
        )
      ],
      {
        type:"application/json"
      }
    );

  const u =
    URL.createObjectURL(b);

  const a =
    document.createElement("a");

  a.href = u;

  a.download =
    `badminton-backup-${today()}.json`;

  a.click();

  URL.revokeObjectURL(u);
}


/* =========================
   EVENTS
========================= */

function setupEvents(){

  $("newMatchBtn").onclick =
    newMatch;

  $("allMatchesBtn").onclick =
    ()=>page("matches");

  $("settingsBtn").onclick =
    ()=>page("settings");

  $("startBtn").onclick =
    start;


  /* ＋1 */

  $("opPoint").onclick =
    ()=>point("op");

  $("mePoint").onclick =
    ()=>point("me");


  /* 得点そのものをタップ */

  $("opScoreArea").onclick =
    ()=>point("op");

  $("meScoreArea").onclick =
    ()=>point("me");


  $("undoBtn").onclick =
    undo;

  $("finishGame").onclick =
    ()=>endGame(false);


  $("quitLive").onclick = ()=>{

    if(
      confirm(
        "試合を終了して保存せず戻りますか？"
      )
    ){

      current = null;
      lastAnnouncement = "";
      pointLocked = false;

      page("home");
    }

  };


  $("saveBtn").onclick =
    saveMatch;


  $("search").oninput =
    list;


  /* 良かったところ */

  document
    .querySelectorAll(
      "#result .tag"
    )
    .forEach(x =>
      x.onclick =
        ()=>x.classList.toggle(
          "selected"
        )
    );


  $("detailBack").onclick =
    ()=>page("matches");


  /* 設定保存 */

  $("saveSettings").onclick = ()=>{

    settings.playerName =
      $("settingName")
        .value
        .trim();

    settings.games =
      +$("settingGames").value;

    settings.target =
      +$("settingTarget").value;

    save();

    toast("設定を保存しました");
  };


  /* 音声 */

  $("soundEnabled").onchange = ()=>{

    settings.soundEnabled =
      $("soundEnabled").checked;

    if(!settings.soundEnabled){

      if("speechSynthesis" in window){
        window.speechSynthesis.cancel();
      }

    }

    save();
  };


  $("soundVolume").oninput = ()=>{

    settings.volume =
      +$("soundVolume").value;

    $("volumeValue").textContent =
      `${settings.volume}%`;

    save();
  };


  $("testSound").onclick = ()=>{

    unlockAudio();

    hitSound();

    setTimeout(()=>{

      speak("Love all, play");

    },100);

  };


  /* フォルダ */

  $("manageFoldersBtn").onclick =
    ()=>page("folders");

  $("folderBack").onclick =
    ()=>page("setup");

  $("addFolder").onclick =
    addFolder;


  /* バックアップ */

  $("export").onclick =
    backup;


  $("import").onchange = e=>{

    const f =
      e.target.files[0];

    if(!f) return;

    const r =
      new FileReader();

    r.onload = ()=>{

      try{

        const d =
          JSON.parse(r.result);

        if(!Array.isArray(d.matches)){
          throw 0;
        }

        if(
          !confirm(
            "現在のデータを置き換えますか？"
          )
        ){
          return;
        }

        matches =
          d.matches;

        settings = {
          ...settings,
          ...(d.settings || {})
        };

        folders =
          Array.isArray(d.folders)
            ? d.folders
            : ["練習"];

        if(!folders.includes("練習")){
          folders.unshift("練習");
        }

        save();

        home();

        toast("復元しました");

      }catch{

        alert(
          "読み込めないファイルです"
        );

      }

    };

    r.readAsText(f);
  };


  /* 全削除 */

  $("clear").onclick = ()=>{

    if(
      confirm(
        "全データを削除しますか？"
      )
    ){

      matches = [];

      save();

      home();

      toast("削除しました");
    }

  };


  /* ホームへ */

  document
    .querySelectorAll(
      ".back-home"
    )
    .forEach(x =>
      x.onclick =
        ()=>page("home")
    );


  /* ナビ */

  document
    .querySelectorAll(
      ".nav button"
    )
    .forEach(x =>
      x.onclick =
        ()=>page(x.dataset.page)
    );


  /* 試合クリック */

  document.addEventListener(
    "click",
    e=>{

      const x =
        e.target.closest(
          "[data-id]"
        );

      if(x){
        detail(
          x.dataset.id
        );
      }


      /* フォルダ削除 */

      const del =
        e.target.closest(
          "[data-delete-folder]"
        );

      if(del){

        const folder =
          del.dataset.deleteFolder;

        const count =
          matches.filter(
            m =>
              (m.folder || "練習")
              === folder
          ).length;

        if(
          !confirm(
            `${folder} を削除しますか？\n` +
            `${count}試合の記録は削除されません。`
          )
        ){
          return;
        }

        folders =
          folders.filter(
            f => f !== folder
          );

        save();

        renderFolders();

        renderFolderSelect();

        toast("フォルダを削除しました");
      }


      /* フォルダをタップ */

      const folderBtn =
        e.target.closest(
          "[data-folder]"
        );

      if(
        folderBtn &&
        !e.target.closest(
          "[data-delete-folder]"
        )
      ){

        const folder =
          folderBtn.dataset.folder;

        page("matches");

        $("search").value =
          folder;

        list();
      }

    }
  );
}


/* =========================
   起動
========================= */

document.addEventListener(
  "DOMContentLoaded",
  ()=>{

    /* 既存データにフォルダがない場合 */

    if(!Array.isArray(folders)){
      folders = ["練習"];
    }

    if(!folders.includes("練習")){
      folders.unshift("練習");
    }

    $("date").value =
      today();

    renderFolderSelect();

    settingsForm();

    setupEvents();

    home();

  }
);