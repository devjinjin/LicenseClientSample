# KLCUBE JSP License Player Sample

JSP에서 KLCUBE 브라우저 플레이어 라이브러리를 사용하는 샘플입니다.

JSP는 초기 설정값만 HTML에 렌더링하고, 실제 라이선스 활성화, 검증, 재생 토큰 발급, 영상 재생은 브라우저의 `klcube-license-player.js`가 처리합니다.

## Run

Maven과 Tomcat 플러그인을 사용하는 환경이면 WAR로 패키징할 수 있습니다.

```bash
mvn package
```

생성 파일:

```text
target/klcube-license-jsp-client.war
```

Tomcat에 배포한 뒤 접속합니다.

```text
http://localhost:8080/klcube-license-jsp-client/
```

## Environment

JSP는 다음 환경 변수를 읽어 기본값으로 표시합니다.

```bash
KLCUBE_LICENSE_SERVER_URL=https://localhost:32769
KLCUBE_LICENSE_KEY=KLC-LIC-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
KLCUBE_VIDEO_ID=video001
```

Windows PowerShell 예시:

```powershell
$env:KLCUBE_LICENSE_SERVER_URL = "https://localhost:32769"
$env:KLCUBE_LICENSE_KEY = "KLC-LIC-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
$env:KLCUBE_VIDEO_ID = "video001"
```

## Files

- `pom.xml`: JSP 클라이언트 WAR 패키징 설정
- `src/main/webapp/index.jsp`: JSP 샘플 페이지
- `src/main/webapp/sample.js`: 플레이어 초기화 및 버튼 이벤트
- `src/main/webapp/style.css`: 샘플 UI 스타일
- `src/main/webapp/klcube-license-player.js`: KLCUBE 브라우저 플레이어 라이브러리

## Flow

1. `licenseKey`와 `videoId` 입력
2. `Play` 클릭
3. activation token 검증
4. 필요 시 라이선스 자동 활성화
5. playback token 발급
6. HLS 우선 재생, 없으면 direct stream 재생
