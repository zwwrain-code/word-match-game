#!/usr/bin/env node
/**
 * 单词消消看 — 逻辑冒烟测试（Node）
 */
"use strict";

require("../js/words.js");
require("../js/logic.js");

const Words = globalThis.WordMatchWords;
const Logic = globalThis.WordMatchLogic;

Words.setActivePack("fun");

let passed = 0;
let failed = 0;
const errors = [];

function assert(cond, name, detail) {
  if (cond) {
    passed += 1;
    console.log("  OK  " + name);
  } else {
    failed += 1;
    const msg = "  FAIL  " + name + (detail ? " — " + detail : "");
    errors.push(msg);
    console.log(msg);
  }
}


function spreadCards(state) {
  // 规则测试用：把牌摊开，避免叠放挡住点选。布局测试不走这里。
  state.cards.forEach(function (c, i) {
    c.x = (i % 6) * 100;
    c.y = Math.floor(i / 6) * 120;
    c.width = 80;
    c.height = 88;
    c.layer = 0;
  });
  return state;
}

function seededRand(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

console.log("1) 词库与关卡配置");
assert(Object.keys(Words.WORDS).length >= 17, "词库不少于 17 个单词");
assert(Words.LEVELS.length === 3, "恰好 3 关");
Words.LEVELS.forEach(function (lv) {
  assert(lv.words.length * 3 === (lv.id === 1 ? 18 : lv.id === 2 ? 27 : 36), "第 " + lv.id + " 关卡片数为 3 的倍数");
  lv.words.forEach(function (id) {
    assert(!!Words.WORDS[id], "单词存在: " + id);
    assert(!!Words.getIllustration(id) && Words.getIllustration(id).indexOf(".jpg") !== -1, "配图路径存在: " + id);
    assert(Words.getImageSrc(id) === "assets/word-" + id + ".jpg", "配图为 jpg: " + id);
  });
  const unique = new Set(lv.words);
  assert(unique.size === lv.words.length, "第 " + lv.id + " 关单词不重复");
});
assert(Words.LEVELS[0].words.length === 6, "第 1 关约 6 组");
assert(Words.LEVELS[1].words.length >= 8 && Words.LEVELS[1].words.length <= 10, "第 2 关 8–10 组");
assert(Words.LEVELS[2].words.length >= 10 && Words.LEVELS[2].words.length <= 12, "第 3 关 10–12 组");
assert(Words.LEVELS[0].undo >= 1 && Words.LEVELS[0].shuffle >= 1, "第 1 关有道具");

console.log("\n2) 关卡生成不变量");
Words.LEVELS.forEach(function (lv) {
  const state = Logic.createLevel(lv.id, 360, 500, seededRand(42 + lv.id));
  const expected = lv.words.length * 3;
  assert(state.cards.length === expected, "第 " + lv.id + " 关生成 " + expected + " 张牌", "实际 " + state.cards.length);
  const slots = Logic.generateSlots(lv.layout);
  assert(slots.length === expected, "第 " + lv.id + " 关槽位数匹配");

  const byWord = {};
  state.cards.forEach(function (c) {
    byWord[c.wordId] = byWord[c.wordId] || {};
    byWord[c.wordId][c.type] = (byWord[c.wordId][c.type] || 0) + 1;
  });
  lv.words.forEach(function (id) {
    const t = byWord[id] || {};
    assert(t.en === 1 && t.zh === 1 && t.img === 1, "第 " + lv.id + " 关 " + id + " 三种牌各一张", JSON.stringify(t));
  });

  const free = Logic.getFreeCards(state.cards);
  const blocked = state.cards.length - free.length;
  const layers = {};
  slots.forEach(function (s) {
    layers[s.layer] = (layers[s.layer] || 0) + 1;
  });
  const layerCount = Object.keys(layers).length;
  assert(free.length >= 3, "第 " + lv.id + " 关开局至少 3 张空闲牌", "空闲 " + free.length);
  assert(blocked >= 3, "第 " + lv.id + " 关开局有被挡的牌（叠放）", "被挡 " + blocked + "，层 " + JSON.stringify(layers));
  assert(free.length < state.cards.length, "第 " + lv.id + " 关不是平铺");
  assert(layerCount >= 3, "第 " + lv.id + " 关至少 3 层", "层数 " + layerCount);
  if (lv.id === 1) {
    assert(layerCount === 3, "第 1 关为 3 层牌山", "层数 " + layerCount + " " + JSON.stringify(layers));
    assert(layers[0] === 12 && layers[1] === 4 && layers[2] === 2, "第 1 关层数 12+4+2", JSON.stringify(layers));
  }
  if (lv.id === 2) {
    assert(layerCount >= 4, "第 2 关至少 4 层", JSON.stringify(layers));
  }
  if (lv.id === 3) {
    assert(layerCount >= 5, "第 3 关至少 5 层", JSON.stringify(layers));
  }
  // 半格网格：同层相邻间距约为牌宽+小缝
  const same = slots.filter(function (s) { return s.layer === 0; }).sort(function (a, b) { return a.y - b.y || a.x - b.x; });
  let minGap = Infinity;
  for (let i = 0; i < same.length; i++) {
    for (let j = i + 1; j < same.length; j++) {
      if (Math.abs(same[i].y - same[j].y) > 1) continue;
      const gap = same[j].x - (same[i].x + same[i].width);
      if (gap >= -0.5 && gap < minGap) minGap = gap;
    }
  }
  assert(minGap >= -0.5 && minGap <= 5, "第 " + lv.id + " 关同层牌紧贴（缝隙 0–4px）", "缝隙 " + minGap);
  assert(state.tray.length === 0, "开局托盘为空");
  assert(state.status === "playing", "开局状态为 playing");
  assert(state.undoLeft === lv.undo && state.shuffleLeft === lv.shuffle, "道具次数正确");
});

console.log("\n3) 遮挡判定");
(function () {
  const base = { id: "a", status: "board", x: 0, y: 0, width: 80, height: 96, layer: 0 };
  const cover = { id: "b", status: "board", x: 20, y: 20, width: 80, height: 96, layer: 1 };
  // base center = (40, 48), inside cover [20,100] x [20,116]
  assert(Logic.isBlocked(base, [base, cover]) === true, "中心被上层牌盖住则挡住");
  const miss = { id: "c", status: "board", x: 80, y: 0, width: 80, height: 96, layer: 1 };
  // center (40,48) not in [80,160] x [0,96]
  assert(Logic.isBlocked(base, [base, miss]) === false, "上层牌未盖住中心则不挡");
  const sameLayer = { id: "d", status: "board", x: 20, y: 20, width: 80, height: 96, layer: 0 };
  assert(Logic.isBlocked(base, [base, sameLayer]) === false, "同层牌不互相遮挡");
  const removed = { id: "e", status: "cleared", x: 20, y: 20, width: 80, height: 96, layer: 1 };
  assert(Logic.isBlocked(base, [base, removed]) === false, "已消除的牌不再遮挡");
  const lower = { id: "f", status: "board", x: 20, y: 20, width: 80, height: 96, layer: -1 };
  assert(Logic.isBlocked(base, [base, lower]) === false, "下层牌不遮挡上层");
})();

console.log("\n4) 托盘归类与三张消除");
(function () {
  const cards = [
    { id: "1", wordId: "cat", type: "en", status: "tray" },
    { id: "2", wordId: "dog", type: "zh", status: "tray" },
    { id: "3", wordId: "cat", type: "zh", status: "tray" },
    { id: "4", wordId: "cat", type: "img", status: "board" },
  ];
  const tray = Logic.insertIntoTray(["1", "2"], "3", cards);
  assert(JSON.stringify(tray) === JSON.stringify(["1", "3", "2"]), "相关牌自动靠拢", JSON.stringify(tray));

  const mid = Logic.insertIntoTray(["1", "3", "2"], "4", cards);
  assert(JSON.stringify(mid) === JSON.stringify(["1", "3", "4", "2"]), "第三张插入同单词组末尾", JSON.stringify(mid));

  const complete = Logic.findCompleteSet(["1", "3", "4", "2"], cards);
  assert(!!complete && complete.wordId === "cat", "英+中+图凑齐可消除");
  assert(complete.cardIds.slice().sort().join(",") === "1,3,4", "消除的是该单词的三张");

  const partial = Logic.findCompleteSet(["1", "3", "2"], cards);
  assert(partial === null, "只有两张同单词不可消除");

  const mixed = Logic.findCompleteSet(["1", "2"], cards);
  assert(mixed === null, "不同单词不可消除");
})();

console.log("\n5) 点选、消除、胜负");
(function () {
  const state = spreadCards(Logic.createLevel(1, 360, 500, seededRand(7)));
  const catCards = state.cards.filter(function (c) {
    return c.wordId === "cat";
  });
  assert(catCards.length === 3, "找到 cat 三张");

  catCards.forEach(function (c) {
    const r = Logic.pickCard(state, c.id);
    assert(r.ok, "点选 " + c.type + " 成功");
  });
  const matched = state.history.length === 3;
  assert(state.clearedWords.indexOf("cat") !== -1, "cat 已被消除");
  assert(state.tray.length === 0, "消除后托盘清空");
  assert(
    catCards.every(function (c) {
      return Logic.findCard(state, c.id).status === "cleared";
    }),
    "三张状态为 cleared"
  );
  assert(state.status === "playing", "尚未通关，仍在进行");
  assert(Logic.remainingSetCount(state) === 5, "剩余 5 组");

  // 撤销应恢复最后一次（含消除）
  const u = Logic.undo(state);
  assert(u.ok, "撤销成功");
  assert(state.clearedWords.indexOf("cat") === -1, "撤销后单词回到未消除");
  assert(state.tray.length === 2, "撤销后托盘剩两张", "实际 " + state.tray.length);
  assert(state.undoLeft === Logic.getLevelConfig(1).undo - 1, "撤销次数减 1");
})();

console.log("\n6) 槽位满了失败，第 7 张凑齐则不失败");
(function () {
  const state = spreadCards(Logic.createLevel(1, 360, 500, seededRand(11)));
  // 取 7 张不同组、且凑不齐的牌：每组只取 1 张
  const seen = {};
  const picks = [];
  state.cards.forEach(function (c) {
    if (picks.length >= 7) return;
    if (seen[c.wordId]) return;
    seen[c.wordId] = true;
    picks.push(c);
  });
  assert(picks.length === 6, "第 1 关只有 6 组，最多 6 张不同单词");
  // 第 7 张取已在托盘中某单词的重复类型？每种类型每组只有一张。
  // 所以 6 组无法装满 7 格而不产生完整组？可以：6 张不同单词 + 其中一词的第二张类型 = 7 张且无一完整组。
  picks.forEach(function (c) {
    Logic.pickCard(state, c.id);
  });
  const extra = state.cards.find(function (c) {
    return c.status === "board" && c.wordId === picks[0].wordId;
  });
  const r = Logic.pickCard(state, extra.id);
  assert(r.ok, "第 7 张可放入");
  assert(state.status === "lost", "7 张未凑齐则失败");
  assert(r.events.some(function (e) { return e.type === "lost"; }), "产生 lost 事件");
})();

(function () {
  const state = spreadCards(Logic.createLevel(1, 360, 500, seededRand(13)));
  const seen = {};
  const singles = [];
  state.cards.forEach(function (c) {
    if (singles.length >= 6) return;
    if (seen[c.wordId]) return;
    seen[c.wordId] = true;
    singles.push(c);
  });
  // 先放 5 张不同单词，再放某一单词剩下的两张，第 7 张凑齐
  const firstWord = singles[0].wordId;
  const rest = state.cards.filter(function (c) {
    return c.wordId === firstWord && c.id !== singles[0].id;
  });
  singles.slice(0, 5).forEach(function (c) {
    Logic.pickCard(state, c.id);
  });
  rest.forEach(function (c) {
    Logic.pickCard(state, c.id);
  });
  assert(state.status === "playing", "第 7 张凑齐时不失败", "status=" + state.status + " tray=" + state.tray.length);
  assert(state.clearedWords.indexOf(firstWord) !== -1, "第 7 张凑齐后该组被消除");
  assert(state.tray.length === 4, "消除后托盘剩 4 张无关牌", "实际 " + state.tray.length);
})();

console.log("\n7) 洗牌与通关");
(function () {
  const state = Logic.createLevel(2, 360, 500, seededRand(21));
  const before = state.cards
    .filter(function (c) { return c.status === "board"; })
    .map(function (c) { return c.id + ":" + c.lx + "," + c.ly + "," + c.layer; })
    .slice()
    .sort();
  const s = Logic.shuffleBoard(state, seededRand(99));
  assert(s.ok, "洗牌成功");
  assert(state.shuffleLeft === Logic.getLevelConfig(2).shuffle - 1, "洗牌次数减 1");
  const afterIds = state.cards.filter(function (c) { return c.status === "board"; }).map(function (c) { return c.id; });
  assert(afterIds.length === before.length, "洗牌不改变剩余牌数");
  const positions = state.logicalSlots.length;
  assert(positions === 27, "第 2 关逻辑槽位仍为 27");

  // 清空第 1 关验证获胜
  const winState = spreadCards(Logic.createLevel(1, 360, 500, seededRand(3)));
  const words = winState.wordIds.slice();
  words.forEach(function (wid) {
    winState.cards
      .filter(function (c) { return c.wordId === wid; })
      .forEach(function (c) { Logic.pickCard(winState, c.id); });
  });
  assert(winState.status === "won", "全部消除则获胜");
  assert(Logic.boardCleared(winState), "棋盘已清空");
  const noPick = Logic.pickCard(winState, winState.cards[0].id);
  assert(!noPick.ok, "胜利后不可再点选");
})();

console.log("\n8) 贪心通关（含道具）");
function greedyPlay(levelId, seed) {
  const state = Logic.createLevel(levelId, 360, 500, seededRand(seed));
  const maxSteps = 500;
  let lastUndoAt = -99;
  for (let step = 0; step < maxSteps; step++) {
    if (state.status === "won") return { ok: true, steps: step, status: state.status };
    if (state.status === "lost") {
      if (state.undoLeft > 0 && state.history.length) {
        Logic.undo(state);
        lastUndoAt = step;
        continue;
      }
      return { ok: false, steps: step, status: "lost" };
    }

    const free = Logic.getFreeCards(state.cards);
    const trayCards = state.tray.map(function (id) {
      return Logic.findCard(state, id);
    });
    const groups = {};
    trayCards.forEach(function (t) {
      if (!t) return;
      if (!groups[t.wordId]) groups[t.wordId] = {};
      groups[t.wordId][t.type] = true;
    });
    const openWords = Object.keys(groups);
    const space = Logic.TRAY_SIZE - state.tray.length;

    const freeByWord = {};
    free.forEach(function (c) {
      if (!freeByWord[c.wordId]) freeByWord[c.wordId] = [];
      freeByWord[c.wordId].push(c);
    });

    function hasType(wordId, type) {
      return !!(groups[wordId] && groups[wordId][type]);
    }
    function groupSize(wordId) {
      return groups[wordId] ? Object.keys(groups[wordId]).length : 0;
    }

    let choice = null;

    // 优先凑齐一组
    choice = free.find(function (c) {
      return groupSize(c.wordId) === 2 && !hasType(c.wordId, c.type);
    });

    // 场上已有某单词的三种空闲牌，且托盘放得下，直接收掉
    if (!choice && space >= 3) {
      const ready = Object.keys(freeByWord).find(function (wid) {
        if (groupSize(wid) !== 0) return false;
        const types = {};
        freeByWord[wid].forEach(function (c) { types[c.type] = true; });
        return types.en && types.zh && types.img;
      });
      if (ready) choice = freeByWord[ready][0];
    }

    // 扩展已有组
    if (!choice) {
      choice = free.find(function (c) {
        return groupSize(c.wordId) > 0 && !hasType(c.wordId, c.type);
      });
    }

    // 未满 2 个未完成组、且至少还有 3 个空位时，开一个新组
    // 优先选“当前空闲牌最多”的单词
    if (!choice && openWords.length < 2 && space >= 3) {
      const candidates = free.filter(function (c) {
        return groupSize(c.wordId) === 0;
      });
      candidates.sort(function (a, b) {
        return (freeByWord[b.wordId] || []).length - (freeByWord[a.wordId] || []).length;
      });
      if (candidates.length) choice = candidates[0];
    }

    if (choice) {
      const r = Logic.pickCard(state, choice.id);
      if (!r.ok) return { ok: false, steps: step, status: "pick-fail:" + r.reason };
      continue;
    }

    // 无法安全推进时，先洗牌再撤销
    if (state.shuffleLeft > 0) {
      Logic.shuffleBoard(state, seededRand(seed + step + 31));
      continue;
    }
    if (state.undoLeft > 0 && state.history.length && step - lastUndoAt > 1) {
      Logic.undo(state);
      lastUndoAt = step;
      continue;
    }

    // 实在不行，若还有空位就硬开一组
    if (space > 0 && free.length) {
      const r = Logic.pickCard(state, free[0].id);
      if (!r.ok) return { ok: false, steps: step, status: "pick-fail:" + r.reason };
      continue;
    }
    return { ok: false, steps: step, status: "stuck" };
  }
  return { ok: state.status === "won", steps: maxSteps, status: state.status };
}

[1, 2, 3].forEach(function (levelId) {
  let wins = 0;
  const trials = 16;
  const details = [];
  for (let i = 0; i < trials; i++) {
    const rand = seededRand(100 * levelId + i * 17);
    const state = Logic.createLevel(levelId, 360, 500, rand);
    if (state.dealSolvable) wins += 1;
    else details.push("seed" + i + "@" + state.dealAttempts);
  }
  assert(wins === trials, "第 " + levelId + " 关发牌可解 " + trials + "/" + trials, "成功 " + wins + (details.length ? " " + details.join(", ") : ""));
});

console.log("\n9) 课程、单元和趣味入门");
(function () {
  const fs = require("fs");
  const path = require("path");
  const order = ["yilin3", "yilin4", "yilin5", "yilin6", "ket", "pet", "fun"];
  order.forEach(function (id) {
    assert(!!Words.getCourse(id), "课程存在: " + id);
  });
  ["yilin4", "yilin5", "yilin6", "ket", "pet"].forEach(function (id) {
    const course = Words.getCourse(id);
    assert(course.playable === false && course.comingSoon === true, id + " 标记为即将开放");
    assert(Words.setActiveCourse(id) === false, id + " 不能进入游戏");
    assert(Words.setActiveUnit(id, "x", "y") === false, id + " 没有可玩单元");
  });
  assert(Words.getCourse("yilin3").playable === true, "译林三年级可玩");
  assert(Words.getCourse("fun").playable === true && Words.getCourse("fun").secondary === true, "趣味入门是次要选项");
  assert(Words.DISCLAIMER.indexOf("不是译林出版社的官方产品") !== -1, "有非官方说明");
  assert(Words.DISCLAIMER.indexOf("译林官方") === -1 && Words.DISCLAIMER.indexOf("正版教材") === -1, "说明里不写官方或正版");

  const books = Words.getBooks("yilin3");
  assert(books.length === 2 && books[0].name === "上册" && books[1].name === "下册", "三年级有上册和下册");
  const playable = [];
  const locked = [];
  books.forEach(function (book) {
    book.units.forEach(function (unit) {
      if (unit.playable) playable.push(book.id + ":" + unit.id);
      else locked.push(unit);
    });
  });
  assert(playable.join(",") === "3a:3a-u56,3a:3a-u78,3b:3b-u12,3b:3b-u34,3b:3b-u7", "可玩单元正确", playable.join(","));
  locked.forEach(function (unit) {
    assert(unit.playable === false && unit.levels.length === 0 && unit.reason, "未开放单元有原因: " + unit.label);
  });

  const sizes = { pile: 6, mountain: 9, peak: 12 };
  books.forEach(function (book) {
    book.units.forEach(function (unit) {
      if (!unit.playable) return;
      assert(unit.levels.length >= 1 && unit.levels.length <= 3, unit.label + " 有 1–3 关", String(unit.levels.length));
      const ok = Words.setActiveUnit("yilin3", book.id, unit.id);
      assert(ok, "可进入 " + unit.label);
      unit.levels.forEach(function (lv) {
        assert(sizes[lv.layout] === lv.words.length, unit.label + " 第 " + lv.id + " 关词数匹配布局", lv.layout + " " + lv.words.length);
        assert(lv.undo === 2 && lv.shuffle === 2, unit.label + " 第 " + lv.id + " 关道具为 2/2");
        const unique = {};
        lv.words.forEach(function (id) {
          unique[id] = true;
          const w = Words.getWord(id);
          assert(!!w && w.zh && w.en, unit.label + " 词条存在: " + id);
          assert(id.toLowerCase() !== "orange" && String(w.en).toLowerCase().indexOf("orange") === -1, "没有 orange: " + id);
        });
        assert(Object.keys(unique).length === lv.words.length, unit.label + " 第 " + lv.id + " 关不重复");
        const state = Logic.createLevel(lv.id, 360, 500, seededRand(80 + lv.id));
        assert(state.cards.length === lv.words.length * 3, unit.label + " 第 " + lv.id + " 关能发牌");
      });
    });
  });

  const all = Words.listPlayableWords();
  Object.keys(all).forEach(function (id) {
    const w = all[id];
    assert(String(id).toLowerCase() !== "orange" && String(w.en).toLowerCase().indexOf("orange") === -1, "词库不含 orange: " + id);
    const file = path.join(__dirname, "..", Words.getImageSrc(id));
    assert(fs.existsSync(file) && fs.statSync(file).size > 1000, "配图文件存在: " + id);
  });

  Words.setActivePack("fun");
  assert(Words.getActivePack().id === "fun", "可切回趣味入门");
  assert(Object.keys(Words.WORDS).length === 17, "趣味入门仍为 17 词", "实际 " + Object.keys(Words.WORDS).length);
  assert(!!Words.WORDS.cat && !!Words.WORDS.dog, "趣味入门保留 cat/dog");
  assert(Words.LEVELS.length === 3 && Words.LEVELS[0].words[0] === "cat", "趣味入门第 1 关仍以 cat 开头");
  assert(Words.LEVELS[0].layout === "pile" && Words.LEVELS[1].layout === "mountain" && Words.LEVELS[2].layout === "peak", "趣味入门仍用三层牌山");
})();

console.log("\n10) 复习词袋");
(function () {
  assert(Logic.reviewSlotCount(6, 0) === 0, "空词袋不塞复习");
  assert(Logic.reviewSlotCount(9, 1) === 1, "只有 1 个复习词时带 1 个");
  assert(Logic.reviewSlotCount(6, 2) === 2, "6 词关至少带 2 个复习词");
  assert(Logic.reviewSlotCount(9, 5) === 2, "9 词关大约四分之一");
  assert(Logic.reviewSlotCount(12, 8) === 3, "12 词关大约四分之一");

  Words.setActivePack("fun");
  const base = Words.LEVELS[1].words.slice();
  const mixed = Logic.injectReviewWords(base, ["cat", "panda", "nope"], function (id) {
    return !!Words.WORDS[id];
  });
  assert(mixed.words.length === base.length, "注入后词数不变");
  assert(mixed.reviewIds.join(",") === "cat,panda", "只注入词库里的复习词", mixed.reviewIds.join(","));
  mixed.reviewIds.forEach(function (id) {
    assert(mixed.words.indexOf(id) !== -1, "复习词出现在下一关: " + id);
  });
  assert(mixed.words.indexOf("nope") === -1, "不存在的词不会注入");

  const state = Logic.createLevel(2, 360, 500, seededRand(4), { reviewIds: ["cat", "panda"] });
  assert(state.wordIds.length === 9, "带复习的第 2 关仍是 9 组");
  assert(state.wordIds.indexOf("cat") !== -1 && state.wordIds.indexOf("panda") !== -1, "发牌包含复习词组");
  const triples = {};
  state.cards.forEach(function (c) {
    triples[c.wordId] = triples[c.wordId] || {};
    triples[c.wordId][c.type] = (triples[c.wordId][c.type] || 0) + 1;
  });
  assert(triples.cat.en === 1 && triples.cat.zh === 1 && triples.cat.img === 1, "复习词是完整的英中图");

  const bag = Logic.createReviewBag();
  Logic.markProblematic(bag, "cat", { reason: "undo", courseId: "fun", bookId: "fun-book", unitId: "fun-main" });
  Logic.markProblematic(bag, "dog", { reason: "failed", courseId: "yilin3", bookId: "3a", unitId: "3a-u56" });
  const memory = {
    data: {},
    getItem: function (key) { return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null; },
    setItem: function (key, value) { this.data[key] = String(value); },
  };
  Logic.saveReviewBag(bag, memory);
  const loaded = Logic.loadReviewBag(memory);
  assert(loaded.items.cat && loaded.items.cat.reason === "undo", "复习词袋可以存进本地存储再读回");
  Logic.markCleanClear(loaded, "cat");
  assert(!loaded.items.cat && !!loaded.items.dog, "干净消除后离开词袋");

  const lost = spreadCards(Logic.createLevel(1, 360, 500, seededRand(9)));
  const seen = {};
  lost.cards.forEach(function (c) {
    if (Object.keys(seen).length >= 6) return;
    if (seen[c.wordId]) return;
    seen[c.wordId] = c;
  });
  Object.keys(seen).forEach(function (id) {
    Logic.pickCard(lost, seen[id].id);
  });
  const extra = lost.cards.find(function (c) {
    return c.status === "board" && c.wordId === Object.keys(seen)[0];
  });
  Logic.pickCard(lost, extra.id);
  assert(lost.status === "lost", "失败局面已形成");
  const stuck = Logic.problematicWordIds(lost);
  assert(stuck.length >= 1, "失败时记下还在槽里或牌山上的词");
  stuck.forEach(function (id) {
    const still = lost.cards.some(function (c) {
      return c.wordId === id && (c.status === "board" || c.status === "tray");
    });
    assert(still, "记下的词确实还没消除: " + id);
  });
  const cleared = lost.clearedWords.filter(function (id) {
    return stuck.indexOf(id) !== -1;
  });
  assert(cleared.length === 0, "已经消除的词不进失败词袋");

  const nextBag = Logic.createReviewBag();
  Logic.markProblematic(nextBag, "bird", { reason: "undo", bookId: "3a", unitId: "3a-u56" });
  Logic.markProblematic(nextBag, "cap", { reason: "failed", bookId: "3a", unitId: "3a-u56" });
  Logic.markProblematic(nextBag, "pig", { reason: "failed", bookId: "3b", unitId: "3b-u7" });
  const same = Logic.selectReviewIds(nextBag, { mode: "next-level", unitId: "3a-u56", bookId: "3a" }, function () { return true; });
  assert(same.indexOf("bird") !== -1 && same.indexOf("cap") !== -1 && same.indexOf("pig") === -1, "同一单元的下一关只带这一单元的词");
  const later = Logic.selectReviewIds(nextBag, { mode: "later-unit", bookId: "3a" }, function () { return true; });
  assert(later.length === 2 && later.indexOf("pig") === -1, "同一册后面的单元只带两个复习词");

  Words.setActivePack("fun");
})();

console.log("\n==========");
console.log("通过 " + passed + "，失败 " + failed);
if (failed) {
  console.log("失败项：");
  errors.forEach(function (e) { console.log(e); });
  process.exit(1);
}
