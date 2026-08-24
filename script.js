const MATCH_KEY = "badminton_matches_v7";
const SET_KEY = "badminton_settings_v7";
const FOLDER_KEY = "badminton_folders_v7";

let matches = load(MATCH_KEY, []);

let settings = {
  playerName: "",
  games: 3,
  target: 21,
  ...load(SET_KEY, {})
};

let folders = load(FOLDER_KEY, []);

if (!folders.length) {
  folders = [
    {
      id: "default",
      name: "すべて"
    }
  ];
}

let current = null;

let lastPointTime = 0;

const $ = id => document.getElementById(id);

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function save() {
  localStorage.setItem(MATCH_KEY, JSON.stringify(matches));
  localStorage.setItem(SET_KEY, JSON.stringify(settings));
  localStorage.setItem(FOLDER_KEY, JSON.stringify(folders));
}

function today() {
  const d = new Date();

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function esc(x) {
  return String(x ?? "").replace(
    /[&<>"']/g,
    c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c])
  );
}

function toast(text) {
  const e = $("toast");

  e.textContent = text;
  e.classList.add("show");

  setTimeout(() => {
    e.classList.remove("show");
  }, 1300);
}


/* =========================
   効果音
========================= */

let audioContext = null;

function racketSound() {

  try {

    if (!audioContext) {
      audioContext = new (
        window.AudioContext ||
        window.webkitAudioContext
      )();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const now = audioContext.currentTime;

    // ラケットに当たる「カッ」という音
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.07);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.32, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(now);
    osc.stop(now + 0.1);

  } catch (e) {
    // 音が使えない環境でも得点処理は続ける
  }
}


/* =========================
   ページ
========================= */

function page(id) {

  document.querySelectorAll(".page")
    .forEach(x => x.classList.toggle("active", x.id === id));

  document.querySelectorAll(".nav button")
    .forEach(x => x.classList.toggle("active", x.dataset.page === id));

  document.body.classList.toggle("live-mode", id === "live");

  window.scrollTo(0, 0);

  if (id === "home") home();
  if (id === "matches") list();
  if (id === "stats") stats();
  if (id === "settings") settingsForm();
}


/* =========================
   ホーム
========================= */

function home() {

  const w = matches.filter(x => x.result === "win").length;
  const l = matches.filter(x => x.result === "loss").length;

  $("wins").textContent = w;
  $("losses").textContent = l;

  $("rate").textContent =
    `勝率 ${matches.length ? Math.round(w / matches.length * 100) : 0}%`;

  const recent = [...matches]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  $("recentMatches").innerHTML =
    recent.length
      ? recent.map(item).join("")
      : `<div class="empty">まだ試合がありません🏸</div>`;
}


/* =========================
   試合カード
========================= */

function item(m) {

  const folder = folders.find(f => f.id === m.folderId);

  return `
    <button class="match-item" data-id="${esc(m.id)}">

      <span>

        <strong>
          ${esc(m.event || "試合")}
        </strong>

        <small>
          ${esc(folder?.name || "未分類")}
          ・
          ${esc(m.date)}
          ・
          ${esc(m.opName || "相手")} vs
          ${esc(m.meName || "自分")}
        </small>

      </span>

      <span class="match-result ${m.result === "win" ? "blue" : "red"}">

        ${esc(m.gameScore)}

        <small>
          ${m.result === "win" ? "WIN" : "LOSS"}
        </small>

      </span>

    </button>
  `;
}


/* =========================
   フォルダ
========================= */

function renderFolderSelect() {

  const select = $("folderSelect");

  const customFolders = folders.filter(f => f.id !== "default");

  select.innerHTML =
    `<option value="default">未分類</option>` +
    customFolders.map(f =>
      `<option value="${esc(f.id)}">${esc(f.name)}</option>`
    ).join("");
}


function renderFolderTabs(selected = "all") {

  $("folderTabs").innerHTML = `
    <button class="folder-tab ${selected === "all" ? "selected" : ""}" data-folder="all">
      すべて
    </button>

    ${folders
      .filter(f => f.id !== "default")
      .map(f => `
        <button
          class="folder-tab ${selected === f.id ? "selected" : ""}"
          data-folder="${esc(f.id)}">
          📁 ${esc(f.name)}
        </button>
      `)
      .join("")}
  `;

  document.querySelectorAll(".folder-tab").forEach(btn => {

    btn.onclick = () => {

      renderFolderTabs(btn.dataset.folder);

      list(btn.dataset.folder);

    };

  });
}


function renderFolderManage() {

  const customFolders = folders.filter(f => f.id !== "default");

  $("folderManage").innerHTML =
    customFolders.length
      ? customFolders.map(f => {

          const count = matches.filter(
            m => m.folderId === f.id
          ).length;

          return `
            <div class="folder-row">

              <span>
                📁 <b>${esc(f.name)}</b>
                <small>${count}試合</small>
              </span>

              <button
                class="folder-delete"
                data-folder-delete="${esc(f.id)}">
                🗑️
              </button>

            </div>
          `;

        }).join("")
      : `<div class="empty small-empty">
           まだフォルダはありません
         </div>`;

  document.querySelectorAll("[data-folder-delete]").forEach(btn => {

    btn.onclick = () => {

      const id = btn.dataset.folderDelete;

      const folder = folders.find(f => f.id === id);

      if (!folder) return;

      if (
        !confirm(
          `「${folder.name}」を削除しますか？\n\n試合データは削除されません。未分類になります。`
        )
      ) return;

      matches.forEach(m => {

        if (m.folderId === id) {
          m.folderId = "default";
        }

      });

      folders = folders.filter(f => f.id !== id);

      save();

      renderFolderManage();
      renderFolderSelect();

      toast("フォルダを削除しました");

    };

  });
}


function addFolder() {

  const name = $("newFolderName").value.trim();

  if (!name) {
    toast("フォルダ名を入力してください");
    return;
  }

  if (
    folders.some(
      f => f.name.toLowerCase() === name.toLowerCase()
    )
  ) {
    toast("同じ名前のフォルダがあります");
    return;
  }

  folders.push({
    id: "folder_" + Date.now(),
    name
  });

  $("newFolderName").value = "";

  save();

  renderFolderManage();
  renderFolderSelect();

  toast("フォルダを追加しました");
}


/* =========================
   新しい試合
========================= */

function newMatch() {

  $("date").value = today();

  $("games").value = settings.games;
  $("target").value = settings.target;

  $("meName").value = settings.playerName;

  $("opName").value = "";
  $("event").value = "";
  $("place").value = "";

  renderFolderSelect();

  $("folderSelect").value = "default";

  page("setup");
}


/* =========================
   試合開始
========================= */

function start() {

  current = {

    id: String(Date.now()),

    createdAt: Date.now(),

    folderId: $("folderSelect").value,

    date: $("date").value || today(),

    type: $("type").value,

    gamesMax: +$("games").value,

    target: +$("target").value,

    meName:
      $("meName").value.trim() || "自分",

    opName:
      $("opName").value.trim() || "相手",

    meLabel:
      $("meSide").value + " " + $("meSR").value,

    opLabel:
      $("opSide").value + " " + $("opSR").value,

    event:
      $("event").value.trim(),

    place:
      $("place").value.trim(),

    weather:
      $("weather").value,

    games: [],

    game: makeGame()

  };

  updateLive();

  page("live");

  toast("試合開始！");
}


function makeGame() {

  return {
    me: 0,
    op: 0,
    points: []
  };

}


/* =========================
   得点
========================= */

function point(who) {

  if (!current) return;

  const now = Date.now();

  /*
    ここが連打防止。
    250ms以内の連続タップは無視。
  */
  if (now - lastPointTime < 250) {
    return;
  }

  lastPointTime = now;

  const g = current.game;

  if (who === "me") {
    g.me++;
  } else {
    g.op++;
  }

  g.points.push(who);

  racketSound();

  updateLive();

  if (finished(g)) {

    setTimeout(() => {

      if (current && current.game === g) {
        endGame(true);
      }

    }, 300);

  }

}


function finished(g) {

  const t = current.target;

  return (
    g.me >= 30 ||
    g.op >= 30 ||
    (g.me >= t && g.me - g.op >= 2) ||
    (g.op >= t && g.op - g.me >= 2)
  );

}


/* =========================
   ゲーム終了
========================= */

function endGame(force = false) {

  const g = current.game;

  if (!g.points.length) {

    toast("得点を入れてください");

    return;

  }

  if (
    !force &&
    !finished(g) &&
    !confirm("このゲームを現在の得点で終了しますか？")
  ) {
    return;
  }

  current.games.push({

    number:
      current.games.length + 1,

    me: g.me,

    op: g.op,

    points: [...g.points],

    winner:
      g.me > g.op
        ? "me"
        : g.op > g.me
          ? "op"
          : "draw"

  });

  const need =
    Math.floor(current.gamesMax / 2) + 1;

  const m =
    current.games.filter(g => g.winner === "me").length;

  const o =
    current.games.filter(g => g.winner === "op").length;

  if (
    m >= need ||
    o >= need ||
    current.games.length >= current.gamesMax
  ) {

    finishMatch();

    return;

  }

  current.game = makeGame();

  updateLive();

  toast(`第${current.games.length + 1}ゲーム開始`);

}


/* =========================
   取り消し
========================= */

function undo() {

  const g = current?.game;

  if (!g?.points.length) {

    toast("取り消せる得点がありません");

    return;

  }

  g.points.pop();

  g.me =
    g.points.filter(x => x === "me").length;

  g.op =
    g.points.filter(x => x === "op").length;

  updateLive();

  toast("1点取り消しました");

}


/* =========================
   試合中画面
========================= */

function updateLive() {

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

  const folder =
    folders.find(f => f.id === current.folderId);

  $("gameTitle").textContent =
    `第${gn}ゲーム`;

  $("gameSub").textContent =
    `GAME ${gn}`;

  $("liveFolder").textContent =
    folder?.name || "未分類";

  $("liveType").textContent =
    current.type;

  $("liveRule").textContent =
    `${current.target}点`;

  $("matchGamesScore").textContent =
    `${m}-${o}`;

  $("opLabel").textContent =
    current.opLabel;

  $("meLabel").textContent =
    current.meLabel;

  $("opNameLive").textContent =
    current.opName;

  $("meNameLive").textContent =
    current.meName;

  $("opScore").textContent =
    g.op;

  $("meScore").textContent =
    g.me;

  $("gameScore").textContent =
    `${m} - ${o}`;

  $("nowScore").textContent =
    `${g.op} - ${g.me}`;

  $("rallyCount").textContent =
    `${g.points.length}回`;

  renderTable();

}


/* =========================
   得点表
========================= */

function renderTable() {

  const p =
    current.game.points;

  const head =
    `<thead>
      <tr>
        <th></th>
        ${p.map((_, i) => `<th>${i + 1}</th>`).join("")}
      </tr>
    </thead>`;

  const op =
    `<tr>
      <th class="op">🔴 相手</th>
      ${
        p.map((x, i) =>
          x === "op"
            ? `<td class="op">
                ${p.slice(0, i + 1)
                  .filter(y => y === "op").length}
              </td>`
            : `<td></td>`
        ).join("")
      }
    </tr>`;

  const me =
    `<tr>
      <th class="me">🔵 自分</th>
      ${
        p.map((x, i) =>
          x === "me"
            ? `<td class="me">
                ${p.slice(0, i + 1)
                  .filter(y => y === "me").length}
              </td>`
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
   試合終了
========================= */

function finishMatch() {

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
    m > o ? "win" : "loss";

  renderResult();

  page("result");

}


function renderResult() {

  $("resultTop").innerHTML = `

    <div class="result-box">

      <div class="result ${current.result === "win" ? "blue" : "red"}">

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
    .forEach(x => x.classList.remove("selected"));

  $("improve").value = "";
  $("memo").value = "";

}


/* =========================
   保存
========================= */

function saveMatch() {

  current.good =
    [...document.querySelectorAll(".tag.selected")]
      .map(x => x.dataset.tag);

  current.improve =
    $("improve").value;

  current.memo =
    $("memo").value;

  delete current.game;

  matches.push(current);

  save();

  current = null;

  toast("保存しました");

  setTimeout(
    () => page("home"),
    250
  );

}


/* =========================
   試合一覧
========================= */

let selectedFolder = "all";

function list(folder = selectedFolder) {

  selectedFolder = folder;

  renderFolderTabs(folder);

  const q =
    $("search").value.toLowerCase();

  let a =
    [...matches]
      .sort(
        (x, y) =>
          y.createdAt - x.createdAt
      );

  if (folder !== "all") {

    a =
      a.filter(
        m => m.folderId === folder
      );

  }

  a =
    a.filter(m =>
      [
        m.event,
        m.opName,
        m.meName,
        m.place,
        m.date
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
   詳細
========================= */

function detail(id) {

  const m =
    matches.find(x => x.id === id);

  if (!m) return;

  const folder =
    folders.find(f => f.id === m.folderId);

  $("detailBody").innerHTML = `

    <div class="result-box">

      <div class="result ${m.result === "win" ? "blue" : "red"}">

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

      📁 フォルダ：
      ${esc(folder?.name || "未分類")}
      <br>

      日付：
      ${esc(m.date)}
      <br>

      種目：
      ${esc(m.type)}
      <br>

      大会：
      ${esc(m.event || "-")}
      <br>

      場所：
      ${esc(m.place || "-")}
      <br>

      天気：
      ${esc(m.weather)}

    </div>

    ${
      m.games
        .map(g => gameDetail(m, g))
        .join("")
    }

    <div class="card">

      <h3>⭐ 良かったところ</h3>

      <p>
        ${esc(
          (m.good || []).join(" ・ ")
          || "なし"
        )}
      </p>

      <h3>🔧 改善点</h3>

      <p>
        ${esc(m.improve || "なし")}
      </p>

      <h3>📝 メモ</h3>

      <p>
        ${esc(m.memo || "なし")}
      </p>

      <button class="sub-btn" id="editNotes">
        ✏️ メモ・改善点を編集
      </button>

      <div
        id="editNotesArea"
        style="display:none;margin-top:12px"
      >

        <label>
          ⭐ 良かったところ
        </label>

        <div class="tags" id="detailTags">

          ${[
            "サーブ",
            "レシーブ",
            "スマッシュ",
            "クリア",
            "ドロップ",
            "ラリー",
            "フットワーク",
            "集中力"
          ].map(tag => `
            <button
              class="tag"
              data-tag="${tag}">
              ${tag}
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
          id="saveNotes">
          💾 変更を保存
        </button>

      </div>

    </div>

    <button
      class="danger"
      id="deleteMatch">
      🗑️ この試合を削除
    </button>
  `;


  $("editNotes").onclick = () => {

    $("editNotesArea").style.display =
      "block";

    document
      .querySelectorAll("#detailTags .tag")
      .forEach(t => {

        t.classList.toggle(
          "selected",
          (m.good || []).includes(
            t.dataset.tag
          )
        );

        t.onclick = () =>
          t.classList.toggle(
            "selected"
          );

      });

  };


  $("saveNotes").onclick = () => {

    const found =
      matches.find(x => x.id === id);

    if (!found) return;

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


  $("deleteMatch").onclick = () => {

    if (
      !confirm(
        "この試合を削除しますか？"
      )
    ) return;

    matches =
      matches.filter(
        x => x.id !== id
      );

    save();

    page("matches");

    toast("削除しました");

  };


  page("detail");

}


function gameDetail(m, g) {

  const head =
    `<thead>
      <tr>
        <th></th>
        ${
          g.points.map(
            (_, i) =>
              `<th>${i + 1}</th>`
          ).join("")
        }
      </tr>
    </thead>`;

  const op =
    `<tr>
      <th class="op">🔴 相手</th>
      ${
        g.points.map((x, i) =>
          x === "op"
            ? `<td class="op">
                ${
                  g.points
                    .slice(0, i + 1)
                    .filter(y => y === "op")
                    .length
                }
              </td>`
            : `<td></td>`
        ).join("")
      }
    </tr>`;

  const me =
    `<tr>
      <th class="me">🔵 自分</th>
      ${
        g.points.map((x, i) =>
          x === "me"
            ? `<td class="me">
                ${
                  g.points
                    .slice(0, i + 1)
                    .filter(y => y === "me")
                    .length
                }
              </td>`
            : `<td></td>`
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
   成績
========================= */

function stats() {

  const w =
    matches.filter(
      x => x.result === "win"
    ).length;

  const l =
    matches.filter(
      x => x.result === "loss"
    ).length;

  $("sMatches").textContent =
    matches.length;

  $("sWins").textContent =
    w;

  $("sLosses").textContent =
    l;

  $("sRate").textContent =
    `${
      matches.length
        ? Math.round(w / matches.length * 100)
        : 0
    }%`;


  /* フォルダ別 */

  const custom =
    folders.filter(
      f => f.id !== "default"
    );

  const allFolderData = [
    {
      id: "default",
      name: "未分類"
    },
    ...custom
  ];

  $("folderStats").innerHTML =
    allFolderData.map(f => {

      const ms =
        matches.filter(
          m => m.folderId === f.id
        );

      const wins =
        ms.filter(
          m => m.result === "win"
        ).length;

      const losses =
        ms.filter(
          m => m.result === "loss"
        ).length;

      const rate =
        ms.length
          ? Math.round(
              wins / ms.length * 100
            )
          : 0;

      return `

        <div class="folder-stat">

          <div>
            <b>📁 ${esc(f.name)}</b>
            <small>
              ${ms.length}試合
            </small>
          </div>

          <div class="folder-stat-numbers">

            <span class="blue">
              ${wins}勝
            </span>

            <span class="red">
              ${losses}敗
            </span>

            <strong>
              ${rate}%
            </strong>

          </div>

        </div>

      `;

    }).join("");


  /* 勝敗グラフ */

  const a =
    [...matches]
      .sort(
        (x, y) =>
          x.createdAt - y.createdAt
      )
      .slice(-15);

  $("chart").innerHTML =
    a.length
      ? `
        <div class="chart-bars">
          ${
            a.map(x => `
              <div
                class="bar ${
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
            `).join("")
          }
        </div>
      `
      : `<div class="empty">
           まだありません
         </div>`;


  /* 良かったところ */

  const c = {};

  matches.forEach(m => {

    (m.good || []).forEach(x => {

      c[x] =
        (c[x] || 0) + 1;

    });

  });

  $("goodStats").innerHTML =
    Object.entries(c)
      .sort((a, b) => b[1] - a[1])
      .map(x =>
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

}


/* =========================
   設定
========================= */

function settingsForm() {

  $("settingName").value =
    settings.playerName || "";

  $("settingGames").value =
    settings.games;

  $("settingTarget").value =
    settings.target;

  renderFolderManage();
  renderFolderSelect();

}


/* =========================
   バックアップ
========================= */

function backup() {

  const blob =
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
        type:
          "application/json"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href = url;

  a.download =
    `badminton-backup-${today()}.json`;

  a.click();

  URL.revokeObjectURL(url);

}


/* =========================
   イベント
========================= */

function setupEvents() {

  $("newMatchBtn").onclick =
    newMatch;

  $("allMatchesBtn").onclick =
    () => page("matches");

  $("settingsBtn").onclick =
    () => page("settings");

  $("startBtn").onclick =
    start;


  $("opPoint").onclick =
    () => point("op");

  $("mePoint").onclick =
    () => point("me");


  /* 横向きの得点部分 */

  $("opScoreArea").onclick =
    () => point("op");

  $("meScoreArea").onclick =
    () => point("me");


  $("undoBtn").onclick =
    undo;

  $("finishGame").onclick =
    () => endGame(false);


  $("quitLive").onclick = () => {

    if (
      confirm(
        "試合を終了して保存せず戻りますか？"
      )
    ) {

      current = null;

      page("home");

    }

  };


  $("saveBtn").onclick =
    saveMatch;


  $("search").oninput =
    () => list(selectedFolder);


  document
    .querySelectorAll(".tag")
    .forEach(x => {

      x.onclick = () =>
        x.classList.toggle(
          "selected"
        );

    });


  $("detailBack").onclick =
    () => page("matches");


  $("saveSettings").onclick = () => {

    settings = {

      playerName:
        $("settingName")
          .value
          .trim(),

      games:
        +$("settingGames").value,

      target:
        +$("settingTarget").value

    };

    save();

    toast("設定を保存しました");

  };


  $("addFolder").onclick =
    addFolder;


  $("newFolderName").addEventListener(
    "keydown",
    e => {

      if (e.key === "Enter") {
        addFolder();
      }

    }
  );


  $("export").onclick =
    backup;


  $("import").onchange =
    e => {

      const f =
        e.target.files[0];

      if (!f) return;

      const reader =
        new FileReader();

      reader.onload = () => {

        try {

          const d =
            JSON.parse(
              reader.result
            );

          if (
            !Array.isArray(
              d.matches
            )
          ) {
            throw 0;
          }

          if (
            !confirm(
              "現在のデータを置き換えますか？"
            )
          ) {
            return;
          }

          matches =
            d.matches;

          settings =
            {
              ...settings,
              ...(d.settings || {})
            };

          if (
            Array.isArray(d.folders)
          ) {

            folders =
              d.folders;

          }

          save();

          home();

          toast(
            "復元しました"
          );

        } catch {

          alert(
            "読み込めないファイルです"
          );

        }

      };

      reader.readAsText(f);

    };


  $("clear").onclick = () => {

    if (
      !confirm(
        "全データを削除しますか？"
      )
    ) {
      return;
    }

    matches = [];

    save();

    home();

    toast("削除しました");

  };


  document
    .querySelectorAll(".back-home")
    .forEach(x =>
      x.onclick =
        () => page("home")
    );


  document
    .querySelectorAll(".nav button")
    .forEach(x =>
      x.onclick =
        () => page(x.dataset.page)
    );


  document.addEventListener(
    "click",
    e => {

      const x =
        e.target.closest("[data-id]");

      if (x) {
        detail(x.dataset.id);
      }

    }
  );

}


/* =========================
   起動
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    $("date").value =
      today();

    settingsForm();

    setupEvents();

    home();

  }
);