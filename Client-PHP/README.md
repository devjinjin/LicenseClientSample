# KLCUBE PHP License Player Sample

PHP에서 KLCUBE 브라우저 플레이어 라이브러리를 사용하는 샘플입니다.

PHP는 초기 설정값을 HTML에 렌더링하고, 실제 라이선스 활성화/검증/재생은 브라우저의 `klcube-license-player.js`가 처리합니다.

## 실행

```bash
php -S localhost:8081
```

접속:

```text
http://localhost:8081
```

## 환경 변수

```bash
set KLCUBE_LICENSE_SERVER_URL=https://localhost:32769
set KLCUBE_LICENSE_KEY=KLC-LIC-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
set KLCUBE_VIDEO_ID=video001
php -S localhost:8081
```

PowerShell:

```powershell
$env:KLCUBE_LICENSE_SERVER_URL = "https://localhost:32769"
$env:KLCUBE_LICENSE_KEY = "KLC-LIC-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
$env:KLCUBE_VIDEO_ID = "video001"
php -S localhost:8081
```

## 파일 구성

- `index.php`: PHP 샘플 페이지
- `sample.js`: 플레이어 초기화 및 버튼 이벤트
- `style.css`: 화면 스타일
- `klcube-license-player.js`: KLCUBE 브라우저 플레이어 라이브러리

## 동작 흐름

1. `licenseKey`와 `videoId` 입력
2. `Play` 클릭
3. 라이선스 검증
4. 필요 시 자동 활성화
5. playback token 발급
6. HLS 우선 재생, direct stream fallback
