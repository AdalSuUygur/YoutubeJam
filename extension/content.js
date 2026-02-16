const socket = io("http://localhost:3000");
const roomId = "vibe-room-1";
socket.emit('joinRoom', roomId);

let isRemoteAction = false; 
const video = document.querySelector('video');

if (video) {
    // Kullanıcı bir şey yapınca sunucuya haber ver
    video.onplay = () => {
        if (!isRemoteAction) socket.emit('videoAction', { type: 'PLAY', roomId });
    };

    video.onpause = () => {
        if (!isRemoteAction) socket.emit('videoAction', { type: 'PAUSE', roomId });
    };

    // Sunucudan emir gelince videoya uygula
    socket.on('videoActionFromServer', (data) => {
        isRemoteAction = true;
        if (data.type === 'PLAY') video.play();
        else if (data.type === 'PAUSE') video.pause();
        
        setTimeout(() => { isRemoteAction = false; }, 500);
    });
}