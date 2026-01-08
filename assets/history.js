async function loadChangelog() {
  const res = await fetch("./data/changelog.json", { cache: "no-store" });
  if (!res.ok) throw new Error("changelog load failed");
  return res.json();
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

function section(title, items) {
  if (!items || items.length === 0) return "";
  return `
    <div style="margin-top:10px;">
      <div class="muted"><b>${escapeHtml(title)}</b></div>
      <ul>
        ${items.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}
      </ul>
    </div>
  `;
}

(async function init() {
  const latestEl = document.getElementById("latest");
  const listEl = document.getElementById("list");

  try {
    const data = await loadChangelog();
    latestEl.textContent = `最新：${data.latest}`;

    listEl.innerHTML = data.items
      .map(
        (it) => `
      <div class="q-block">
        <div class="q-head">
          <div class="q-meta">
            <span><b>${escapeHtml(it.version)}</b></span>
            <span class="muted">${escapeHtml(it.date || "")}</span>
          </div>
        </div>
        ${section("変更", it.changes)}
        ${section("修正", it.fixes)}
      </div>
    `
      )
      .join("");
  } catch (e) {
    console.error(e);
    latestEl.textContent = "";
    listEl.innerHTML = `<p class="muted">更新履歴を読み込めませんでした。</p>`;
  }
})();
