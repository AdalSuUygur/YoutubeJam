let roomId = null; 
let socket = null;
let isRemoteAction = false; 
let video = null; 
let currentUrl = location.href;

// 1. BAĞLANTI FONKSİYONU
function connect(id) {
    if (socket) socket.disconnect(); 
    
    // Artık config dosyasından çekiyoruz:
    socket = io(CONFIG.API_URL); 
    roomId = id;

    socket.on('connect', () => {
        console.log("✅ Sunucuya bağlandım! Oda:", roomId);
        socket.emit('joinRoom', roomId);
    });

    socket.on('videoActionFromServer', (data) => {
        handleServerAction(data);
    });

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

// 2. BEKLEYEN SENKRONİZASYONU UYGULA (Yeni Eklenen Kritik Fonksiyon)
function applyPendingSync() {
    const pendingTime = sessionStorage.getItem('pendingSyncTime');
    const pendingState = sessionStorage.getItem('pendingSyncState');

    if (pendingTime && video) {
        console.log("⏳ Bekleyen senkronizasyon uygulanıyor...");
        
        // Video verisi yüklenene kadar bekle
        video.onloadedmetadata = () => {
            isRemoteAction = true;
            video.currentTime = parseFloat(pendingTime);
            
            if (pendingState === 'true') video.play(); else video.pause();
            
            // İşlem bitince temizle
            sessionStorage.removeItem('pendingSyncTime');
            sessionStorage.removeItem('pendingSyncState');
            
            setTimeout(() => { isRemoteAction = false; }, 1000);
        };

        // Eğer video zaten yüklüyse (metadata event'i kaçtıysa) direkt çalıştır
        if (video.readyState >= 1) {
            video.onloadedmetadata();
        }
    }
}

// URL'den sadece Video ID'sini çeken yardımcı fonksiyon
function getVideoId(url) {
    const urlObj = new URL(url);
    return urlObj.searchParams.get("v");
}

// 3. KOMUT MERKEZİ
function handleServerAction(data) {
    isRemoteAction = true;
    console.log("📥 Sunucudan emir:", data.type);

    if (data.type === 'URL_CHANGE' || data.type === 'SYNC') {
        const currentVideoId = getVideoId(location.href);
        const incomingVideoId = getVideoId(data.newUrl);

// Tüm link yerine sadece Video ID'lerini karşılaştırıyoruz
        if (currentVideoId !== incomingVideoId) {
            if (data.type === 'SYNC') {
                sessionStorage.setItem('pendingSyncTime', data.time);
                sessionStorage.setItem('pendingSyncState', data.state);
            }
            window.location.href = data.newUrl;
            return; 
        }
    }

    if (video) {
        if (data.type === 'PLAY' || (data.type === 'SYNC' && data.state)) {
            video.play();
        } else if (data.type === 'PAUSE' || (data.type === 'SYNC' && !data.state)) {
            video.pause();
        }

        if (data.type === 'SEEK' || data.type === 'SYNC') {
            const timeDiff = Math.abs(video.currentTime - data.time);
            if (timeDiff > 1) {
                video.currentTime = data.time;
            }
        }
    }

    setTimeout(() => { isRemoteAction = false; }, 1000);
}

// 4. SAYFA VE VİDEO TAKİBİ
function checkPageStatus() {
    if (!socket) return;

    if (location.href !== currentUrl) {
        currentUrl = location.href;
        if (!isRemoteAction && currentUrl.includes("watch?v=")) {
            socket.emit('videoAction', { type: 'URL_CHANGE', newUrl: currentUrl, roomId });
        }
    }

    const v = document.querySelector('video');
    if (v && v !== video) {
        video = v;
        attachEvents(video);
        // --- BURASI KRİTİK ---
        // Yeni video elementi bulunduğunda, bekleyen bir senkronizasyon var mı bak:
        applyPendingSync();
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

// 5. POPUP'TAN GELEN MESAJLAR
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "JOIN_NEW_ROOM") {
        sessionStorage.setItem('jamActive', 'true');
        connect(message.roomId);
        // Yeni eklenen geri bildirim:
        alert(`${message.roomId} odasına başarıyla katıldın!`);
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

if (sessionStorage.getItem('jamActive') === 'true') {
    chrome.storage.local.get(['savedRoomId'], (res) => {
        if (res.savedRoomId) connect(res.savedRoomId);
    });
}