# KLCUBE Iframe Client Sample

HTML 페이지 안에서 JSP 클라이언트를 iframe으로 실행하는 샘플입니다.

## Run

`index.html`을 브라우저에서 열면 기본적으로 다음 JSP 클라이언트를 iframe에 로드합니다.

```text
http://localhost:8080/klcube-license-jsp-client/
```

다른 JSP 주소를 사용하려면 화면 상단 입력창에 URL을 넣고 `Load`를 클릭합니다.

쿼리스트링으로도 지정할 수 있습니다.

```text
index.html?jspUrl=http://localhost:8080/klcube-license-jsp-client/
```

## Files

- `index.html`: iframe으로 JSP 클라이언트를 표시하는 정적 HTML 샘플

## Notes

JSP 클라이언트와 라이선스 서버가 다른 origin이면 라이선스 서버 CORS 설정이 JSP 클라이언트 origin을 허용해야 합니다.

JSP 서버가 `X-Frame-Options: DENY` 또는 제한적인 `Content-Security-Policy frame-ancestors` 헤더를 내려주면 iframe 표시가 차단될 수 있습니다.
