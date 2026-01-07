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

