// ... (eski kodların devamı)

if (video) {
    // KULLANICI SARDIĞINDA
    video.onseeking = () => {
        if (!isRemoteAction) {
            socket.emit('videoAction', { 
                type: 'SEEK', 
                time: video.currentTime, // Hangi saniyeye gittiği
                roomId: roomId 
            });
        }
    };

    // SUNUCUDAN GELEN EMİRLERİ DİNLE (Genişletilmiş hali)
    socket.on('videoActionFromServer', (data) => {
        isRemoteAction = true;

        if (data.type === 'PLAY') {
            video.play();
        } else if (data.type === 'PAUSE') {
            video.pause();
        } else if (data.type === 'SEEK') {
            // Videoyu gelen saniyeye ışınla
            video.currentTime = data.time;
        }

        setTimeout(() => { isRemoteAction = false; }, 500);
    });
}