let roomId = null; 
let socket = null;
let isRemoteAction = false; 
let video = null; 
let currentUrl = location.href;

// 1. BAĞLANTI FONKSİYONU (Sadece butona basınca)
function connect(id) {
    if (socket) socket.disconnect(); // Varsa eski bağlantıyı kapat
    
    socket = io("http://localhost:3000");
    roomId = id;

    socket.on('connect', () => {
        console.log("✅ Sunucuya bağlandım! Oda:", roomId);
        socket.emit('joinRoom', roomId);
    });

    // Sunucudan gelen emirleri dinle
    socket.on('videoActionFromServer', (data) => {
        handleServerAction(data);
    });

    // Senkronizasyon isteği (Odaya yeni biri gelirse)
    socket.on('getSyncData', (targetId) => {
        if (video) {
            socket.emit('sendSyncData', {
                targetId: targetId,
                action: {
                    type: 'SYNC',
                    newUrl: location.href,
                    time: video.currentTime,
                    state: !video.paused
                }
            });
        }
    });
}

// 2. KOMUT MERKEZİ (Command Pattern Mantığı)
function handleServerAction(data) {
    isRemoteAction = true;
    console.log("📥 Sunucudan emir:", data.type);

    if (data.type === 'URL_CHANGE' || data.type === 'SYNC') {
        if (location.href !== data.newUrl) {
            window.location.href = data.newUrl;
            return; // Sayfa yenileneceği için kilit açmaya gerek yok
        }
    }

    if (video) {
        if (data.type === 'PLAY' || (data.type === 'SYNC' && data.state)) video.play();
        else if (data.type === 'PAUSE' || (data.type === 'SYNC' && !data.state)) video.pause();
        else if (data.type === 'SEEK' || data.type === 'SYNC') video.currentTime = data.time;
    }

    setTimeout(() => { isRemoteAction = false; }, 1000);
}

// 3. SAYFA VE VİDEO TAKİBİ
function checkPageStatus() {
    if (!socket) return;

    // Link değişimi kontrolü
    if (location.href !== currentUrl) {
        currentUrl = location.href;
        if (!isRemoteAction && currentUrl.includes("watch?v=")) {
            socket.emit('videoAction', { type: 'URL_CHANGE', newUrl: currentUrl, roomId });
        }
    }

    // Video elementi kontrolü
    const v = document.querySelector('video');
    if (v && v !== video) {
        video = v;
        attachEvents(video);
    }
}

function attachEvents(v) {
    v.onplay = () => { if (!isRemoteAction && socket) socket.emit('videoAction', { type: 'PLAY', roomId }); };
    v.onpause = () => { if (!isRemoteAction && socket) socket.emit('videoAction', { type: 'PAUSE', roomId }); };
    v.onseeking = () => { 
        if (!isRemoteAction && socket) {
            socket.emit('videoAction', { type: 'SEEK', time: v.currentTime, roomId });
        }
    };
}

setInterval(checkPageStatus, 500);

// 4. POPUP'TAN GELEN MESAJLAR
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "JOIN_NEW_ROOM") {
        sessionStorage.setItem('jamActive', 'true');
        connect(message.roomId);
    }
    else if (message.type === "LEAVE_ROOM") {
        if (socket) {
            socket.emit('leaveRoom', roomId);
            socket.disconnect();
        }
        sessionStorage.removeItem('jamActive');
        alert("Odadan ayrıldın.");
        location.reload();
    }
});

// Sayfa yenilendiğinde aktiflik kontrolü
if (sessionStorage.getItem('jamActive') === 'true') {
    chrome.storage.local.get(['savedRoomId'], (res) => {
        if (res.savedRoomId) connect(res.savedRoomId);
    });
}