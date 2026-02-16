// --- AYARLAR ---
let roomId = "vibe-room-1"; 
const socket = io("http://localhost:3000");
let isPartyActive = sessionStorage.getItem('jamActive') === 'true';
let isRemoteAction = false; 
let video = null; 
let currentUrl = location.href;
const SYNC_THRESHOLD = 2; 

let currentQueue = []; 
let currentPartyUrl = null; // YENİ: Partinin olduğu asıl URL'yi burada tutuyoruz

// --- BAŞLANGIÇ ---
if (isPartyActive) connectToRoom();

function connectToRoom() {
    socket.emit('joinRoom', roomId);
    console.log("🟢 Jam Modu: AKTİF. Oda:", roomId);
}

// --- ANA DÖNGÜ ---
setInterval(() => {
    if (!isPartyActive) return;

    // Video kontrolü
    const newVideo = document.querySelector('video');
    if (newVideo && newVideo !== video) {
        video = newVideo;
        attachEvents(video);
    }

    // URL Değişimi Kontrolü
    if (location.href !== currentUrl) {
        currentUrl = location.href;
        
        // Eğer manuel gezerken doğru linke geldiysek, bunu sunucuya bildirelim mi?
        // Hayır, sadece izleyiciyiz. Ama eğer DJ bizsek ve link değiştirdiysek bildiririz.
        if (!isRemoteAction && currentUrl.includes("watch?v=")) {
            socket.emit('videoAction', { type: 'URL', newUrl: currentUrl, roomId });
        }
    }
}, 1000);

// --- HEARTBEAT ---
setInterval(() => {
    if (isPartyActive && video && !video.paused && !isRemoteAction && location.href.includes("watch?v=")) {
        if(video.currentTime > 1) {
            socket.emit('videoAction', { type: 'HEARTBEAT', time: video.currentTime, roomId });
        }
    }
}, 4000); 

// --- VİDEO DİNLEYİCİLERİ ---
function attachEvents(vid) {
    const shouldSend = () => isPartyActive && !isRemoteAction;

    vid.onplay = () => { if (shouldSend()) socket.emit('videoAction', { type: 'PLAY', roomId }); };
    vid.onpause = () => { if (shouldSend()) socket.emit('videoAction', { type: 'PAUSE', roomId }); };
    vid.onseeking = () => { if (shouldSend()) socket.emit('videoAction', { type: 'SEEK', time: vid.currentTime, roomId }); };
    
    vid.onended = () => {
        if (isPartyActive) {
            console.log("🎬 Video bitti! Sıradaki isteniyor...");
            socket.emit('queueAction', { type: 'NEXT', roomId });
        }
    };
}

// --- SUNUCUDAN GELENLER ---
socket.on('applyAction', (data) => {
    if (!isPartyActive) return;
    isRemoteAction = true; 

    // URL DEĞİŞİMİ: Sadece hafızaya kaydet, yönlendirme YAPMA.
    if (data.type === 'URL' || data.type === 'SYNC_NEW_USER') {
        if (data.newUrl) {
            currentPartyUrl = data.newUrl; // Hedef URL'yi güncelle
        }
    }
    
    // Video yoksa veya sayfada değilsek diğer komutları yoksay
    if (!video || (currentPartyUrl && location.href !== currentPartyUrl)) {
        isRemoteAction = false;
        return;
    }

    // HEARTBEAT
    if (data.type === 'HEARTBEAT' && !video.paused) {
        const timeDiff = data.time - video.currentTime;
        if (timeDiff > SYNC_THRESHOLD) {
            video.currentTime = data.time;
        }
        isRemoteAction = false; 
        return;
    }
    
    // OYNATMA KONTROLLERİ
    if (data.type === 'PLAY') video.play();
    else if (data.type === 'PAUSE') video.pause();
    else if (data.type === 'SEEK') video.currentTime = data.time;
    else if (data.type === 'SYNC_NEW_USER') {
        video.currentTime = data.time;
        if(data.isPlaying) video.play(); else video.pause();
    }

    setTimeout(() => { isRemoteAction = false; }, 1000);
});

// --- LİSTE GÜNCELLEMELERİ ---
socket.on('updateQueue', (queue) => {
    currentQueue = queue;
    // Popup'a hem listeyi hem de aktif parti URL'sini gönder
    chrome.runtime.sendMessage({ 
        type: "UPDATE_POPUP_QUEUE", 
        queue, 
        partyUrl: currentPartyUrl 
    }).catch(() => {});
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
    else if (msg.type === "QUEUE_ADD") {
        socket.emit('queueAction', { type: 'ADD', url: msg.url, roomId });
    }
    else if (msg.type === "GET_QUEUE_DATA") {
        // Popup veri istediğinde: Liste + O anki Parti URL'si
        chrome.runtime.sendMessage({ 
            type: "UPDATE_POPUP_QUEUE", 
            queue: currentQueue,
            partyUrl: currentPartyUrl 
        });
    }
});