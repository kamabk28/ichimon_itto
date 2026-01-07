// assets/quiz.js
import {
  loadQuestions,
  loadSettings,
  sampleWithoutReplacement,
  normalizeAnswer,
  getAcceptedAnswers,
} from "./app.js";

/** ★ここを必ず差し替え：Googleフォーム埋め込みURL（embedded=true のやつ） */
const FEEDBACK_EMBED_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfUVun_xGMb8m2UGkkEBVzQe3iBfJY8bk6yUUIiLvsTdh2EpQ/viewform?usp=dialog_embedded=true";

const loadingEl = document.getElementById("loading");
const quizEl = document.getElementById("quiz");
const resultEl = document.getElementById("result");

const questionListEl = document.getElementById("questionList");
const metaTextEl = document.getElementById("metaText");
const scoreTextEl = document.getElementById("scoreText");

const gradeAllBtn = document.getElementById("gradeAll");
const retryAllBtn = document.getElementById("retryAll");

const resultSummaryEl = document.getElementById("resultSummary");
const wrongListEl = document.getElementById("wrongList");
const retryWrongBtn = document.getElementById("retryWrong");
const backTopBtn = document.getElementById("backTop");

// フィードバックモーダル
const fbBackdrop = document.getElementById("fbBackdrop");
const fbClose = document.getElementById("fbClose");
const fbFrame = document.getElementById("fbFrame");

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

function openFeedback() {
  if (!FEEDBACK_EMBED_URL || FEEDBACK_EMBED_URL.includes("YOUR_GOOGLE_FORM")) {
    alert(
      "フォームURL（埋め込みURL）が未設定です。assets/quiz.js の FEEDBACK_EMBED_URL を設定してください。"
    );
    return;
  }
  fbFrame.src = FEEDBACK_EMBED_URL;
  show(fbBackdrop);
}

function closeFeedback() {
  hide(fbBackdrop);
  // フォームを閉じたら読み込みも止める（軽くする）
  fbFrame.src = "";
}

// モーダルイベント
document.querySelectorAll(".open-feedback").forEach((btn) => {
  btn.addEventListener("click", openFeedback);
});
fbClose.addEventListener("click", closeFeedback);
fbBackdrop.addEventListener("click", (e) => {
  if (e.target === fbBackdrop) closeFeedback();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !fbBackdrop.classList.contains("hidden"))
    closeFeedback();
});

let allQuestions = [];
let questions = [];
let graded = false;
let history = []; // { q, user, correct }

function renderQuestions() {
  questionListEl.innerHTML = questions
    .map((q, idx) => {
      const id = q.id || "";
      const unit = q.unit || "";
      return `
      <div class="q-block" id="q-${idx}" data-idx="${idx}">
        <div class="q-head">
          <div class="q-meta">
            <span class="muted">#${idx + 1}</span>
            ${id ? `<span class="muted">ID: ${escapeHtml(id)}</span>` : ""}
            ${
              unit ? `<span class="muted">単元: ${escapeHtml(unit)}</span>` : ""
            }
          </div>
          <div class="mark" id="mark-${idx}" aria-label="採点結果"></div>
        </div>

        <div class="prompt">${escapeHtml(q.prompt)}</div>

        <div class="row">
          <label for="ans-${idx}">回答（単語）</label>
          <input id="ans-${idx}" type="text" autocomplete="off" />
        </div>

        <div class="muted small" id="fb-${idx}"></div>
      </div>
    `;
    })
    .join("");

  // Enterで次の入力へ
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

    // ○×
    markEl.textContent = ok ? "○" : "×";
    markEl.classList.toggle("ok", ok);
    markEl.classList.toggle("ng", !ok);

    // 背景色（薄い黄緑/赤）
    blockEl.classList.toggle("graded-ok", ok);
    blockEl.classList.toggle("graded-ng", !ok);

    // フィードバック
    if (ok) {
      fbEl.innerHTML = `<span class="ok-text">正解</span>`;
    } else {
      fbEl.innerHTML = `<span class="ng-text">不正解</span>　正答：<b>${escapeHtml(
        q.answer
      )}</b>`;
    }

    // 採点後は入力不可
    input.disabled = true;
  });

  setMeta();
  show(resultEl);

  // 結果まとめ
  resultSummaryEl.textContent = `${questions.length}問中 ${score}問正解`;

  const wrong = history.filter((h) => !h.correct);
  if (wrong.length === 0) {
    wrongListEl.innerHTML = `<p>全部正解！🎉</p>`;
    retryWrongBtn.disabled = true;
  } else {
    retryWrongBtn.disabled = false;
    wrongListEl.innerHTML = wrong
      .map((h) => {
        const q = h.q;
        return `
        <div class="card" style="margin:10px 0;">
          <div class="muted">ID: ${escapeHtml(q.id || "")}</div>
          <div style="margin-top:6px;"><b>問題</b><br>${escapeHtml(
            q.prompt
          )}</div>
          <div style="margin-top:6px;"><b>あなたの答え</b><br>${escapeHtml(
            h.user || "(未入力)"
          )}</div>
          <div style="margin-top:6px;"><b>正答</b><br>${escapeHtml(
            q.answer
          )}</div>
        </div>
      `;
      })
      .join("");
  }

  resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function init(customQuestions = null) {
  show(loadingEl);
  hide(quizEl);
  hide(resultEl);

  allQuestions = await loadQuestions();

  const settings = loadSettings();
  const count = settings.count || "10";

  questions = customQuestions ?? sampleWithoutReplacement(allQuestions, count);

  graded = false;
  history = [];

  hide(loadingEl);
  show(quizEl);

  renderQuestions();
  setMeta();

  const first = document.getElementById("ans-0");
  if (first) first.focus();
}

gradeAllBtn.addEventListener("click", gradeAll);

retryAllBtn.addEventListener("click", () => {
  const ok = confirm("入力がすべて消えます。やり直しますか？");
  if (!ok) return;
  location.reload();
});

retryWrongBtn.addEventListener("click", () => {
  const wrongQs = history.filter((h) => !h.correct).map((h) => h.q);
  if (wrongQs.length === 0) return;
  init(wrongQs);
});

backTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

init().catch((e) => {
  console.error(e);
  loadingEl.textContent =
    "エラー：CSVの読み込みに失敗しました。ファイル名やパスを確認してください。";
});
