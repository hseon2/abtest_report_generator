# Railway 배포 가이드

이 문서는 A/B 테스트 리포트 생성기를 Railway에 배포하는 방법을 설명합니다.

## 🚀 배포 단계

### 1단계: Railway 계정 생성

1. [Railway.app](https://railway.app) 접속
2. **"Login"** → **"Login with GitHub"** 클릭
3. GitHub 계정으로 로그인 및 권한 부여

### 2단계: 새 프로젝트 생성

1. Railway 대시보드에서 **"New Project"** 클릭
2. **"Deploy from GitHub repo"** 선택
3. 저장소 목록에서 **`hseon2/abtest_report_generator`** 선택
   - 저장소가 안 보이면 "Configure GitHub App" 클릭해서 권한 추가

### 3단계: 환경 변수 설정

배포된 프로젝트의 **"Variables"** 탭에서 다음 환경 변수를 추가하세요:

```
GEMINI_API_KEY=your_actual_gemini_api_key
NODE_ENV=production
```

#### Gemini API Key 발급 방법:
1. [Google AI Studio](https://makersuite.google.com/app/apikey) 접속
2. **"Get API Key"** → **"Create API key"** 클릭
3. 생성된 키를 복사해서 Railway의 `GEMINI_API_KEY`에 입력

### 4단계: 배포 시작

1. 환경 변수 설정 완료 후 자동으로 배포가 시작됩니다
2. **"Deployments"** 탭에서 진행 상황 확인 (약 3-5분 소요)
3. 빌드 로그에서 오류가 없는지 확인

### 5단계: 도메인 확인

1. 배포가 완료되면 **"Settings"** 탭으로 이동
2. **"Domains"** 섹션에서 자동 생성된 URL 확인
   - 예: `https://abtest-report-generator-production.up.railway.app`
3. 해당 URL을 클릭해서 앱이 정상 작동하는지 테스트

## 🔄 자동 재배포

GitHub에 코드를 push하면 **자동으로 재배포**됩니다:

```bash
git add .
git commit -m "Update features"
git push
```

Railway가 자동으로 감지하고 새 버전을 배포합니다.

## 💰 비용 안내

- **무료 플랜**: 월 $5 크레딧 제공 (소규모 앱에 충분)
- **사용량 초과 시**: 자동으로 사용 중단 (추가 요금 없음)
- **업그레이드**: 필요 시 Hobby 플랜($5/월)으로 업그레이드 가능

## 🐛 문제 해결

### Python 패키지 설치 오류
```bash
# requirements.txt의 버전 제약 확인
# nixpacks.toml에서 Python 버전 확인 (현재: python310)
```

### 메모리 부족 오류
Railway Settings에서 메모리 할당량 증가 (Hobby 플랜 필요)

### 환경 변수 누락
Variables 탭에서 `GEMINI_API_KEY`가 제대로 설정되어 있는지 확인

## 📱 커스텀 도메인 (선택사항)

1. Railway Settings → **"Domains"** 섹션
2. **"Custom Domain"** 클릭
3. 본인 소유의 도메인 연결 (DNS 설정 필요)

---

## 🎉 배포 완료!

이제 전 세계 어디서든 앱에 접속할 수 있습니다. 추가 질문이 있다면 [Railway 문서](https://docs.railway.app)를 참고하세요.





