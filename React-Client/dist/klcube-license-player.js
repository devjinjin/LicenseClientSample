(function (global) {
  "use strict";

  const DEFAULT_STORAGE_PREFIX = "klcube_license_player";
  const DEVICE_FINGERPRINT_VERSION = "browser-stable-v2";
  const RESULT_CODES_REQUIRING_ACTIVATION = new Set([
    "TOKEN_MISSING",
    "TOKEN_EXPIRED",
    "TOKEN_NOT_FOUND",
    "DEVICE_INVALID",
    "DEVICE_MISMATCH"
  ]);

  class KlcubeLicenseError extends Error {
    constructor(message, result) {
      super(message);
      this.name = "KlcubeLicenseError";
      this.result = result || null;
      this.resultCode = result && result.resultCode ? result.resultCode : "UNKNOWN";
    }
  }

  class KlcubeLicensePlayer {
    constructor(options) {
      const config = options || {};

      if (!config.serverBaseUrl) {
        throw new Error("serverBaseUrl is required.");
      }

      if (!config.licenseKey) {
        throw new Error("licenseKey is required.");
      }

      this.serverBaseUrl = normalizeBaseUrl(config.serverBaseUrl);
      this.licenseKey = config.licenseKey;
      this.videoElement = resolveVideoElement(config.videoElement);
      this.storagePrefix = config.storagePrefix || DEFAULT_STORAGE_PREFIX;
      this.browserFamily = config.browserFamily || detectBrowserFamily();
      this.autoActivate = config.autoActivate !== false;
      this.preferHls = config.preferHls !== false;
      this.logger = typeof config.logger === "function" ? config.logger : null;
      this.fetchImpl = config.fetchImpl || global.fetch.bind(global);
      this.hlsFactory = config.hlsFactory || null;
      this.hlsInstance = null;
    }

    async activate() {
      const deviceFingerprint = await this.getDeviceFingerprint();
      const result = await this.postJson("/api/licenses/activate", {
        licenseKey: this.licenseKey,
        hostName: global.location && global.location.hostname ? global.location.hostname : "web-client",
        deviceFingerprint,
        machineGuid: null,
        macAddress: null,
        internalIpAddress: null
      });

      this.log("activate", result);

      if (result.success && result.data && result.data.token) {
        this.setSession("token", result.data.token);
        this.setSession("tokenId", result.data.tokenId || "");
        this.setSession("deviceFingerprint", deviceFingerprint);
        this.setSession("tokenExpiresAt", result.data.expiresAt || "");
      }

      return result;
    }

    async validate() {
      const token = this.getSession("token");
      const deviceFingerprint = this.getSession("deviceFingerprint") || await this.getDeviceFingerprint();

      if (!token || !deviceFingerprint) {
        return createFailure("TOKEN_MISSING", "Stored activation token is missing.");
      }

      const result = await this.postJson("/api/licenses/validate", {
        token,
        deviceFingerprint
      });

      this.log("validate", result);
      return result;
    }

    async issuePlaybackToken(videoId) {
      if (!videoId) {
        return createFailure("INVALID_REQUEST", "videoId is required.");
      }

      const token = this.getSession("token");
      const deviceFingerprint = this.getSession("deviceFingerprint") || await this.getDeviceFingerprint();

      if (!token || !deviceFingerprint) {
        return createFailure("TOKEN_MISSING", "Stored activation token is missing.");
      }

      const result = await this.postJson("/api/videos/playback-token", {
        token,
        deviceFingerprint,
        videoId
      });

      this.log("issuePlaybackToken", result);
      return result;
    }

    async ensureLicense() {
      let validateResult = await this.validate();

      if (validateResult.success && validateResult.data && validateResult.data.isAllowed === true) {
        return validateResult;
      }

      if (!this.autoActivate || !RESULT_CODES_REQUIRING_ACTIVATION.has(validateResult.resultCode)) {
        throw new KlcubeLicenseError(validateResult.message || "License validation failed.", validateResult);
      }

      const activateResult = await this.activate();
      if (!activateResult.success) {
        throw new KlcubeLicenseError(activateResult.message || "License activation failed.", activateResult);
      }

      validateResult = await this.validate();
      if (!validateResult.success || !validateResult.data || validateResult.data.isAllowed !== true) {
        throw new KlcubeLicenseError(validateResult.message || "License validation failed.", validateResult);
      }

      return validateResult;
    }

    async play(videoId, options) {
      const playOptions = options || {};
      const videoElement = resolveVideoElement(playOptions.videoElement || this.videoElement);

      if (!videoElement) {
        throw new Error("videoElement is required.");
      }

      await this.ensureLicense();

      const playbackResult = await this.issuePlaybackToken(videoId);
      if (!playbackResult.success || !playbackResult.data) {
        throw new KlcubeLicenseError(playbackResult.message || "Playback token issue failed.", playbackResult);
      }

      const source = this.selectSource(playbackResult.data);
      if (!source) {
        throw new KlcubeLicenseError("Playable stream URL was not returned.", playbackResult);
      }

      await this.loadSource(videoElement, source);

      if (playOptions.autoplay !== false) {
        await videoElement.play();
      }

      return {
        source,
        playback: playbackResult
      };
    }

    stop() {
      this.disposeHls();

      if (this.videoElement) {
        this.videoElement.removeAttribute("src");
        this.videoElement.load();
      }
    }

    clearSession() {
      removeStorage(sessionStorage, this.sessionKey("token"));
      removeStorage(sessionStorage, this.sessionKey("tokenId"));
      removeStorage(sessionStorage, this.sessionKey("deviceFingerprint"));
      removeStorage(sessionStorage, this.sessionKey("deviceFingerprintVersion"));
      removeStorage(sessionStorage, this.sessionKey("browserFamily"));
      removeStorage(sessionStorage, this.sessionKey("tokenExpiresAt"));
    }

    async getDeviceFingerprint() {
      const cached = this.getSession("deviceFingerprint");
      const cachedVersion = this.getSession("deviceFingerprintVersion");
      const cachedBrowserFamily = this.getSession("browserFamily");
      if (
        cached &&
        cachedVersion === DEVICE_FINGERPRINT_VERSION &&
        cachedBrowserFamily === this.browserFamily
      ) {
        return cached;
      }

      const raw = [
        DEVICE_FINGERPRINT_VERSION,
        this.browserFamily,
        navigator.userAgent || "",
        navigator.platform || "",
        navigator.language || "",
        screen.width || 0,
        screen.height || 0,
        Intl.DateTimeFormat().resolvedOptions().timeZone || ""
      ].join("|");

      const fingerprint = await sha256(raw);
      this.setSession("deviceFingerprint", fingerprint);
      this.setSession("deviceFingerprintVersion", DEVICE_FINGERPRINT_VERSION);
      this.setSession("browserFamily", this.browserFamily);
      return fingerprint;
    }

    selectSource(data) {
      if (this.preferHls && data.hlsUrl) {
        return {
          type: "hls",
          url: toAbsoluteUrl(this.serverBaseUrl, data.hlsUrl)
        };
      }

      if (data.streamUrl) {
        return {
          type: "file",
          url: toAbsoluteUrl(this.serverBaseUrl, data.streamUrl)
        };
      }

      return null;
    }

    async loadSource(videoElement, source) {
      this.disposeHls();

      if (source.type === "hls") {
        if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
          videoElement.src = source.url;
          videoElement.load();
          return;
        }

        const HlsCtor = this.hlsFactory || global.Hls;
        if (HlsCtor && typeof HlsCtor.isSupported === "function" && HlsCtor.isSupported()) {
          this.hlsInstance = new HlsCtor();
          this.hlsInstance.loadSource(source.url);
          this.hlsInstance.attachMedia(videoElement);
          return;
        }

        throw new Error("HLS is not supported. Load hls.js or use a browser with native HLS support.");
      }

      videoElement.src = source.url;
      videoElement.load();
    }

    disposeHls() {
      if (this.hlsInstance && typeof this.hlsInstance.destroy === "function") {
        this.hlsInstance.destroy();
      }

      this.hlsInstance = null;
    }

    async postJson(path, payload) {
      const response = await this.fetchImpl(toAbsoluteUrl(this.serverBaseUrl, path), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      return await response.json();
    }

    log(eventName, data) {
      if (this.logger) {
        this.logger(eventName, data);
      }
    }

    sessionKey(name) {
      return `${this.storagePrefix}_${name}`;
    }

    getSession(name) {
      return getStorage(sessionStorage, this.sessionKey(name));
    }

    setSession(name, value) {
      setStorage(sessionStorage, this.sessionKey(name), value);
    }
  }

  function normalizeBaseUrl(value) {
    return String(value).replace(/\/+$/, "");
  }

  function toAbsoluteUrl(baseUrl, value) {
    if (/^https?:\/\//i.test(value)) {
      return value;
    }

    return `${baseUrl}${value.startsWith("/") ? "" : "/"}${value}`;
  }

  function resolveVideoElement(value) {
    if (!value) {
      return null;
    }

    if (typeof value === "string") {
      return document.querySelector(value);
    }

    return value;
  }

  function createFailure(resultCode, message) {
    return {
      success: false,
      statusCode: 0,
      resultCode,
      message,
      data: null
    };
  }

  function detectBrowserFamily() {
    const ua = navigator.userAgent || "";
    const brands = navigator.userAgentData && Array.isArray(navigator.userAgentData.brands)
      ? navigator.userAgentData.brands.map((brand) => brand.brand).join(" ")
      : "";
    const source = `${brands} ${ua}`;

    if (/Edg\//.test(source) || /Microsoft Edge/i.test(source)) {
      return "EDGE";
    }

    if (/Firefox\//i.test(source)) {
      return "FIREFOX";
    }

    if (/OPR\//.test(source) || /Opera/i.test(source)) {
      return "OPERA";
    }

    if (/SamsungBrowser\//i.test(source)) {
      return "SAMSUNG_INTERNET";
    }

    if (/Chrome\//.test(source) || /Chromium/i.test(source)) {
      return "CHROME";
    }

    if (/Safari\//.test(source) && /Version\//.test(source)) {
      return "SAFARI";
    }

    return "UNKNOWN_BROWSER";
  }

  function createUuid() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }

    return `browser-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  async function sha256(text) {
    if (!global.crypto || !global.crypto.subtle) {
      throw new Error("Web Crypto API is required to generate a device fingerprint.");
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await global.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((value) => value.toString(16).padStart(2, "0")).join("");
  }

  function getStorage(storage, key) {
    try {
      return storage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function setStorage(storage, key, value) {
    try {
      storage.setItem(key, value);
    } catch (_) {
      // Storage can be disabled in some embedded browsers.
    }
  }

  function removeStorage(storage, key) {
    try {
      storage.removeItem(key);
    } catch (_) {
      // Storage can be disabled in some embedded browsers.
    }
  }

  global.KlcubeLicensePlayer = KlcubeLicensePlayer;
  global.KlcubeLicenseError = KlcubeLicenseError;
})(window);
