# KLCUBE React License Player Sample

React에서 `klcube-license-player.js`를 사용하는 샘플입니다.

## 실행

```bash
npm install
npm run dev
```

기본 URL:

```text
http://localhost:5173
```

## 설정

화면에서 직접 수정하거나 `.env` 파일로 기본값을 지정할 수 있습니다.

```env
VITE_LICENSE_SERVER_URL=https://localhost:32769
VITE_LICENSE_KEY=KLC-LIC-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_VIDEO_ID=video001
```

## 구성

- `public/klcube-license-player.js`: KLCUBE 브라우저 플레이어 라이브러리
- `index.html`: hls.js와 플레이어 라이브러리 로드
- `src/App.tsx`: React 샘플 플레이어 UI
- `src/styles.css`: 샘플 스타일

## 동작 흐름

1. `licenseKey`와 `videoId` 입력
2. `Play` 클릭
3. 라이선스 검증
4. 필요 시 자동 활성화
5. playback token 발급
6. HLS 우선 재생, direct stream fallback
