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

// Yardımcı Fonksiyon
function sendMessageToContent(type, data) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: type,
                roomId: data
            });
        }
    });
}

// Kayıtlı odayı geri getir
chrome.storage.local.get(['savedRoomId'], (result) => {
    if (result.savedRoomId) {
        document.getElementById('roomInput').value = result.savedRoomId;
    }
});