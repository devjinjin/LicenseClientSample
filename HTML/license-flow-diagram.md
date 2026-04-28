# KLCUBE License Player Flow Diagram

## 1. 전체 절차

```mermaid
sequenceDiagram
    autonumber

    participant Admin as 관리자
    participant AdminWeb as Admin Web
    participant AdminApi as License Server<br/>/api/admin
    participant ExternalPage as 외부 회사 웹페이지
    participant PlayerLib as klcube-license-player.js
    participant LicenseApi as License Server<br/>/api/licenses
    participant VideoApi as License Server<br/>/api/videos
    participant HlsApi as License Server<br/>/api/hls
    participant Browser as Browser Video Element

    Admin->>AdminWeb: /admin 로그인
    AdminWeb->>AdminApi: POST /login
    AdminApi-->>AdminWeb: 관리자 쿠키 발급

    Admin->>AdminWeb: 신규 라이선스 발급
    AdminWeb->>AdminApi: POST /licenses<br/>customerCode, productCode, maxActiveDevices
    AdminApi-->>AdminWeb: licenseId, customerCode, productCode, licenseKey

    opt 기존 라이선스 키 조회 또는 재발급
        AdminWeb->>AdminApi: POST /licenses/access-key<br/>customerCode, productCode, rotate
        AdminApi-->>AdminWeb: licenseKey, rotated
    end

    Admin-->>ExternalPage: licenseKey 전달

    ExternalPage->>PlayerLib: new KlcubeLicensePlayer({ licenseKey, videoElement })
    ExternalPage->>PlayerLib: play(videoId)

    PlayerLib->>PlayerLib: deviceFingerprint 생성 또는 조회
    PlayerLib->>LicenseApi: POST /validate<br/>stored activationToken, deviceFingerprint

    alt activationToken valid
        LicenseApi-->>PlayerLib: SUCCESS, isAllowed=true
    else token missing/expired/not found
        LicenseApi-->>PlayerLib: TOKEN_MISSING or TOKEN_EXPIRED
        PlayerLib->>LicenseApi: POST /activate<br/>licenseKey, deviceFingerprint
        LicenseApi->>LicenseApi: licenseKey로 라이선스 조회
        LicenseApi->>LicenseApi: 350대 활성 디바이스 제한 검증
        LicenseApi-->>PlayerLib: activationToken
        PlayerLib->>LicenseApi: POST /validate<br/>activationToken, deviceFingerprint
        LicenseApi-->>PlayerLib: SUCCESS, isAllowed=true
    end

    PlayerLib->>VideoApi: POST /playback-token<br/>activationToken, deviceFingerprint, videoId
    VideoApi-->>PlayerLib: playbackToken, hlsUrl, streamUrl

    alt hlsUrl exists
        PlayerLib->>Browser: HLS source 연결
        Browser->>HlsApi: GET /{videoId}/master.m3u8?playbackToken=...
        HlsApi-->>Browser: rewritten master.m3u8
        Browser->>HlsApi: GET variant playlist / segments
        HlsApi->>HlsApi: playbackToken 검증
        HlsApi-->>Browser: HLS playlist / segment
    else streamUrl fallback
        PlayerLib->>Browser: MP4/WebM source 연결
        Browser->>VideoApi: GET /stream/{videoId}?playbackToken=...
        VideoApi->>VideoApi: playbackToken 검증
        VideoApi-->>Browser: video stream
    end

    Browser-->>ExternalPage: 영상 재생
```

## 2. 클라이언트 플레이어 내부 흐름

```mermaid
flowchart TD
    A["외부 페이지에서 player.play(videoId) 호출"] --> B["videoElement 확인"]
    B --> C["deviceFingerprint 생성 또는 sessionStorage 조회"]
    C --> D["저장된 activationToken 조회"]
    D --> E{"activationToken 존재?"}

    E -- "없음" --> F["POST /api/licenses/activate<br/>licenseKey + deviceFingerprint"]
    E -- "있음" --> G["POST /api/licenses/validate"]

    G --> H{"검증 성공?"}
    H -- "성공" --> I["POST /api/videos/playback-token"]
    H -- "토큰 없음/만료" --> F
    H -- "기타 실패" --> X["재생 중단 및 에러 반환"]

    F --> J{"활성화 성공?"}
    J -- "실패" --> X
    J -- "성공" --> K["activationToken sessionStorage 저장"]
    K --> G

    I --> L{"playbackToken 발급 성공?"}
    L -- "실패" --> X
    L -- "성공" --> M{"hlsUrl 존재?"}

    M -- "있음" --> N{"Native HLS 지원?"}
    N -- "지원" --> O["video.src = hlsUrl"]
    N -- "미지원" --> P{"hls.js 사용 가능?"}
    P -- "가능" --> Q["hls.js loadSource + attachMedia"]
    P -- "불가" --> X

    M -- "없음" --> R{"streamUrl 존재?"}
    R -- "있음" --> S["video.src = streamUrl"]
    R -- "없음" --> X

    O --> T["video.play"]
    Q --> T
    S --> T
    T --> U["재생 시작"]
```

## 3. 서버 활성화 검증 흐름

```mermaid
flowchart TD
    A[POST /api/licenses/activate] --> B{licenseKey와 deviceFingerprint 존재?}
    B -- 아니오 --> Z1[INVALID_REQUEST]
    B -- 예 --> C{licenseKey로 라이선스 조회 가능?}

    C -- 아니오 --> Z2[LICENSE_NOT_FOUND]
    C -- 예 --> D{라이선스 ACTIVE?}
    D -- 아니오 --> Z2
    D -- 예 --> E{라이선스 만료?}

    E -- 예 --> Z3[LICENSE_EXPIRED]
    E -- 아니오 --> F[오래된 ACTIVE 디바이스 INACTIVE 처리]
    F --> G{기존 디바이스 존재?}

    G -- 존재 --> H{DEVICE_BLOCKED?}
    H -- 예 --> Z4[DEVICE_BLOCKED]
    H -- 아니오 --> I{이미 유효한 activationToken 있음?}
    I -- 예 --> Z5[ALREADY_ACTIVATED]
    I -- 아니오 --> J[활성 슬롯 필요 여부 계산]

    G -- 없음 --> J
    J --> K{ACTIVE 디바이스 수 >= 350?}
    K -- 예 --> Z6[DEVICE_LIMIT_EXCEEDED]
    K -- 아니오 --> L[디바이스 ACTIVE 저장]
    L --> M[activationToken 발급]
    M --> N[ACTIVATED]
```

## 4. 외부 회사 연동 최소 코드

```html
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
<script src="./klcube-license-player.js"></script>

<video id="videoPlayer" controls></video>

<script>
  const player = new KlcubeLicensePlayer({
    serverBaseUrl: "https://license.example.com",
    licenseKey: "KLC-LIC-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    videoElement: "#videoPlayer"
  });

  await player.play("video001");
</script>
```

## 5. 보안 경계

```mermaid
flowchart LR
    A[licenseKey<br/>브라우저에 노출 가능] --> B[라이선스 식별]
    B --> C[activationToken<br/>디바이스 활성화 결과]
    C --> D[playbackToken<br/>짧은 수명의 영상 접근 권한]
    D --> E[HLS playlist/segment 또는 stream 접근]

    F[서버 검증] --> C
    F --> D
    F --> E
```

`licenseKey`는 공개 키에 가깝습니다. 최종 접근 제어는 서버의 activation token, playback token, HLS segment 검증, 디바이스 수 제한으로 수행됩니다.
