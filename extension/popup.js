document.getElementById('joinBtn').addEventListener('click', () => {
    const roomId = document.getElementById('roomInput').value;

    // Aktif olan YouTube sekmesini bul ve ona mesaj gönder
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
            type: "JOIN_NEW_ROOM",
            roomId: roomId
        });
    });

    // Best Practice: Odayı hafızaya kaydet ki pencere kapanınca unutmasın
    chrome.storage.local.set({ savedRoomId: roomId });
    alert("Oda değiştirme isteği gönderildi: " + roomId);
});