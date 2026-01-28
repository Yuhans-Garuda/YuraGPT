/* ExportGPT - Yuhans (print page) */

const FOOTER = {
  handle: "@yuhansnurfw",
  links: {
    tiktok: "https://www.tiktok.com/@yuhansnurfw",
    instagram: "https://www.instagram.com/yuhansnurfw/",
    threads: "https://www.threads.net/@yuhansnurfw",
  },
};

function esc(s) {
  return (s ?? "").replace(/[&<>\"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
}

function sanitizeFilename(name) {
  const cleaned = (name || "ChatGPT Conversation")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return cleaned || "ChatGPT Conversation";
}

function svgTikTok(){return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.2 2h-2.5v13.2a3.7 3.7 0 1 1-3.2-3.7V9a6.2 6.2 0 1 0 5.7 6.2V7.6c1.1.8 2.4 1.3 3.8 1.4V6.5c-1.9-.2-3.1-1.4-3.8-2.5z"/></svg>`;}
function svgInstagram(){return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm-5 4a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.3-2.2a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>`;}
function svgThreads(){return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 2a8 8 0 1 1-8 8 8 8 0 0 1 8-8Zm.2 4.8c2.5 0 4.3 1.4 4.8 3.6l-2 .4c-.3-1.4-1.2-2.1-2.8-2.1-1.7 0-2.7.8-2.7 2 0 1.1.8 1.7 2.3 2l1.2.3c2.2.5 3.6 1.7 3.6 3.7 0 2.4-2 4-4.8 4-2.6 0-4.5-1.3-5-3.6l2-.4c.4 1.5 1.5 2.3 3.1 2.3 1.7 0 2.8-.8 2.8-2 0-1-.7-1.6-2.2-1.9l-1.3-.3c-2.5-.6-3.6-2-3.6-3.8 0-2.3 2-3.9 4.6-3.9Z"/></svg>`;}

function svgFile(){return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`;}
function svgImage(){return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8.5 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/><path d="M21 15l-5-5L5 21"/></svg>`;}

function typeLabel(att) {
  const name = (att?.name || "").trim();
  const ext = (name.split(".").pop() || "").toLowerCase();
  const map = {
    pdf: "PDF Document",
    docx: "Word Document",
    xlsx: "Excel Spreadsheet",
    csv: "CSV File",
    pptx: "PowerPoint",
    zip: "ZIP Archive",
    json: "JSON",
    md: "Markdown",
    txt: "Text File",
    js: "JavaScript",
    ts: "TypeScript",
    py: "Python",
    java: "Java",
    c: "C",
    cpp: "C++",
    rs: "Rust",
    go: "Go",
    html: "HTML",
    css: "CSS",
    png: "PNG Image",
    jpg: "JPEG Image",
    jpeg: "JPEG Image",
    gif: "GIF Image",
    webp: "WEBP Image",
    svg: "SVG Image",
  };
  if (att?.kind === "image") {
    return map[ext] || (ext ? `${ext.toUpperCase()} Image` : "Image");
  }
  if (!ext || ext === name.toLowerCase()) return "File";
  return map[ext] || ext.toUpperCase();
}

function sanitizeHtml(rawHtml) {
  // The ChatGPT app already sanitizes message HTML, but we sanitize again since we inject into an extension page.
  const container = document.createElement("div");
  container.innerHTML = String(rawHtml || "");

  container.querySelectorAll("script,style,noscript,iframe,object,embed").forEach((n) => n.remove());

  container.querySelectorAll("*").forEach((el) => {
    Array.from(el.attributes || []).forEach((attr) => {
      const n = (attr.name || "").toLowerCase();
      if (n.startsWith("on") || n === "style") el.removeAttribute(attr.name);
    });

    if (el.tagName === "A") {
      const href = (el.getAttribute("href") || "").trim();
      if (!href || /^javascript:/i.test(href)) {
        el.removeAttribute("href");
      } else {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noreferrer");
      }
    }
  });

  return container.innerHTML;
}

async function loadData() {
  const { lastPrintData, lastPrintSettings } = await chrome.storage.local.get([
    "lastPrintData",
    "lastPrintSettings",
  ]);
  return { convo: lastPrintData, settings: lastPrintSettings || {} };
}

function render(convo, settings) {
  const displayTitle = convo?.title || "ChatGPT Conversation";
  const fileTitle = sanitizeFilename(displayTitle);

  // Chrome/Edge "Save as PDF" uses document.title as the suggested filename.
  document.title = fileTitle;

  document.getElementById("docTitle").textContent = displayTitle;
  document.getElementById("topTitle").textContent = displayTitle;

  const meta = [];
  if (settings?.includeMeta !== false) {
    if (convo?.url) meta.push(`Source: ${convo.url}`);
    if (convo?.exportedAt) meta.push(`Exported: ${new Date(convo.exportedAt).toLocaleString()}`);
  }
  document.getElementById("docMeta").textContent = meta.join(" • ");

  const messagesWrap = document.getElementById("messages");
  messagesWrap.innerHTML = "";

  for (const m of (convo?.messages || [])) {
    const roleRaw = (m.role || "").toLowerCase();
    const role = roleRaw === "user" ? "User" : (roleRaw === "assistant" ? "Assistant" : (m.role || "Message"));

    const row = document.createElement("div");
    row.className = "row " + (roleRaw === "user" ? "user" : "assistant");

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = roleRaw === "user" ? "U" : "GPT";

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    const roleEl = document.createElement("div");
    roleEl.className = "role";
    roleEl.textContent = role;

    const content = document.createElement("div");
    content.className = "content";

    const html = (m.html || "").trim();
    if (html) {
      content.innerHTML = sanitizeHtml(html);
    } else {
      // Fallback: plain text
      const pre = document.createElement("div");
      pre.style.whiteSpace = "pre-wrap";
      pre.style.margin = "0";
      pre.textContent = String(m.text || "");
      content.appendChild(pre);
    }

    bubble.appendChild(roleEl);
    bubble.appendChild(content);

    // Attachments (images/files) shown as file cards (per user request)
    const atts = Array.isArray(m.attachments) ? m.attachments : [];
    if (atts.length) {
      const list = document.createElement("div");
      list.className = "attachments";

      for (const att of atts) {
        const a = document.createElement(att?.url ? "a" : "div");
        a.className = "attachment";
        if (att?.url) {
          a.href = att.url;
          a.target = "_blank";
          a.rel = "noreferrer";
        }

        const icon = document.createElement("div");
        icon.className = "attIcon";
        icon.innerHTML = att?.kind === "image" ? svgImage() : svgFile();

        const meta = document.createElement("div");
        meta.className = "attMeta";

        const name = document.createElement("div");
        name.className = "attName";
        name.textContent = att?.name || (att?.kind === "image" ? "Image" : "File");

        const t = document.createElement("div");
        t.className = "attType";
        t.textContent = typeLabel(att);

        meta.appendChild(name);
        meta.appendChild(t);

        a.appendChild(icon);
        a.appendChild(meta);
        list.appendChild(a);
      }

      bubble.appendChild(list);
    }

    row.appendChild(avatar);
    row.appendChild(bubble);
    messagesWrap.appendChild(row);
  }

  // Footer setup
  const footer = document.getElementById("footer");
  if (settings?.includeFooter === false) {
    footer.style.display = "none";
  } else {
    document.getElementById("handle").textContent = FOOTER.handle;
    const t = document.getElementById("lTikTok");
    const i = document.getElementById("lInstagram");
    const th = document.getElementById("lThreads");
    t.href = FOOTER.links.tiktok; t.innerHTML = svgTikTok();
    i.href = FOOTER.links.instagram; i.innerHTML = svgInstagram();
    th.href = FOOTER.links.threads; th.innerHTML = svgThreads();
  }
}

function hookButtons() {
  document.getElementById("btnPrint").addEventListener("click", () => window.print());
  document.getElementById("btnClose").addEventListener("click", () => window.close());
}

(async function init() {
  hookButtons();
  const { convo, settings } = await loadData();
  if (!convo?.messages?.length) {
    document.getElementById("topTitle").textContent = "Tidak ada data. Buka ChatGPT lalu export lagi.";
    document.getElementById("docTitle").textContent = "Tidak ada data.";
    return;
  }

  render(convo, settings);

  // Auto-trigger print (best-effort) – works well when initiated from popup/FAB
  if (settings?.autoPrint !== false) {
    setTimeout(() => {
      try { window.print(); } catch (_) {}
    }, 450);
  }
})();
