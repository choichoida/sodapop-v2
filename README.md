# SODAPOP 2.0 🚀

**Social Demographic Analysis Platform for Optimal Planning**

> Built on the "Google Antigravity" philosophy — eliminating the weight of complex raw data to provide a weightless, fluid experience for evidence-based social welfare insights.

---

## 🎯 Mission

Empower social workers across South Korea with instant, evidence-based demographic insights. Transform dense KOSIS statistics into actionable welfare rationales.

---

## 🌟 Antigravity Edition Features

### Suspension Bar (Floating Cockpit)
The top control panel hovers above the interface, providing:
- **Year Selector**: Quick switch between 2021-2025
- **Region Cascade**: Sido → Sigungu → Eupmyeondong fluid navigation
- **Target Filters**: Children, Productive, Young-Old, Old-Old clusters
- **Keyword Search**: 1인가구, 독거노인 등 welfare keywords

### Visual Weightlessness
- **Floating Cards**: Stats and panels with elevation and glow effects
- **Population Pyramid**: Chart.js with elderly highlighting (red zones for 65+)
- **Comparison Layers**: Overlay national averages on regional pyramids
- **Urgency Rankings**: Real-time sorted by welfare priority score

### Logic Generator
Auto-generate copy-paste ready welfare rationales:
```
"○○구의 75세 이상 후기고령인구는 2021년 대비 15.3% 증가하여
현재 전체 인구의 8.2%를 차지하고 있습니다. 이는 전국 평균(6.8%)을
크게 상회하는 수치로, 재가돌봄서비스의 즉각적인 확대가 필요합니다."
```

## ✨ Core Features

### 1. Fluid Navigation
- Seamless traversal across all administrative levels
- **Sido (시도)** → **Sigungu (시군구)** → **Eupmyeondong (읍면동)**
- KIKcd_H 10-digit hierarchy mapping

### 2. Zero-Inertia Data Processing
- Automatic filtering of "Total(계)" entries
- Expired code detection and removal
- 5-year longitudinal analysis (2021-2025)

### 3. Lifted Insights
- "Floating Cards" of logical evidence
- Welfare Rationale Generator
- Copy-paste ready summaries for business proposals

---

## 📊 Demographic Segmentation

| Cluster | Age Range | Focus |
|---------|-----------|-------|
| Children/Youth | 0-18 | Development & Protection |
| Productive Population | 19-64 | Employment & Family Support |
| Young-Old | 65-74 | Active Participation |
| Old-Old | 75+ | Intensive Care |

---

## 🏗️ Architecture

### Vercel Deployment Structure (New)
```
project_ai/
├── public/                      # Static Files (Vercel Output)
│   ├── index.html              # Main HTML with Suspension Bar
│   ├── style.css               # Antigravity Design System
│   ├── sodapop.js              # Client-side Application
│   └── data/
│       └── sido_codes.json     # 행정구역 코드 데이터
├── api/                         # Vercel Serverless Functions
│   ├── kosis.js                # KOSIS API Proxy (API 키 보호)
│   └── hierarchy.js            # Administrative Hierarchy API
├── vercel.json                  # Vercel Configuration
├── .env.example                 # Environment Variables Template
└── .gitignore                   # Git Ignore Rules
```

### Legacy Python Backend
```
├── sodapop/                     # Python Backend
│   ├── core/
│   │   ├── hierarchy.py        # KIKcd_H Administrative Mapping
│   │   ├── processor.py        # Demographic Data Processor
│   │   └── analyzer.py         # Trend Detection & Aging Velocity
│   ├── visualization/
│   │   ├── pyramid.py          # Population Pyramids
│   │   └── rankings.py         # Regional Rankings
│   ├── generators/
│   │   └── rationale.py        # Welfare Rationale Logic Generator
│   └── config.py               # Central Configuration
├── app.py                      # Streamlit Dashboard
└── requirements.txt            # Python Dependencies
```

---

## 🚀 Quick Start

### Option 1: Vercel Deployment (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Or deploy to production
vercel --prod
```

### Option 2: Local Development
```bash
# Serve the public folder
npx serve public

# Or with Python
cd public && python -m http.server 8080
# Visit http://localhost:8080
```

### Option 3: Streamlit Dashboard (Legacy)
```bash
# Install dependencies
pip install -r requirements.txt

# Run the dashboard
streamlit run app.py
```

---

## 🔒 Environment Variables (Vercel)

API 키를 안전하게 관리하기 위해 환경변수를 사용합니다.

### Vercel Dashboard에서 설정

1. **Project Settings > Environment Variables**
2. 다음 변수 추가:

| Variable | Description | Required |
|----------|-------------|----------|
| `KOSIS_API_KEY` | KOSIS OpenAPI 키 | ⚠️ 실제 데이터 사용시 |

**API 키 발급:** https://kosis.kr/openapi/

### 로컬 개발 시
```bash
# .env.local 파일 생성
cp .env.example .env.local
# KOSIS_API_KEY 값 설정
```

### 보안 구조
```
Browser → /api/kosis (Serverless Function) → KOSIS API
            ↑
    환경변수에서 API 키 로드
    (클라이언트에 노출 안됨)
```

---

## 📈 Key Metrics

- **Aging Velocity**: Year-over-Year growth rate of elderly population
- **Dependency Ratio**: Non-productive / Productive population
- **Welfare Urgency Index**: Composite score for resource allocation

---

## 📝 Evidence-Based Practice (EBP)

Every insight generated follows EBP principles:
1. **Data-Driven**: All claims backed by KOSIS statistics
2. **Contextual**: Regional comparisons with national averages
3. **Actionable**: Clear welfare service recommendations

---

---

## 🎨 UI/UX Design Principles

### Antigravity Framework
1. **Fluid Navigation**: Zero-friction transition across administrative levels
2. **Zero-Inertia Processing**: Automatic `!includes("계")` filtering, expired code removal
3. **Lifted Insights**: Data floats as cards, not anchored to bottom
4. **Visual Weightlessness**: Glassmorphism, glow effects, subtle animations

### Color System
| Purpose | Color | Hex |
|---------|-------|-----|
| Male Population | Blue | `#3b82f6` |
| Female Population | Pink | `#ec4899` |
| Elderly Highlight | Red | `#dc2626` |
| Children/Youth | Teal | `#4ECDC4` |
| Young-Old (65-74) | Amber | `#F7B731` |
| Old-Old (75+) | Coral | `#FC5C65` |
| Primary Accent | Indigo | `#6366f1` |

### Aging Emphasis
The pyramid chart automatically highlights elderly age groups (65+) with red tones:
- **65-74 (전기고령)**: Light red overlay
- **75+ (후기고령)**: Deep red highlighting with bold labels

---

## 📡 KOSIS API Integration

```javascript
// Automatic '계' filtering
const filtered = data.filter(item => !item.name.includes('계'));

// Age classification
const clusters = DataProcessor.classifyWelfareTarget(minAge, maxAge);
// Returns: [{ cluster: 'oldOld', proportion: 1.0 }]

// Service Area grouping (가상 행정동)
const serviceArea = DataProcessor.createServiceArea(
  [region1, region2, region3],
  '○○권역'
);
```

---

*Built with ❤️ for South Korean Social Workers*
