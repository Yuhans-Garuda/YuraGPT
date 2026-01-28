
const DEFAULT_SETTINGS = {
  includeFooter: true,
  includeMeta: true,
  filenameWithDate: false,
  autoPrint: true,
};

function $(id){return document.getElementById(id);}

async function getSettings() {
  const data = await chrome.storage.local.get(["settings"]);
  return { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
}

async function saveSettings(partial) {
  const cur = await getSettings();
  const next = { ...cur, ...partial };
  await chrome.storage.local.set({ settings: next });
  return next;
}

function setStatus(text) {
  const el = $("status");
  el.textContent = text;
  clearTimeout(setStatus._t);
  setStatus._t = setTimeout(() => (el.textContent = ""), 1800);
}

(async function init(){
  const s = await getSettings();
  $("includeFooter").checked = !!s.includeFooter;
  $("includeMeta").checked = !!s.includeMeta;
  $("filenameWithDate").checked = !!s.filenameWithDate;
  $("autoPrint").checked = !!s.autoPrint;

  const handler = async () => {
    await saveSettings({
      includeFooter: $("includeFooter").checked,
      includeMeta: $("includeMeta").checked,
      filenameWithDate: $("filenameWithDate").checked,
      autoPrint: $("autoPrint").checked,
    });
    setStatus("Tersimpan ✅");
  };

  ["includeFooter","includeMeta","filenameWithDate","autoPrint"].forEach((id) => {
    $(id).addEventListener("change", handler);
  });
})();
