// --- TEMEL BUTONLAR ---
document.getElementById('joinBtn').addEventListener('click', () => {
    const roomId = document.getElementById('roomInput').value;
    sendMessage("JOIN", { roomId });
    chrome.storage.local.set({ savedRoomId: roomId });
});

document.getElementById('leaveBtn').addEventListener('click', () => {
    sendMessage("LEAVE");
});

// --- LISTE (QUEUE) BUTONLARI ---
document.getElementById('addQueueBtn').addEventListener('click', () => {
    const url = document.getElementById('videoUrlInput').value;
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
        sendMessage("QUEUE_ADD", { url });
        document.getElementById('videoUrlInput').value = ""; // Kutuyu temizle
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

// --- POPUP AÇILINCA VERİLERİ ÇEK ---
// 1. Odayı Hatırla
chrome.storage.local.get(['savedRoomId'], (res) => {
    if (res.savedRoomId) document.getElementById('roomInput').value = res.savedRoomId;
});

// 2. Content Script'ten Listeyi İste
sendMessage("GET_QUEUE_DATA");

// 3. Content Script'ten Gelen Listeyi Dinle (Popup açıkken liste güncellenirse)
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "UPDATE_POPUP_QUEUE") {
        renderQueue(msg.queue);
    }
});

// Listeyi Ekrana Basan Fonksiyon
function renderQueue(queue) {
    const listEl = document.getElementById('queueList');
    listEl.innerHTML = "";
    
    if (queue.length === 0) {
        listEl.innerHTML = "<li>Liste boş...</li>";
        return;
    }

    queue.forEach(url => {
        const li = document.createElement('li');
        // URL çok uzunsa kısaltarak göster
        li.textContent = url.substring(0, 35) + "..."; 
        listEl.appendChild(li);
    });
}