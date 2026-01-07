# Google Gemini API 연동 가이드

## API 키 발급 방법

1. [Google AI Studio](https://makersuite.google.com/app/apikey)에 접속
2. Google 계정으로 로그인
3. "Create API Key" 버튼 클릭
4. 생성된 API 키 복사

## 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```bash
GEMINI_API_KEY=your_actual_api_key_here
```

## 사용 방법

### Python 스크립트에서 직접 사용

`python/analyze.py` 실행 시 config 파일에 `useAI: true` 추가:

```json
{
  "primaryKPIs": [...],
  "secondaryKPIs": [...],
  "country": "UK",
  "useAI": true
}
```

### 무료 사용량 제한

- 분당 15 requests
- 월 1,500 requests
- 토큰 제한: 요청당 약 32,000 토큰

## 주의사항

- API 키는 절대 공개 저장소에 커밋하지 마세요
- `.env.local` 파일은 `.gitignore`에 추가되어 있어야 합니다
- API 호출 실패 시 기본 인사이트 생성 로직으로 자동 전환됩니다

