# Render 배포 가이드

이 문서는 A/B 테스트 리포트 생성기를 Render에 배포하는 방법을 설명합니다.

## 🚀 배포 단계

### 1단계: Render 계정 생성

1. [Render.com](https://render.com) 접속
2. **"Get Started for Free"** 클릭
3. **"Sign up with GitHub"** 선택
4. GitHub 계정으로 로그인 및 권한 부여

### 2단계: 새 Web Service 생성

1. Render 대시보드에서 **"New +"** 클릭
2. **"Web Service"** 선택
3. **"Connect GitHub"** 클릭 (처음이면)
4. 저장소 목록에서 **`hseon2/abtest_report_generator`** 선택
5. **"Connect"** 클릭

### 3단계: 서비스 설정

#### 기본 설정

- **Name**: `ab-test-report-generator` (또는 원하는 이름)
- **Region**: `Singapore` (또는 가장 가까운 지역)
- **Branch**: `main`
- **Root Directory**: (비워두기 - 루트가 기본값)

#### Build & Deploy 설정

- **Environment**: `Node`
- **Build Command**: (render.yaml이 자동으로 사용됨)
  ```
  npm ci
  npm run build
  python3 -m venv venv
  . venv/bin/activate && pip install --upgrade pip setuptools wheel
  . venv/bin/activate && pip install -r requirements.txt
  ```
- **Start Command**: (render.yaml이 자동으로 사용됨)
  ```
  npm start
  ```

#### 환경 변수 설정

**Environment Variables** 섹션에서 다음 변수 추가:

```
NODE_ENV=production
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

**GEMINI_API_KEY 발급 방법:**
1. [Google AI Studio](https://makersuite.google.com/app/apikey) 접속
2. **"Get API Key"** → **"Create API key"** 클릭
3. 생성된 키를 복사해서 Render의 `GEMINI_API_KEY`에 입력

### 4단계: 배포 시작

1. 모든 설정 완료 후 **"Create Web Service"** 클릭
2. 배포가 자동으로 시작됩니다 (약 5-10분 소요)
3. **"Logs"** 탭에서 빌드 진행 상황 확인

### 5단계: 배포 완료 확인

1. 배포가 완료되면 **"Events"** 탭에서 **"Live"** 상태 확인
2. 자동 생성된 URL 확인:
   - 예: `https://ab-test-report-generator.onrender.com`
3. 해당 URL을 클릭해서 앱이 정상 작동하는지 테스트

## 🔄 자동 재배포

GitHub에 코드를 push하면 **자동으로 재배포**됩니다:

```bash
git add .
git commit -m "Update features"
git push
```

Render가 자동으로 감지하고 새 버전을 배포합니다.

## 💰 비용 안내

- **무료 플랜**: 
  - Web Service가 15분 비활성 시 sleep (느림)
  - 월 750시간 무료
  - 느린 시작 (sleep에서 깨어날 때)
- **Starter 플랜** ($7/월):
  - Sleep 없음
  - 빠른 시작
  - 더 많은 리소스

## 🐛 문제 해결

### Python 패키지 설치 오류

```bash
# requirements.txt의 버전 제약 확인
# Python 버전 확인 (Render는 기본적으로 Python 3.10+ 사용)
```

### 메모리 부족 오류

Render Settings에서 메모리 할당량 증가 (Starter 플랜 필요)

### 환경 변수 누락

Environment Variables 탭에서 `GEMINI_API_KEY`가 제대로 설정되어 있는지 확인

### Sleep 문제 (무료 플랜)

무료 플랜은 15분 비활성 시 sleep됩니다. 첫 요청이 느릴 수 있어요.
- 해결: Starter 플랜으로 업그레이드 ($7/월)

## 📱 커스텀 도메인 (선택사항)

1. Render Settings → **"Custom Domains"** 섹션
2. **"Add Custom Domain"** 클릭
3. 본인 소유의 도메인 연결 (DNS 설정 필요)

## 🔍 Health Check

Render는 자동으로 health check를 수행합니다:
- `/api/health` 엔드포인트가 200을 반환하면 정상

## 🎉 배포 완료!

이제 전 세계 어디서든 앱에 접속할 수 있습니다. 추가 질문이 있다면 [Render 문서](https://render.com/docs)를 참고하세요.








