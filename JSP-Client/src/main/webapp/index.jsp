<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<%!
  private String envOrDefault(String name, String defaultValue) {
    String value = System.getenv(name);
    return value == null || value.trim().isEmpty() ? defaultValue : value.trim();
  }

  private String html(String value) {
    if (value == null) {
      return "";
    }

    return value
      .replace("&", "&amp;")
      .replace("<", "&lt;")
      .replace(">", "&gt;")
      .replace("\"", "&quot;")
      .replace("'", "&#039;");
  }
%>
<%
  String defaultServerBaseUrl = envOrDefault("KLCUBE_LICENSE_SERVER_URL", "https://localhost:32773");
  String defaultLicenseKey = envOrDefault("KLCUBE_LICENSE_KEY", "KLC-LIC-183A910E1CA546EEAD7A114A8ACC59AD");
  String defaultVideoId = envOrDefault("KLCUBE_VIDEO_ID", "video001");
%>
<!DOCTYPE html>
<html lang="ko">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KLCUBE JSP License Player Sample</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <script src="./klcube-license-player.js"></script>
  <link rel="stylesheet" href="./style.css" />
</head>

<body>
  <main class="app">
    <section class="player-panel">
      <div class="video-frame">
        <video id="klcubeVideo" controls playsinline></video>
      </div>

      <div class="toolbar">
        <button id="playButton" type="button">Play</button>
        <button id="activateButton" type="button">Activate</button>
        <button id="validateButton" type="button">Validate</button>
        <button id="clearButton" type="button">Clear Session</button>
      </div>

      <p id="message" class="message">Ready</p>
    </section>

    <aside class="side-panel">
      <h1>KLCUBE JSP Player Sample</h1>

      <label>
        License Server URL
        <input id="serverBaseUrl" value="<%= html(defaultServerBaseUrl) %>" />
      </label>

      <label>
        License Key
        <input id="licenseKey" value="<%= html(defaultLicenseKey) %>" />
      </label>

      <label>
        Video ID
        <input id="videoId" value="<%= html(defaultVideoId) %>" />
      </label>

      <section class="log-panel">
        <h2>Events</h2>
        <div id="logs" class="logs empty">No events yet.</div>
      </section>
    </aside>
  </main>

  <script src="./sample.js"></script>
</body>

</html>
