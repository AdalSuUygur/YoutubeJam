/**
 * popup.js
 * - Aktif sekmedeki content.js ile mesajlaşır
 * - "Sunucuya Bağlan" / "Bağlantıyı Kes" toggle
 * - UI: buton rengi ve durum metni değişir
 */

const statusText = document.getElementById("statusText");
const statusPill = document.getElementById("statusPill");
const toggleBtn = document.getElementById("toggleBtn");

function setUI(connected) {
  statusText.textContent = `Durum: ${connected ? "Bağlı" : "Kopuk"}`;
  statusPill.textContent = connected ? "Bağlı" : "Kopuk";

  statusPill.classList.toggle("connected", connected);
  statusPill.classList.toggle("disconnected", !connected);

  toggleBtn.textContent = connected ? "Bağlantıyı Kes" : "Sunucuya Bağlan";
  toggleBtn.classList.toggle("connect", !connected);
  toggleBtn.classList.toggle("disconnect", connected);
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function sendToTab(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (resp) => resolve(resp));
  });
}

async function refreshState() {
  const tab = await getActiveTab();
  if (!tab?.id) {
    setUI(false);
    statusText.textContent = "Durum: Sekme bulunamadı";
    return;
  }

  const resp = await sendToTab(tab.id, { type: "YJ_GET_STATE" });
  const connected = !!resp?.connected;
  setUI(connected);
}

toggleBtn.addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab?.id) return;

  const state = await sendToTab(tab.id, { type: "YJ_GET_STATE" });
  const currentlyConnected = !!state?.connected;

  const action = currentlyConnected ? "YJ_DISCONNECT" : "YJ_CONNECT";
  const resp = await sendToTab(tab.id, { type: action });

  setUI(!!resp?.connected);
});

refreshState();
