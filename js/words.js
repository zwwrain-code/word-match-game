/**
 * 单词消消看 — 词库与配图
 * 配图为 assets/word-{id}.jpg 的写实照片，不依赖设备 emoji 或旧版 SVG。
 * 包含「译林版」与「趣味入门」两套词包，WORDS / LEVELS 随当前包切换。
 */
(function (root) {
  "use strict";

  const FUN_WORDS = {
    cat: { id: "cat", en: "cat", zh: "猫", category: "animal" },
    dog: { id: "dog", en: "dog", zh: "狗", category: "animal" },
    bird: { id: "bird", en: "bird", zh: "鸟", category: "animal" },
    fish: { id: "fish", en: "fish", zh: "鱼", category: "animal" },
    rabbit: { id: "rabbit", en: "rabbit", zh: "兔子", category: "animal" },
    panda: { id: "panda", en: "panda", zh: "熊猫", category: "animal" },
    duck: { id: "duck", en: "duck", zh: "鸭子", category: "animal" },
    apple: { id: "apple", en: "apple", zh: "苹果", category: "fruit" },
    banana: { id: "banana", en: "banana", zh: "香蕉", category: "fruit" },
    grape: { id: "grape", en: "grape", zh: "葡萄", category: "fruit" },
    watermelon: { id: "watermelon", en: "watermelon", zh: "西瓜", category: "fruit" },
    strawberry: { id: "strawberry", en: "strawberry", zh: "草莓", category: "fruit" },
    red: { id: "red", en: "red", zh: "红色", category: "color" },
    blue: { id: "blue", en: "blue", zh: "蓝色", category: "color" },
    yellow: { id: "yellow", en: "yellow", zh: "黄色", category: "color" },
    green: { id: "green", en: "green", zh: "绿色", category: "color" },
    pink: { id: "pink", en: "pink", zh: "粉色", category: "color" },
  };

  const FUN_LEVELS = [
    {
      id: 1,
      name: "入门",
      words: ["cat", "dog", "bird", "apple", "banana", "red"],
      undo: 2,
      shuffle: 2,
      layout: "pile",
    },
    {
      id: 2,
      name: "小挑战",
      words: ["dog", "bird", "fish", "rabbit", "apple", "grape", "watermelon", "blue", "yellow"],
      undo: 2,
      shuffle: 2,
      layout: "mountain",
    },
    {
      id: 3,
      name: "大挑战",
      words: [
        "cat",
        "fish",
        "rabbit",
        "panda",
        "duck",
        "banana",
        "strawberry",
        "watermelon",
        "grape",
        "green",
        "pink",
        "yellow",
      ],
      undo: 2,
      shuffle: 2,
      layout: "peak",
    },
  ];

  const YILIN_WORDS = {
    red: { id: "red", en: "red", zh: "红色", category: "color" },
    yellow: { id: "yellow", en: "yellow", zh: "黄色", category: "color" },
    blue: { id: "blue", en: "blue", zh: "蓝色", category: "color" },
    green: { id: "green", en: "green", zh: "绿色", category: "color" },
    cap: { id: "cap", en: "cap", zh: "帽子", category: "clothes" },
    jacket: { id: "jacket", en: "jacket", zh: "夹克衫", category: "clothes" },
    cake: { id: "cake", en: "cake", zh: "蛋糕", category: "food" },
    egg: { id: "egg", en: "egg", zh: "鸡蛋", category: "food" },
    pencil: { id: "pencil", en: "pencil", zh: "铅笔", category: "stationery" },
    schoolbag: { id: "schoolbag", en: "schoolbag", zh: "书包", category: "stationery" },
    book: { id: "book", en: "book", zh: "书", category: "stationery" },
    ruler: { id: "ruler", en: "ruler", zh: "尺", category: "stationery" },
    bird: { id: "bird", en: "bird", zh: "鸟", category: "animal" },
    duck: { id: "duck", en: "duck", zh: "鸭子", category: "animal" },
    pig: { id: "pig", en: "pig", zh: "猪", category: "animal" },
    cow: { id: "cow", en: "cow", zh: "奶牛", category: "animal" },
    apple: { id: "apple", en: "apple", zh: "苹果", category: "fruit" },
    pear: { id: "pear", en: "pear", zh: "梨", category: "fruit" },
  };

  const YILIN_LEVELS = [
    {
      id: 1,
      name: "入门",
      words: ["red", "yellow", "blue", "cap", "cake", "apple"],
      undo: 2,
      shuffle: 2,
      layout: "pile",
    },
    {
      id: 2,
      name: "小挑战",
      words: ["green", "jacket", "egg", "pencil", "schoolbag", "book", "ruler", "bird", "pear"],
      undo: 2,
      shuffle: 2,
      layout: "mountain",
    },
    {
      id: 3,
      name: "大挑战",
      words: [
        "apple",
        "cake",
        "book",
        "bird",
        "duck",
        "pig",
        "cow",
        "pear",
        "pencil",
        "schoolbag",
        "cap",
        "egg",
      ],
      undo: 2,
      shuffle: 2,
      layout: "peak",
    },
  ];

  const PACKS = {
    fun: {
      id: "fun",
      name: "趣味入门",
      subtitle: "",
      previewWord: "cat",
      tipWord: "dog",
      words: FUN_WORDS,
      levels: FUN_LEVELS,
    },
    yilin: {
      id: "yilin",
      name: "译林版",
      subtitle: "译林版小学英语三年级",
      previewWord: "apple",
      tipWord: "apple",
      words: YILIN_WORDS,
      levels: YILIN_LEVELS,
    },
  };

  let activePackId = "yilin";

  function getActivePack() {
    return PACKS[activePackId] || PACKS.yilin;
  }

  function setActivePack(id) {
    if (!PACKS[id]) return false;
    activePackId = id;
    return true;
  }

  function getImageSrc(wordId) {
    return "assets/word-" + wordId + ".jpg";
  }

  function getIllustration(wordId) {
    const w = getWord(wordId);
    if (!w) return "";
    const src = getImageSrc(wordId);
    return (
      '<img class="word-photo" src="' +
      src +
      '" alt="' +
      w.en +
      '" draggable="false">'
    );
  }

  function getWord(wordId) {
    return getActivePack().words[wordId];
  }

  const api = {
    PACKS: PACKS,
    setActivePack: setActivePack,
    getActivePack: getActivePack,
    getImageSrc: getImageSrc,
    getIllustration: getIllustration,
    getWord: getWord,
  };

  Object.defineProperty(api, "WORDS", {
    enumerable: true,
    get: function () {
      return getActivePack().words;
    },
  });

  Object.defineProperty(api, "LEVELS", {
    enumerable: true,
    get: function () {
      return getActivePack().levels;
    },
  });

  root.WordMatchWords = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
