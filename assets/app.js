// assets/app.js
// 依存なしで動く簡易CSVパーサ（ダブルクォート対応）
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        // escaped quote
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && (c === "," || c === "\n" || c === "\r")) {
      if (c === ",") {
        row.push(cur);
        cur = "";
        continue;
      }
      // newline
      if (c === "\r" && next === "\n") i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
      continue;
    }

    cur += c;
  }
  // last cell
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }

  // remove empty trailing rows
  const cleaned = rows.filter((r) => r.some((v) => (v ?? "").trim() !== ""));
  if (cleaned.length === 0) return [];

  const header = cleaned[0].map((h) => h.trim());
  return cleaned.slice(1).map((r) => {
    const obj = {};
    header.forEach((h, idx) => (obj[h] = (r[idx] ?? "").trim()));
    return obj;
  });
}

export async function loadQuestions() {
  const res = await fetch("./data/teacher.csv", { cache: "no-store" });
  if (!res.ok) throw new Error("CSVが読み込めませんでした: " + res.status);
  const text = await res.text();
  const items = parseCSV(text);

  // 必須列チェック（ゆるめ）
  const required = ["id", "prompt", "answer"];
  for (const key of required) {
    if (!items[0] || !(key in items[0])) {
      console.warn("CSVのヘッダーに必要な列がありません:", key);
    }
  }

  // 空行・空データ除去
  return items.filter(
    (q) =>
      (q.id ?? "").trim() !== "" &&
      (q.prompt ?? "").trim() !== "" &&
      (q.answer ?? "").trim() !== ""
  );
}

export function saveSettings(s) {
  localStorage.setItem("jhs_settings", JSON.stringify(s));
}

export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem("jhs_settings") || "{}");
  } catch {
    return {};
  }
}

export function sampleWithoutReplacement(arr, n) {
  const a = [...arr];
  // Fisher–Yates shuffle
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (n === "all") return a;
  const k = Math.max(0, Math.min(Number(n), a.length));
  return a.slice(0, k);
}

// 全角英数→半角（ASCII範囲のみ）
function toHalfWidthAscii(str) {
  return str
    .replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ");
}

export function normalizeAnswer(s) {
  if (s == null) return "";
  return toHalfWidthAscii(String(s)).trim().toLowerCase();
}

export function getAcceptedAnswers(q) {
  const base = [q.answer];
  const alt = (q.alt_answers || "")
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);
  return [...base, ...alt].map(normalizeAnswer);
}

// ===== Feedback modal (Google Form embed) =====
export function initFeedbackModal(embedUrl) {
  const backdrop = document.getElementById("fbBackdrop");
  const frame = document.getElementById("fbFrame");
  const closeBtn = document.getElementById("fbClose");

  if (!backdrop || !frame || !closeBtn) return;

  function open() {
    if (!embedUrl || embedUrl.includes("YOUR_GOOGLE_FORM")) {
      alert("フォームURL（埋め込みURL）が未設定です。");
      return;
    }
    frame.src = embedUrl;
    backdrop.classList.remove("hidden");
  }

  function close() {
    backdrop.classList.add("hidden");
    frame.src = "";
  }

  // open buttons
  document.querySelectorAll(".open-feedback").forEach((btn) => {
    btn.addEventListener("click", open);
  });

  // close actions
  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !backdrop.classList.contains("hidden")) close();
  });

  return { open, close };
}
