const videoEl = document.getElementById("klcubeVideo");
const messageEl = document.getElementById("message");
const logsEl = document.getElementById("logs");
const serverBaseUrlEl = document.getElementById("serverBaseUrl");
const licenseKeyEl = document.getElementById("licenseKey");
const videoIdEl = document.getElementById("videoId");

let player = null;
let logs = [];

function setMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.className = isError ? "message error" : "message";
}

function appendLog(eventName, data) {
  logs = [
    {
      id: Date.now() + Math.random(),
      eventName,
      data
    },
    ...logs
  ].slice(0, 20);

  renderLogs();
}

function renderLogs() {
  if (logs.length === 0) {
    logsEl.className = "logs empty";
    logsEl.textContent = "No events yet.";
    return;
  }

  logsEl.className = "logs";
  logsEl.innerHTML = logs.map(log => `
    <details open>
      <summary>${escapeHtml(log.eventName)}</summary>
      <pre>${escapeHtml(JSON.stringify(log.data, null, 2))}</pre>
    </details>
  `).join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getPlayer() {
  const serverBaseUrl = serverBaseUrlEl.value.trim();
  const licenseKey = licenseKeyEl.value.trim();

  if (!serverBaseUrl) {
    throw new Error("License Server URL is required.");
  }

  if (!licenseKey) {
    throw new Error("License Key is required.");
  }

  if (!window.KlcubeLicensePlayer) {
    throw new Error("klcube-license-player.js is not loaded.");
  }

  if (player) {
    player.stop();
  }

  player = new KlcubeLicensePlayer({
    serverBaseUrl,
    licenseKey,
    videoElement: videoEl,
    logger: appendLog
  });

  return player;
}

async function runAction(action) {
  const buttons = document.querySelectorAll("button");
  buttons.forEach(button => button.disabled = true);

  try {
    await action();
  } catch (error) {
    const message = error && error.message ? error.message : "Request failed.";
    setMessage(message, true);
    appendLog("error", { message });
  } finally {
    buttons.forEach(button => button.disabled = false);
  }
}

document.getElementById("playButton").addEventListener("click", () => {
  runAction(async () => {
    const videoId = videoIdEl.value.trim();
    if (!videoId) {
      throw new Error("Video ID is required.");
    }

    setMessage("Checking license...");
    const result = await getPlayer().play(videoId);
    setMessage(`Playback started with ${result.source.type.toUpperCase()}.`);
    appendLog("play", result);
  });
});

document.getElementById("activateButton").addEventListener("click", () => {
  runAction(async () => {
    setMessage("Activating license...");
    const result = await getPlayer().activate();
    setMessage("Activation request completed.");
    appendLog("manualActivate", result);
  });
});

document.getElementById("validateButton").addEventListener("click", () => {
  runAction(async () => {
    setMessage("Validating token...");
    const result = await getPlayer().validate();
    setMessage("Validation request completed.");
    appendLog("manualValidate", result);
  });
});

document.getElementById("clearButton").addEventListener("click", () => {
  if (player) {
    player.stop();
    player.clearSession();
    player = null;
  }

  setMessage("License session cleared.");
  appendLog("clearSession", { success: true });
});
