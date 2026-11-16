/**
 * 单词消消看 — 界面与流程
 */
(function () {
  "use strict";

  const Logic = window.WordMatchLogic;
  const Words = window.WordMatchWords;
  const AudioX = window.WordMatchAudio;

  const els = {
    start: document.getElementById("screen-start"),
    game: document.getElementById("screen-game"),
    board: document.getElementById("board"),
    tray: document.getElementById("tray"),
    overlay: document.getElementById("overlay"),
    modal: document.getElementById("modal"),
    celebrate: document.getElementById("celebrate"),
    levelNum: document.getElementById("level-num"),
    levelName: document.getElementById("level-name"),
    setsLeft: document.getElementById("sets-left"),
    undoCount: document.getElementById("undo-count"),
    shuffleCount: document.getElementById("shuffle-count"),
    btnStart: document.getElementById("btn-start"),
    btnUndo: document.getElementById("btn-undo"),
    btnShuffle: document.getElementById("btn-shuffle"),
    startPreview: document.getElementById("start-preview"),
    stage: document.getElementById("stage"),
  };

  let state = null;
  let sessionWords = [];
  let visualTray = [];
  let flying = new Set();
  let modalOpen = false;
  let inputLocked = false;
  let celebrateTimer = null;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function cardInner(card) {
    const word = Words.getWord(card.wordId);
    if (!word) return "";
    if (card.type === "en") {
      const len = word.en.length;
      const size = len >= 8 ? " long" : len >= 5 ? " mid" : "";
      return (
        '<span class="badge badge-en">英</span>' +
        '<span class="en-word' + size + '">' + escapeHtml(word.en) + "</span>"
      );
    }
    if (card.type === "zh") {
      return (
        '<span class="badge badge-zh">中</span>' +
        '<span class="zh-word">' + escapeHtml(word.zh) + "</span>"
      );
    }
    return (
      '<span class="badge badge-img">图</span>' +
      '<div class="illu">' + Words.getIllustration(word.id) + "</div>"
    );
  }

  function miniCardHtml(wordId, type) {
    const fake = { wordId: wordId, type: type };
    return '<div class="mini-card">' + cardInner(fake) + "</div>";
  }

  function renderStartPreview() {
    els.startPreview.innerHTML =
      miniCardHtml("cat", "en") + miniCardHtml("cat", "zh") + miniCardHtml("cat", "img");
  }

  function boardSize() {
    const wrap = els.board;
    const w = Math.max(200, wrap.clientWidth || 360);
    const h = Math.max(220, wrap.clientHeight || 480);
    return { w: w, h: h };
  }

  function createAndBindLevel(levelId) {
    const size = boardSize();
    state = Logic.createLevel(levelId, size.w, size.h);
    visualTray = [];
    flying.clear();
    inputLocked = false;
    renderHeader();
    renderBoard(true);
    renderTray();
  }

  function renderHeader() {
    if (!state) return;
    els.levelNum.textContent = String(state.levelId);
    els.levelName.textContent = state.levelName;
    els.setsLeft.textContent = String(Logic.remainingSetCount(state));
    els.undoCount.textContent = String(state.undoLeft);
    els.shuffleCount.textContent = String(state.shuffleLeft);
    els.btnUndo.disabled = state.undoLeft <= 0 || state.history.length === 0 || state.status === "won";
    els.btnShuffle.disabled =
      state.shuffleLeft <= 0 ||
      state.status !== "playing" ||
      state.cards.filter(function (c) {
        return c.status === "board";
      }).length < 2;
  }

  function applyCardBox(el, card) {
    el.style.left = card.x + "px";
    el.style.top = card.y + "px";
    el.style.width = card.width + "px";
    el.style.height = card.height + "px";
    el.style.zIndex = String(10 + card.layer * 10);
  }

  function makeCardEl(card, entering) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "card";
    el.dataset.id = card.id;
    el.dataset.word = card.wordId;
    el.dataset.type = card.type;
    el.setAttribute("aria-label", (Words.getWord(card.wordId) || {}).en + " " + (card.type === "en" ? "英文" : card.type === "zh" ? "中文" : "图片"));
    el.innerHTML = cardInner(card);
    applyCardBox(el, card);
    const blocked = Logic.isBlocked(card, state.cards);
    el.classList.toggle("blocked", blocked);
    el.classList.toggle("free", !blocked);
    if (entering) {
      const delay = (card.layer || 0) * 70 + Math.random() * 40;
      el.classList.add("entering");
      el.style.animationDelay = delay + "ms";
      el.addEventListener(
        "animationend",
        function () {
          el.classList.remove("entering");
          el.style.animationDelay = "";
        },
        { once: true }
      );
    }
    el.addEventListener("click", function (ev) {
      ev.preventDefault();
      onPick(card.id);
    });
    return el;
  }

  function renderBoard(entering) {
    els.board.innerHTML = "";
    if (!state) return;
    const byLayer = state.cards
      .filter(function (c) {
        return c.status === "board" && !flying.has(c.id);
      })
      .slice()
      .sort(function (a, b) {
        return a.layer - b.layer;
      });
    byLayer.forEach(function (card) {
      els.board.appendChild(makeCardEl(card, entering));
    });
  }

  function refreshBlocked() {
    if (!state) return;
    state.cards.forEach(function (c) {
      if (c.status !== "board") return;
      const el = els.board.querySelector('[data-id="' + c.id + '"]');
      if (!el || el.classList.contains("flying")) return;
      const blocked = Logic.isBlocked(c, state.cards);
      el.classList.toggle("blocked", blocked);
      el.classList.toggle("free", !blocked);
    });
  }

  function renderTray(excludeId) {
    els.tray.innerHTML = "";
    for (let i = 0; i < Logic.TRAY_SIZE; i++) {
      const slot = document.createElement("div");
      slot.className = "slot";
      const id = visualTray[i];
      if (id && id !== excludeId) {
        const card = Logic.findCard(state, id);
        if (card) {
          const el = document.createElement("div");
          el.className = "card";
          el.dataset.id = card.id;
          el.dataset.word = card.wordId;
          el.dataset.type = card.type;
          el.innerHTML = cardInner(card);
          slot.appendChild(el);
        }
      }
      els.tray.appendChild(slot);
    }
  }

  function showScreen(name) {
    els.start.classList.toggle("hidden", name !== "start");
    els.game.classList.toggle("hidden", name !== "game");
  }

  function hideOverlay() {
    els.overlay.classList.add("hidden");
    els.modal.innerHTML = "";
    modalOpen = false;
  }

  function showOverlay(html) {
    els.modal.innerHTML = html;
    els.overlay.classList.remove("hidden");
    modalOpen = true;
  }

  function hideCelebrate() {
    if (celebrateTimer) {
      clearTimeout(celebrateTimer);
      celebrateTimer = null;
    }
    els.celebrate.classList.add("hidden");
    els.celebrate.innerHTML = "";
  }

  function showCelebrate(wordId, done) {
    const word = Words.getWord(wordId);
    hideCelebrate();
    els.celebrate.innerHTML =
      Words.getIllustration(word.id) +
      '<p class="ce-en">' +
      escapeHtml(word.en) +
      "</p>" +
      '<p class="ce-zh">' +
      escapeHtml(word.zh) +
      "</p>";
    els.celebrate.classList.remove("hidden");
    AudioX.speak(word.en);
    AudioX.playMatch();
    celebrateTimer = setTimeout(function () {
      hideCelebrate();
      if (done) done();
    }, 1000);
  }

  function burstConfetti() {
    const colors = ["#ff7a45", "#f4c430", "#2a9d8f", "#4A90F2", "#FF8AC3", "#7BC67B"];
    const stage = els.stage;
    for (let i = 0; i < 22; i++) {
      const p = document.createElement("div");
      p.className = "confetti-piece";
      p.style.left = 8 + Math.random() * 84 + "%";
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = Math.random() * 0.25 + "s";
      p.style.animationDuration = 0.9 + Math.random() * 0.6 + "s";
      p.style.transform = "rotate(" + Math.random() * 180 + "deg)";
      stage.appendChild(p);
      setTimeout(function () {
        p.remove();
      }, 1800);
    }
  }

  function showTipThenPlay(levelId) {
    if (levelId === 1) {
      showOverlay(
        '<div class="tip-icon" aria-hidden="true">💡</div>' +
          ' <div class="tip-cards">' +
          miniCardHtml("dog", "en") +
          miniCardHtml("dog", "zh") +
          miniCardHtml("dog", "img") +
          "</div>" +
          "<h2>怎么玩</h2>" +
          "<p>点英文、中文和图片，三张配成一组就能消掉。</p>" +
          '<div class="modal-actions">' +
          '<button type="button" class="btn-primary" id="modal-ok">知道了，开始</button>' +
          "</div>"
      );
      document.getElementById("modal-ok").addEventListener("click", function () {
        hideOverlay();
      });
      return;
    }
    const cfg = Logic.getLevelConfig(levelId);
    showOverlay(
      "<h2>第 " +
        cfg.id +
        " 关</h2>" +
        "<p>" +
        escapeHtml(cfg.name) +
        " · 一共 " +
        cfg.words.length +
        " 组单词</p>" +
        '<div class="modal-actions">' +
        '<button type="button" class="btn-primary" id="modal-ok">开始挑战</button>' +
        "</div>"
    );
    document.getElementById("modal-ok").addEventListener("click", function () {
      hideOverlay();
    });
  }

  function showWin() {
    AudioX.playWin();
    const isLast = state.levelId >= Words.LEVELS.length;
    if (isLast) {
      showAllClear();
      return;
    }
    burstConfetti();
    showOverlay(
      "<h2>你赢了！</h2>" +
        "<p>第 " +
        state.levelId +
        " 关完成啦，单词记牢了吗？</p>" +
        '<div class="modal-actions">' +
        '<button type="button" class="btn-primary" id="modal-next">下一关</button>' +
        "</div>"
    );
    document.getElementById("modal-next").addEventListener("click", function () {
      hideOverlay();
      startLevel(state.levelId + 1);
    });
  }

  function showLose() {
    AudioX.playLose();
    showOverlay(
      "<h2>槽位满了</h2>" +
        "<p>底部七个格子装满啦。试试先凑齐一组，或者用撤销、洗牌帮帮忙。</p>" +
        '<div class="modal-actions">' +
        '<button type="button" class="btn-primary" id="modal-retry">再试一次</button>' +
        "</div>"
    );
    document.getElementById("modal-retry").addEventListener("click", function () {
      hideOverlay();
      startLevel(state.levelId);
    });
  }

  function recordSessionWords() {
    if (!state) return;
    state.clearedWords.forEach(function (id) {
      if (sessionWords.indexOf(id) === -1) sessionWords.push(id);
    });
  }

  function showAllClear() {
    recordSessionWords();
    const items = sessionWords
      .map(function (id) {
        const w = Words.getWord(id);
        if (!w) return "";
        return (
          '<li class="review-item" data-word="' +
          escapeHtml(w.id) +
          '">' +
          Words.getIllustration(w.id) +
          '<span><span class="rw-en">' +
          escapeHtml(w.en) +
          '</span><br><span class="rw-zh">' +
          escapeHtml(w.zh) +
          "</span></span>" +
          '<span class="rw-play">发音</span>' +
          "</li>"
        );
      })
      .join("");
    showOverlay(
      "<h2>全部通关！</h2>" +
        "<p>本局记住了这些单词，点一点可以听发音。</p>" +
        '<ul class="review-list">' +
        items +
        "</ul>" +
        '<div class="modal-actions">' +
        '<button type="button" class="btn-primary" id="modal-restart">再玩一次</button>' +
        "</div>"
    );
    burstConfetti();
    els.modal.querySelectorAll(".review-item").forEach(function (item) {
      item.addEventListener("click", function () {
        const w = Words.getWord(item.getAttribute("data-word"));
        if (w) AudioX.speak(w.en);
      });
    });
    document.getElementById("modal-restart").addEventListener("click", function () {
      hideOverlay();
      sessionWords = [];
      showScreen("start");
    });
  }

  function startLevel(levelId) {
    showScreen("game");
    hideCelebrate();
    // 先显示棋盘容器再测量尺寸
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        createAndBindLevel(levelId);
        showTipThenPlay(levelId);
      });
    });
  }

  function flyToSlot(cardEl, slotIndex, done) {
    const slots = els.tray.querySelectorAll(".slot");
    const target = slots[slotIndex];
    if (!cardEl || !target) {
      if (done) done();
      return;
    }
    const from = cardEl.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const boardRect = els.board.getBoundingClientRect();
    cardEl.classList.remove("entering");
    cardEl.classList.add("flying");
    cardEl.classList.remove("blocked", "free");
    // 强制从当前位置开始过渡
    cardEl.style.left = from.left - boardRect.left + "px";
    cardEl.style.top = from.top - boardRect.top + "px";
    cardEl.style.width = from.width + "px";
    cardEl.style.height = from.height + "px";
    cardEl.style.zIndex = "90";
    void cardEl.offsetWidth;
    cardEl.style.left = to.left - boardRect.left + "px";
    cardEl.style.top = to.top - boardRect.top + "px";
    cardEl.style.width = to.width + "px";
    cardEl.style.height = to.height + "px";

    let finished = false;
    const finish = function () {
      if (finished) return;
      finished = true;
      if (cardEl.parentNode) cardEl.parentNode.removeChild(cardEl);
      if (done) done();
    };
    cardEl.addEventListener("transitionend", finish, { once: true });
    setTimeout(finish, 420);
  }

  function onPick(cardId) {
    if (!state || state.status !== "playing" || modalOpen || inputLocked) return;
    const card = Logic.findCard(state, cardId);
    if (!card) return;
    AudioX.unlock();

    const result = Logic.pickCard(state, cardId);
    if (!result.ok) return;

    inputLocked = true;
    AudioX.playTap();
    if (card.type === "en") {
      AudioX.speak(Words.getWord(card.wordId).en);
    }

    const preTray = state.history[state.history.length - 1].tray;
    const midTray = Logic.insertIntoTray(preTray, cardId, state.cards);
    visualTray = midTray.slice();
    const slotIndex = midTray.indexOf(cardId);

    const cardEl = els.board.querySelector('[data-id="' + cardId + '"]');
    flying.add(cardId);
    renderTray(cardId);
    refreshBlocked();
    renderHeader();

    const afterLand = function () {
      flying.delete(cardId);
      const matched = result.events.find(function (e) {
        return e.type === "matched";
      });
      const won = result.events.some(function (e) {
        return e.type === "won";
      });
      const lost = result.events.some(function (e) {
        return e.type === "lost";
      });

      renderTray();

      if (matched) {
        matched.cardIds.forEach(function (id) {
          const el = els.tray.querySelector('[data-id="' + id + '"]');
          if (el) el.classList.add("matching");
        });
        showCelebrate(matched.wordId, function () {
          matched.cardIds.forEach(function (id) {
            const el = els.tray.querySelector('[data-id="' + id + '"]');
            if (el) el.classList.add("cleared-out");
          });
          setTimeout(function () {
            if (state.clearedWords.indexOf(matched.wordId) !== -1) {
              if (sessionWords.indexOf(matched.wordId) === -1) {
                sessionWords.push(matched.wordId);
              }
            }
            visualTray = state.tray.slice();
            renderTray();
            renderHeader();
            inputLocked = false;
            if (won) showWin();
          }, 280);
        });
      } else if (lost) {
        inputLocked = false;
        showLose();
      } else {
        inputLocked = false;
        renderHeader();
      }
    };

    if (cardEl) {
      flyToSlot(cardEl, slotIndex, afterLand);
    } else {
      afterLand();
    }
  }

  function onUndo() {
    if (!state || modalOpen || inputLocked) return;
    AudioX.unlock();
    const result = Logic.undo(state);
    if (!result.ok) return;
    hideCelebrate();
    flying.clear();
    visualTray = state.tray.slice();
    renderBoard(false);
    renderTray();
    renderHeader();
    AudioX.playTap();
  }

  function onShuffle() {
    if (!state || modalOpen || inputLocked) return;
    AudioX.unlock();
    const result = Logic.shuffleBoard(state);
    if (!result.ok) return;
    flying.clear();
    renderBoard(true);
    renderHeader();
    AudioX.playShuffle();
  }

  function onResize() {
    if (!state || els.game.classList.contains("hidden")) return;
    const size = boardSize();
    Logic.refitCards(state, size.w, size.h);
    // 飞行中的牌不强制重排，直接以最新坐标刷新静止牌
    Array.prototype.forEach.call(els.board.querySelectorAll(".card"), function (el) {
      if (el.classList.contains("flying")) return;
      const card = Logic.findCard(state, el.dataset.id);
      if (card && card.status === "board") applyCardBox(el, card);
    });
  }

  els.btnStart.addEventListener("click", function () {
    AudioX.unlock();
    sessionWords = [];
    startLevel(1);
  });
  els.btnUndo.addEventListener("click", onUndo);
  els.btnShuffle.addEventListener("click", onShuffle);
  els.overlay.addEventListener("click", function (ev) {
    if (ev.target === els.overlay) {
      // 提示页允许点遮罩关闭；胜负页必须点按钮
      const ok = document.getElementById("modal-ok");
      if (ok) hideOverlay();
    }
  });

  window.addEventListener("resize", onResize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", onResize);
  }

  renderStartPreview();
  window.__wordMatchStartLevel = startLevel;
})();
