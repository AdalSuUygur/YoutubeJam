// KATIL BUTONU
document.getElementById('joinBtn').addEventListener('click', () => {
    const roomId = document.getElementById('roomInput').value;
    if (!roomId) return alert("Oda adı girin!");
    
    // Odayı kaydet ve Content Script'e bildir
    chrome.storage.local.set({ savedRoomId: roomId }, () => {
        sendMessageToContent("JOIN_NEW_ROOM", roomId);
    });
});

// AYRIL BUTONU
document.getElementById('leaveBtn').addEventListener('click', () => {
    sendMessageToContent("LEAVE_ROOM", null);
    chrome.storage.local.remove(['savedRoomId']);
});

// Yardımcı Fonksiyon (Rozet Işığı Eklendi)
function sendMessageToContent(type, data) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: type,
                roomId: data
            });

            // YENİ: ROZET (BADGE) KONTROLÜ
            if (type === "JOIN_NEW_ROOM") {
                // Odaya girince yeşil "ON" ışığını yak
                chrome.action.setBadgeText({ text: "ON", tabId: tabs[0].id });
                chrome.action.setBadgeBackgroundColor({ color: "#00FF00", tabId: tabs[0].id });
            } else if (type === "LEAVE_ROOM") {
                // Odadan çıkınca ışığı söndür (yazıyı temizle)
                chrome.action.setBadgeText({ text: "", tabId: tabs[0].id });
            }
        }
    });
}

// Kayıtlı odayı ve KİŞİ SAYISINI geri getir
chrome.storage.local.get(['savedRoomId', 'roomUserCount'], (result) => {
    if (result.savedRoomId) {
        document.getElementById('roomInput').value = result.savedRoomId;
    }
    if (result.roomUserCount) {
        document.getElementById('countDisplay').innerText = `Odada: ${result.roomUserCount} kişi`;
    }
});