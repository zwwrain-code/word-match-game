/**
 * 单词消消看 — 词库与配图
 * 配图为 assets/word-{id}.jpg 的写实照片，不依赖设备 emoji 或旧版 SVG。
 */
(function (root) {
  "use strict";

  const WORDS = {
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

  const LEVELS = [
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

  function getImageSrc(wordId) {
    return "assets/word-" + wordId + ".jpg";
  }

  function getIllustration(wordId) {
    const w = WORDS[wordId];
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
    return WORDS[wordId];
  }

  const api = {
    WORDS: WORDS,
    LEVELS: LEVELS,
    getImageSrc: getImageSrc,
    getIllustration: getIllustration,
    getWord: getWord,
  };

  root.WordMatchWords = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
