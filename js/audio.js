/**
 * 单词消消看 — 语音朗读与简易音效
 */
(function (root) {
  "use strict";

  let speechUnlocked = false;
  let audioCtx = null;

  function getAudioCtx() {
    if (audioCtx) return audioCtx;
    const Ctx = root.AudioContext || root.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    return audioCtx;
  }

  function unlock() {
    speechUnlocked = true;
    try {
      const ctx = getAudioCtx();
      if (ctx && ctx.state === "suspended") {
        ctx.resume();
      }
    } catch (e) {}
    try {
      if (root.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(" ");
        u.volume = 0;
        u.lang = "en-US";
        root.speechSynthesis.speak(u);
        root.speechSynthesis.cancel();
      }
    } catch (e) {}
  }

  function speak(word) {
    if (!word) return;
    try {
      if (!root.speechSynthesis) return;
      if (!speechUnlocked) unlock();
      root.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(word));
      u.lang = "en-US";
      u.rate = 0.85;
      u.pitch = 1.05;
      u.volume = 1;
      const voices = root.speechSynthesis.getVoices() || [];
      const en = voices.find(function (v) {
        return v.lang && v.lang.toLowerCase().indexOf("en-us") === 0 && v.localService;
      }) || voices.find(function (v) {
        return v.lang && v.lang.toLowerCase().indexOf("en") === 0;
      });
      if (en) u.voice = en;
      root.speechSynthesis.speak(u);
    } catch (e) {}
  }

  function tone(freq, dur, type, gain, delay) {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();
      const t0 = ctx.currentTime + (delay || 0);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type || "sine";
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain == null ? 0.07 : gain, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (e) {}
  }

  function playTap() {
    tone(520, 0.08, "triangle", 0.05, 0);
  }

  function playMatch() {
    tone(523.25, 0.12, "sine", 0.07, 0);
    tone(659.25, 0.12, "sine", 0.07, 0.08);
    tone(783.99, 0.18, "sine", 0.08, 0.16);
  }

  function playWin() {
    tone(523.25, 0.14, "sine", 0.07, 0);
    tone(659.25, 0.14, "sine", 0.07, 0.12);
    tone(783.99, 0.14, "sine", 0.07, 0.24);
    tone(1046.5, 0.28, "sine", 0.09, 0.36);
  }

  function playLose() {
    tone(392, 0.18, "triangle", 0.06, 0);
    tone(311, 0.2, "triangle", 0.06, 0.14);
    tone(247, 0.32, "triangle", 0.07, 0.3);
  }

  function playShuffle() {
    tone(400, 0.08, "square", 0.03, 0);
    tone(500, 0.08, "square", 0.03, 0.07);
    tone(450, 0.1, "square", 0.03, 0.14);
  }

  const api = {
    unlock: unlock,
    speak: speak,
    playTap: playTap,
    playMatch: playMatch,
    playWin: playWin,
    playLose: playLose,
    playShuffle: playShuffle,
  };

  root.WordMatchAudio = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
