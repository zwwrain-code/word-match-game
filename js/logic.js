/**
 * 单词消消看 — 纯游戏逻辑（无 DOM，可在 Node 中测试）
 */
(function (root) {
  "use strict";

  const WORDS_API = root.WordMatchWords;
  const TRAY_SIZE = 7;
  const TYPES = ["en", "zh", "img"];

  const CARD_W = 80;
  const CARD_H = 88;
  const TILE_GAP = 0;
  const HX = (CARD_W + TILE_GAP) / 2;
  const HY = (CARD_H + TILE_GAP) / 2;

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function shuffleInPlace(arr, rand) {
    const r = rand || Math.random;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function getLevelConfig(levelId) {
    const levels = WORDS_API.LEVELS;
    return levels.find(function (l) {
      return l.id === levelId;
    }) || levels[0];
  }

  function tile(gx, gy, layer) {
    return {
      x: gx * HX,
      y: gy * HY,
      layer: layer,
      width: CARD_W,
      height: CARD_H,
    };
  }

  function gridAt(gx0, gy0, cols, rows, layer) {
    const out = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        out.push(tile(gx0 + c * 2, gy0 + r * 2, layer));
      }
    }
    return out;
  }

  /**
   * 生成关卡槽位（半格网格，上层错开半格）。
   * 同层牌紧贴（半格错开叠放），形成中央「牌山」。
   */
  function generateSlots(layout) {
    const slots = [];

    if (layout === "pile") {
      // 第 1 关：18 张，3 层中央堆。底层 4×3=12，中层 2×2=4，顶层 2 张。
      slots.push.apply(slots, gridAt(0, 0, 4, 3, 0));
      slots.push.apply(slots, gridAt(2, 1, 2, 2, 1));
      slots.push.apply(slots, [tile(3, 2, 2), tile(3, 4, 2)]);
      return slots;
    }

    if (layout === "mountain") {
      // 第 2 关：27 张，4 层中央山。底层 4×4=16，中层 2×3=6（左右露边），
      // 上层 2×2=4，顶峰 1 张。
      slots.push.apply(slots, gridAt(0, 0, 4, 4, 0));
      slots.push.apply(slots, gridAt(2, 1, 2, 3, 1));
      slots.push.apply(slots, gridAt(2, 2, 2, 2, 2));
      slots.push(tile(3, 3, 3));
      return slots;
    }

    if (layout === "peak") {
      // 第 3 关：36 张。主堆 33 张共 5 层（20+6+4+2+1），下方短堆 3 张（2+1）。
      // 中层比底层窄 2 列，左右和下方露出底层牌边。
      slots.push.apply(slots, gridAt(0, 0, 5, 4, 0));
      slots.push.apply(slots, gridAt(2, 1, 3, 2, 1));
      slots.push.apply(slots, gridAt(3, 2, 2, 2, 2));
      slots.push.apply(slots, [tile(4, 3, 3), tile(4, 5, 3)]);
      slots.push(tile(4, 4, 4));
      // 主堆底层 gy=0,2,4,6 结束于 8；短堆放在下方
      slots.push.apply(slots, [tile(3, 9, 0), tile(5, 9, 0), tile(4, 10, 1)]);
      return slots;
    }

    throw new Error("Unknown layout: " + layout);
  }

  /**
   * 将逻辑槽位缩放到实际棋盘尺寸。
   */
  function fitSlots(slots, boardW, boardH, padding) {
    padding = padding == null ? 8 : padding;
    if (!slots.length) return [];
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    slots.forEach(function (s) {
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x + s.width);
      maxY = Math.max(maxY, s.y + s.height);
    });
    const lw = Math.max(1, maxX - minX);
    const lh = Math.max(1, maxY - minY);
    const scale = Math.min((boardW - padding * 2) / lw, (boardH - padding * 2) / lh);
    const extraX = boardW - padding * 2 - lw * scale;
    const extraY = boardH - padding * 2 - lh * scale;
    const ox = padding + extraX / 2 - minX * scale;
    // 牌山略偏上，接近正版叠牌的视觉位置
    const oy = padding + Math.max(0, extraY) * 0.2 - minY * scale;
    return slots.map(function (s) {
      return {
        x: s.x * scale + ox,
        y: s.y * scale + oy,
        layer: s.layer,
        width: s.width * scale,
        height: s.height * scale,
        lx: s.x,
        ly: s.y,
        lwidth: s.width,
        lheight: s.height,
        llayer: s.layer,
      };
    });
  }

  function makeDeck(wordIds) {
    const deck = [];
    wordIds.forEach(function (id) {
      TYPES.forEach(function (type) {
        deck.push({ wordId: id, type: type });
      });
    });
    return deck;
  }

  const REVIEW_STORAGE_KEY = "wordmatch-review-bag-v1";

  /**
   * 下一关要带上的复习词数量：大约 20%–30%，词袋很少时至少 1–2 个。
   */
  function reviewSlotCount(capacity, available) {
    if (!available || available <= 0 || !capacity) return 0;
    if (available === 1) return 1;
    let want = Math.round(capacity * 0.25);
    if (want < 2) want = 2;
    let ceiling = Math.round(capacity * 0.3);
    if (ceiling < 2) ceiling = 2;
    if (want > ceiling) want = ceiling;
    if (want > available) want = available;
    if (want > capacity - 1) want = capacity - 1;
    return want;
  }

  /**
   * 用完整的英+中+图词组替换关卡末尾的词，总数保持不变。
   */
  function injectReviewWords(baseWords, reviewIds, isKnown) {
    const capacity = baseWords.length;
    const seen = {};
    const fresh = [];
    (reviewIds || []).forEach(function (id) {
      if (!id || seen[id]) return;
      if (isKnown && !isKnown(id)) return;
      seen[id] = true;
      fresh.push(id);
    });
    const n = reviewSlotCount(capacity, fresh.length);
    const chosen = fresh.slice(0, n);
    const chosenSet = {};
    chosen.forEach(function (id) {
      chosenSet[id] = true;
    });
    const rest = baseWords.filter(function (id) {
      return !chosenSet[id];
    });
    const words = chosen.concat(rest).slice(0, capacity);
    return { words: words, reviewIds: chosen };
  }

  function createReviewBag() {
    return { items: {} };
  }

  function markProblematic(bag, wordId, info) {
    if (!bag || !wordId) return bag;
    if (!bag.items) bag.items = {};
    info = info || {};
    bag.items[wordId] = {
      wordId: wordId,
      reason: info.reason || "failed",
      courseId: info.courseId || "",
      bookId: info.bookId || "",
      unitId: info.unitId || "",
    };
    return bag;
  }

  function markCleanClear(bag, wordId) {
    if (bag && bag.items && wordId && bag.items[wordId]) delete bag.items[wordId];
    return bag;
  }

  function problematicWordIds(state) {
    const ids = {};
    if (!state || !state.cards) return [];
    state.cards.forEach(function (card) {
      if (card.status === "board" || card.status === "tray") ids[card.wordId] = true;
    });
    return Object.keys(ids);
  }

  function saveReviewBag(bag, storage) {
    if (!storage) return;
    storage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(bag || createReviewBag()));
  }

  function loadReviewBag(storage) {
    if (!storage) return createReviewBag();
    try {
      const raw = storage.getItem(REVIEW_STORAGE_KEY);
      if (!raw) return createReviewBag();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.items !== "object" || !parsed.items) return createReviewBag();
      return { items: parsed.items };
    } catch (err) {
      return createReviewBag();
    }
  }

  /**
   * 同一单元的下一关带上本单元的复习词；同一册后面的单元只带 1–2 个。
   */
  function selectReviewIds(bag, spec, isKnown) {
    spec = spec || {};
    const items = (bag && bag.items) || {};
    const ids = Object.keys(items).filter(function (id) {
      return !isKnown || isKnown(id);
    });
    if (spec.mode === "next-level") {
      const sameUnit = ids.filter(function (id) {
        return items[id].unitId === spec.unitId;
      });
      if (sameUnit.length) return sameUnit;
      return ids.filter(function (id) {
        return items[id].bookId && items[id].bookId === spec.bookId;
      });
    }
    if (spec.mode === "later-unit") {
      return ids
        .filter(function (id) {
          return items[id].bookId && items[id].bookId === spec.bookId;
        })
        .slice(0, 2);
    }
    return [];
  }

  function buildState(cfg, words, fitted, slots, rand) {
    const deck = makeDeck(words);
    shuffleInPlace(deck, rand);
    const cards = deck.map(function (d, i) {
      const s = fitted[i];
      return {
        id: "c" + cfg.id + "-" + i,
        wordId: d.wordId,
        type: d.type,
        x: s.x,
        y: s.y,
        width: s.width,
        height: s.height,
        layer: s.layer,
        lx: s.lx,
        ly: s.ly,
        lwidth: s.lwidth,
        lheight: s.lheight,
        status: "board",
      };
    });
    return {
      levelId: cfg.id,
      levelName: cfg.name,
      wordIds: words.slice(),
      cards: cards,
      tray: [],
      undoLeft: cfg.undo,
      shuffleLeft: cfg.shuffle,
      history: [],
      status: "playing",
      clearedWords: [],
      logicalSlots: slots,
    };
  }

  function createLevel(levelId, boardW, boardH, rand, options) {
    const cfg = getLevelConfig(levelId);
    options = options || {};
    const known = function (id) {
      return !!(WORDS_API.getWord && WORDS_API.getWord(id));
    };
    const mixed = injectReviewWords(cfg.words, options.reviewIds || [], known);
    const words = mixed.words;
    const slots = generateSlots(cfg.layout);
    const fitted = fitSlots(slots, boardW || 360, boardH || 500, 8);
    if (makeDeck(words).length !== fitted.length) {
      throw new Error(
        "Slot/card count mismatch for level " + levelId + ": " + makeDeck(words).length + " vs " + fitted.length
      );
    }
    let fallback = null;
    for (let attempt = 0; attempt < 60; attempt++) {
      const state = buildState(cfg, words, fitted, slots, rand);
      state.reviewWordIds = mixed.reviewIds.slice();
      fallback = state;
      if (isGreedilySolvable(clone(state), rand)) {
        state.dealSolvable = true;
        state.dealAttempts = attempt + 1;
        return state;
      }
    }
    fallback.dealSolvable = false;
    fallback.dealAttempts = 60;
    fallback.reviewWordIds = mixed.reviewIds.slice();
    return fallback;
  }

  /**
   * 若更高层牌的矩形盖住了本牌中心，则本牌被挡住。
   */
  function isBlocked(card, cards) {
    if (!card || card.status !== "board") return true;
    const cx = card.x + card.width / 2;
    const cy = card.y + card.height / 2;
    for (let i = 0; i < cards.length; i++) {
      const other = cards[i];
      if (other.id === card.id) continue;
      if (other.status !== "board") continue;
      if (other.layer <= card.layer) continue;
      var eps = 0.5;
      if (
        cx >= other.x - eps &&
        cx <= other.x + other.width + eps &&
        cy >= other.y - eps &&
        cy <= other.y + other.height + eps
      ) {
        return true;
      }
    }
    return false;
  }

  function getFreeCards(cards) {
    return cards.filter(function (c) {
      return c.status === "board" && !isBlocked(c, cards);
    });
  }

  function findCard(state, cardId) {
    for (let i = 0; i < state.cards.length; i++) {
      if (state.cards[i].id === cardId) return state.cards[i];
    }
    return null;
  }

  /**
   * 把新牌插入托盘：同一单词的牌自动靠在一起。
   */
  function insertIntoTray(tray, cardId, cards) {
    const card = cards.find(function (c) {
      return c.id === cardId;
    });
    const next = tray.slice();
    if (!card) {
      next.push(cardId);
      return next;
    }
    let first = -1;
    let last = -1;
    for (let i = 0; i < next.length; i++) {
      const t = cards.find(function (c) {
        return c.id === next[i];
      });
      if (t && t.wordId === card.wordId) {
        if (first === -1) first = i;
        last = i;
      }
    }
    if (first === -1) {
      next.push(cardId);
    } else {
      next.splice(last + 1, 0, cardId);
    }
    return next;
  }

  /**
   * 托盘中是否已有某一单词的英、中、图各一张。
   */
  function findCompleteSet(tray, cards) {
    const groups = {};
    tray.forEach(function (id) {
      const c = cards.find(function (x) {
        return x.id === id;
      });
      if (!c) return;
      if (!groups[c.wordId]) groups[c.wordId] = [];
      groups[c.wordId].push(c);
    });
    const wordIds = Object.keys(groups);
    for (let i = 0; i < wordIds.length; i++) {
      const list = groups[wordIds[i]];
      const types = {};
      list.forEach(function (c) {
        types[c.type] = c;
      });
      if (types.en && types.zh && types.img) {
        return {
          wordId: wordIds[i],
          cardIds: [types.en.id, types.zh.id, types.img.id],
        };
      }
    }
    return null;
  }

  function remainingSetCount(state) {
    const left = {};
    state.cards.forEach(function (c) {
      if (c.status === "cleared") return;
      left[c.wordId] = true;
    });
    return Object.keys(left).length;
  }

  function boardCleared(state) {
    return state.cards.every(function (c) {
      return c.status === "cleared";
    });
  }

  /**
   * 点选一张空闲牌进入托盘。可能触发消除、获胜或失败。
   * 返回 { ok, reason, events }，并就地更新 state。
   * events 项: { type: 'picked'|'matched'|'won'|'lost', ... }
   */
  function pickCard(state, cardId) {
    const events = [];
    if (state.status !== "playing") {
      return { ok: false, reason: "not-playing", events: events };
    }
    const card = findCard(state, cardId);
    if (!card || card.status !== "board") {
      return { ok: false, reason: "not-on-board", events: events };
    }
    if (isBlocked(card, state.cards)) {
      return { ok: false, reason: "blocked", events: events };
    }
    if (state.tray.length >= TRAY_SIZE) {
      return { ok: false, reason: "tray-full", events: events };
    }

    state.history.push({
      tray: state.tray.slice(),
      cardId: cardId,
      clearedWords: state.clearedWords.slice(),
      cardStatuses: state.cards.map(function (c) {
        return { id: c.id, status: c.status };
      }),
    });

    card.status = "tray";
    state.tray = insertIntoTray(state.tray, cardId, state.cards);
    events.push({ type: "picked", cardId: cardId, wordId: card.wordId, cardType: card.type });

    const match = findCompleteSet(state.tray, state.cards);
    if (match) {
      match.cardIds.forEach(function (id) {
        const c = findCard(state, id);
        if (c) c.status = "cleared";
      });
      state.tray = state.tray.filter(function (id) {
        return match.cardIds.indexOf(id) === -1;
      });
      if (state.clearedWords.indexOf(match.wordId) === -1) {
        state.clearedWords.push(match.wordId);
      }
      events.push({ type: "matched", wordId: match.wordId, cardIds: match.cardIds });

      if (boardCleared(state) && state.tray.length === 0) {
        state.status = "won";
        events.push({ type: "won" });
      }
    } else if (state.tray.length >= TRAY_SIZE) {
      state.status = "lost";
      events.push({ type: "lost" });
    }

    return { ok: true, reason: null, events: events };
  }

  function undo(state) {
    if (state.status === "won") {
      return { ok: false, reason: "already-won" };
    }
    if (state.undoLeft <= 0) {
      return { ok: false, reason: "no-undos" };
    }
    if (!state.history.length) {
      return { ok: false, reason: "empty-history" };
    }
    const snap = state.history.pop();
    state.undoLeft -= 1;
    state.tray = snap.tray.slice();
    state.clearedWords = snap.clearedWords.slice();
    const map = {};
    snap.cardStatuses.forEach(function (s) {
      map[s.id] = s.status;
    });
    state.cards.forEach(function (c) {
      if (map[c.id]) c.status = map[c.id];
    });
    state.status = "playing";
    return { ok: true, reason: null, cardId: snap.cardId };
  }

  /**
   * 洗牌：剩余在棋盘上的牌互换位置（含层级），牌面内容跟着走。
   */
  function shuffleBoard(state, rand) {
    if (state.status !== "playing") {
      return { ok: false, reason: "not-playing" };
    }
    if (state.shuffleLeft <= 0) {
      return { ok: false, reason: "no-shuffles" };
    }
    const remaining = state.cards.filter(function (c) {
      return c.status === "board";
    });
    if (remaining.length < 2) {
      return { ok: false, reason: "not-enough-cards" };
    }
    const positions = remaining.map(function (c) {
      return {
        x: c.x,
        y: c.y,
        width: c.width,
        height: c.height,
        layer: c.layer,
        lx: c.lx,
        ly: c.ly,
        lwidth: c.lwidth,
        lheight: c.lheight,
      };
    });
    shuffleInPlace(positions, rand);
    remaining.forEach(function (c, i) {
      const p = positions[i];
      c.x = p.x;
      c.y = p.y;
      c.width = p.width;
      c.height = p.height;
      c.layer = p.layer;
      c.lx = p.lx;
      c.ly = p.ly;
      c.lwidth = p.lwidth;
      c.lheight = p.lheight;
    });
    state.shuffleLeft -= 1;
    return { ok: true, reason: null };
  }

  /**
   * 窗口尺寸变化时，按逻辑坐标重新投影到新棋盘。
   */
  function refitCards(state, boardW, boardH) {
    const fitted = fitSlots(state.logicalSlots, boardW, boardH, 10);
    const byKey = {};
    fitted.forEach(function (s) {
      byKey[s.lx + "," + s.ly + "," + s.layer] = s;
    });
    state.cards.forEach(function (c) {
      const s = byKey[c.lx + "," + c.ly + "," + c.layer];
      if (!s) return;
      c.x = s.x;
      c.y = s.y;
      c.width = s.width;
      c.height = s.height;
    });
  }


  /**
   * 判断当前牌面是否能被「先凑齐、再延伸、最多同时开 2 组」的策略过关。
   * 用于发牌筛选，保证关卡原则上可解。洗牌使用传入的随机源，步骤有上限。
   */
  function isGreedilySolvable(state, rand) {
    const r = rand || Math.random;
    const maxSteps = 500;
    let lastUndo = -99;
    for (let step = 0; step < maxSteps; step++) {
      if (state.status === "won") return true;
      if (state.status === "lost") {
        if (state.undoLeft > 0 && state.history.length) {
          undo(state);
          lastUndo = step;
          continue;
        }
        return false;
      }

      const free = getFreeCards(state.cards);
      const trayCards = state.tray.map(function (id) {
        return findCard(state, id);
      });
      const groups = {};
      trayCards.forEach(function (card) {
        if (!card) return;
        if (!groups[card.wordId]) groups[card.wordId] = {};
        groups[card.wordId][card.type] = true;
      });
      const openWords = Object.keys(groups);
      const space = TRAY_SIZE - state.tray.length;
      const freeByWord = {};
      free.forEach(function (c) {
        if (!freeByWord[c.wordId]) freeByWord[c.wordId] = [];
        freeByWord[c.wordId].push(c);
      });
      function gsize(wid) {
        return groups[wid] ? Object.keys(groups[wid]).length : 0;
      }
      function hasType(wid, typ) {
        return !!(groups[wid] && groups[wid][typ]);
      }

      let choice = free.find(function (c) {
        return gsize(c.wordId) === 2 && !hasType(c.wordId, c.type);
      });

      if (!choice && space >= 3) {
        const ready = Object.keys(freeByWord).find(function (wid) {
          if (gsize(wid) !== 0) return false;
          const types = {};
          freeByWord[wid].forEach(function (c) {
            types[c.type] = true;
          });
          return types.en && types.zh && types.img;
        });
        if (ready) choice = freeByWord[ready][0];
      }

      if (!choice) {
        choice = free.find(function (c) {
          return gsize(c.wordId) > 0 && !hasType(c.wordId, c.type);
        });
      }

      if (!choice && openWords.length < 2 && space >= 3) {
        const candidates = free.filter(function (c) {
          return gsize(c.wordId) === 0;
        });
        candidates.sort(function (a, b) {
          return (freeByWord[b.wordId] || []).length - (freeByWord[a.wordId] || []).length;
        });
        if (candidates.length) choice = candidates[0];
      }

      if (choice) {
        const res = pickCard(state, choice.id);
        if (!res.ok) return false;
        continue;
      }

      if (state.shuffleLeft > 0) {
        shuffleBoard(state, r);
        continue;
      }
      if (state.undoLeft > 0 && state.history.length && step - lastUndo > 1) {
        undo(state);
        lastUndo = step;
        continue;
      }
      if (space > 0 && free.length) {
        const res = pickCard(state, free[0].id);
        if (!res.ok) return false;
        continue;
      }
      return false;
    }
    return state.status === "won";
  }

  const api = {
    TRAY_SIZE: TRAY_SIZE,
    TYPES: TYPES,
    CARD_W: CARD_W,
    CARD_H: CARD_H,
    clone: clone,
    shuffleInPlace: shuffleInPlace,
    getLevelConfig: getLevelConfig,
    generateSlots: generateSlots,
    fitSlots: fitSlots,
    makeDeck: makeDeck,
    createLevel: createLevel,
    isBlocked: isBlocked,
    getFreeCards: getFreeCards,
    findCard: findCard,
    insertIntoTray: insertIntoTray,
    findCompleteSet: findCompleteSet,
    remainingSetCount: remainingSetCount,
    boardCleared: boardCleared,
    pickCard: pickCard,
    undo: undo,
    shuffleBoard: shuffleBoard,
    refitCards: refitCards,
    isGreedilySolvable: isGreedilySolvable,
    REVIEW_STORAGE_KEY: REVIEW_STORAGE_KEY,
    reviewSlotCount: reviewSlotCount,
    injectReviewWords: injectReviewWords,
    createReviewBag: createReviewBag,
    markProblematic: markProblematic,
    markCleanClear: markCleanClear,
    problematicWordIds: problematicWordIds,
    saveReviewBag: saveReviewBag,
    loadReviewBag: loadReviewBag,
    selectReviewIds: selectReviewIds,
  };

  root.WordMatchLogic = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
