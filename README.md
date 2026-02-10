# A/B 테스트 리포트 생성기

Adobe Analytics Workspace에서 내보낸 Excel 파일을 분석하여 A/B 테스트 리포트를 자동으로 생성하는 웹 애플리케이션입니다.

## 기능

- Excel 파일 업로드 및 자동 파싱
- Primary/Secondary/Additional KPI 설정
- Uplift 및 신뢰도 자동 계산
- Verdict 자동 할당 (모수부족 / variation win / control win / 차이없음)
- 인사이트 및 추천 자동 생성
- PDF 리포트 자동 생성

## 기술 스택

- **Frontend**: Next.js 14 (App Router) + TypeScript + React
- **Backend**: Next.js API Routes
- **Python**: pandas, numpy, scipy (데이터 분석)
- **PDF**: reportlab (PDF 생성)

## 설치 및 실행

### 1. 의존성 설치

```bash
# Node.js 의존성 설치
npm install

# Python 의존성 설치
pip install -r requirements.txt
```

### 2. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 애플리케이션에 접근합니다.

### 3. 프로덕션 빌드

```bash
npm run build
npm start
```

## 협업 가이드

### 개발 환경 설정

#### 1. 레포지토리 클론

```bash
git clone https://github.com/hseon2/abtest_report_generator.git
cd abtest_report_generator
```

#### 2. 환경변수 설정

```bash
# env.example을 .env.local로 복사
cp env.example .env.local

# .env.local 파일을 열어 실제 API 키 입력
# GEMINI_API_KEY=실제_API_키
```

#### 3. 의존성 설치

```bash
# Node.js 의존성
npm install

# Python 의존성
pip install -r requirements.txt
```

#### 4. 개발 서버 실행

```bash
npm run dev
```

### Git 브랜치 전략

프로젝트는 다음과 같은 브랜치 전략을 사용합니다:

- **`main`**: 프로덕션 배포용 (Render에 자동 배포됨)
- **`feature/*`**: 새 기능 개발 (예: `feature/add-csv-support`)
- **`fix/*`**: 버그 수정 (예: `fix/excel-download`)
- **`docs/*`**: 문서 업데이트 (예: `docs/update-readme`)

### 작업 흐름

#### 1. 최신 코드 가져오기

```bash
git checkout main
git pull origin main
```

#### 2. 새 브랜치 생성

```bash
# 기능 개발
git checkout -b feature/기능명

# 버그 수정
git checkout -b fix/버그명
```

#### 3. 코드 작성 및 커밋

```bash
# 변경사항 확인
git status

# 파일 추가
git add .

# 커밋 (명확한 메시지 작성)
git commit -m "feat: 새 기능 추가"
# 또는
git commit -m "fix: 버그 수정"
```

#### 4. GitHub에 푸시

```bash
git push origin feature/기능명
```

#### 5. Pull Request 생성

1. GitHub 레포지토리 페이지 방문
2. "Compare & pull request" 버튼 클릭
3. PR 제목과 설명 작성:
   - 무엇을 변경했는지
   - 왜 변경했는지
   - 테스트 방법
4. "Create pull request" 클릭

#### 6. 코드 리뷰 및 병합

- 팀원의 리뷰를 받습니다
- 수정 요청이 있으면 같은 브랜치에 추가 커밋
- 승인되면 `main` 브랜치에 병합
- 병합 후 브랜치 삭제

### 커밋 메시지 컨벤션

명확한 커밋 메시지를 위해 다음 접두사를 사용합니다:

- `feat:` - 새로운 기능 추가
- `fix:` - 버그 수정
- `docs:` - 문서 수정
- `style:` - 코드 포맷팅 (기능 변경 없음)
- `refactor:` - 코드 리팩토링
- `test:` - 테스트 추가/수정
- `chore:` - 빌드 설정, 패키지 관리 등

**예시:**
```bash
git commit -m "feat: CSV 파일 업로드 지원 추가"
git commit -m "fix: Excel 다운로드 시 파일명 오류 수정"
git commit -m "docs: README에 협업 가이드 추가"
```

### 배포

#### 자동 배포 (Render)

- `main` 브랜치에 병합되면 자동으로 Render에 배포됩니다
- 배포 상태는 [Render Dashboard](https://dashboard.render.com/)에서 확인
- 배포 완료까지 약 5-10분 소요

#### 환경변수

프로덕션 환경변수는 Render Dashboard에서 관리합니다:
1. Render Dashboard → 서비스 선택
2. Environment 탭
3. 필요한 환경변수 추가/수정

### 협업 시 주의사항

1. **절대 직접 `main`에 푸시하지 않기**
   - 항상 브랜치를 만들어 작업
   - Pull Request를 통해 병합

2. **환경변수 관리**
   - `.env`, `.env.local` 파일은 절대 커밋하지 않기
   - API 키 등 민감 정보는 팀 채널로 공유

3. **코드 리뷰**
   - 모든 PR은 최소 1명의 리뷰 필요
   - 건설적인 피드백 제공

4. **정기적인 동기화**
   - 작업 시작 전 항상 `git pull origin main`
   - 충돌 최소화를 위해 자주 커밋

5. **테스트**
   - 변경사항은 로컬에서 테스트 후 푸시
   - `npm run dev`로 개발 서버 실행 확인

### GitHub Collaborator 추가하기

레포지토리 소유자가 협업자를 추가하는 방법:

1. https://github.com/hseon2/abtest_report_generator 방문
2. **Settings** 탭 클릭
3. 왼쪽 메뉴에서 **Collaborators** 선택
4. **Add people** 버튼 클릭
5. 협업자의 GitHub 사용자명 또는 이메일 입력
6. 권한 선택:
   - **Write**: 코드 읽기/쓰기, PR 생성/병합
   - **Admin**: 설정 변경, 협업자 관리 등 모든 권한

### 문제 해결

#### Git 충돌 발생 시

```bash
# 1. 최신 main 브랜치 가져오기
git checkout main
git pull origin main

# 2. 작업 브랜치로 돌아가서 병합
git checkout feature/기능명
git merge main

# 3. 충돌 파일 수정 (VS Code에서 표시됨)
# 4. 수정 후 커밋
git add .
git commit -m "chore: merge main and resolve conflicts"
```

#### 잘못된 커밋을 되돌리기

```bash
# 마지막 커밋 취소 (변경사항은 유지)
git reset --soft HEAD~1

# 마지막 커밋 완전히 취소 (변경사항도 삭제)
git reset --hard HEAD~1
```

## 사용 방법

### 1. 파일 업로드

Adobe Analytics Workspace에서 내보낸 Excel 파일(.xlsx)을 업로드합니다.

### 2. KPI 설정

#### Primary KPI 설정

Primary KPI는 비율, 매출, RPV 등을 계산할 수 있습니다.

**예시:**
- **KPI 이름**: Cart CVR
- **분자 (Numerator)**: `(OR 2) Cart count`
- **분모 (Denominator)**: `(OR 2) Visits count`
- **타입**: Rate (비율)

- **KPI 이름**: Revenue
- **분자**: `Revenue` 또는 `Revenue_UK`
- **분모**: (Revenue 타입의 경우 사용되지 않음)
- **타입**: Revenue (매출)

- **KPI 이름**: RPV
- **분자**: `Revenue`
- **분모**: `Visits`
- **타입**: RPV (Revenue per Visit)

#### Secondary KPI 설정

Secondary KPI는 단순 메트릭 값입니다. 정확한 라벨을 입력하세요.

**예시:**
- `(OR 2) Offer section Impression`
- `(OR 2) Offer section Click`

#### Additional KPI 설정

조건부 전환율 등을 계산할 수 있습니다.

**예시:**
- **KPI 이름**: Click -> Cart CVR
- **분자**: `(OR 2) Cart count`
- **분모**: `(OR 2) Offer section Click`
- **타입**: Rate (비율)

### 3. 분석 실행

"분석 실행" 버튼을 클릭하면 데이터가 분석되고 결과가 표시됩니다.

### 4. PDF 다운로드

분석이 완료되면 "PDF 다운로드" 버튼이 나타나며, 클릭하여 리포트를 다운로드할 수 있습니다.

## 설정 JSON 예시

```json
{
  "primaryKPIs": [
    {
      "name": "Cart CVR",
      "numerator": "(OR 2) Cart count",
      "denominator": "(OR 2) Visits count",
      "type": "rate"
    },
    {
      "name": "Order CVR",
      "numerator": "(OR 2) Order count",
      "denominator": "(OR 2) Visits count",
      "type": "rate"
    },
    {
      "name": "Revenue",
      "numerator": "Revenue",
      "denominator": "",
      "type": "revenue"
    }
  ],
  "secondaryKPIs": [
    "(OR 2) Offer section Impression",
    "(OR 2) Offer section Click"
  ],
  "additionalKPIs": [
    {
      "name": "Click -> Cart CVR",
      "numerator": "(OR 2) Cart count",
      "denominator": "(OR 2) Offer section Click",
      "type": "rate"
    }
  ]
}
```

## 데이터 형식

Excel 파일은 다음 형식을 따라야 합니다:

- "Segments" 행 이후에 실제 데이터가 시작됩니다.
- 컬럼 구조:
  - **A**: 세그먼트 라벨/그룹 이름
  - **B**: 메트릭 상세 라벨 (예: "(OR 2) Target pg", "(OR 2) Offer section Click")
  - **C**: 국가 라벨 (예: "UK") 또는 시장 라벨 (예: "Revenue_UK")
  - **D**: All Control 값
  - **E**: All Variation 값
  - **F**: MO Control 값
  - **G**: MO Variation 값
  - **H**: PC Control 값
  - **I**: PC Variation 값

## 계산 공식

### Uplift

```
Uplift = (Variation - Control) / Control × 100%
```

### Confidence (비율 KPI)

Two-sided z-test with unpooled standard error:

```
pC = xC / nC
pV = xV / nV
z = (pV - pC) / sqrt((pV(1-pV)/nV) + (pC(1-pC)/nC))
p-value = 2 × (1 - Φ(|z|))
Confidence = (1 - p-value) × 100%
```

### Verdict 규칙

- **분모 샘플 크기 < 100**: 모수부족
- **Uplift ≥ +3%**: variation win
- **Uplift ≤ -3%**: control win
- **그 외**: 차이없음

### Revenue Confidence

Revenue 타입의 경우 variance 데이터가 없으므로 confidence를 계산할 수 없습니다. 리포트에 "insufficient variance data to compute confidence" 메시지가 표시됩니다.

## 추천 로직

- **Primary KPI에 "control win"이 하나라도 있으면**: Hold
- **Primary KPI가 대부분 "차이없음"이고 Secondary에 부정적 결과가 있으면**: Hold/Iterate
- **Primary KPI에 "variation win"이 있고 Secondary에 큰 부정적 결과가 없으면**: Rollout
- **그 외**: Iterate

## 프로젝트 구조

```
test_report/
├── app/
│   ├── api/
│   │   ├── analyze/
│   │   │   └── route.ts      # 파일 업로드 및 분석 API
│   │   └── pdf/
│   │       └── route.ts      # PDF 다운로드 API
│   ├── globals.css           # 전역 스타일
│   ├── layout.tsx            # 레이아웃
│   └── page.tsx              # 메인 페이지
├── python/
│   ├── analyze.py            # 데이터 분석 스크립트
│   └── report.py             # PDF 생성 스크립트
├── tmp/                      # 임시 파일 저장소 (자동 생성)
├── package.json
├── requirements.txt
├── tsconfig.json
└── README.md
```

## 문제 해결

### Python 명령을 찾을 수 없는 경우

Windows에서 `python` 명령이 작동하지 않으면 `python3`를 사용하거나, `app/api/analyze/route.ts` 파일에서 Python 실행 명령을 수정하세요.

### 한글 폰트 문제

PDF에서 한글이 제대로 표시되지 않으면 `python/report.py` 파일의 폰트 설정을 수정하세요. Windows의 경우 기본적으로 Malgun Gothic을 사용하려고 시도합니다.

### 파일 업로드 오류

파일 크기가 10MB를 초과하면 오류가 발생할 수 있습니다. `next.config.js`에서 `bodySizeLimit`을 조정하세요.

## 라이선스

이 프로젝트는 내부 사용을 위한 것입니다.

