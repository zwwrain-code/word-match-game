/**
 * 单词消消看 — 词库、课程与配图
 * 配图为 assets/word-{id}.jpg 的写实照片。
 * 译林三年级按上册 / 下册和单元来选；四至六年级、KET、PET 只在菜单里占位。
 * 词表来自公开流传的译林小学英语三年级起点常见名词，不是官方教材文本。
 */
(function (root) {
  "use strict";

  const DISCLAIMER =
    "适合学习江苏译林小学英语。本游戏由创界科技制作，不是译林出版社的官方产品。";

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

  function word(id, en, zh, category) {
    return { id: id, en: en, zh: zh, category: category };
  }

  const YILIN_WORDS = {
    red: word("red", "red", "红色", "color"),
    yellow: word("yellow", "yellow", "黄色", "color"),
    blue: word("blue", "blue", "蓝色", "color"),
    green: word("green", "green", "绿色", "color"),
    black: word("black", "black", "黑色", "color"),
    brown: word("brown", "brown", "棕色", "color"),
    white: word("white", "white", "白色", "color"),
    cap: word("cap", "cap", "帽子", "clothes"),
    jacket: word("jacket", "jacket", "夹克衫", "clothes"),
    tshirt: word("tshirt", "T-shirt", "T恤衫", "clothes"),
    skirt: word("skirt", "skirt", "裙子", "clothes"),
    pie: word("pie", "pie", "馅饼", "food"),
    cake: word("cake", "cake", "蛋糕", "food"),
    icecream: word("icecream", "ice cream", "冰淇淋", "food"),
    sweet: word("sweet", "sweet", "糖果", "food"),
    hotdog: word("hotdog", "hot dog", "热狗", "food"),
    egg: word("egg", "egg", "鸡蛋", "food"),
    doll: word("doll", "doll", "玩具娃娃", "toy"),
    ball: word("ball", "ball", "球", "toy"),
    robot: word("robot", "robot", "机器人", "toy"),
    cd: word("cd", "CD", "光盘", "toy"),
    car: word("car", "car", "小汽车", "toy"),
    toy: word("toy", "toy", "玩具", "toy"),
    door: word("door", "door", "门", "school"),
    window: word("window", "window", "窗户", "school"),
    blackboard: word("blackboard", "blackboard", "黑板", "school"),
    book: word("book", "book", "书", "school"),
    milk: word("milk", "milk", "牛奶", "food"),
    library: word("library", "library", "图书馆", "school"),
    pencil: word("pencil", "pencil", "铅笔", "school"),
    schoolbag: word("schoolbag", "schoolbag", "书包", "school"),
    pen: word("pen", "pen", "钢笔", "school"),
    crayon: word("crayon", "crayon", "蜡笔", "school"),
    ruler: word("ruler", "ruler", "尺", "school"),
    pencilcase: word("pencilcase", "pencil case", "铅笔盒", "school"),
    rubber: word("rubber", "rubber", "橡皮", "school"),
    bird: word("bird", "bird", "鸟", "animal"),
    desk: word("desk", "desk", "书桌", "school"),
    chair: word("chair", "chair", "椅子", "school"),
    tree: word("tree", "tree", "树", "nature"),
    pig: word("pig", "pig", "猪", "animal"),
    cow: word("cow", "cow", "奶牛", "animal"),
    apple: word("apple", "apple", "苹果", "fruit"),
    pear: word("pear", "pear", "梨", "fruit"),
    chicken: word("chicken", "chicken", "鸡", "animal"),
    duck: word("duck", "duck", "鸭子", "animal"),
  };

  function level(id, name, words, layout) {
    return { id: id, name: name, words: words, undo: 2, shuffle: 2, layout: layout };
  }

  function lockedUnit(id, label, title, reason) {
    return {
      id: id,
      label: label,
      title: title,
      playable: false,
      reason: reason,
      words: [],
      levels: [],
    };
  }

  function playableUnit(id, label, title, words, levels) {
    return {
      id: id,
      label: label,
      title: title,
      playable: true,
      reason: "",
      words: words,
      levels: levels,
    };
  }

  const BOOK_3A_UNITS = [
    lockedUnit("3a-u1", "第1单元", "打招呼", "这一单元主要是问候，没有适合画成图片的名词。"),
    lockedUnit("3a-u2", "第2单元", "自我介绍", "这一单元主要是语法和称呼，没有适合画成图片的名词。"),
    lockedUnit("3a-u3", "第3单元", "朋友", "可画的具体名词太少，先不开放。"),
    lockedUnit("3a-u4", "第4单元", "家人", "家人称呼不在这一版的物品、颜色和动物词里。"),
    playableUnit(
      "3a-u56",
      "第5–6单元",
      "衣服和颜色",
      ["red", "yellow", "blue", "green", "black", "brown", "white", "cap", "jacket", "tshirt", "skirt"],
      [
        level(1, "入门", ["red", "yellow", "blue", "cap", "jacket", "skirt"], "pile"),
        level(2, "小挑战", ["green", "black", "brown", "white", "tshirt", "cap", "jacket", "red", "skirt"], "mountain"),
      ]
    ),
    playableUnit(
      "3a-u78",
      "第7–8单元",
      "食物和玩具",
      ["pie", "cake", "icecream", "sweet", "hotdog", "egg", "doll", "ball", "robot", "cd", "car", "toy"],
      [
        level(1, "入门", ["cake", "egg", "pie", "icecream", "sweet", "hotdog"], "pile"),
        level(2, "小挑战", ["doll", "ball", "robot", "car", "toy", "cd", "cake", "egg", "pie"], "mountain"),
        level(3, "大挑战", ["pie", "cake", "icecream", "sweet", "hotdog", "egg", "doll", "ball", "robot", "cd", "car", "toy"], "peak"),
      ]
    ),
  ];

  const BOOK_3B_UNITS = [
    playableUnit(
      "3b-u12",
      "第1–2单元",
      "教室",
      ["door", "window", "blackboard", "book", "milk", "library"],
      [level(1, "入门", ["door", "window", "blackboard", "book", "milk", "library"], "pile")]
    ),
    playableUnit(
      "3b-u34",
      "第3–4单元",
      "文具和身边",
      ["pencil", "schoolbag", "pen", "crayon", "ruler", "pencilcase", "rubber", "bird", "desk", "chair", "tree"],
      [
        level(1, "入门", ["pencil", "schoolbag", "pen", "ruler", "crayon", "rubber"], "pile"),
        level(2, "小挑战", ["pencilcase", "bird", "desk", "chair", "tree", "pencil", "pen", "ruler", "schoolbag"], "mountain"),
      ]
    ),
    lockedUnit("3b-u5", "第5单元", "年龄", "这一单元主要是数字，没有足够的可画名词。"),
    lockedUnit("3b-u6", "第6单元", "时间", "这一单元主要是时刻，可画的名词太少，先不和别的单元硬凑。"),
    playableUnit(
      "3b-u7",
      "第7单元",
      "农场",
      ["pig", "cow", "apple", "pear", "chicken", "duck"],
      [level(1, "入门", ["pig", "cow", "apple", "pear", "chicken", "duck"], "pile")]
    ),
    lockedUnit("3b-u8", "第8单元", "人物", "人物称呼不在这一版的物品、动物和食物词里。"),
  ];

  const COURSES = [
    {
      id: "yilin3",
      name: "译林三年级",
      playable: true,
      comingSoon: false,
      secondary: false,
      disclaimer: DISCLAIMER,
      books: [
        { id: "3a", name: "上册", units: BOOK_3A_UNITS },
        { id: "3b", name: "下册", units: BOOK_3B_UNITS },
      ],
    },
    { id: "yilin4", name: "译林四年级", playable: false, comingSoon: true, secondary: false, books: [] },
    { id: "yilin5", name: "译林五年级", playable: false, comingSoon: true, secondary: false, books: [] },
    { id: "yilin6", name: "译林六年级", playable: false, comingSoon: true, secondary: false, books: [] },
    { id: "ket", name: "KET", playable: false, comingSoon: true, secondary: false, books: [] },
    { id: "pet", name: "PET", playable: false, comingSoon: true, secondary: false, books: [] },
    {
      id: "fun",
      name: "趣味入门",
      playable: true,
      comingSoon: false,
      secondary: true,
      disclaimer: "",
      books: [
        {
          id: "fun-book",
          name: "趣味入门",
          units: [
            playableUnit("fun-main", "趣味入门", "趣味入门", Object.keys(FUN_WORDS), FUN_LEVELS),
          ],
        },
      ],
    },
  ];

  let activeCourseId = "fun";
  let activeBookId = "fun-book";
  let activeUnitId = "fun-main";

  function findCourse(id) {
    for (let i = 0; i < COURSES.length; i++) {
      if (COURSES[i].id === id) return COURSES[i];
    }
    return null;
  }

  function findBook(course, bookId) {
    if (!course || !course.books) return null;
    for (let i = 0; i < course.books.length; i++) {
      if (course.books[i].id === bookId) return course.books[i];
    }
    return null;
  }

  function findUnit(book, unitId) {
    if (!book || !book.units) return null;
    for (let i = 0; i < book.units.length; i++) {
      if (book.units[i].id === unitId) return book.units[i];
    }
    return null;
  }

  function lexiconFor(courseId) {
    if (courseId === "fun") return FUN_WORDS;
    if (courseId === "yilin3") return YILIN_WORDS;
    return null;
  }

  function getActiveCourse() {
    return findCourse(activeCourseId);
  }

  function getActiveBook() {
    return findBook(getActiveCourse(), activeBookId);
  }

  function getActiveUnit() {
    return findUnit(getActiveBook(), activeUnitId);
  }

  function getActivePack() {
    const course = getActiveCourse();
    const unit = getActiveUnit();
    const book = getActiveBook();
    return {
      id: activeCourseId,
      name: course ? course.name : "",
      subtitle: unit && course && course.id === "yilin3" ? book.name + " · " + unit.label + " " + unit.title : "",
      previewWord: activeCourseId === "fun" ? "cat" : "apple",
      tipWord: activeCourseId === "fun" ? "dog" : "apple",
      words: lexiconFor(activeCourseId) || {},
      levels: unit && unit.playable ? unit.levels : [],
      course: course,
      book: book,
      unit: unit,
    };
  }

  function setActiveUnit(courseId, bookId, unitId) {
    const course = findCourse(courseId);
    if (!course || !course.playable) return false;
    const book = findBook(course, bookId);
    const unit = findUnit(book, unitId);
    if (!unit || !unit.playable || !unit.levels.length) return false;
    activeCourseId = courseId;
    activeBookId = bookId;
    activeUnitId = unitId;
    return true;
  }

  function setActiveCourse(id) {
    const course = findCourse(id);
    if (!course || !course.playable) return false;
    if (id === "fun") return setActiveUnit("fun", "fun-book", "fun-main");
    activeCourseId = id;
    return true;
  }

  function setActivePack(id) {
    if (id === "fun") return setActiveUnit("fun", "fun-book", "fun-main");
    if (id === "yilin" || id === "yilin3") return setActiveUnit("yilin3", "3a", "3a-u56");
    return false;
  }

  function lookup(wordId) {
    return FUN_WORDS[wordId] || YILIN_WORDS[wordId] || null;
  }

  function getImageSrc(wordId) {
    return "assets/word-" + wordId + ".jpg";
  }

  function getWord(wordId) {
    const pack = getActivePack();
    return pack.words[wordId] || null;
  }

  function getIllustration(wordId) {
    const w = getWord(wordId) || lookup(wordId);
    if (!w) return "";
    return (
      '<img class="word-photo" src="' +
      getImageSrc(wordId) +
      '" alt="' +
      w.en +
      '" draggable="false">'
    );
  }

  function listPlayableWords() {
    const ids = {};
    Object.keys(FUN_WORDS).forEach(function (id) {
      ids[id] = FUN_WORDS[id];
    });
    Object.keys(YILIN_WORDS).forEach(function (id) {
      ids[id] = YILIN_WORDS[id];
    });
    return ids;
  }

  const api = {
    DISCLAIMER: DISCLAIMER,
    COURSES: COURSES,
    PACKS: {
      fun: { id: "fun", name: "趣味入门" },
      yilin: { id: "yilin3", name: "译林三年级" },
    },
    findCourse: findCourse,
    getCourse: findCourse,
    getBooks: function (courseId) {
      const course = findCourse(courseId);
      return course && course.books ? course.books : [];
    },
    getUnits: function (courseId, bookId) {
      const book = findBook(findCourse(courseId), bookId);
      return book && book.units ? book.units : [];
    },
    getUnit: function (courseId, bookId, unitId) {
      return findUnit(findBook(findCourse(courseId), bookId), unitId);
    },
    setActiveCourse: setActiveCourse,
    setActiveUnit: setActiveUnit,
    setActivePack: setActivePack,
    getActiveCourse: getActiveCourse,
    getActiveBook: getActiveBook,
    getActiveUnit: getActiveUnit,
    getActivePack: getActivePack,
    lookup: lookup,
    listPlayableWords: listPlayableWords,
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
