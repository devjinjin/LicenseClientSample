# KLCUBE 라이선스 정보

## 1. 개요

KLCUBE 라이선스는 보호된 영상 서비스를 사용하기 전에 서버에서 사용 권한을 확인하기 위한 정보입니다.

현재 구조는 두 영역으로 나뉩니다.

- 관리자 영역: 라이선스 생성, 라이선스 키 발급/재발급, 디바이스 현황 조회
- 외부 클라이언트 영역: 발급받은 `licenseKey`만 사용해서 영상 재생

외부 회사의 웹페이지나 서비스는 `customerCode`, `productCode`를 알 필요가 없습니다. 발급 완료 후 전달받는 값은 `licenseKey` 하나입니다.

## 2. 주요 값

### customerCode

관리자가 라이선스를 발급할 때 고객 또는 외부 회사를 식별하기 위해 사용하는 내부 관리 코드입니다.

예:

```text
BANK001
```

외부 클라이언트 플레이어 설정에는 사용하지 않습니다.

### productCode

관리자가 라이선스를 발급할 때 제품 또는 서비스를 구분하기 위해 사용하는 내부 관리 코드입니다.

예:

```text
WEB_VIDEO
```

외부 클라이언트 플레이어 설정에는 사용하지 않습니다.

### licenseKey

외부 클라이언트가 라이선스 활성화 요청에 사용하는 공개 접근 키입니다.

예:

```text
KLC-LIC-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

브라우저 JavaScript에 포함되는 값이므로 비밀키로 취급하면 안 됩니다. 실제 보호는 서버의 activation token, playback token, HLS segment 검증, 디바이스 수 제한으로 처리합니다.

## 3. 관리자 라이선스 발급 절차

관리자는 `/admin` 페이지에서 로그인한 뒤 신규 라이선스를 발급합니다.

관리자 로그인:

```text
ID: klcubeadmin
PW: Cubeadmin12#
```

신규 라이선스 발급 API:

```http
POST /api/admin/licenses
```

요청 예:

```json
{
  "customerCode": "BANK001",
  "productCode": "WEB_VIDEO",
  "maxActiveDevices": 350,
  "licenseKey": null,
  "expiresAt": null
}
```

`licenseKey`를 비워두면 서버가 자동 생성합니다.

응답 예:

```json
{
  "success": true,
  "statusCode": 200,
  "resultCode": "REGISTERED",
  "message": "등록 성공",
  "data": {
    "licenseId": 1,
    "customerCode": "BANK001",
    "productCode": "WEB_VIDEO",
    "licenseKey": "KLC-LIC-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "maxActiveDevices": 350,
    "licenseStatus": "LICENSE_ACTIVE",
    "issuedAt": "2026-04-27T01:41:28.0000000Z",
    "expiresAt": null
  }
}
```

관리자는 이 응답의 `licenseKey`만 외부 회사에 전달합니다.

## 4. 라이선스 키 조회 또는 재발급

기존 라이선스의 키를 조회하거나 새 키로 교체할 수 있습니다.

```http
POST /api/admin/licenses/access-key
```

요청 예:

```json
{
  "customerCode": "BANK001",
  "productCode": "WEB_VIDEO",
  "rotate": false
}
```

`rotate` 값:

- `false`: 기존 키가 있으면 기존 키 반환, 없으면 신규 발급
- `true`: 기존 키를 새 키로 교체

키를 재발급하면 기존 외부 클라이언트 설정의 `licenseKey`도 새 값으로 교체해야 합니다.

## 5. 외부 클라이언트 연동

외부 클라이언트는 `licenseKey`만 설정합니다.

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

필수 옵션:

- `serverBaseUrl`: 라이선스 서버 주소
- `licenseKey`: 관리자에게 발급받은 라이선스 키
- `videoElement`: 재생에 사용할 video 엘리먼트 또는 CSS selector

## 6. 디바이스 활성화 요청

플레이어는 영상 재생 전에 자동으로 라이선스 활성화를 수행합니다.

```http
POST /api/licenses/activate
```

요청 예:

```json
{
  "licenseKey": "KLC-LIC-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "hostName": "client.example.com",
  "deviceFingerprint": "device-fingerprint-value",
  "machineGuid": null,
  "macAddress": null,
  "internalIpAddress": null
}
```

서버 검증 조건:

- `licenseKey`로 라이선스를 찾을 수 있는지
- 라이선스가 활성 상태인지
- 라이선스가 만료되지 않았는지
- 디바이스가 차단 상태가 아닌지
- 활성 디바이스 수가 350대를 넘지 않는지

성공하면 activation token을 발급합니다.

## 7. 디바이스 수 제한

현재 서버는 활성 디바이스를 최대 350대로 제한합니다.

정책:

- `MaxActiveDevices`는 350을 초과할 수 없습니다.
- 기존 DB 값이 350보다 커도 활성화 시점에는 최대 350으로 제한됩니다.
- 활성화 처리는 DB `Serializable` 트랜잭션에서 수행됩니다.
- 동시 활성화 요청이 몰려도 350대 제한이 깨지지 않도록 PostgreSQL 직렬화 충돌을 재시도합니다.

## 8. 재생 토큰 발급

activation token만으로 영상 파일에 직접 접근하지 않습니다. 영상 재생 전에는 짧은 수명의 playback token을 별도로 발급받습니다.

```http
POST /api/videos/playback-token
```

요청 예:

```json
{
  "token": "KLCUBE-activation-token",
  "deviceFingerprint": "device-fingerprint-value",
  "videoId": "video001"
}
```

응답에는 다음 URL 중 하나 이상이 포함됩니다.

- `hlsUrl`: HLS master playlist URL
- `streamUrl`: MP4/WebM 직접 스트리밍 URL

## 9. 플레이어 내부 처리 순서

`player.play(videoId)` 호출 시 다음 순서로 처리됩니다.

1. 저장된 activation token 검증
2. 토큰이 없거나 만료되었으면 `licenseKey`로 자동 활성화
3. playback token 발급
4. HLS URL 우선 로드
5. HLS가 없으면 MP4/WebM 직접 스트리밍으로 fallback
6. video 엘리먼트 재생

## 10. 운영 시 주의사항

`licenseKey`는 브라우저에서 확인 가능한 공개 값입니다.

운영 환경에서는 다음 API를 반드시 관리자 인증 뒤에서만 사용해야 합니다.

```http
POST /api/admin/licenses
POST /api/admin/licenses/access-key
```

권장 보호 방식:

- 관리자 계정을 환경 변수 또는 DB로 이전
- 관리자 API에 권한 정책 추가
- 허용 IP 제한
- 허용 Origin 또는 도메인 검증
- 키 재발급 이력 감사 로그

현재 라이선스 보호의 핵심은 `licenseKey` 자체가 아니라 서버에서 검증하는 activation token, playback token, 디바이스 제한, HLS segment 접근 제어입니다.
