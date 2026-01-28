
/* ExportGPT - Yuhans (content script) */

const CLEAN_UI_LINES = new Set([
  "Copy", "Copy code", "Copied!", "Regenerate", "Retry", "Edit", "Share", "Stop generating",
  "Good response", "Bad response", "Read aloud", "Listen", "Continue generating",
]);

function getConversationId() {
  const p = location.pathname || "";
  const m = p.match(/\/(?:c|chat)\/([a-z0-9-]{8,})/i);
  return m ? m[1] : null;
}

function pickTitleFromLinksById(id) {
  if (!id) return null;
  const links = Array.from(document.querySelectorAll("a[href]"))
    .filter((a) => {
      const h = a.getAttribute("href") || "";
      return h.includes(`/c/${id}`) || h.includes(`/chat/${id}`) || (a.href || "").includes(`/${id}`);
    })
    .sort((a, b) => (b.textContent || "").length - (a.textContent || "").length);

  for (const a of links) {
    const t = (a.textContent || "").trim();
    if (t && t.length > 1 && t.length < 200 && t.toLowerCase() !== "chatgpt") return t;
  }
  return null;
}

function pickTitleFromActiveNav() {
  const cands = Array.from(
    document.querySelectorAll(
      'nav a[aria-current="page"], aside a[aria-current="page"], a[aria-current="page"]'
    )
  );
  for (const a of cands) {
    const href = a.getAttribute("href") || "";
    if (!/\/(?:c|chat)\//.test(href)) continue;
    const t = (a.textContent || "").trim();
    if (t && t.length > 1 && t.length < 200 && t.toLowerCase() !== "chatgpt") return t;
  }
  return null;
}

function pickTitleFromHeader() {
  const candidates = [
    '[data-testid="conversation-title"]',
    'header [data-testid="conversation-title"]',
    'header h1',
    'main h1',
    'h1',
  ];
  for (const sel of candidates) {
    const el = document.querySelector(sel);
    const t = (el?.textContent || "").trim();
    if (t && t.length > 1 && t.length < 200 && t.toLowerCase() !== "chatgpt") return t;
  }
  return null;
}

function getConversationTitle() {
  const convoId = getConversationId();
  const byId = pickTitleFromLinksById(convoId);
  if (byId) return byId;

  const fromNav = pickTitleFromActiveNav();
  if (fromNav) return fromNav;

  const fromHeader = pickTitleFromHeader();
  if (fromHeader) return fromHeader;

  const dt = (document.title || "").trim();
  if (dt) {
    // Remove common suffixes
    const stripped = dt
      .replace(/\s*[-|•]\s*ChatGPT.*$/i, "")
      .replace(/\s*[-|•]\s*OpenAI.*$/i, "")
      .trim();
    if (stripped && stripped.toLowerCase() !== "chatgpt") return stripped;
  }

  // Fallback: use first user message snippet as title.
  const firstUser = document.querySelector('[data-message-author-role="user"]');
  const firstText = firstUser?.innerText?.trim();
  if (firstText) return firstText.split(/\s+/).slice(0, 10).join(" ");

  return "ChatGPT Conversation";
}

function cleanText(raw) {
  const lines = String(raw || "").split("\n");
  const cleaned = lines
    .map(l => l.replace(/\u00a0/g, " ").trimEnd())
    .filter(l => {
      const t = l.trim();
      if (!t) return true;
      if (CLEAN_UI_LINES.has(t)) return false;
      // Filter weird footer lines some UI injects
      if (/^Exported with/i.test(t)) return false;
      return true;
    });
  // Collapse excessive blank lines
  return cleaned.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function extractMessages() {
  // ChatGPT typically annotates each message with data-message-author-role.
  // We scope to <main> to reduce duplicates from side panels.
  const nodes = Array.from(document.querySelectorAll("main [data-message-author-role]"));
  const msgs = [];
  const seen = new Set();

  for (const node of nodes) {
    const role = (node.getAttribute("data-message-author-role") || "").trim() || "unknown";
    if (role !== "user" && role !== "assistant" && role !== "system" && role !== "tool") continue;

    const key =
      node.getAttribute("data-message-id") ||
      node.getAttribute("data-testid") ||
      `${role}:${(node.innerText || "").slice(0, 120)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const contentEl =
      node.querySelector("[data-message-content]") ||
      node.querySelector(".markdown") ||
      node.querySelector(".prose") ||
      node.querySelector("div[class*='markdown']") ||
      node;

    const { html, attachments } = extractRichContent(node, contentEl);
    const raw = contentEl?.innerText || "";
    const text = cleanText(raw);

    if (text || (attachments && attachments.length) || (html && html.trim())) {
      msgs.push({ role, text, html, attachments });
    }
  }

  // Fallback: try to find chat bubbles if attribute isn't present
  if (!msgs.length) {
    const articles = Array.from(document.querySelectorAll("main article"));
    for (const a of articles) {
      const text = cleanText(a.innerText);
      if (!text) continue;
      const role = a.querySelector("img[alt*='user' i]") ? "user" : "assistant";
      const { html, attachments } = extractRichContent(a, a);
      msgs.push({ role, text, html, attachments });
    }
  }

  return msgs;
}

function isProbablyEmojiImage(img) {
  const src = img.getAttribute("src") || "";
  const alt = (img.getAttribute("alt") || "").trim();
  if (/^data:image\//i.test(src) && alt && alt.length <= 4) return true;
  if ((img.className || "").toString().toLowerCase().includes("emoji")) return true;
  return false;
}

function getFilenameFromUrl(u) {
  try {
    const url = new URL(u, location.href);
    const last = url.pathname.split("/").pop() || "";
    return decodeURIComponent(last);
  } catch (_) {
    return "";
  }
}

function guessKindFromName(name) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) return "image";
  return "file";
}

function isLikelyFileAttachmentLink(a) {
  const href = a.getAttribute("href") || "";
  const abs = a.href || href;
  const text = (a.textContent || "").trim();

  if (!abs) return false;
  if (a.hasAttribute("download")) return true;
  if (/files\.openai\.com|openaiusercontent\.com|\/backend-api\/files\//i.test(abs)) return true;
  if (/\.(pdf|docx|xlsx|csv|zip|txt|md|pptx|json|js|ts|py|java|c|cpp|rs|go|html|css)$/i.test(text) && text.length < 180) return true;
  // Common "file card" anchors: contain an icon + short filename
  if (a.querySelector("svg") && /\.[a-z0-9]{1,5}$/i.test(text) && text.length < 180) return true;
  return false;
}

function extractRichContent(container, contentEl) {
  const attachments = [];

  // 1) Images: treat as attachments (except emoji)
  const imgs = Array.from(container.querySelectorAll("img"));
  let imgN = 0;
  for (const img of imgs) {
    if (isProbablyEmojiImage(img)) continue;
    // Avoid capturing avatars/icons. Prefer images inside the message content,
    // or images hosted from OpenAI's file domains (common for uploads/generations).
    const src0 = img.getAttribute("src") || "";
    const inContent = !!(contentEl && contentEl.contains(img));
    const fromOpenAI = /files\.openai\.com|openaiusercontent\.com/i.test(src0);
    if (!inContent && !fromOpenAI) continue;
    const src = img.getAttribute("src") || "";
    if (!src) continue;
    imgN += 1;
    const nameFromUrl = getFilenameFromUrl(src);
    const name =
      (img.getAttribute("alt") || "").trim() ||
      nameFromUrl ||
      `image-${imgN}`;
    attachments.push({ kind: "image", name, url: src });
  }

  // 2) Links that look like file attachments
  const links = Array.from(container.querySelectorAll("a[href]"));
  for (const a of links) {
    if (!isLikelyFileAttachmentLink(a)) continue;
    const abs = a.href || a.getAttribute("href") || "";
    const name = (a.textContent || "").trim() || getFilenameFromUrl(abs) || "file";
    const kind = guessKindFromName(name);
    attachments.push({ kind, name, url: abs });
  }

  // De-dupe attachments
  const uniq = new Map();
  for (const at of attachments) {
    const k = `${at.kind}|${at.name}|${at.url}`;
    if (!uniq.has(k)) uniq.set(k, at);
  }
  const deduped = Array.from(uniq.values());

  // Build HTML (best-effort). We remove images so the PDF isn't huge and matches requested UI.
  let html = "";
  try {
    const root = contentEl ? contentEl.cloneNode(true) : null;
    if (root) {
      root.querySelectorAll("img").forEach((img) => img.remove());
      root.querySelectorAll("script, style, noscript, iframe").forEach((el) => el.remove());
      root.querySelectorAll("button, textarea, input, select, form").forEach((el) => el.remove());

      // Strip inline styles & event handlers.
      root.querySelectorAll("*").forEach((el) => {
        Array.from(el.attributes || []).forEach((attr) => {
          const n = (attr.name || "").toLowerCase();
          if (n.startsWith("on") || n === "style") el.removeAttribute(attr.name);
          if (n === "href") {
            const v = (el.getAttribute("href") || "").trim();
            if (/^javascript:/i.test(v)) el.removeAttribute("href");
          }
        });
      });

      html = root.innerHTML.trim();
    }
  } catch (_) {
    html = "";
  }

  return { html, attachments: deduped };
}

function getConversation() {
  return {
    title: getConversationTitle(),
    url: location.href,
    exportedAt: new Date().toISOString(),
    messages: extractMessages(),
  };
}

async function copyToClipboard(text) {
  const t = String(text || "");
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch (_) {
    // Fallback
    try {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return !!ok;
    } catch (e) {
      return false;
    }
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg?.type) return;
  if (msg.type === "EXPORTGPT_GET_CONVERSATION") {
    sendResponse(getConversation());
    return true;
  }
  if (msg.type === "EXPORTGPT_COPY_TO_CLIPBOARD") {
    copyToClipboard(msg.text).then((ok) => sendResponse({ ok }));
    return true;
  }
});

/** Optional: floating quick-export button */
function injectFab() {
  if (document.getElementById("exportgpt-fab")) return;

  const fab = document.createElement("button");
  fab.id = "exportgpt-fab";
  fab.type = "button";
  fab.title = "ExportGPT: Print / Save as PDF";
  fab.innerHTML = `<span class="eg-dot"></span><span class="eg-label">Export</span>`;
  fab.addEventListener("click", async () => {
    // Quick print flow: store convo + open print page
    const convo = getConversation();
    const { settings } = await chrome.storage.local.get(["settings"]);
    await chrome.storage.local.set({ lastPrintData: convo, lastPrintSettings: settings || {} });
    chrome.runtime.sendMessage({ type: "EXPORTGPT_OPEN_PRINT" });
  });

  document.documentElement.appendChild(fab);
}

function shouldEnableFab() {
  // Only in actual chat view.
  return /\/c\//.test(location.pathname) || /\/chat\//.test(location.pathname) || location.pathname === "/";
}

if (shouldEnableFab()) injectFab();
