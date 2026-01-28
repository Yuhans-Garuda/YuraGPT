
/* ExportGPT - Yuhans (MV3) */
const DEFAULT_SETTINGS = {
  includeFooter: true,
  includeMeta: true,
  filenameWithDate: false,
  autoPrint: true,
};

const FOOTER = {
  handle: "@yuhansnurfw",
  links: {
    tiktok: "https://www.tiktok.com/@yuhansnurfw",
    instagram: "https://www.instagram.com/yuhansnurfw/",
    threads: "https://www.threads.net/@yuhansnurfw",
  },
};

function $(id) { return document.getElementById(id); }

function sanitizeFilename(name) {
  const cleaned = (name || "ChatGPT Conversation")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return cleaned || "ChatGPT Conversation";
}

function todayStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function getSettings() {
  const data = await chrome.storage.local.get(["settings"]);
  return { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
}

async function setSettings(partial) {
  const s = await getSettings();
  const next = { ...s, ...partial };
  await chrome.storage.local.set({ settings: next });
  return next;
}

async function getActiveChatGPTTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id || !tab.url) return null;
  const url = new URL(tab.url);
  if (url.host !== "chatgpt.com" && url.host !== "chat.openai.com") return null;
  return tab;
}

async function requestConversation(tabId) {
  return await chrome.tabs.sendMessage(tabId, { type: "EXPORTGPT_GET_CONVERSATION" });
}

function buildMarkdown(convo, settings) {
  const lines = [];
  const title = convo.title || "ChatGPT Conversation";

  if (settings.includeMeta) {
    lines.push(`# ${title}`);
    if (convo.url) lines.push(`> Source: ${convo.url}`);
    lines.push("");
  }

  for (const m of convo.messages || []) {
    const label = m.role === "user" ? "User" : (m.role === "assistant" ? "Assistant" : m.role);
    lines.push(`## ${label}`);
    lines.push("");
    lines.push((m.text || "").trim());

    const atts = Array.isArray(m.attachments) ? m.attachments : [];
    if (atts.length) {
      lines.push("");
      lines.push("**Attachments:**");
      for (const a of atts) {
        const icon = a.kind === "image" ? "🖼️" : "📎";
        const name = a.name || (a.kind === "image" ? "Image" : "File");
        if (a.url) {
          lines.push(`- ${icon} [${name}](${a.url})`);
        } else {
          lines.push(`- ${icon} ${name}`);
        }
      }
    }
    lines.push("");
  }

  if (settings.includeFooter) {
    lines.push("---");
    lines.push(`**${FOOTER.handle}**  `);
    lines.push(`${FOOTER.links.tiktok}  `);
    lines.push(`${FOOTER.links.instagram}  `);
    lines.push(`${FOOTER.links.threads}`);
    lines.push("");
  }

  return lines.join("\n");
}

function buildHTML(convo, settings) {
  // A screen-friendly HTML export (also printable).
  const esc = (s) => (s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const title = esc(convo.title || "ChatGPT Conversation");
  const url = esc(convo.url || "");

  const blocks = (convo.messages || []).map((m) => {
    const role = m.role === "user" ? "User" : (m.role === "assistant" ? "Assistant" : m.role);
    const cls = m.role === "user" ? "user" : "assistant";
    // Preserve line breaks.
    const text = esc(m.text || "").replace(/\n/g, "<br/>");
    return `<section class="msg ${cls}">
      <div class="role">${esc(role)}</div>
      <div class="text">${text}</div>
    </section>`;
  }).join("\n");

  const footer = settings.includeFooter ? `
    <footer class="footer">
      <div class="footerInner">
        <a class="soc" href="${FOOTER.links.tiktok}" target="_blank" rel="noreferrer" aria-label="TikTok">${svgTikTok()}</a>
        <a class="soc" href="${FOOTER.links.instagram}" target="_blank" rel="noreferrer" aria-label="Instagram">${svgInstagram()}</a>
        <a class="soc" href="${FOOTER.links.threads}" target="_blank" rel="noreferrer" aria-label="Threads">${svgThreads()}</a>
        <span class="handle">${esc(FOOTER.handle)}</span>
      </div>
    </footer>` : "";

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
<style>
  :root{
    --bg:#060812;
    --card:rgba(255,255,255,.06);
    --stroke:rgba(255,255,255,.12);
    --text:rgba(255,255,255,.92);
    --muted:rgba(255,255,255,.62);
    --accent:#66F6FF;
    --accent2:#9D6BFF;
  }
  *{box-sizing:border-box}
  html,body{margin:0; padding:0; background:radial-gradient(1200px 600px at 15% 0%, rgba(157,107,255,.25), transparent 60%),
    radial-gradient(900px 600px at 90% 10%, rgba(102,246,255,.18), transparent 55%),
    linear-gradient(160deg,#050712,#0B1224); color:var(--text); font: 14px/1.55 ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial}
  .wrap{max-width:920px; margin:32px auto; padding:0 16px 90px;}
  .top{border:1px solid var(--stroke); background:var(--card); border-radius:18px; padding:18px 18px; margin-bottom:14px}
  h1{margin:0; font-size:22px; letter-spacing:.2px}
  .meta{margin-top:8px; color:var(--muted); font-size:12px}
  .msg{border:1px solid var(--stroke); background:rgba(255,255,255,.04); border-radius:18px; padding:14px 14px; margin:10px 0}
  .msg.user{background:linear-gradient(135deg, rgba(102,246,255,.10), rgba(157,107,255,.07))}
  .role{color:var(--muted); font-weight:800; letter-spacing:.15px; font-size:12px; text-transform:uppercase}
  .text{margin-top:10px; white-space:normal; overflow-wrap:anywhere}
  .footer{position:fixed; left:0; right:0; bottom:0; padding:10px 0 14px; background:rgba(0,0,0,.35); backdrop-filter: blur(10px); border-top:1px solid rgba(255,255,255,.10)}
  .footerInner{display:flex; gap:10px; align-items:center; justify-content:center; color:var(--muted)}
  .soc{display:inline-flex; width:18px; height:18px; color:rgba(255,255,255,.75)}
  .soc svg{width:18px; height:18px; fill:currentColor}
  .handle{padding:4px 10px; border:1px dashed rgba(255,255,255,.20); border-radius:999px; font-weight:700}
  a{color:inherit; text-decoration:none}
  a:hover{color:var(--accent)}
  @media print{
    html,body{background:#fff; color:#111}
    .wrap{max-width:none; margin:0; padding:0 0 80px}
    .top,.msg{background:#fff; border-color:#ddd}
    .msg.user{background:#fff}
    .role{color:#444}
    .footer{background:#fff; border-top:1px solid #ddd}
    .footerInner{color:#444}
    .soc{color:#444}
  }
</style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <h1>${title}</h1>
      ${settings.includeMeta ? `<div class="meta">${url ? `Source: ${url}` : ""}</div>` : ""}
    </div>
    ${blocks}
  </div>
  ${footer}
</body>
</html>`;
}

function svgTikTok() { return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.2 2h-2.5v13.2a3.7 3.7 0 1 1-3.2-3.7V9a6.2 6.2 0 1 0 5.7 6.2V7.6c1.1.8 2.4 1.3 3.8 1.4V6.5c-1.9-.2-3.1-1.4-3.8-2.5z"/></svg>`; }
function svgInstagram() { return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm-5 4a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.3-2.2a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>`; }
function svgThreads() { return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 2a8 8 0 1 1-8 8 8 8 0 0 1 8-8Zm.2 4.8c2.5 0 4.3 1.4 4.8 3.6l-2 .4c-.3-1.4-1.2-2.1-2.8-2.1-1.7 0-2.7.8-2.7 2 0 1.1.8 1.7 2.3 2l1.2.3c2.2.5 3.6 1.7 3.6 3.7 0 2.4-2 4-4.8 4-2.6 0-4.5-1.3-5-3.6l2-.4c.4 1.5 1.5 2.3 3.1 2.3 1.7 0 2.8-.8 2.8-2 0-1-.7-1.6-2.2-1.9l-1.3-.3c-2.5-.6-3.6-2-3.6-3.8 0-2.3 2-3.9 4.6-3.9Z"/></svg>`; } async function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  try {
    await chrome.downloads.download({ url, filename, saveAs: false });
  } finally {
    // Revoke after a moment to let the download start.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}

async function doExport(kind) {
  const tab = await getActiveChatGPTTab();
  const status = $("status");
  if (!tab) {
    status.textContent = "Buka chatgpt.com terlebih dulu.";
    status.style.color = "var(--bad)";
    return;
  }

  status.textContent = "Mengambil percakapan…";
  status.style.color = "var(--muted)";

  let convo;
  try {
    convo = await requestConversation(tab.id);
  } catch (e) {
    status.textContent = "Gagal ambil percakapan. Reload tab ChatGPT lalu coba lagi.";
    status.style.color = "var(--bad)";
    return;
  }

  if (!convo?.messages?.length) {
    status.textContent = "Tidak ada pesan yang bisa diexport.";
    status.style.color = "var(--bad)";
    return;
  }

  const settings = await getSettings();
  const title = sanitizeFilename(convo.title);
  const fileBase = settings.filenameWithDate ? `${title} - ${todayStamp()}` : title;

  try {
    if (kind === "md") {
      await downloadText(`${fileBase}.md`, buildMarkdown(convo, settings), "text/markdown;charset=utf-8");
    } else if (kind === "html") {
      await downloadText(`${fileBase}.html`, buildHTML(convo, settings), "text/html;charset=utf-8");
    } else if (kind === "json") {
      const payload = { ...convo, exportedBy: "ExportGPT - Yuhans", exportedAt: new Date().toISOString() };
      await downloadText(`${fileBase}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
    } else if (kind === "copy") {
      const md = buildMarkdown(convo, settings);
      await chrome.tabs.sendMessage(tab.id, { type: "EXPORTGPT_COPY_TO_CLIPBOARD", text: md });
    } else if (kind === "pdf") {
      await chrome.storage.local.set({ lastPrintData: convo, lastPrintSettings: settings });
      await chrome.tabs.create({ url: chrome.runtime.getURL("print.html") });
    }
    status.textContent = "Sukses ✅";
    status.style.color = "var(--good)";
  } catch (e) {
    console.error(e);
    status.textContent = "Error saat export.";
    status.style.color = "var(--bad)";
  }
}

async function init() {
  const tab = await getActiveChatGPTTab();
  $("status").textContent = tab ? "Siap export dari tab ChatGPT aktif." : "Buka chatgpt.com untuk mulai.";

  const settings = await getSettings();
  $("optFooter").checked = !!settings.includeFooter;
  $("optMeta").checked = !!settings.includeMeta;
  $("optDate").checked = !!settings.filenameWithDate;

  $("btnMd").addEventListener("click", () => doExport("md"));
  $("btnHtml").addEventListener("click", () => doExport("html"));
  $("btnJson").addEventListener("click", () => doExport("json"));
  $("btnPdf").addEventListener("click", () => doExport("pdf"));
  $("btnCopy").addEventListener("click", () => doExport("copy"));

  $("optFooter").addEventListener("change", (e) => setSettings({ includeFooter: e.target.checked }));
  $("optMeta").addEventListener("change", (e) => setSettings({ includeMeta: e.target.checked }));
  $("optDate").addEventListener("change", (e) => setSettings({ filenameWithDate: e.target.checked }));

  $("openOptions").addEventListener("click", async (e) => {
    e.preventDefault();
    await chrome.runtime.openOptionsPage();
  });

  // Protection: ensure branding link stays intact
  const _yh = atob("QHl1aGFuc251cmZ3");
  const _yl = atob("aHR0cHM6Ly95dXJhbmVzaWEud2ViLmlk");
  const _restoreBrand = () => {
    const f = document.querySelector(".footer");
    const h = document.getElementById("_yh_link");
    if (!f || !h || h.textContent.indexOf(_yh.slice(1)) === -1 || h.getAttribute("href") !== _yl) {
      const newF = document.createElement("footer");
      newF.className = "footer";
      newF.innerHTML = `<a class="handle" href="${_yl}" target="_blank" rel="noopener" id="_yh_link"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>${_yh}</a>`;
      if (f) f.replaceWith(newF); else document.querySelector(".app").appendChild(newF);
    }
  };
  _restoreBrand();
  setInterval(_restoreBrand, 2000);
  new MutationObserver(_restoreBrand).observe(document.body, { childList: true, subtree: true, characterData: true });
}

document.addEventListener("DOMContentLoaded", init);
