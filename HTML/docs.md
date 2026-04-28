# KLCUBE License Player

## Local test server

```bash
python -m http.server 5500
```

Open `http://localhost:5500/index.html`.

## Browser library

Include `hls.js` for browsers without native HLS support, then include the KLCUBE player library.

```html
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
<script src="./klcube-license-player.js"></script>
```

```html
<video id="videoPlayer" controls></video>

<script>
  const player = new KlcubeLicensePlayer({
    serverBaseUrl: "https://license.example.com",
    licenseKey: "KLC-LIC-CHANGE-ME",
    videoElement: "#videoPlayer"
  });

  await player.play("video001");
</script>
```

## Public API

- `activate()`: activates the current browser/device and stores the activation token in `sessionStorage`.
- `validate()`: validates the stored activation token.
- `issuePlaybackToken(videoId)`: requests a short-lived playback token.
- `play(videoId, options)`: validates license, issues a playback token, loads HLS first, then falls back to direct stream.
- `stop()`: stops the current player source and disposes hls.js.
- `clearSession()`: clears activation token state from `sessionStorage`.

## Required options

- `serverBaseUrl`: license server origin, for example `https://license.example.com`.
- `licenseKey`: public license key issued by KLCUBE.
- `videoElement`: video element or CSS selector.

## Issue license key

The server exposes an API for issuing or rotating a public license key for an existing customer/product license.

```http
POST /api/licenses/access-key
Content-Type: application/json
```

```json
{
  "customerCode": "BANK001",
  "productCode": "WEB_VIDEO",
  "rotate": false
}
```

Set `rotate` to `true` only when the existing key must be replaced.

## Optional options

- `autoActivate`: default `true`. Automatically activates when validation token is missing or expired.
- `preferHls`: default `true`. Uses HLS before direct MP4/WebM stream.
- `storagePrefix`: storage key prefix for browser/device identity and session token.
- `logger`: callback `(eventName, data) => void`.
