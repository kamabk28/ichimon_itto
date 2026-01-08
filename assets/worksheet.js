import {
  loadQuestions,
  loadSettings,
  saveSettings,
  sampleWithoutReplacement,
} from "./app.js";

const loadingEl = document.getElementById("loading");
const paperEl = document.getElementById("paper");
const qListEl = document.getElementById("questionList");
const aPageEl = document.getElementById("answerPage");
const aListEl = document.getElementById("answerList");
const paperMetaEl = document.getElementById("paperMeta");

const regenerateBtn = document.getElementById("regenerate");
const printBtn = document.getElementById("print");
const showAnswersEl = document.getElementById("showAnswers");
const countEl = document.getElementById("count");

function getMode() {
  return document.querySelector('input[name="mode"]:checked')?.value || "A";
}

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
let current = [];

function applyAnswerToggleRule() {
  const mode = getMode();
  if (mode === "B") {
    showAnswersEl.checked = false;
    showAnswersEl.disabled = true;
  } else {
    showAnswersEl.disabled = false;
  }
}

function render() {
  const mode = getMode();
  const now = new Date();
  const count = countEl.value;

  paperMetaEl.textContent = `問題数: ${
    count === "all" ? "全問" : count
  } / 形式: ${mode} / 作成: ${now.toLocaleString()}`;

  qListEl.innerHTML = current
    .map((q) => {
      if (mode === "A") {
        return `
        <li>
          ${escapeHtml(q.prompt)}
          <span class="answer-line"></span>
        </li>
      `;
      }
      return `
      <li>
        <b>${escapeHtml(q.answer)}</b>
        <span class="answer-box"></span>
      </li>
    `;
    })
    .join("");

  const showAns = showAnswersEl.checked && !showAnswersEl.disabled;
  if (!showAns) {
    hide(aPageEl);
  } else {
    show(aPageEl);
    aListEl.innerHTML = current
      .map(
        (q) => `
      <li>
        <span class="muted">ID: ${escapeHtml(q.id || "")}</span><br>
        ${escapeHtml(q.answer)}
      </li>
    `
      )
      .join("");
  }
}

async function regenerate() {
  show(loadingEl);
  hide(paperEl);

  allQuestions = allQuestions.length ? allQuestions : await loadQuestions();

  const count = countEl.value;
  const s = loadSettings();
  saveSettings({ ...s, wsCount: count });

  current = sampleWithoutReplacement(allQuestions, count);

  hide(loadingEl);
  show(paperEl);

  applyAnswerToggleRule();
  render();
}

regenerateBtn.addEventListener("click", regenerate);
printBtn.addEventListener("click", () => window.print());
showAnswersEl.addEventListener("change", render);
countEl.addEventListener("change", regenerate);

document.querySelectorAll('input[name="mode"]').forEach((el) => {
  el.addEventListener("change", () => {
    applyAnswerToggleRule();
    render();
  });
});

(function init() {
  const s = loadSettings();
  countEl.value = s.wsCount || "10";
  regenerate().catch((e) => {
    console.error(e);
    loadingEl.textContent = "エラー：CSVの読み込みに失敗しました。";
  });
})();
