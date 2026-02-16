let activePartyUrl = null;

// --- TEMEL BUTONLAR ---
document.getElementById('joinBtn').addEventListener('click', () => {
    const roomId = document.getElementById('roomInput').value;
    sendMessage("JOIN", { roomId });
    chrome.storage.local.set({ savedRoomId: roomId });
});

document.getElementById('leaveBtn').addEventListener('click', () => {
    sendMessage("LEAVE");
});

// YENİ: Sync Butonu
document.getElementById('syncBtn').addEventListener('click', () => {
    if (activePartyUrl) {
        chrome.tabs.update({ url: activePartyUrl });
    }
});

// --- LİSTE BUTONLARI ---
document.getElementById('addQueueBtn').addEventListener('click', () => {
    const url = document.getElementById('videoUrlInput').value;
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
        sendMessage("QUEUE_ADD", { url });
        document.getElementById('videoUrlInput').value = ""; 
    } else {
        alert("Lütfen geçerli bir YouTube linki girin!");
    }
});

// --- İLETİŞİM FONKSİYONU ---
function sendMessage(type, data = {}) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if(tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { type, ...data });
        }
    });
}

// --- POPUP AÇILINCA ---
chrome.storage.local.get(['savedRoomId'], (res) => {
    if (res.savedRoomId) document.getElementById('roomInput').value = res.savedRoomId;
});

// Content Script'ten verileri iste
sendMessage("GET_QUEUE_DATA");

// --- Content Script'ten Gelen Yanıtı Dinle ---
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "UPDATE_POPUP_QUEUE") {
        // Listeyi güncelle
        renderQueue(msg.queue);
        
        // URL KONTROLÜ (Senkronize miyiz?)
        if (msg.partyUrl) {
            activePartyUrl = msg.partyUrl;
            checkSyncStatus(activePartyUrl);
        }
    }
});

function checkSyncStatus(partyUrl) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        // Basit string karşılaştırması (Youtube parametreleri bazen sırayı değiştirir, ama genelde watch?v=ID aynı kalır)
        // Daha sağlam kontrol için sadece video ID'sine bakılabilir ama şimdilik URL yeterli.
        
        const alertBox = document.getElementById('syncAlert');
        
        if (currentTab.url !== partyUrl) {
            // Farklı sayfadayız, uyarıyı göster
            alertBox.style.display = "block";
        } else {
            // Aynı sayfadayız, gizle
            alertBox.style.display = "none";
        }
    });
}

function renderQueue(queue) {
    const listEl = document.getElementById('queueList');
    listEl.innerHTML = "";
    
    if (!queue || queue.length === 0) {
        listEl.innerHTML = "<li>Liste boş...</li>";
        return;
    }

    queue.forEach(url => {
        const li = document.createElement('li');
        li.textContent = url.substring(0, 35) + "..."; 
        listEl.appendChild(li);
    });
}