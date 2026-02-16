// --- AYARLAR ---
let roomId = "vibe-room-1"; 
const socket = io("http://localhost:3000");

// Jam Modu Kontrolü
let isPartyActive = sessionStorage.getItem('jamActive') === 'true';

let isRemoteAction = false; 
let video = null; 
let currentUrl = location.href;

// Tolerans Ayarı: 2 saniyeden az farkları görmezden gel (Keyif kaçmasın diye)
const SYNC_THRESHOLD = 2; 

// --- BAŞLANGIÇ ---
if (isPartyActive) {
    connectToRoom();
}

function connectToRoom() {
    socket.emit('joinRoom', roomId);
    console.log("🟢 Jam Modu: AKTİF. Oda:", roomId);
}

// --- ANA DÖNGÜ (Sürekli Kontrol) ---
setInterval(() => {
    if (!isPartyActive) return;

    // 1. VİDEO YAKALAMA
    const newVideo = document.querySelector('video');
    if (newVideo && newVideo !== video) {
        console.log("🎥 Video elementi yakalandı.");
        video = newVideo;
        attachEvents(video);
    }

    // 2. URL KONTROLÜ
    if (location.href !== currentUrl) {
        currentUrl = location.href;
        if (!isRemoteAction && currentUrl.includes("watch?v=")) {
            console.log("🔗 URL değişti, bildiriliyor...");
            socket.emit('videoAction', { 
                type: 'URL', 
                newUrl: currentUrl, 
                roomId: roomId 
            });
        }
    }
}, 1000);

// --- YENİ: HEARTBEAT (NABIZ) SİSTEMİ 💓 ---
// Her 4 saniyede bir, eğer video oynuyorsa zamanımı diğerlerine bildir.
setInterval(() => {
    if (isPartyActive && video && !video.paused && !isRemoteAction) {
        // Sadece 'watch' sayfalarındaysak gönder
        if(location.href.includes("watch?v=")) {
            socket.emit('videoAction', { 
                type: 'HEARTBEAT', 
                time: video.currentTime, 
                roomId: roomId 
            });
        }
    }
}, 4000); 


// --- VİDEO DİNLEYİCİLERİ ---
function attachEvents(vid) {
    const shouldSend = () => isPartyActive && !isRemoteAction;

    vid.onplay = () => {
        if (shouldSend()) socket.emit('videoAction', { type: 'PLAY', roomId });
    };

    vid.onpause = () => {
        if (shouldSend()) socket.emit('videoAction', { type: 'PAUSE', roomId });
    };

    vid.onseeking = () => {
        if (shouldSend()) socket.emit('videoAction', { type: 'SEEK', time: vid.currentTime, roomId });
    };
}

// --- SUNUCUDAN GELENLERİ UYGULA ---
socket.on('applyAction', (data) => {
    if (!isPartyActive) return;

    // Kilit tak (Kendi kendimize döngüye girmeyelim)
    isRemoteAction = true; 

    // 1. HEARTBEAT (OTOMATİK DÜZELTME)
    if (data.type === 'HEARTBEAT') {
        if (video && !video.paused) { // Sadece video oynuyorsa düzelt
            const diff = Math.abs(video.currentTime - data.time);
            
            // Eğer fark EŞİK DEĞERİNDEN (2 sn) büyükse düzelt
            if (diff > SYNC_THRESHOLD) {
                console.log(`⚠️ Kayma tespit edildi (${diff.toFixed(1)}sn). Senkronize ediliyor...`);
                video.currentTime = data.time;
            }
        }
        // Heartbeat işlemi çok hızlı olduğu için kilidi hemen aç
        isRemoteAction = false; 
        return; 
    }

    console.log("📥 Gelen Komut:", data.type);

    // 2. URL DEĞİŞİMİ
    if (data.type === 'URL') {
        if (location.href !== data.newUrl) {
            window.location.href = data.newUrl;
            return; 
        }
    }
    // 3. SYNC (Hoş Geldin Paketi)
    else if (data.type === 'SYNC') {
        if (location.href !== data.newUrl && data.newUrl.includes("watch?v=")) {
            window.location.href = data.newUrl;
            return;
        }
        if (video) {
            video.currentTime = data.time;
            if (data.isPlaying) video.play(); else video.pause();
        }
    }
    // 4. NORMAL EYLEMLER
    else if (video) {
        if (data.type === 'PLAY') video.play();
        else if (data.type === 'PAUSE') video.pause();
        else if (data.type === 'SEEK') video.currentTime = data.time;
    }

    setTimeout(() => { isRemoteAction = false; }, 1000);
});

// --- YENİ GELENLERE DURUM RAPORU ---
socket.on('requestSync', (requesterId) => {
    if (!isPartyActive || !video) return;
    
    socket.emit('sendSyncData', {
        targetId: requesterId,
        action: {
            type: 'SYNC',
            time: video.currentTime,
            isPlaying: !video.paused,
            newUrl: location.href,
            roomId: roomId
        }
    });
});

// --- POPUP İLETİŞİMİ ---
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "JOIN") {
        isPartyActive = true;
        sessionStorage.setItem('jamActive', 'true');
        roomId = msg.roomId;
        connectToRoom();
        alert("Odaya Bağlandın!");
        if(video) attachEvents(video);
    }
    else if (msg.type === "LEAVE") {
        isPartyActive = false;
        sessionStorage.removeItem('jamActive');
        socket.emit('leaveRoom', roomId);
        alert("Odadan Ayrıldın.");
        location.reload(); 
    }
});