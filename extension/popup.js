// KATIL BUTONU
document.getElementById('joinBtn').addEventListener('click', () => {
    const roomId = document.getElementById('roomInput').value;
    if (!roomId) return alert("Oda adı girin!");

    // YENİ EKLENEN KONTROL: Chrome'a şu anki sekmeyi soruyoruz
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        
        // Eğer sekme yoksa veya URL 'youtube.com' içermiyorsa işlemi durdur
        if (!currentTab || !currentTab.url.includes("youtube.com")) {
            return alert("YoutubeJam'i kullanmak için lütfen önce bir YouTube sekmesi açın!");
        }

        // Eğer YouTube'daysak: Odayı kaydet ve Content Script'e bildir
        chrome.storage.local.set({ savedRoomId: roomId }, () => {
            sendMessageToContent("JOIN_NEW_ROOM", roomId);
        });
    });
});

// AYRIL BUTONU
document.getElementById('leaveBtn').addEventListener('click', () => {
    // 1. Adım: Content Script'e "Bağlantıyı kopar" emri gönder
    sendMessageToContent("LEAVE_ROOM", null);

    // 2. Adım: Hafızayı temizle (Hangi odada olduğumuzu unutalım)
    chrome.storage.local.remove(['savedRoomId', 'roomUserCount']);

    // 3. Adım: UI Güncelleme (Aşağıda detaylandırıyoruz)
    document.getElementById('countDisplay').innerText = "Aktif bir odada değilsiniz.";
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

    const countDisplay = document.getElementById('countDisplay');
    const roomInput = document.getElementById('roomInput');

    if (result.savedRoomId) {
        roomInput.value = result.savedRoomId;
        // Eğer sayı henüz gelmemişse (null/undefined ise) 1 olarak varsayalım
        const count = result.roomUserCount || 1;
        countDisplay.innerText = `Odada: ${count} kişi`;
    } else {
        // BURASI ÖNEMLİ: Eğer kayıtlı oda yoksa UI'ı temizle
        roomInput.value = ""; // Input kutusunu da boşaltalım
        countDisplay.innerText = "Aktif bir odada değilsiniz.";
    }
});