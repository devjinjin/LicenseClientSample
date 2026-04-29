import { useCallback, useRef, useState } from "react";

type PlayerSource = {
  type: "hls" | "file";
  url: string;
};

type PlayerResult = {
  source: PlayerSource;
  playback: unknown;
};

type PlayerLog = {
  id: number;
  eventName: string;
  data: unknown;
};

type KlcubeLicensePlayerInstance = {
  activate(): Promise<unknown>;
  validate(): Promise<unknown>;
  play(videoId: string, options?: { videoElement?: HTMLVideoElement; autoplay?: boolean }): Promise<PlayerResult>;
  stop(): void;
  clearSession(): void;
};

declare global {
  interface Window {
    KlcubeLicensePlayer: new (options: {
      serverBaseUrl: string;
      licenseKey: string;
      videoElement: HTMLVideoElement;
      logger?: (eventName: string, data: unknown) => void;
    }) => KlcubeLicensePlayerInstance;
  }
}

const defaultServerBaseUrl = import.meta.env.VITE_LICENSE_SERVER_URL || "https://localhost:32775";
const defaultLicenseKey =
  import.meta.env.VITE_LICENSE_KEY || "KLC-LIC-C65F766F751245FF96BD8134AAB39BD5";
const defaultVideoId = import.meta.env.VITE_VIDEO_ID || "video001";

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<KlcubeLicensePlayerInstance | null>(null);
  const [serverBaseUrl, setServerBaseUrl] = useState(defaultServerBaseUrl);
  const [licenseKey, setLicenseKey] = useState(defaultLicenseKey);
  const [videoId, setVideoId] = useState(defaultVideoId);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Ready");
  const [logs, setLogs] = useState<PlayerLog[]>([]);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const setVideoElement = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
    setIsVideoReady(Boolean(element));
  }, []);

  const canCreatePlayer = Boolean(
    serverBaseUrl.trim() &&
    licenseKey.trim() &&
    videoId.trim() &&
    isVideoReady
  );

  function appendLog(eventName: string, data: unknown) {
    setLogs((previous) => [
      {
        id: Date.now() + Math.random(),
        eventName,
        data
      },
      ...previous
    ].slice(0, 20));
  }

  function getPlayer() {
    if (!videoRef.current) {
      throw new Error("Video element is not ready.");
    }

    if (!window.KlcubeLicensePlayer) {
      throw new Error("klcube-license-player.js is not loaded.");
    }

    playerRef.current?.stop();
    playerRef.current = new window.KlcubeLicensePlayer({
      serverBaseUrl: serverBaseUrl.trim(),
      licenseKey: licenseKey.trim(),
      videoElement: videoRef.current,
      logger: appendLog
    });

    return playerRef.current;
  }

  async function handlePlay() {
    setBusy(true);
    setMessage("Checking license...");

    try {
      const player = getPlayer();
      const result = await player.play(videoId.trim());
      setMessage(`Playback started with ${result.source.type.toUpperCase()}.`);
      appendLog("play", result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Playback failed.";
      setMessage(message);
      appendLog("error", { message });
    } finally {
      setBusy(false);
    }
  }

  async function handleActivate() {
    setBusy(true);
    setMessage("Activating license...");

    try {
      const player = getPlayer();
      const result = await player.activate();
      setMessage("Activation request completed.");
      appendLog("manualActivate", result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Activation failed.";
      setMessage(message);
      appendLog("error", { message });
    } finally {
      setBusy(false);
    }
  }

  async function handleValidate() {
    setBusy(true);
    setMessage("Validating token...");

    try {
      const player = getPlayer();
      const result = await player.validate();
      setMessage("Validation request completed.");
      appendLog("manualValidate", result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Validation failed.";
      setMessage(message);
      appendLog("error", { message });
    } finally {
      setBusy(false);
    }
  }

  function handleClearSession() {
    playerRef.current?.stop();
    playerRef.current?.clearSession();
    playerRef.current = null;
    setMessage("License session cleared.");
    appendLog("clearSession", { success: true });
  }

  return (
    <main className="app">
      <section className="player-section">
        <div className="video-frame">
          <video ref={setVideoElement} controls playsInline />
        </div>

        <div className="toolbar">
          <button type="button" onClick={handlePlay} disabled={busy || !canCreatePlayer}>
            Play
          </button>
          <button type="button" onClick={handleActivate} disabled={busy || !canCreatePlayer}>
            Activate
          </button>
          <button type="button" onClick={handleValidate} disabled={busy || !canCreatePlayer}>
            Validate
          </button>
          <button type="button" onClick={handleClearSession}>
            Clear Session
          </button>
        </div>

        <p className={message.toLowerCase().includes("failed") ? "message error" : "message"}>{message}</p>
      </section>

      <aside className="side-panel">
        <h1>KLCUBE React Player Sample</h1>

        <label>
          License Server URL
          <input value={serverBaseUrl} onChange={(event) => setServerBaseUrl(event.target.value)} />
        </label>

        <label>
          License Key
          <input value={licenseKey} onChange={(event) => setLicenseKey(event.target.value)} />
        </label>

        <label>
          Video ID
          <input value={videoId} onChange={(event) => setVideoId(event.target.value)} />
        </label>

        <div className="log-panel">
          <h2>Events</h2>
          {logs.length === 0 ? (
            <p className="empty">No events yet.</p>
          ) : (
            logs.map((log) => (
              <details key={log.id} open>
                <summary>{log.eventName}</summary>
                <pre>{JSON.stringify(log.data, null, 2)}</pre>
              </details>
            ))
          )}
        </div>
      </aside>
    </main>
  );
}
