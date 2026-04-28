// 즉시 실행 함수로 전역 스코프 오염을 줄입니다.
(function (global) {
  // JavaScript 엄격 모드를 활성화합니다.
  "use strict";

  // sessionStorage/localStorage에 사용할 기본 key prefix입니다.
  const DEFAULT_STORAGE_PREFIX = "klcube_license_player";

  // 이 결과 코드들은 토큰이 없거나 만료된 상태이므로 자동 활성화를 다시 시도할 수 있습니다.
  const RESULT_CODES_REQUIRING_ACTIVATION = new Set([
    // 저장된 활성화 토큰이 없는 경우입니다.
    "TOKEN_MISSING",
    // 저장된 활성화 토큰이 만료된 경우입니다.
    "TOKEN_EXPIRED",
    // 서버에서 토큰을 찾지 못한 경우입니다.
    "TOKEN_NOT_FOUND",
    // 연결된 디바이스 상태가 유효하지 않은 경우입니다.
    "DEVICE_INVALID",
    // 요청 디바이스와 토큰의 디바이스 정보가 다른 경우입니다.
    "DEVICE_MISMATCH"
  ]);

  // 라이선스/재생 처리 중 발생한 서버 응답을 포함하기 위한 커스텀 에러입니다.
  class KlcubeLicenseError extends Error {
    // message는 사용자 표시용 에러 메시지이고, result는 서버 응답 원본입니다.
    constructor(message, result) {
      // 기본 Error 생성자에 메시지를 전달합니다.
      super(message);

      // 에러 이름을 구분 가능한 값으로 지정합니다.
      this.name = "KlcubeLicenseError";

      // 서버 응답 전체를 보관합니다.
      this.result = result || null;

      // 서버 응답의 resultCode를 바로 접근할 수 있게 보관합니다.
      this.resultCode = result && result.resultCode ? result.resultCode : "UNKNOWN";
    }
  }

  // 외부 회사가 직접 생성해서 사용하는 라이선스 플레이어 클래스입니다.
  class KlcubeLicensePlayer {
    // options로 서버 주소, 고객 코드, 제품 코드, video 엘리먼트 등을 받습니다.
    constructor(options) {
      // options가 없을 때 빈 객체로 처리합니다.
      const config = options || {};

      // 라이선스 서버 주소는 필수입니다.
      if (!config.serverBaseUrl) {
        // 필수 옵션 누락 시 즉시 예외를 던집니다.
        throw new Error("serverBaseUrl is required.");
      }

      // 공개 라이선스 키는 활성화 요청 전에 클라이언트를 식별하기 위해 필수입니다.
      if (!config.licenseKey) {
        // 필수 옵션 누락 시 즉시 예외를 던집니다.
        throw new Error("licenseKey is required.");
      }

      // 서버 주소 끝의 슬래시를 제거해 URL 조합을 안정화합니다.
      this.serverBaseUrl = normalizeBaseUrl(config.serverBaseUrl);

      // 라이선스 활성화 요청에 사용할 공개 라이선스 키를 보관합니다.
      this.licenseKey = config.licenseKey;

      // CSS selector 또는 video DOM 엘리먼트를 실제 엘리먼트로 변환합니다.
      this.videoElement = resolveVideoElement(config.videoElement);

      // 저장소 key prefix를 지정합니다.
      this.storagePrefix = config.storagePrefix || DEFAULT_STORAGE_PREFIX;

      // 기본값은 자동 활성화 허용입니다.
      this.autoActivate = config.autoActivate !== false;

      // 기본값은 HLS 우선 재생입니다.
      this.preferHls = config.preferHls !== false;

      // 호출자가 logger 함수를 넘긴 경우에만 로그 콜백을 사용합니다.
      this.logger = typeof config.logger === "function" ? config.logger : null;

      // 테스트나 특수 환경에서 fetch를 대체할 수 있게 합니다.
      this.fetchImpl = config.fetchImpl || global.fetch.bind(global);

      // 테스트나 직접 주입을 위해 hls.js 생성자를 받을 수 있게 합니다.
      this.hlsFactory = config.hlsFactory || null;

      // 현재 사용 중인 hls.js 인스턴스를 보관합니다.
      this.hlsInstance = null;
    }

    // 현재 브라우저/디바이스를 라이선스 서버에 활성화합니다.
    async activate() {
      // 브라우저 정보 기반 디바이스 지문을 생성하거나 저장된 값을 가져옵니다.
      const deviceFingerprint = await this.getDeviceFingerprint();

      // 서버 활성화 API에 보낼 요청 값을 구성합니다.
      const result = await this.postJson("/api/licenses/activate", {
        // 공개 라이선스 키입니다.
        licenseKey: this.licenseKey,
        // 현재 웹 페이지의 호스트 이름입니다.
        hostName: global.location && global.location.hostname ? global.location.hostname : "web-client",
        // 생성된 디바이스 지문입니다.
        deviceFingerprint,
        // 웹 브라우저에서는 MachineGuid를 알 수 없으므로 null로 보냅니다.
        machineGuid: null,
        // 웹 브라우저에서는 MAC 주소를 알 수 없으므로 null로 보냅니다.
        macAddress: null,
        // 웹 브라우저에서는 내부 IP를 안정적으로 알 수 없으므로 null로 보냅니다.
        internalIpAddress: null
      });

      // 활성화 결과를 logger 콜백으로 전달합니다.
      this.log("activate", result);

      // 활성화가 성공하고 토큰이 내려온 경우 세션 저장소에 저장합니다.
      if (result.success && result.data && result.data.token) {
        // 활성화 토큰 값을 저장합니다.
        this.setSession("token", result.data.token);
        // 토큰 식별자를 저장합니다.
        this.setSession("tokenId", result.data.tokenId || "");
        // 디바이스 지문을 저장합니다.
        this.setSession("deviceFingerprint", deviceFingerprint);
        // 토큰 만료 시각을 저장합니다.
        this.setSession("tokenExpiresAt", result.data.expiresAt || "");
      }

      // 호출자에게 서버 응답을 그대로 반환합니다.
      return result;
    }

    // 저장된 활성화 토큰이 현재 디바이스에서 유효한지 검증합니다.
    async validate() {
      // 세션 저장소에서 활성화 토큰을 가져옵니다.
      const token = this.getSession("token");

      // 세션 저장소의 디바이스 지문을 우선 사용하고, 없으면 새로 계산합니다.
      const deviceFingerprint = this.getSession("deviceFingerprint") || await this.getDeviceFingerprint();

      // 토큰 또는 디바이스 지문이 없으면 서버 호출 없이 실패 응답 형태로 반환합니다.
      if (!token || !deviceFingerprint) {
        // 서버 응답과 같은 형태의 실패 객체를 반환합니다.
        return createFailure("TOKEN_MISSING", "Stored activation token is missing.");
      }

      // 라이선스 검증 API를 호출합니다.
      const result = await this.postJson("/api/licenses/validate", {
        // 검증할 활성화 토큰입니다.
        token,
        // 검증할 디바이스 지문입니다.
        deviceFingerprint
      });

      // 검증 결과를 logger 콜백으로 전달합니다.
      this.log("validate", result);

      // 호출자에게 서버 응답을 그대로 반환합니다.
      return result;
    }

    // 영상 재생에 사용할 짧은 수명의 playback token을 발급받습니다.
    async issuePlaybackToken(videoId) {
      // videoId가 없으면 서버 호출 없이 실패 응답을 반환합니다.
      if (!videoId) {
        // 서버 응답과 같은 형태의 실패 객체를 반환합니다.
        return createFailure("INVALID_REQUEST", "videoId is required.");
      }

      // 세션 저장소에서 활성화 토큰을 가져옵니다.
      const token = this.getSession("token");

      // 세션 저장소의 디바이스 지문을 우선 사용하고, 없으면 새로 계산합니다.
      const deviceFingerprint = this.getSession("deviceFingerprint") || await this.getDeviceFingerprint();

      // 토큰 또는 디바이스 지문이 없으면 서버 호출 없이 실패 응답 형태로 반환합니다.
      if (!token || !deviceFingerprint) {
        // 서버 응답과 같은 형태의 실패 객체를 반환합니다.
        return createFailure("TOKEN_MISSING", "Stored activation token is missing.");
      }

      // playback token 발급 API를 호출합니다.
      const result = await this.postJson("/api/videos/playback-token", {
        // 활성화 토큰입니다.
        token,
        // 요청 디바이스의 지문입니다.
        deviceFingerprint,
        // 재생할 영상 식별자입니다.
        videoId
      });

      // 발급 결과를 logger 콜백으로 전달합니다.
      this.log("issuePlaybackToken", result);

      // 호출자에게 서버 응답을 그대로 반환합니다.
      return result;
    }

    // 재생 전 라이선스가 유효한 상태인지 보장합니다.
    async ensureLicense() {
      // 먼저 저장된 토큰으로 검증을 시도합니다.
      let validateResult = await this.validate();

      // 검증 성공이며 isAllowed가 true이면 그대로 통과합니다.
      if (validateResult.success && validateResult.data && validateResult.data.isAllowed === true) {
        // 검증 결과를 반환합니다.
        return validateResult;
      }

      // 자동 활성화가 꺼져 있거나 자동 활성화 대상 코드가 아니면 실패로 처리합니다.
      if (!this.autoActivate || !RESULT_CODES_REQUIRING_ACTIVATION.has(validateResult.resultCode)) {
        // 호출자가 catch할 수 있도록 커스텀 에러를 던집니다.
        throw new KlcubeLicenseError(validateResult.message || "License validation failed.", validateResult);
      }

      // 토큰 누락/만료 등 자동 복구 가능한 상태이면 활성화를 시도합니다.
      const activateResult = await this.activate();

      // 활성화 실패 시 재생을 중단합니다.
      if (!activateResult.success) {
        // 호출자가 catch할 수 있도록 커스텀 에러를 던집니다.
        throw new KlcubeLicenseError(activateResult.message || "License activation failed.", activateResult);
      }

      // 새로 받은 토큰으로 다시 검증합니다.
      validateResult = await this.validate();

      // 재검증도 실패하면 재생을 중단합니다.
      if (!validateResult.success || !validateResult.data || validateResult.data.isAllowed !== true) {
        // 호출자가 catch할 수 있도록 커스텀 에러를 던집니다.
        throw new KlcubeLicenseError(validateResult.message || "License validation failed.", validateResult);
      }

      // 최종 검증 결과를 반환합니다.
      return validateResult;
    }

    // 라이선스 검증부터 영상 로드와 재생까지 한 번에 처리합니다.
    async play(videoId, options) {
      // 재생 옵션이 없으면 빈 객체로 처리합니다.
      const playOptions = options || {};

      // 메서드 호출 시 넘긴 videoElement가 있으면 우선 사용합니다.
      const videoElement = resolveVideoElement(playOptions.videoElement || this.videoElement);

      // 실제 video 엘리먼트가 없으면 재생할 수 없습니다.
      if (!videoElement) {
        // 필수 값 누락이므로 즉시 예외를 던집니다.
        throw new Error("videoElement is required.");
      }

      // 재생 전 라이선스 상태를 보장합니다.
      await this.ensureLicense();

      // 영상 접근용 playback token을 발급받습니다.
      const playbackResult = await this.issuePlaybackToken(videoId);

      // playback token 발급 실패 시 재생을 중단합니다.
      if (!playbackResult.success || !playbackResult.data) {
        // 호출자가 catch할 수 있도록 커스텀 에러를 던집니다.
        throw new KlcubeLicenseError(playbackResult.message || "Playback token issue failed.", playbackResult);
      }

      // 서버 응답에서 실제 재생 URL을 선택합니다.
      const source = this.selectSource(playbackResult.data);

      // HLS 또는 direct stream URL이 모두 없으면 재생할 수 없습니다.
      if (!source) {
        // 호출자가 catch할 수 있도록 커스텀 에러를 던집니다.
        throw new KlcubeLicenseError("Playable stream URL was not returned.", playbackResult);
      }

      // 선택된 URL을 video 엘리먼트에 로드합니다.
      await this.loadSource(videoElement, source);

      // autoplay 옵션이 false가 아니면 즉시 재생을 시도합니다.
      if (playOptions.autoplay !== false) {
        // 브라우저 정책에 따라 사용자 제스처가 없으면 여기서 실패할 수 있습니다.
        await videoElement.play();
      }

      // 재생에 사용한 source와 playback token 응답을 반환합니다.
      return {
        // 실제 재생 URL 정보입니다.
        source,
        // playback token 발급 응답입니다.
        playback: playbackResult
      };
    }

    // 현재 재생 소스를 해제합니다.
    stop() {
      // hls.js 인스턴스가 있으면 정리합니다.
      this.disposeHls();

      // 생성자에 videoElement가 지정된 경우 소스를 제거합니다.
      if (this.videoElement) {
        // video src 속성을 제거합니다.
        this.videoElement.removeAttribute("src");
        // 브라우저가 소스 제거를 반영하도록 load를 호출합니다.
        this.videoElement.load();
      }
    }

    // 현재 세션에 저장된 활성화 토큰 정보를 삭제합니다.
    clearSession() {
      // 활성화 토큰을 삭제합니다.
      removeStorage(sessionStorage, this.sessionKey("token"));
      // 토큰 식별자를 삭제합니다.
      removeStorage(sessionStorage, this.sessionKey("tokenId"));
      // 디바이스 지문 세션 값을 삭제합니다.
      removeStorage(sessionStorage, this.sessionKey("deviceFingerprint"));
      // 토큰 만료 시각을 삭제합니다.
      removeStorage(sessionStorage, this.sessionKey("tokenExpiresAt"));
    }

    // 현재 브라우저/디바이스를 식별할 지문 값을 가져옵니다.
    async getDeviceFingerprint() {
      // 세션 저장소에 이미 계산된 값이 있으면 재사용합니다.
      const cached = this.getSession("deviceFingerprint");

      // 캐시가 있으면 바로 반환합니다.
      if (cached) {
        // 저장된 디바이스 지문을 반환합니다.
        return cached;
      }

      // localStorage에 저장된 브라우저 ID를 가져오거나 새로 만듭니다.
      const browserId = getOrCreateBrowserId(this.storagePrefix);

      // 브라우저에서 접근 가능한 값들을 조합합니다.
      const raw = [
        // 브라우저별 고정 ID입니다.
        browserId,
        // User-Agent 문자열입니다.
        navigator.userAgent || "",
        // 브라우저 플랫폼 값입니다.
        navigator.platform || "",
        // 브라우저 언어 값입니다.
        navigator.language || "",
        // 화면 너비입니다.
        screen.width || 0,
        // 화면 높이입니다.
        screen.height || 0,
        // 브라우저 타임존입니다.
        Intl.DateTimeFormat().resolvedOptions().timeZone || ""
        // 각 값을 구분자로 연결합니다.
      ].join("|");

      // 조합된 문자열을 SHA-256으로 해시합니다.
      const fingerprint = await sha256(raw);

      // 계산된 지문을 세션 저장소에 저장합니다.
      this.setSession("deviceFingerprint", fingerprint);

      // 디바이스 지문을 반환합니다.
      return fingerprint;
    }

    // 서버가 내려준 재생 URL 중 사용할 소스를 선택합니다.
    selectSource(data) {
      // HLS 우선 설정이고 HLS URL이 있으면 HLS를 선택합니다.
      if (this.preferHls && data.hlsUrl) {
        // HLS source 객체를 반환합니다.
        return {
          // HLS 재생 타입입니다.
          type: "hls",
          // 서버 base URL과 상대 URL을 합쳐 절대 URL로 만듭니다.
          url: toAbsoluteUrl(this.serverBaseUrl, data.hlsUrl)
        };
      }

      // HLS가 없거나 사용하지 않는 경우 direct stream URL을 확인합니다.
      if (data.streamUrl) {
        // 파일 source 객체를 반환합니다.
        return {
          // 일반 파일 재생 타입입니다.
          type: "file",
          // 서버 base URL과 상대 URL을 합쳐 절대 URL로 만듭니다.
          url: toAbsoluteUrl(this.serverBaseUrl, data.streamUrl)
        };
      }

      // 사용할 수 있는 source가 없음을 나타냅니다.
      return null;
    }

    // 선택된 source를 video 엘리먼트에 실제로 연결합니다.
    async loadSource(videoElement, source) {
      // 이전 HLS 인스턴스가 있으면 먼저 제거합니다.
      this.disposeHls();

      // HLS source인 경우입니다.
      if (source.type === "hls") {
        // Safari처럼 브라우저가 HLS를 native로 지원하는지 확인합니다.
        if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
          // native HLS URL을 video src에 직접 넣습니다.
          videoElement.src = source.url;
          // 새 소스를 로드합니다.
          videoElement.load();
          // native 처리 완료 후 함수를 종료합니다.
          return;
        }

        // 주입된 hlsFactory가 있으면 사용하고, 없으면 전역 Hls를 사용합니다.
        const HlsCtor = this.hlsFactory || global.Hls;

        // hls.js가 로드되어 있고 현재 브라우저를 지원하는지 확인합니다.
        if (HlsCtor && typeof HlsCtor.isSupported === "function" && HlsCtor.isSupported()) {
          // hls.js 인스턴스를 생성합니다.
          this.hlsInstance = new HlsCtor();
          // HLS playlist URL을 로드합니다.
          this.hlsInstance.loadSource(source.url);
          // video 엘리먼트에 hls.js를 연결합니다.
          this.hlsInstance.attachMedia(videoElement);
          // hls.js 처리 완료 후 함수를 종료합니다.
          return;
        }

        // native HLS도 hls.js도 사용할 수 없으면 에러를 던집니다.
        throw new Error("HLS is not supported. Load hls.js or use a browser with native HLS support.");
      }

      // 일반 MP4/WebM URL을 video src에 직접 넣습니다.
      videoElement.src = source.url;

      // 새 소스를 로드합니다.
      videoElement.load();
    }

    // hls.js 인스턴스를 정리합니다.
    disposeHls() {
      // 기존 hls.js 인스턴스가 있고 destroy 메서드가 있으면 호출합니다.
      if (this.hlsInstance && typeof this.hlsInstance.destroy === "function") {
        // hls.js 내부 리소스를 해제합니다.
        this.hlsInstance.destroy();
      }

      // 인스턴스 참조를 제거합니다.
      this.hlsInstance = null;
    }

    // JSON POST 요청을 보내고 JSON 응답을 반환합니다.
    async postJson(path, payload) {
      // fetch를 사용해 서버 API를 호출합니다.
      const response = await this.fetchImpl(toAbsoluteUrl(this.serverBaseUrl, path), {
        // POST 메서드를 사용합니다.
        method: "POST",
        // JSON 요청임을 서버에 알립니다.
        headers: {
          // 요청 본문 타입입니다.
          "Content-Type": "application/json"
        },
        // payload 객체를 JSON 문자열로 변환합니다.
        body: JSON.stringify(payload)
      });

      // 응답 본문을 JSON으로 파싱해 반환합니다.
      return await response.json();
    }

    // 외부 logger 콜백을 호출합니다.
    log(eventName, data) {
      // logger가 설정된 경우에만 호출합니다.
      if (this.logger) {
        // 이벤트 이름과 데이터를 전달합니다.
        this.logger(eventName, data);
      }
    }

    // sessionStorage에 사용할 key를 만듭니다.
    sessionKey(name) {
      // prefix와 이름을 조합해 라이브러리 전용 key로 만듭니다.
      return `${this.storagePrefix}_${name}`;
    }

    // sessionStorage에서 값을 읽습니다.
    getSession(name) {
      // 안전한 storage 읽기 helper를 사용합니다.
      return getStorage(sessionStorage, this.sessionKey(name));
    }

    // sessionStorage에 값을 저장합니다.
    setSession(name, value) {
      // 안전한 storage 쓰기 helper를 사용합니다.
      setStorage(sessionStorage, this.sessionKey(name), value);
    }
  }

  // base URL 끝에 붙은 슬래시를 제거합니다.
  function normalizeBaseUrl(value) {
    // 문자열로 변환한 뒤 끝의 슬래시들을 제거합니다.
    return String(value).replace(/\/+$/, "");
  }

  // 상대 URL 또는 절대 URL을 최종 절대 URL로 변환합니다.
  function toAbsoluteUrl(baseUrl, value) {
    // 이미 http 또는 https 절대 URL이면 그대로 반환합니다.
    if (/^https?:\/\//i.test(value)) {
      // 원본 URL을 그대로 사용합니다.
      return value;
    }

    // base URL과 상대 경로를 하나의 URL로 합칩니다.
    return `${baseUrl}${value.startsWith("/") ? "" : "/"}${value}`;
  }

  // videoElement 옵션을 실제 DOM 엘리먼트로 변환합니다.
  function resolveVideoElement(value) {
    // 값이 없으면 null을 반환합니다.
    if (!value) {
      // video 엘리먼트가 없음을 나타냅니다.
      return null;
    }

    // 문자열이면 CSS selector로 간주합니다.
    if (typeof value === "string") {
      // document.querySelector로 DOM 엘리먼트를 찾습니다.
      return document.querySelector(value);
    }

    // 이미 DOM 엘리먼트면 그대로 반환합니다.
    return value;
  }

  // 서버 응답과 유사한 실패 객체를 만듭니다.
  function createFailure(resultCode, message) {
    // API 응답 형태와 맞춘 객체를 반환합니다.
    return {
      // 실패 상태입니다.
      success: false,
      // 서버 호출이 없었으므로 0을 사용합니다.
      statusCode: 0,
      // 실패 원인 코드입니다.
      resultCode,
      // 실패 메시지입니다.
      message,
      // 실패 시 데이터는 없습니다.
      data: null
    };
  }

  // 브라우저별 고정 ID를 localStorage에서 가져오거나 생성합니다.
  function getOrCreateBrowserId(prefix) {
    // localStorage key를 만듭니다.
    const key = `${prefix}_browserId`;

    // 기존 browserId를 읽습니다.
    let value = getStorage(localStorage, key);

    // 저장된 값이 없으면 새로 생성합니다.
    if (!value) {
      // UUID 또는 fallback 문자열을 생성합니다.
      value = createUuid();
      // 생성한 값을 localStorage에 저장합니다.
      setStorage(localStorage, key, value);
    }

    // browserId를 반환합니다.
    return value;
  }

  // 브라우저 ID 생성용 UUID 문자열을 만듭니다.
  function createUuid() {
    // 최신 브라우저의 crypto.randomUUID를 우선 사용합니다.
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      // 표준 UUID를 반환합니다.
      return global.crypto.randomUUID();
    }

    // 구형 브라우저용 간단한 fallback 값을 반환합니다.
    return `browser-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  // 문자열을 SHA-256 해시로 변환합니다.
  async function sha256(text) {
    // Web Crypto API가 없으면 지문 생성이 불가능합니다.
    if (!global.crypto || !global.crypto.subtle) {
      // HTTPS 또는 localhost가 아닌 환경에서 발생할 수 있습니다.
      throw new Error("Web Crypto API is required to generate a device fingerprint.");
    }

    // 문자열 인코더를 생성합니다.
    const encoder = new TextEncoder();

    // 문자열을 UTF-8 byte 배열로 변환합니다.
    const data = encoder.encode(text);

    // SHA-256 해시를 계산합니다.
    const hashBuffer = await global.crypto.subtle.digest("SHA-256", data);

    // ArrayBuffer를 숫자 배열로 변환합니다.
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    // 각 byte를 16진수 두 자리 문자열로 변환해 합칩니다.
    return hashArray.map((value) => value.toString(16).padStart(2, "0")).join("");
  }

  // storage에서 값을 안전하게 읽습니다.
  function getStorage(storage, key) {
    // 브라우저 설정에 따라 storage 접근이 예외를 던질 수 있으므로 try로 감쌉니다.
    try {
      // 지정한 key의 값을 반환합니다.
      return storage.getItem(key);
    } catch (_) {
      // storage 접근이 막힌 경우 null을 반환합니다.
      return null;
    }
  }

  // storage에 값을 안전하게 씁니다.
  function setStorage(storage, key, value) {
    // 브라우저 설정에 따라 storage 접근이 예외를 던질 수 있으므로 try로 감쌉니다.
    try {
      // 지정한 key에 값을 저장합니다.
      storage.setItem(key, value);
    } catch (_) {
      // 일부 임베디드 브라우저에서는 storage가 비활성화될 수 있습니다.
    }
  }

  // storage에서 값을 안전하게 삭제합니다.
  function removeStorage(storage, key) {
    // 브라우저 설정에 따라 storage 접근이 예외를 던질 수 있으므로 try로 감쌉니다.
    try {
      // 지정한 key를 삭제합니다.
      storage.removeItem(key);
    } catch (_) {
      // 일부 임베디드 브라우저에서는 storage가 비활성화될 수 있습니다.
    }
  }

  // 외부 페이지에서 new KlcubeLicensePlayer(...)로 사용할 수 있게 전역에 공개합니다.
  global.KlcubeLicensePlayer = KlcubeLicensePlayer;

  // 외부 페이지에서 에러 타입을 식별할 수 있게 전역에 공개합니다.
  global.KlcubeLicenseError = KlcubeLicenseError;

  // 즉시 실행 함수에 window 객체를 전달합니다.
})(window);
