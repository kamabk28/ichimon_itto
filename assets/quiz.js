import {
  loadQuestions,
  loadSettings,
  saveSettings,
  sampleWithoutReplacement,
  normalizeAnswer,
  getAcceptedAnswers,
} from "./app.js";

const FEEDBACK_EMBED_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfUVun_xGMb8m2UGkkEBVzQe3iBfJY8bk6yUUIiLvsTdh2EpQ/viewform?usp=dialog_embedded=true";
import { initFeedbackModal } from "./app.js";
initFeedbackModal(FEEDBACK_EMBED_URL);

const loadingEl = document.getElementById("loading");
const quizEl = document.getElementById("quiz");
const resultEl = document.getElementById("result");

const questionListEl = document.getElementById("questionList");
const metaTextEl = document.getElementById("metaText");
const scoreTextEl = document.getElementById("scoreText");

const countEl = document.getElementById("count");
const generateBtn = document.getElementById("generate");

const gradeAllBtn = document.getElementById("gradeAll");
const retryAllBtn = document.getElementById("retryAll");

const resultSummaryEl = document.getElementById("resultSummary");
const wrongListEl = document.getElementById("wrongList");
const retryWrongBtn = document.getElementById("retryWrong");
const backTopBtn = document.getElementById("backTop");

const resultScore = document.getElementById("resultScore");
const resultRate = document.getElementById("resultRate");

// 得点バナー
const scoreBanner = document.getElementById("scoreBanner");
const scoreBig = document.getElementById("scoreBig");
const scoreRate = document.getElementById("scoreRate");

function show(el) {
  el.classList.remove("hidden");
}
function hide(el) {
  el.classList.add("hidden");
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[m])
  );
}

let allQuestions = [];
let questions = [];
let graded = false;
let history = [];

function renderQuestions() {
  questionListEl.innerHTML = questions
    .map(
      (q, idx) => `
    <div class="q-block" id="q-${idx}">
      <div class="q-head">
        <div class="q-meta">
          <span class="muted">#${idx + 1}</span>
          ${q.id ? `<span class="muted">ID: ${escapeHtml(q.id)}</span>` : ""}
          ${
            q.unit
              ? `<span class="muted">単元: ${escapeHtml(q.unit)}</span>`
              : ""
          }
        </div>
        <div class="mark" id="mark-${idx}"></div>
      </div>

      <div class="prompt">${escapeHtml(q.prompt)}</div>

      <div class="row">
        <label for="ans-${idx}">回答（単語）</label>
        <input id="ans-${idx}" type="text" autocomplete="off" />
      </div>

      <div class="muted small" id="fb-${idx}"></div>
    </div>
  `
    )
    .join("");

  questions.forEach((_, idx) => {
    const input = document.getElementById(`ans-${idx}`);
    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const next = document.getElementById(`ans-${idx + 1}`);
      if (next) next.focus();
      else gradeAllBtn.focus();
    });
  });
}

function setMeta() {
  metaTextEl.textContent = `問題数: ${questions.length}`;
  scoreTextEl.textContent = graded
    ? `正解: ${history.filter((h) => h.correct).length}`
    : "未採点";
}

function resetGradingUI() {
  graded = false;
  history = [];
  hide(resultEl);
  hide(scoreBanner);
  scoreBig.textContent = "";
  scoreRate.textContent = "";

  questions.forEach((_, idx) => {
    const input = document.getElementById(`ans-${idx}`);
    const blockEl = document.getElementById(`q-${idx}`);
    const markEl = document.getElementById(`mark-${idx}`);
    const fbEl = document.getElementById(`fb-${idx}`);

    input.disabled = false;
    input.value = "";
    markEl.textContent = "";
    fbEl.textContent = "";

    blockEl.classList.remove("graded-ok", "graded-ng");
    markEl.classList.remove("ok", "ng");
  });

  setMeta();
  const first = document.getElementById("ans-0");
  if (first) first.focus();
}

function gradeAll() {
  if (graded) return;

  graded = true;
  history = [];
  let score = 0;

  questions.forEach((q, idx) => {
    const input = document.getElementById(`ans-${idx}`);
    const user = input.value;

    const accepted = getAcceptedAnswers(q);
    const ok = accepted.includes(normalizeAnswer(user));
    if (ok) score++;

    history.push({ q, user, correct: ok });

    const blockEl = document.getElementById(`q-${idx}`);
    const markEl = document.getElementById(`mark-${idx}`);
    const fbEl = document.getElementById(`fb-${idx}`);

    markEl.textContent = ok ? "○" : "×";
    markEl.classList.toggle("ok", ok);
    markEl.classList.toggle("ng", !ok);

    blockEl.classList.toggle("graded-ok", ok);
    blockEl.classList.toggle("graded-ng", !ok);

    fbEl.innerHTML = ok
      ? `<span class="ok-text">正解</span>`
      : `<span class="ng-text">不正解</span>　正答：<b>${escapeHtml(
          q.answer
        )}</b>`;

    input.disabled = true;
  });

  // 得点を大きく表示
  const total = questions.length;
  const rate = total ? Math.round((score / total) * 100) : 0;
  scoreBig.textContent = `得点：${score} / ${total}`;
  scoreRate.textContent = `正答率：${rate}%`;
  show(scoreBanner);

  setMeta();
  show(resultEl);

  resultScore.textContent = `得点：${score} / ${total}`;
  resultRate.textContent = `正答率：${rate}%`;

  const wrong = history.filter((h) => !h.correct);
  if (wrong.length === 0) {
    wrongListEl.innerHTML = `<p>全部正解！🎉</p>`;
    retryWrongBtn.disabled = true;
  } else {
    retryWrongBtn.disabled = false;
    wrongListEl.innerHTML = wrong
      .map(
        (h) => `
      <div class="card" style="margin:10px 0;">
        <div class="muted">ID: ${escapeHtml(h.q.id || "")}</div>
        <div style="margin-top:6px;"><b>問題</b><br>${escapeHtml(
          h.q.prompt
        )}</div>
        <div style="margin-top:6px;"><b>あなたの答え</b><br>${escapeHtml(
          h.user || "(未入力)"
        )}</div>
        <div style="margin-top:6px;"><b>正答</b><br>${escapeHtml(
          h.q.answer
        )}</div>
      </div>
    `
      )
      .join("");
  }

  resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function generate() {
  show(loadingEl);
  hide(quizEl);
  hide(resultEl);

  if (!allQuestions.length) allQuestions = await loadQuestions();

  const count = countEl.value;
  const s = loadSettings();
  saveSettings({ ...s, quizCount: count });

  questions = sampleWithoutReplacement(allQuestions, count);

  hide(loadingEl);
  show(quizEl);

  renderQuestions();
  resetGradingUI();
  setMeta();
}

generateBtn.addEventListener("click", generate);
gradeAllBtn.addEventListener("click", gradeAll);

// 誤爆対策：入力消去（同じ問題セット）
retryAllBtn.addEventListener("click", () => {
  const ok = confirm("入力がすべて消えます。やり直しますか？");
  if (!ok) return;
  resetGradingUI();
});

retryWrongBtn.addEventListener("click", () => {
  const wrongQs = history.filter((h) => !h.correct).map((h) => h.q);
  if (!wrongQs.length) return;
  questions = wrongQs;
  renderQuestions();
  resetGradingUI();
});

backTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

(function init() {
  const s = loadSettings();
  countEl.value = s.quizCount || "10";
  generate().catch((e) => {
    console.error(e);
    loadingEl.textContent = "エラー：CSVの読み込みに失敗しました。";
  });
})();
