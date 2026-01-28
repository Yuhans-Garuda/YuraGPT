
/* ExportGPT - Yuhans (service worker) */

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id || !tab.url) return null;
  try {
    const u = new URL(tab.url);
    if (u.host !== "chatgpt.com" && u.host !== "chat.openai.com") return null;
  } catch (_) {
    return null;
  }
  return tab;
}

async function openPrintPage() {
  await chrome.tabs.create({ url: chrome.runtime.getURL("print.html") });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "EXPORTGPT_OPEN_PRINT") {
    openPrintPage();
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "exportgpt_print_pdf") return;

  const tab = await getActiveTab();
  if (!tab) return;

  try {
    const convo = await chrome.tabs.sendMessage(tab.id, { type: "EXPORTGPT_GET_CONVERSATION" });
    const { settings } = await chrome.storage.local.get(["settings"]);
    await chrome.storage.local.set({ lastPrintData: convo, lastPrintSettings: settings || {} });
    await openPrintPage();
  } catch (e) {
    // ignore
  }
});
