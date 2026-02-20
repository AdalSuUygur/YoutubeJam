// 1. Başlangıç Ayarları
// 'const' yerine 'let' kullandık çünkü oda ismi popup'tan gelen mesajla değişebilecek.
let roomId = "vibe-room-1"; 
const socket = io("http://localhost:3000");

// 2. Kilit (Flag) Mekanizması
// Sunucudan gelen komutların sonsuz döngüye girmesini engeller.
let isRemoteAction = false; 

// 3. Odaya İlk Giriş
socket.emit('joinRoom', roomId);

socket.on('connect', () => {
    console.log("Sunucuya bağlandım! Şu anki oda:", roomId);
});

// 4. Video Oynatıcıyı Yakala
const video = document.querySelector('video');

if (video) {
    // --- KULLANICI HAREKETLERİNİ DİNLE (Sunucuya Gönder) ---

    video.onplay = () => {
        if (!isRemoteAction) {
            socket.emit('videoAction', { type: 'PLAY', roomId: roomId });
        }
    };

    video.onpause = () => {
        if (!isRemoteAction) {
            socket.emit('videoAction', { type: 'PAUSE', roomId: roomId });
        }
    };

    video.onseeking = () => {
        if (!isRemoteAction) {
            socket.emit('videoAction', { 
                type: 'SEEK', 
                time: video.currentTime, 
                roomId: roomId 
            });
        }
    };

    // --- SUNUCUDAN GELEN EMİRLERİ DİNLE (Videoya Uygula) ---

    socket.on('videoActionFromServer', (data) => {
        isRemoteAction = true; // Kilidi kapat

        if (data.type === 'PLAY') {
            video.play();
        } else if (data.type === 'PAUSE') {
            video.pause();
        } else if (data.type === 'SEEK') {
            video.currentTime = data.time;
        }

        // Kısa bir süre sonra kilidi tekrar aç
        setTimeout(() => { isRemoteAction = false; }, 500);
    });
}

// 5. POPUP'TAN GELEN MESAJLARI DİNLE (Oda Değiştirme)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "JOIN_NEW_ROOM") {
        console.log("Yeni odaya geçiş yapılıyor:", message.roomId);
        
        // Eski odadan bağı kopar ve yeni odaya gir (Server tarafında joinRoom bunu halleder)
        socket.emit('joinRoom', message.roomId);
        
        // Yerel oda değişkenini güncelle ki mesajlar artık yeni odaya gitsin
        roomId = message.roomId; 
    }
});