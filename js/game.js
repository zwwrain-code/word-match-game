/**
 * 单词消消看 — 界面与流程
 */
(function () {
  "use strict";

  const Logic = window.WordMatchLogic;
  const Words = window.WordMatchWords;
  const AudioX = window.WordMatchAudio;
  const SESSION_KEY = "wordmatch-session-v1";

  const els = {
    home: document.getElementById("screen-home"),
    books: document.getElementById("screen-books"),
    units: document.getElementById("screen-units"),
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
    btnUndo: document.getElementById("btn-undo"),
    btnShuffle: document.getElementById("btn-shuffle"),
    startPreview: document.getElementById("start-preview"),
    stage: document.getElementById("stage"),
    unitList: document.getElementById("unit-list"),
    unitsTitle: document.getElementById("units-title"),
    booksTitle: document.getElementById("books-title"),
  };

  let state = null;
  let sessionWords = [];
  let visualTray = [];
  let flying = new Set();
  let modalOpen = false;
  let inputLocked = false;
  let celebrateTimer = null;
  let reviewBag = Logic.loadReviewBag(openStore("local"));
  let place = { courseId: "", bookId: "", unitId: "", entryMode: "fresh" };

  function openStore(kind) {
    try {
      const store = kind === "session" ? window.sessionStorage : window.localStorage;
      const probe = "__wm_probe";
      store.setItem(probe, "1");
      store.removeItem(probe);
      return store;
    } catch (err) {
      const mem = {};
      return {
        getItem: function (key) {
          return Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : null;
        },
        setItem: function (key, value) {
          mem[key] = String(value);
        },
        removeItem: function (key) {
          delete mem[key];
        },
      };
    }
  }

  function loadSession() {
    try {
      const raw = openStore("session").getItem(SESSION_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && Array.isArray(parsed.unitsStarted)) return parsed;
    } catch (err) {
      /* 空会话 */
    }
    return { courseId: "", bookId: "", unitsStarted: [] };
  }

  function saveSession(session) {
    try {
      openStore("session").setItem(SESSION_KEY, JSON.stringify(session));
    } catch (err) {
      /* 忽略无法写入的会话 */
    }
  }

  function persistBag() {
    Logic.saveReviewBag(reviewBag, openStore("local"));
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function cardInner(card) {
    const word = Words.getWord(card.wordId) || Words.lookup(card.wordId);
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
    return '<div class="mini-card">' + cardInner({ wordId: wordId, type: type }) + "</div>";
  }

  function renderHomePreview() {
    const id = "apple";
    els.startPreview.innerHTML = miniCardHtml(id, "en") + miniCardHtml(id, "zh") + miniCardHtml(id, "img");
  }

  function showScreen(name) {
    els.home.classList.toggle("hidden", name !== "home");
    els.books.classList.toggle("hidden", name !== "books");
    els.units.classList.toggle("hidden", name !== "units");
    els.game.classList.toggle("hidden", name !== "game");
  }

  function showHome() {
    hideOverlay();
    showScreen("home");
  }

  function showBooks() {
    const course = Words.getCourse("yilin3");
    if (els.booksTitle && course) els.booksTitle.textContent = course.name;
    hideOverlay();
    showScreen("books");
  }

  function showUnits(bookId) {
    const book = Words.getBooks("yilin3").filter(function (item) {
      return item.id === bookId;
    })[0];
    if (!book) {
      showBooks();
      return;
    }
    place.courseId = "yilin3";
    place.bookId = bookId;
    els.unitsTitle.textContent = book.name;
    els.unitList.innerHTML = book.units
      .map(function (unit) {
        if (!unit.playable) {
          return (
            '<button type="button" class="choice-btn is-locked" disabled data-unit="' +
            escapeHtml(unit.id) +
            '"><span class="choice-title">' +
            escapeHtml(unit.label) +
            " " +
            escapeHtml(unit.title) +
            '</span><span class="choice-sub"><span class="soon-tag">即将开放</span></span></button>'
          );
        }
        return (
          '<button type="button" class="choice-btn" data-unit="' +
          escapeHtml(unit.id) +
          '"><span class="choice-title">' +
          escapeHtml(unit.label) +
          " " +
          escapeHtml(unit.title) +
          '</span><span class="choice-sub">' +
          unit.levels.length +
          " 关</span></button>"
        );
      })
      .join("");
    Array.prototype.forEach.call(els.unitList.querySelectorAll("button[data-unit]"), function (btn) {
      if (btn.disabled) return;
      btn.addEventListener("click", function () {
        beginUnit("yilin3", bookId, btn.getAttribute("data-unit"));
      });
    });
    hideOverlay();
    showScreen("units");
  }

  function boardSize() {
    const wrap = els.board;
    const w = Math.max(200, wrap.clientWidth || 360);
    const h = Math.max(220, wrap.clientHeight || 480);
    return { w: w, h: h };
  }

  function knownWord(id) {
    return !!Words.getWord(id);
  }

  function reviewIdsFor(levelId) {
    if (levelId > 1) {
      return Logic.selectReviewIds(
        reviewBag,
        { mode: "next-level", unitId: place.unitId, bookId: place.bookId },
        knownWord
      );
    }
    if (place.entryMode === "later-unit") {
      return Logic.selectReviewIds(reviewBag, { mode: "later-unit", bookId: place.bookId }, knownWord);
    }
    return [];
  }

  function createAndBindLevel(levelId) {
    const size = boardSize();
    state = Logic.createLevel(levelId, size.w, size.h, null, { reviewIds: reviewIdsFor(levelId) });
    visualTray = [];
    flying.clear();
    inputLocked = false;
    renderHeader();
    renderBoard(true);
    renderTray();
  }

  function renderHeader() {
    if (!state) return;
    const unit = Words.getActiveUnit();
    els.levelNum.textContent = String(state.levelId);
    els.levelName.textContent = unit && unit.title ? unit.title : state.levelName;
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
    const word = Words.getWord(card.wordId);
    el.setAttribute(
      "aria-label",
      (word ? word.en : card.wordId) + " " + (card.type === "en" ? "英文" : card.type === "zh" ? "中文" : "图片")
    );
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

  function tipWordId() {
    const pack = Words.getActivePack();
    return pack && pack.tipWord && Words.getWord(pack.tipWord) ? pack.tipWord : "apple";
  }

  function showTipThenPlay(levelId) {
    if (levelId === 1) {
      showOverlay(
        '<div class="tip-icon" aria-hidden="true">💡</div>' +
          ' <div class="tip-cards">' +
          miniCardHtml(tipWordId(), "en") +
          miniCardHtml(tipWordId(), "zh") +
          miniCardHtml(tipWordId(), "img") +
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
    showOverlay(
      "<h2>第 " +
        state.levelId +
        " 关</h2>" +
        "<p>" +
        escapeHtml(state.levelName) +
        " · 一共 " +
        state.wordIds.length +
        " 组单词</p>" +
        '<div class="modal-actions">' +
        '<button type="button" class="btn-primary" id="modal-ok">开始挑战</button>' +
        "</div>"
    );
    document.getElementById("modal-ok").addEventListener("click", function () {
      hideOverlay();
    });
  }

  function leaveToMenu() {
    hideOverlay();
    if (place.courseId === "yilin3" && place.bookId) {
      showUnits(place.bookId);
      return;
    }
    showHome();
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
        " 关完成啦，没记住的词会在下一关再出现。</p>" +
        '<div class="modal-actions">' +
        '<button type="button" class="btn-primary" id="modal-next">下一关</button>' +
        '<button type="button" class="btn-secondary" id="modal-back">返回</button>' +
        "</div>"
    );
    document.getElementById("modal-next").addEventListener("click", function () {
      hideOverlay();
      startLevel(state.levelId + 1);
    });
    document.getElementById("modal-back").addEventListener("click", leaveToMenu);
  }

  function noteFailure() {
    const info = {
      reason: "failed",
      courseId: place.courseId,
      bookId: place.bookId,
      unitId: place.unitId,
    };
    Logic.problematicWordIds(state).forEach(function (id) {
      Logic.markProblematic(reviewBag, id, info);
    });
    persistBag();
  }

  function showLose() {
    noteFailure();
    AudioX.playLose();
    showOverlay(
      "<h2>槽位满了</h2>" +
        "<p>底部七个格子装满啦。没消掉的词会记下来，下一关再见面。</p>" +
        '<div class="modal-actions">' +
        '<button type="button" class="btn-primary" id="modal-retry">再试一次</button>' +
        '<button type="button" class="btn-secondary" id="modal-back">返回</button>' +
        "</div>"
    );
    document.getElementById("modal-retry").addEventListener("click", function () {
      hideOverlay();
      startLevel(state.levelId);
    });
    document.getElementById("modal-back").addEventListener("click", leaveToMenu);
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
    const backLabel = place.courseId === "yilin3" ? "返回单元" : "返回";
    showOverlay(
      "<h2>本单元完成！</h2>" +
        "<p>这些单词都消掉了，点一点可以听发音。再玩一次会回到这一单元的第 1 关。</p>" +
        '<ul class="review-list">' +
        items +
        "</ul>" +
        '<div class="modal-actions">' +
        '<button type="button" class="btn-primary" id="modal-replay">再玩一次</button>' +
        '<button type="button" class="btn-secondary" id="modal-unit">' +
        backLabel +
        "</button>" +
        '<button type="button" class="btn-secondary" id="modal-home">课程首页</button>' +
        "</div>"
    );
    burstConfetti();
    els.modal.querySelectorAll(".review-item").forEach(function (item) {
      item.addEventListener("click", function () {
        const w = Words.getWord(item.getAttribute("data-word"));
        if (w) AudioX.speak(w.en);
      });
    });
    document.getElementById("modal-replay").addEventListener("click", function () {
      hideOverlay();
      sessionWords = [];
      startLevel(1);
    });
    document.getElementById("modal-unit").addEventListener("click", leaveToMenu);
    document.getElementById("modal-home").addEventListener("click", showHome);
  }

  function startLevel(levelId) {
    showScreen("game");
    hideCelebrate();
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
        Logic.markCleanClear(reviewBag, matched.wordId);
        persistBag();
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
            if (state.clearedWords.indexOf(matched.wordId) !== -1 && sessionWords.indexOf(matched.wordId) === -1) {
              sessionWords.push(matched.wordId);
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
    const card = Logic.findCard(state, result.cardId);
    if (card) {
      Logic.markProblematic(reviewBag, card.wordId, {
        reason: "undo",
        courseId: place.courseId,
        bookId: place.bookId,
        unitId: place.unitId,
      });
      persistBag();
    }
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
    Array.prototype.forEach.call(els.board.querySelectorAll(".card"), function (el) {
      if (el.classList.contains("flying")) return;
      const card = Logic.findCard(state, el.dataset.id);
      if (card && card.status === "board") applyCardBox(el, card);
    });
  }

  function beginUnit(courseId, bookId, unitId) {
    if (!Words.setActiveUnit(courseId, bookId, unitId)) return;
    AudioX.unlock();
    const sess = loadSession();
    let entryMode = "fresh";
    const sameBook =
      sess.courseId === courseId && sess.bookId === bookId && sess.unitsStarted.indexOf(unitId) === -1 && sess.unitsStarted.length > 0;
    if (sameBook) entryMode = "later-unit";
    if (sess.courseId !== courseId || sess.bookId !== bookId) {
      sess.courseId = courseId;
      sess.bookId = bookId;
      sess.unitsStarted = [];
    }
    if (sess.unitsStarted.indexOf(unitId) === -1) sess.unitsStarted.push(unitId);
    sess.courseId = courseId;
    sess.bookId = bookId;
    saveSession(sess);
    place = { courseId: courseId, bookId: bookId, unitId: unitId, entryMode: entryMode };
    sessionWords = [];
    startLevel(1);
  }

  function onCourseClick(courseId) {
    const course = Words.getCourse(courseId);
    if (!course || !course.playable) return;
    AudioX.unlock();
    if (courseId === "fun") {
      beginUnit("fun", "fun-book", "fun-main");
      return;
    }
    if (courseId === "yilin3") showBooks();
  }

  document.querySelectorAll("#course-list .course-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      onCourseClick(btn.getAttribute("data-course"));
    });
  });
  document.getElementById("btn-book-3a").addEventListener("click", function () {
    showUnits("3a");
  });
  document.getElementById("btn-book-3b").addEventListener("click", function () {
    showUnits("3b");
  });
  document.getElementById("btn-books-back").addEventListener("click", showHome);
  document.getElementById("btn-units-back").addEventListener("click", showBooks);
  document.getElementById("btn-units-home").addEventListener("click", showHome);
  document.getElementById("btn-back").addEventListener("click", function () {
    if (modalOpen) return;
    leaveToMenu();
  });
  els.btnUndo.addEventListener("click", onUndo);
  els.btnShuffle.addEventListener("click", onShuffle);
  els.overlay.addEventListener("click", function (ev) {
    if (ev.target === els.overlay && document.getElementById("modal-ok")) hideOverlay();
  });

  window.addEventListener("resize", onResize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", onResize);
  }

  renderHomePreview();
  window.__wordMatchStartLevel = startLevel;
})();
