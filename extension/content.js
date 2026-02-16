// --- AYARLAR ---
let roomId = "vibe-room-1"; 
const socket = io("http://localhost:3000");
let isPartyActive = sessionStorage.getItem('jamActive') === 'true';
let isRemoteAction = false; 
let video = null; 
let currentUrl = location.href;
const SYNC_THRESHOLD = 2; 

// --- BAŞLANGIÇ ---
if (isPartyActive) connectToRoom();

function connectToRoom() {
    socket.emit('joinRoom', roomId);
    console.log("🟢 Jam Modu: AKTİF. Oda:", roomId);
}

// --- ANA DÖNGÜ ---
setInterval(() => {
    if (!isPartyActive) return;

    // Video ve URL kontrolü (Aynı kaldı)
    const newVideo = document.querySelector('video');
    if (newVideo && newVideo !== video) {
        video = newVideo;
        attachEvents(video);
    }
    if (location.href !== currentUrl) {
        currentUrl = location.href;
        if (!isRemoteAction && currentUrl.includes("watch?v=")) {
            socket.emit('videoAction', { type: 'URL', newUrl: currentUrl, roomId });
        }
    }
}, 1000);

// --- HEARTBEAT ---
setInterval(() => {
    if (isPartyActive && video && !video.paused && !isRemoteAction && location.href.includes("watch?v=")) {
        socket.emit('videoAction', { type: 'HEARTBEAT', time: video.currentTime, roomId });
    }
}, 4000); 

// --- VİDEO DİNLEYİCİLERİ ---
function attachEvents(vid) {
    const shouldSend = () => isPartyActive && !isRemoteAction;

    vid.onplay = () => { if (shouldSend()) socket.emit('videoAction', { type: 'PLAY', roomId }); };
    vid.onpause = () => { if (shouldSend()) socket.emit('videoAction', { type: 'PAUSE', roomId }); };
    vid.onseeking = () => { if (shouldSend()) socket.emit('videoAction', { type: 'SEEK', time: vid.currentTime, roomId }); };
    
    // --- YENİ: VİDEO BİTİNCE SIRADAKİNE GEÇ ---
    vid.onended = () => {
        if (isPartyActive) {
            console.log("🎬 Video bitti! Sıradaki isteniyor...");
            // Listeden bir sonraki videoyu oynatması için sunucuya emir ver
            socket.emit('queueAction', { type: 'NEXT', roomId });
        }
    };
}

// --- SUNUCUDAN GELENLER ---
socket.on('applyAction', (data) => {
    if (!isPartyActive) return;
    isRemoteAction = true; 

    // URL ve SYNC işlemleri (Aynı kaldı)
    if (data.type === 'URL' || (data.type === 'SYNC' && data.newUrl !== location.href)) {
        if(location.href !== data.newUrl) {
            window.location.href = data.newUrl;
            return;
        }
    }
    
    // Video Kontrolleri & Heartbeat (Aynı kaldı)
    if (data.type === 'HEARTBEAT' && video && !video.paused) {
        if (Math.abs(video.currentTime - data.time) > SYNC_THRESHOLD) video.currentTime = data.time;
        isRemoteAction = false; return;
    }
    
    if (video) {
        if (data.type === 'PLAY') video.play();
        else if (data.type === 'PAUSE') video.pause();
        else if (data.type === 'SEEK') video.currentTime = data.time;
        else if (data.type === 'SYNC') {
            video.currentTime = data.time;
            if (data.isPlaying) video.play(); else video.pause();
        }
    }
    setTimeout(() => { isRemoteAction = false; }, 1000);
});

// --- YENİ: LİSTE GÜNCELLEMELERİNİ DİNLE ---
socket.on('updateQueue', (queue) => {
    console.log("📋 Liste güncellendi:", queue);
    // Eğer popup açıksa ona da gönder
    chrome.runtime.sendMessage({ type: "UPDATE_POPUP_QUEUE", queue });
});


// --- POPUP İLETİŞİMİ ---
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "JOIN") {
        isPartyActive = true;
        sessionStorage.setItem('jamActive', 'true');
        roomId = msg.roomId;
        connectToRoom();
        alert("Bağlandın!");
    }
    else if (msg.type === "LEAVE") {
        isPartyActive = false;
        sessionStorage.removeItem('jamActive');
        socket.emit('leaveRoom', roomId);
        location.reload(); 
    }
    // YENİ: POPUP LİSTEYE BİR ŞEY EKLEDİ
    else if (msg.type === "QUEUE_ADD") {
        socket.emit('queueAction', { type: 'ADD', url: msg.url, roomId });
    }
    // YENİ: POPUP LİSTEYİ GÖRMEK İSTEDİ (Sadece tetikleyici, veri socket.on'dan gelecek)
    else if (msg.type === "GET_QUEUE_DATA") {
        // Bu tetiklendiğinde sunucu zaten updateQueue atar mı? 
        // En iyisi sunucudan istemek yerine content script'in hafızasındakini yollamak ama
        // Şimdilik pas geçiyoruz, bir sonraki eventte güncellenir.
    }
});