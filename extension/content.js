// 1. BAŞLANGIÇ AYARLARI
let roomId = "vibe-room-1"; 
const socket = io("http://localhost:3000");

// "Bu sekme Jam'e dahil mi?" kontrolü (Sayfa yenilense bile hatırlar)
let isPartyActive = sessionStorage.getItem('jamActive') === 'true';

let isRemoteAction = false; 
let video = null; 
let currentUrl = location.href;

// Eğer bu sekme daha önce aktifleştirildiyse odaya gir
if (isPartyActive) {
    socket.emit('joinRoom', roomId);
    console.log("🟢 Bu sekme Jam modunda ve aktif!");
} else {
    console.log("⚪ Bu sekme pasif modda. Aktifleştirmek için eklentiye tıkla.");
}

// 2. SÜREKLİ KONTROL MERKEZİ
function checkPageStatus() {
    // EĞER BU SEKME PASİFSE HİÇBİR ŞEY YAPMA!
    if (!isPartyActive) return;

    // --- A) LİNK DEĞİŞİM KONTROLÜ (FİLTRELİ) ---
    if (location.href !== currentUrl) {
        currentUrl = location.href;
        
        // FİLTRE: Sadece '/watch?v=' içeren GERÇEK videoları paylaş.
        // Shorts (/shorts/) veya Anasayfa (/) ise sunucuya gönderme.
        const isValidVideo = currentUrl.includes("watch?v=");

        if (!isRemoteAction && isValidVideo) {
            console.log("🔗 Geçerli video linki paylaşıldı:", currentUrl);
            socket.emit('videoAction', { 
                type: 'URL_CHANGE', 
                newUrl: currentUrl, 
                roomId: roomId 
            });
        }
    }

    // --- B) VİDEO ELEMENT KONTROLÜ ---
    const newVideo = document.querySelector('video');
    if (newVideo && newVideo !== video) {
        video = newVideo;
        attachEvents(video);
    }
}

// 3. VİDEO OLAYLARINI DİNLEME
function attachEvents(videoElement) {
    // Yardımcı fonksiyon: Sadece aktif ve geçerli videoyso gönder
    const canSend = () => isPartyActive && !isRemoteAction && location.href.includes("watch?v=");

    videoElement.onplay = () => {
        if (canSend()) socket.emit('videoAction', { type: 'PLAY', roomId });
    };

    videoElement.onpause = () => {
        if (canSend()) socket.emit('videoAction', { type: 'PAUSE', roomId });
    };

    videoElement.onseeking = () => {
        if (canSend()) {
            socket.emit('videoAction', { type: 'SEEK', time: videoElement.currentTime, roomId });
        }
    };
}

// Her yarım saniyede bir kontrol et
setInterval(checkPageStatus, 500);

// 4. SUNUCUDAN GELEN MESAJLARI UYGULA
socket.on('videoActionFromServer', (data) => {
    // Eğer ben pasifsem, dışarıdan gelen emirleri de takmam!
    if (!isPartyActive) return;

    isRemoteAction = true; 
    console.log("📥 Sunucudan emir:", data.type);

    if (data.type === 'URL_CHANGE') {
        if (location.href !== data.newUrl) {
            console.log("🚀 Arkadaşın videosuna ışınlanılıyor...");
            window.location.href = data.newUrl; 
        }
    } 
    else if (video) { 
        if (data.type === 'PLAY') video.play();
        else if (data.type === 'PAUSE') video.pause();
        else if (data.type === 'SEEK') video.currentTime = data.time;
    }

    setTimeout(() => { isRemoteAction = false; }, 1000);
});

// 5. POPUP İLETİŞİMİ (AKTİFLEŞTİRME BUTONU)
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "JOIN_NEW_ROOM") {
        console.log("✅ Bu sekme Jam için AKTİFLEŞTİRİLDİ:", message.roomId);
        
        // 1. Bu sekmeyi 'aktif' olarak işaretle ve hafızaya at
        isPartyActive = true;
        sessionStorage.setItem('jamActive', 'true');

        // 2. Odaya bağlan
        socket.emit('joinRoom', message.roomId);
        roomId = message.roomId; 
        
        alert("Bu sekme artık senkronize! Diğer sekmeler etkilenmeyecek.");
    }
});