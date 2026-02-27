// JOIN BUTTON
document.getElementById('joinBtn').addEventListener('click', () => {
  const roomId = document.getElementById('roomInput').value.trim();
  if (!roomId) return alert("Please enter a room name.");

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];

    // Must be on YouTube
    if (!currentTab || !currentTab.url || !currentTab.url.includes("youtube.com")) {
      return alert("To use JamRoom, please open a YouTube tab first.");
    }

    // Save room + tell content script to join
    chrome.storage.local.set({ savedRoomId: roomId }, () => {
      sendMessageToContent("JOIN_NEW_ROOM", roomId);

      // Immediate UI feedback (no alert)
      const countDisplay = document.getElementById('countDisplay');
      countDisplay.innerText = `Joining: ${roomId}...`;
    });
  });
});

// LEAVE BUTTON
document.getElementById('leaveBtn').addEventListener('click', () => {
  sendMessageToContent("LEAVE_ROOM", null);

  chrome.storage.local.remove(['savedRoomId', 'roomUserCount']);

  document.getElementById('countDisplay').innerText = "Not in an active room.";
});

// Helper: send message to active tab content script + badge control
function sendMessageToContent(type, data) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;

    chrome.tabs.sendMessage(tabs[0].id, { type, roomId: data });

    if (type === "JOIN_NEW_ROOM") {
      chrome.action.setBadgeText({ text: "ON", tabId: tabs[0].id });
      chrome.action.setBadgeBackgroundColor({ color: "#00FF00", tabId: tabs[0].id });
    } else if (type === "LEAVE_ROOM") {
      chrome.action.setBadgeText({ text: "", tabId: tabs[0].id });
    }
  });
}

// Listen for content script confirmation (replaces alert)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "ROOM_JOINED") {
    const countDisplay = document.getElementById("countDisplay");
    const roomInput = document.getElementById("roomInput");

    // Keep UI consistent
    if (msg.roomId) roomInput.value = msg.roomId;

    // Show a short success message, then fall back to user count
    countDisplay.innerText = `Joined: ${msg.roomId}`;

    setTimeout(() => {
      chrome.storage.local.get(['roomUserCount'], (res) => {
        const count = res.roomUserCount || 1;
        countDisplay.innerText = `In room: ${count} users`;
      });
    }, 1200);
  }
});

// Restore saved room and user count on popup open
chrome.storage.local.get(['savedRoomId', 'roomUserCount'], (result) => {
  const countDisplay = document.getElementById('countDisplay');
  const roomInput = document.getElementById('roomInput');

  if (result.savedRoomId) {
    roomInput.value = result.savedRoomId;
    const count = result.roomUserCount || 1;
    countDisplay.innerText = `In room: ${count} users`;
  } else {
    roomInput.value = "";
    countDisplay.innerText = "Not in an active room.";
  }
});