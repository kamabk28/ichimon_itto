// assets/worksheet.js
import {
  loadQuestions,
  loadSettings,
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

function render() {
  const settings = loadSettings();
  const count = settings.count || "10";
  const mode = getMode();
  const now = new Date();

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
      // mode B: 単語→説明（記述欄）
      return `
      <li>
        <b>${escapeHtml(q.answer)}</b>
        <span class="answer-box"></span>
      </li>
    `;
    })
    .join("");

  const showAns = showAnswersEl.checked;
  if (!showAns) {
    hide(aPageEl);
  } else {
    show(aPageEl);
    // 解答は「A形式でもB形式でも、正答は answer を出す」で統一（ベータ）
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
  const settings = loadSettings();
  const count = settings.count || "10";

  current = sampleWithoutReplacement(allQuestions, count);

  hide(loadingEl);
  show(paperEl);
  render();
}

regenerateBtn.addEventListener("click", regenerate);
printBtn.addEventListener("click", () => window.print());
showAnswersEl.addEventListener("change", render);
document
  .querySelectorAll('input[name="mode"]')
  .forEach((el) => el.addEventListener("change", render));

regenerate().catch((e) => {
  console.error(e);
  loadingEl.textContent =
    "エラー：CSVの読み込みに失敗しました。ファイル名やパスを確認してください。";
});
