/**
 * SODAPOP 2.0 - Main Application Script
 * Antigravity Edition (Vercel Deployment Ready)
 * 
 * KOSIS 데이터 기반 전국 복지 분석 시스템
 * - API 환경변수 보호 (서버리스 함수 통한 프록시)
 * - 상대 경로 기반 데이터 로딩
 * - '계' 항목 자동 제거
 * - 행정구역 H-Code 기반 유동적 탐색
 */

// ============================================
// API CONFIGURATION
// ============================================
const API_CONFIG = {
    // API endpoints (relative paths for Vercel deployment)
    KOSIS_PROXY: '/api/kosis',
    HIERARCHY_API: '/api/hierarchy',
    DATA_PATH: '/data',  // Static data in public folder
    
    // Enable/disable real API calls (fallback to demo data if disabled)
    USE_REAL_API: false,  // Set to true when API key is configured
    
    // Cache duration in milliseconds
    CACHE_TTL: 5 * 60 * 1000  // 5 minutes
};

// ============================================
// DATA CACHE
// ============================================
const DataCache = {
    store: new Map(),
    
    set(key, data) {
        this.store.set(key, {
            data,
            timestamp: Date.now()
        });
    },
    
    get(key) {
        const cached = this.store.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > API_CONFIG.CACHE_TTL) {
            this.store.delete(key);
            return null;
        }
        return cached.data;
    },
    
    clear() {
        this.store.clear();
    }
};

// ============================================
// API CLIENT
// ============================================
const APIClient = {
    /**
     * Fetch data from KOSIS proxy API
     */
    async fetchKOSIS(action, params = {}) {
        const cacheKey = `kosis_${action}_${JSON.stringify(params)}`;
        const cached = DataCache.get(cacheKey);
        if (cached) return cached;
        
        if (!API_CONFIG.USE_REAL_API) {
            return null; // Will fallback to demo data
        }
        
        try {
            const queryParams = new URLSearchParams({ action, ...params });
            const response = await fetch(`${API_CONFIG.KOSIS_PROXY}?${queryParams}`);
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                DataCache.set(cacheKey, result.data);
                return result.data;
            } else {
                console.warn('KOSIS API returned error:', result.error);
                return null;
            }
        } catch (error) {
            console.error('KOSIS API fetch failed:', error);
            return null;
        }
    },
    
    /**
     * Fetch hierarchy data
     */
    async fetchHierarchy(type, parent = null) {
        const cacheKey = `hierarchy_${type}_${parent}`;
        const cached = DataCache.get(cacheKey);
        if (cached) return cached;
        
        try {
            // Try API first
            const params = new URLSearchParams({ type });
            if (parent) params.append('parent', parent);
            
            const response = await fetch(`${API_CONFIG.HIERARCHY_API}?${params}`);
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    DataCache.set(cacheKey, result.data);
                    return result.data;
                }
            }
        } catch (error) {
            console.warn('Hierarchy API unavailable, using static data');
        }
        
        // Fallback to static JSON
        try {
            const response = await fetch(`${API_CONFIG.DATA_PATH}/sido_codes.json`);
            if (response.ok) {
                const data = await response.json();
                DataCache.set(cacheKey, data);
                return data;
            }
        } catch (error) {
            console.warn('Static data unavailable, using embedded data');
        }
        
        // Final fallback: embedded data
        return this.getEmbeddedSidoCodes();
    },
    
    /**
     * Embedded Sido codes (guaranteed fallback)
     */
    getEmbeddedSidoCodes() {
        return {
            sido_codes: {
                "11": { name: "서울특별시", name_en: "Seoul", type: "metropolitan", code_10digit: "1100000000" },
                "26": { name: "부산광역시", name_en: "Busan", type: "metropolitan", code_10digit: "2600000000" },
                "27": { name: "대구광역시", name_en: "Daegu", type: "metropolitan", code_10digit: "2700000000" },
                "28": { name: "인천광역시", name_en: "Incheon", type: "metropolitan", code_10digit: "2800000000" },
                "29": { name: "광주광역시", name_en: "Gwangju", type: "metropolitan", code_10digit: "2900000000" },
                "30": { name: "대전광역시", name_en: "Daejeon", type: "metropolitan", code_10digit: "3000000000" },
                "31": { name: "울산광역시", name_en: "Ulsan", type: "metropolitan", code_10digit: "3100000000" },
                "36": { name: "세종특별자치시", name_en: "Sejong", type: "special_autonomous", code_10digit: "3600000000" },
                "41": { name: "경기도", name_en: "Gyeonggi", type: "province", code_10digit: "4100000000" },
                "42": { name: "강원특별자치도", name_en: "Gangwon", type: "special_autonomous_province", code_10digit: "4200000000" },
                "43": { name: "충청북도", name_en: "Chungcheongbuk", type: "province", code_10digit: "4300000000" },
                "44": { name: "충청남도", name_en: "Chungcheongnam", type: "province", code_10digit: "4400000000" },
                "45": { name: "전북특별자치도", name_en: "Jeonbuk", type: "special_autonomous_province", code_10digit: "4500000000" },
                "46": { name: "전라남도", name_en: "Jeollanam", type: "province", code_10digit: "4600000000" },
                "47": { name: "경상북도", name_en: "Gyeongsangbuk", type: "province", code_10digit: "4700000000" },
                "48": { name: "경상남도", name_en: "Gyeongsangnam", type: "province", code_10digit: "4800000000" },
                "50": { name: "제주특별자치도", name_en: "Jeju", type: "special_autonomous_province", code_10digit: "5000000000" }
            }
        };
    },
    
    /**
     * Check API health
     */
    async checkHealth() {
        try {
            const response = await fetch(`${API_CONFIG.KOSIS_PROXY}?action=health`);
            const result = await response.json();
            return result.status === 'ok';
        } catch {
            return false;
        }
    }
};

// ============================================
// CONSTANTS
// ============================================
// 전국 참조값 (전 세대 복지 지표)
const NATIONAL_REF = {
    // 인구 기본 지표
    totalPopulation: 51700000,
    totalHouseholds: 22470000,
    
    // 세대별 인구
    children: 8530000,          // 0-18세 아동·청소년
    childrenRatio: 16.5,
    youth: 8790000,             // 19-34세 청년
    youthRatio: 17.0,
    middle: 21450000,           // 35-64세 중장년
    middleRatio: 41.5,
    elderly: 9930000,           // 65세 이상 노인
    elderlyRatio: 19.2,
    
    // 후기고령 (75세 이상)
    oldOld: 4220000,
    oldOldRatio: 42.5,  // 노인 중 비율
    
    // 1인가구
    singleHousehold: 7166000,
    singleHouseholdRatio: 31.9,
    
    // 다문화 가구
    multicultural: 385000,
    multiculturalRatio: 1.7,
    
    // 장애인
    disabled: 2670000,
    disabledRatio: 5.2,
    
    // 기초생활수급자
    basicLivelihood: 2360000,
    basicLivelihoodRatio: 4.6,
    
    // 세대별 핵심 복지 이슈
    childrenVulnerable: 340000,     // 취약계층 아동
    youthUnemployment: 7.2,         // 청년 실업률(%)
    middleCaregiver: 2100000,       // 가족돌봄자
    elderlyAlone: 1780000           // 독거노인
};

const AGE_GROUPS = [
    '0-4', '5-9', '10-14', '15-19', '20-24', '25-29', '30-34', '35-39',
    '40-44', '45-49', '50-54', '55-59', '60-64', '65-69', '70-74', '75-79', '80-84', '85+'
];

// 전 세대 클러스터 색상
const CLUSTER_COLORS = {
    children: '#60a5fa',    // 아동·청소년 (파랑)
    youth: '#34d399',       // 청년 (초록)
    middle: '#a78bfa',      // 중장년 (보라)
    productive: '#45B7D1',  // 생산가능 (레거시 호환)
    youngOld: '#fbbf24',    // 전기고령 (노랑)
    oldOld: '#f87171',      // 후기고령 (빨강)
    elderly: '#f97316'      // 노인 전체 (주황)
};

// 전 세대 복지 대상 유형 정의
const DATA_TYPES = {
    all: { name: '전체 인구', icon: '👥', unit: '명', description: '전체 인구 현황' },
    children: { name: '아동·청소년', icon: '👶', unit: '명', description: '0-18세 아동 및 청소년' },
    youth: { name: '청년', icon: '🧑', unit: '명', description: '19-34세 청년층' },
    middle: { name: '중장년', icon: '👨‍💼', unit: '명', description: '35-64세 중장년층' },
    elderly: { name: '노인', icon: '👴', unit: '명', description: '65세 이상 노인' },
    single: { name: '1인가구', icon: '🏠', unit: '가구', description: '1인가구 현황' },
    multicultural: { name: '다문화가구', icon: '🌍', unit: '가구', description: '다문화가정 현황' },
    disabled: { name: '장애인', icon: '♿', unit: '명', description: '등록 장애인' },
    basic_livelihood: { name: '기초생활수급', icon: '💰', unit: '명', description: '기초생활수급자' }
};

// ============================================
// DATA STORE
// ============================================
const DataStore = {
    regions: new Map(),
    sidoCodes: {},
    currentYear: 2025,
    currentRegion: null,
    currentDataType: 'all',  // 현재 선택된 데이터 유형 (기본: 전체 인구)
    compareMode: false,
    initialized: false,
    
    async init() {
        // Load Sido codes from API/static file
        const hierarchyData = await APIClient.fetchHierarchy('all');
        
        if (hierarchyData && hierarchyData.sido_codes) {
            this.sidoCodes = hierarchyData.sido_codes;
        } else {
            // Use embedded fallback
            this.sidoCodes = APIClient.getEmbeddedSidoCodes().sido_codes;
        }
        
        // Generate demo data for all Sido
        Object.entries(this.sidoCodes).forEach(([code, info]) => {
            const fullCode = code.padEnd(10, '0');
            this.regions.set(fullCode, this.generateRegionData(fullCode, info.name, 'sido'));
        });
        
        // Generate Sigungu for main regions
        // 서울특별시 25개 자치구
        this.generateSigungu('11', [
            '종로구', '중구', '용산구', '성동구', '광진구', '동대문구', '중랑구', '성북구',
            '강북구', '도봉구', '노원구', '은평구', '서대문구', '마포구', '양천구', '강서구',
            '구로구', '금천구', '영등포구', '동작구', '관악구', '서초구', '강남구', '송파구', '강동구'
        ]);
        // 부산광역시 16개 자치구군
        this.generateSigungu('26', [
            '중구', '서구', '동구', '영도구', '부산진구', '동래구', '남구', '북구',
            '해운대구', '사하구', '금정구', '강서구', '연제구', '수영구', '사상구', '기장군'
        ]);
        // 대구광역시 8개 자치구군
        this.generateSigungu('27', ['중구', '동구', '서구', '남구', '북구', '수성구', '달서구', '달성군']);
        // 인천광역시 10개 자치구군
        this.generateSigungu('28', [
            '중구', '동구', '미추홀구', '연수구', '남동구', '부평구', '계양구', '서구', '강화군', '옹진군'
        ]);
        // 광주광역시 5개 자치구
        this.generateSigungu('29', ['동구', '서구', '남구', '북구', '광산구']);
        // 대전광역시 5개 자치구
        this.generateSigungu('30', ['동구', '중구', '서구', '유성구', '대덕구']);
        // 울산광역시 5개 자치구군
        this.generateSigungu('31', ['중구', '남구', '동구', '북구', '울주군']);
        // 경기도 31개 시군
        this.generateSigungu('41', [
            '수원시', '성남시', '의정부시', '안양시', '부천시', '광명시', '평택시', '동두천시',
            '안산시', '고양시', '과천시', '구리시', '남양주시', '오산시', '시흥시', '군포시',
            '의왕시', '하남시', '용인시', '파주시', '이천시', '안성시', '김포시', '화성시',
            '광주시', '양주시', '포천시', '여주시', '연천군', '가평군', '양평군'
        ]);
        
        this.initialized = true;
    },
    
    generateSigungu(sidoCode, names) {
        names.forEach((name, i) => {
            const code = `${sidoCode}${String(i + 11).padStart(2, '0')}000000`;
            const type = name.includes('군') ? 'rural' : 'urban';
            this.regions.set(code, this.generateRegionData(code, name, type));
        });
    },
    
    generateRegionData(code, name, type) {
        const params = {
            sido: { basePop: 2000000 + Math.random() * 8000000, childRatio: 0.165, youthRatio: 0.17, elderlyRatio: 0.18, urbanRatio: 0.7 },
            urban: { basePop: 200000 + Math.random() * 500000, childRatio: 0.17, youthRatio: 0.19, elderlyRatio: 0.16, urbanRatio: 0.9 },
            rural: { basePop: 30000 + Math.random() * 50000, childRatio: 0.10, youthRatio: 0.10, elderlyRatio: 0.28, urbanRatio: 0.3 }
        }[type] || params.urban;
        
        const data = {};
        for (let year = 2021; year <= 2025; year++) {
            const yearIdx = year - 2021;
            const agingFactor = 1 + yearIdx * 0.02;
            const childFactor = 1 - yearIdx * 0.02;    // 아동 감소 추세
            const youthFactor = 1 - yearIdx * 0.015;   // 청년 감소 추세
            const singleFactor = 1 + yearIdx * 0.025;  // 1인가구 증가 추세
            
            const totalPop = Math.round(params.basePop * (1 - yearIdx * 0.003));
            
            // 전 세대 인구 분포 (0-18 / 19-34 / 35-64 / 65+)
            const children = Math.round(totalPop * params.childRatio * childFactor);
            const youth = Math.round(totalPop * params.youthRatio * youthFactor);
            const elderly = Math.round(totalPop * params.elderlyRatio * agingFactor);
            const middle = totalPop - children - youth - elderly;
            
            // 세부 고령층 (65-74 전기고령, 75+ 후기고령)
            const youngOld = Math.round(elderly * 0.58);  // 전기고령
            const oldOld = elderly - youngOld;             // 후기고령
            
            // 생산가능인구 (19-64세)
            const productive = youth + middle;
            
            // 가구 수 계산 (평균 가구원수 2.3명 기준)
            const totalHouseholds = Math.round(totalPop / 2.3);
            
            // 1인가구 (도시화율에 따라 차이, 연도별 증가)
            const singleRatio = (0.28 + params.urbanRatio * 0.1) * singleFactor;
            const singleHousehold = Math.round(totalHouseholds * singleRatio);
            
            // 다문화가구 (도시 지역 더 높음)
            const multiculturalRatio = type === 'urban' ? 0.02 : 0.012;
            const multicultural = Math.round(totalHouseholds * multiculturalRatio);
            
            // 독거노인 (65세 이상 중 약 18~25%)
            const elderlyAloneRatio = type === 'rural' ? 0.25 : 0.18;
            const elderlyAlone = Math.round(elderly * elderlyAloneRatio * agingFactor);
            
            // 장애인 (전체 인구의 4~6%)
            const disabledRatioVal = 0.045 + Math.random() * 0.015;
            const disabled = Math.round(totalPop * disabledRatioVal);
            
            // 기초생활수급자 (전체 인구의 3~7%, 농촌 지역 더 높음)
            const basicRatio = type === 'rural' ? (0.06 + Math.random() * 0.02) : (0.03 + Math.random() * 0.02);
            const basicLivelihood = Math.round(totalPop * basicRatio);
            
            // 세대별 취약계층
            const childrenVulnerable = Math.round(children * 0.04);    // 취약계층 아동
            const youthUnemployed = Math.round(youth * 0.072);         // 청년 실업자
            const middleCaregiver = Math.round(middle * 0.10);         // 가족돌봄자
            
            data[year] = {
                totalPopulation: totalPop,
                totalHouseholds,
                male: Math.round(totalPop * 0.49),
                female: Math.round(totalPop * 0.51),
                
                // 전 세대 인구
                children,
                childrenRatio: (children / totalPop * 100),
                youth,
                youthRatio: (youth / totalPop * 100),
                middle,
                middleRatio: (middle / totalPop * 100),
                elderly,
                elderlyRatio: (elderly / totalPop * 100),
                
                // 레거시 호환 (기존 차트용)
                productive, youngOld, oldOld,
                
                // 가구 유형
                singleHousehold,
                singleHouseholdRatio: (singleHousehold / totalHouseholds * 100),
                multicultural,
                multiculturalRatio: (multicultural / totalHouseholds * 100),
                
                // 취약계층
                elderlyAlone,
                elderlyAloneRatio: (elderlyAlone / elderly * 100),
                disabled,
                disabledRatio: (disabled / totalPop * 100),
                basicLivelihood,
                basicLivelihoodRatio: (basicLivelihood / totalPop * 100),
                
                // 세대별 취약계층
                childrenVulnerable,
                youthUnemployed,
                middleCaregiver,
                
                ageDistribution: this.generateAgeDistribution(totalPop, children, productive, youngOld, oldOld)
            };
        }
        
        return { code, name, type, data };
    },
    
    generateAgeDistribution(total, children, productive, youngOld, oldOld) {
        const weights = [0.04, 0.045, 0.05, 0.055, 0.06, 0.07, 0.075, 0.08, 
                        0.085, 0.09, 0.085, 0.08, 0.075, 0.06, 0.05, 0.035, 0.02, 0.01];
        
        const male = [], female = [];
        weights.forEach((w, i) => {
            const groupPop = Math.round(total * w * (i < 4 ? 0.8 : i > 12 ? 1.4 : 1));
            const maleRatio = i > 14 ? 0.38 : i > 12 ? 0.45 : 0.51;
            male.push(Math.round(groupPop * maleRatio));
            female.push(Math.round(groupPop * (1 - maleRatio)));
        });
        
        return { male, female };
    },
    
    getRegion(code) {
        return this.regions.get(code);
    },
    
    getSidoList() {
        return Object.entries(this.sidoCodes).map(([code, info]) => ({
            code: code.padEnd(10, '0'),
            name: info.name
        }));
    },
    
    getSigunguList(sidoCode) {
        const list = [];
        const sidoPrefix = sidoCode.substring(0, 2);
        
        this.regions.forEach((region, code) => {
            if (code.startsWith(sidoPrefix) && !code.endsWith('00000000')) {
                list.push({ code, name: region.name });
            }
        });
        return list;
    },
    
    getRankings(limit = 10) {
        const rankings = [];
        this.regions.forEach((region, code) => {
            if (code.endsWith('00000000')) return; // Skip Sido
            const d = region.data[this.currentYear];
            const elderly = d.youngOld + d.oldOld;
            const agingRatio = (elderly / d.totalPopulation) * 100;
            const score = this.calculateUrgency(d, agingRatio);
            rankings.push({ code, name: region.name, agingRatio, score, population: d.totalPopulation });
        });
        return rankings.sort((a, b) => b.score - a.score).slice(0, limit);
    },
    
    calculateUrgency(d, agingRatio) {
        let score = 0;
        if (agingRatio > 20) score += 25;
        else if (agingRatio > 14) score += 15;
        else score += agingRatio;
        
        const oldOldRatio = d.oldOld / (d.youngOld + d.oldOld) * 100;
        if (oldOldRatio > 50) score += 25;
        else if (oldOldRatio > 40) score += 15;
        else score += oldOldRatio * 0.3;
        
        const depRatio = (d.children + d.youngOld + d.oldOld) / d.productive * 100;
        if (depRatio > 60) score += 25;
        else score += depRatio * 0.3;
        
        return Math.min(100, Math.round(score));
    }
};

// ============================================
// CHART MANAGER
// ============================================
const ChartManager = {
    pyramidChart: null,
    trendChart: null,
    clusterChart: null,
    miniChart: null,
    
    initPyramid(data, compareData = null) {
        const ctx = document.getElementById('pyramidChart')?.getContext('2d');
        if (!ctx) return;
        
        if (this.pyramidChart) this.pyramidChart.destroy();
        
        const maleData = data.male.map(v => -v);
        const femaleData = data.female;
        
        // 전 세대 색상: 아동(파랑), 청년(초록), 중장년(보라), 노인(빨강/주황)
        // AGE_GROUPS: 0-4 ~ 85+ (18개 그룹)
        // 0-4(0), 5-9(1), 10-14(2), 15-19(3) → 아동·청소년 (4개)
        // 20-24(4), 25-29(5), 30-34(6) → 청년 (3개)
        // 35-39(7) ~ 60-64(12) → 중장년 (6개)
        // 65-69(13) ~ 85+(17) → 노인 (5개)
        const getAgeGroupColor = (i, isMale) => {
            const alpha = isMale ? 0.8 : 0.7;
            if (i <= 3) return `rgba(96, 165, 250, ${alpha})`;   // 아동·청소년 (파랑)
            if (i <= 6) return `rgba(52, 211, 153, ${alpha})`;   // 청년 (초록)
            if (i <= 12) return `rgba(167, 139, 250, ${alpha})`; // 중장년 (보라)
            if (i <= 14) return `rgba(251, 191, 36, ${alpha})`;  // 전기고령 (노랑)
            return `rgba(248, 113, 113, ${alpha})`;               // 후기고령 (빨강)
        };
        
        const maleColors = AGE_GROUPS.map((_, i) => getAgeGroupColor(i, true));
        const femaleColors = AGE_GROUPS.map((_, i) => getAgeGroupColor(i, false));
        
        const datasets = [
            {
                label: '남성',
                data: maleData,
                backgroundColor: maleColors,
                borderRadius: 2,
                barPercentage: 0.9
            },
            {
                label: '여성',
                data: femaleData,
                backgroundColor: femaleColors,
                borderRadius: 2,
                barPercentage: 0.9
            }
        ];
        
        if (compareData) {
            datasets.push({
                label: '전국 (남)',
                data: compareData.male.map(v => -v),
                backgroundColor: 'transparent',
                borderColor: 'rgba(255,255,255,0.5)',
                borderWidth: 2,
                borderDash: [5, 5],
                type: 'bar',
                barPercentage: 0.9
            });
            datasets.push({
                label: '전국 (여)',
                data: compareData.female,
                backgroundColor: 'transparent',
                borderColor: 'rgba(255,255,255,0.5)',
                borderWidth: 2,
                borderDash: [5, 5],
                type: 'bar',
                barPercentage: 0.9
            });
        }
        
        const maxVal = Math.max(...data.male, ...data.female) * 1.15;
        
        this.pyramidChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: AGE_GROUPS, datasets },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 800 },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        titleColor: '#f1f5f9',
                        bodyColor: '#94a3b8',
                        callbacks: {
                            label: ctx => `${ctx.dataset.label}: ${Math.abs(ctx.raw).toLocaleString()}명`
                        }
                    }
                },
                scales: {
                    x: {
                        min: -maxVal,
                        max: maxVal,
                        grid: { color: 'rgba(148, 163, 184, 0.1)' },
                        ticks: {
                            color: '#94a3b8',
                            callback: v => Math.abs(v) >= 1000 ? Math.abs(v)/1000 + 'K' : Math.abs(v)
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: {
                            color: (ctx) => ctx.index >= 13 ? '#f87171' : '#94a3b8',
                            font: { weight: ctx => ctx.index >= 13 ? 'bold' : 'normal' }
                        }
                    }
                }
            }
        });
    },
    
    initTrend(data, nationalData) {
        const ctx = document.getElementById('trendChart')?.getContext('2d');
        if (!ctx) return;
        
        if (this.trendChart) this.trendChart.destroy();
        
        this.trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.years,
                datasets: [
                    {
                        label: data.label,
                        data: data.values,
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointBackgroundColor: '#6366f1'
                    },
                    {
                        label: '전국 평균',
                        data: nationalData,
                        borderColor: '#64748b',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        tension: 0.4,
                        pointRadius: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: { color: '#94a3b8', usePointStyle: true }
                    }
                },
                scales: {
                    x: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { color: '#94a3b8' } },
                    y: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { color: '#94a3b8', callback: v => v + '%' } }
                }
            }
        });
    },
    
    initCluster(data) {
        const ctx = document.getElementById('clusterChart')?.getContext('2d');
        if (!ctx) return;
        
        if (this.clusterChart) this.clusterChart.destroy();
        
        // 데이터 유형에 따라 클러스터 구성 변경
        const dataType = DataStore.currentDataType;
        let labels, values, colors;
        
        if (dataType === 'all' || dataType === 'children' || dataType === 'youth' || 
            dataType === 'middle' || dataType === 'elderly') {
            // 전 세대 분포
            labels = ['아동·청소년 (0-18)', '청년·중장년 (19-64)', '전기고령 (65-74)', '후기고령 (75+)'];
            values = [data.children || 0, data.productive || 0, data.youngOld || 0, data.oldOld || 0];
            colors = [CLUSTER_COLORS.children, CLUSTER_COLORS.productive, CLUSTER_COLORS.youngOld, CLUSTER_COLORS.oldOld];
        } else {
            // 기본 4분류
            labels = ['아동·청소년', '생산가능', '전기고령', '후기고령'];
            values = [data.children || 0, data.productive || 0, data.youngOld || 0, data.oldOld || 0];
            colors = [CLUSTER_COLORS.children, CLUSTER_COLORS.productive, CLUSTER_COLORS.youngOld, CLUSTER_COLORS.oldOld];
        }
        
        this.clusterChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: { legend: { display: false } }
            }
        });
        
        // Update breakdown
        const total = values.reduce((a, b) => a + b, 0);
        const breakdown = document.getElementById('clusterBreakdown');
        if (breakdown && total > 0) {
            breakdown.innerHTML = labels.map((label, i) => `
                <div class="cluster-item">
                    <span class="cluster-dot" style="background:${colors[i]}"></span>
                    <div class="cluster-info">
                        <span class="cluster-name">${label}</span>
                        <span class="cluster-value">${(values[i]/total*100).toFixed(1)}%</span>
                    </div>
                </div>
            `).join('');
        }
    },
    
    initMiniTrend(values) {
        const ctx = document.getElementById('agingTrendMini')?.getContext('2d');
        if (!ctx) return;
        
        if (this.miniChart) this.miniChart.destroy();
        
        this.miniChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['2021', '2022', '2023', '2024', '2025'],
                datasets: [{
                    data: values,
                    borderColor: '#f87171',
                    backgroundColor: 'rgba(248, 113, 113, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
    }
};

// ============================================
// REPORT GENERATOR
// ============================================
const ReportGenerator = {
    generate(region, yearData) {
        const dataType = DataStore.currentDataType;
        const name = region.name;
        
        // 데이터 유형별 맞춤 보고서 생성
        switch (dataType) {
            case 'children':
                return this.generateChildrenReport(name, region, yearData);
            case 'youth':
                return this.generateYouthReport(name, region, yearData);
            case 'middle':
                return this.generateMiddleReport(name, region, yearData);
            case 'elderly':
                return this.generateElderlyReport(name, region, yearData);
            case 'single':
                return this.generateSingleReport(name, region, yearData);
            case 'multicultural':
                return this.generateMulticulturalReport(name, region, yearData);
            case 'disabled':
                return this.generateDisabledReport(name, region, yearData);
            case 'basic_livelihood':
                return this.generateBasicLivelihoodReport(name, region, yearData);
            default:
                return this.generateOverallReport(name, region, yearData);
        }
    },
    
    generateOverallReport(name, region, yearData) {
        const d = yearData;
        const firstYear = region.data[2021];
        const popChange = ((d.totalPopulation - firstYear.totalPopulation) / firstYear.totalPopulation * 100).toFixed(1);
        
        return `
            <p><strong>${name}</strong>의 ${DataStore.currentYear}년 기준 
            <span class="metric">총 인구는 ${d.totalPopulation.toLocaleString()}명</span>, 
            <span class="metric">총 가구수는 ${d.totalHouseholds?.toLocaleString() || '-'}가구</span>입니다.</p>
            
            <p><strong>세대별 인구 분포:</strong><br>
            • 아동·청소년 (0-18): <span class="metric">${d.children?.toLocaleString() || '-'}명 (${(d.childrenRatio || 0).toFixed(1)}%)</span><br>
            • 청년 (19-34): <span class="metric">${d.youth?.toLocaleString() || '-'}명 (${(d.youthRatio || 0).toFixed(1)}%)</span><br>
            • 중장년 (35-64): <span class="metric">${d.middle?.toLocaleString() || '-'}명 (${(d.middleRatio || 0).toFixed(1)}%)</span><br>
            • 노인 (65+): <span class="metric">${(d.elderly || d.youngOld + d.oldOld)?.toLocaleString() || '-'}명 (${(d.elderlyRatio || 0).toFixed(1)}%)</span></p>
            
            <p>5년간 인구 변화: <span class="${popChange < 0 ? 'warning' : ''}">${popChange}%</span></p>
            
            <p style="margin-top:12px; padding-top:12px; border-top:1px solid rgba(148,163,184,0.2);">
            <strong>📋 복지 사업 대상 현황</strong><br>
            • 1인가구: ${d.singleHousehold?.toLocaleString() || '-'}가구 (${(d.singleHouseholdRatio || 0).toFixed(1)}%)<br>
            • 장애인: ${d.disabled?.toLocaleString() || '-'}명<br>
            • 기초생활수급자: ${d.basicLivelihood?.toLocaleString() || '-'}명</p>
        `;
    },
    
    generateChildrenReport(name, region, yearData) {
        const d = yearData;
        const firstYear = region.data[2021];
        const change = ((d.children - firstYear.children) / firstYear.children * 100).toFixed(1);
        const status = d.childrenRatio < 14 ? '<span class="critical">심각한 저출산 지역</span>' :
                      d.childrenRatio < 16 ? '<span class="warning">저출산 진행 지역</span>' : '아동복지 수요 지역';
        
        return `
            <p><strong>${name}</strong>은(는) ${status}으로, 
            <span class="metric">${DataStore.currentYear}년 기준 0-18세 아동·청소년이 ${d.children?.toLocaleString() || '-'}명</span>으로 
            전체 인구의 <span class="metric">${(d.childrenRatio || 0).toFixed(1)}%</span>를 차지합니다.</p>
            
            <p>2021년 대비 <span class="${change < 0 ? 'warning' : ''}">${change}% ${change < 0 ? '감소' : '증가'}</span>하였으며,
            <span class="metric">취약계층 아동은 약 ${d.childrenVulnerable?.toLocaleString() || '-'}명</span>으로 추정됩니다.</p>
            
            <p><strong>권장 복지서비스:</strong> ${d.childrenRatio < 15 ? 
                '<span class="metric">출산장려금, 보육시설 확충, 아동돌봄서비스</span>' :
                '<span class="metric">지역아동센터, 방과후교실, 청소년활동지원</span>'}이 필요합니다.</p>
        `;
    },
    
    generateYouthReport(name, region, yearData) {
        const d = yearData;
        const firstYear = region.data[2021];
        const change = ((d.youth - firstYear.youth) / firstYear.youth * 100).toFixed(1);
        const status = d.youthRatio < 14 ? '<span class="critical">심각한 청년 유출 지역</span>' :
                      d.youthRatio < 17 ? '<span class="warning">청년인구 감소 지역</span>' : '청년정책 대상 지역';
        
        return `
            <p><strong>${name}</strong>은(는) ${status}으로, 
            <span class="metric">${DataStore.currentYear}년 기준 19-34세 청년이 ${d.youth?.toLocaleString() || '-'}명</span>으로 
            전체 인구의 <span class="metric">${(d.youthRatio || 0).toFixed(1)}%</span>를 차지합니다.</p>
            
            <p>2021년 대비 <span class="${change < 0 ? 'warning' : ''}">${change}% ${change < 0 ? '감소' : '증가'}</span>하였으며,
            <span class="metric">청년 실업자(추정)는 약 ${d.youthUnemployed?.toLocaleString() || '-'}명</span>입니다.</p>
            
            <p><strong>권장 복지서비스:</strong> ${d.youthRatio < 15 ? 
                '<span class="metric">청년 일자리 창출, 주거지원, 정착금 지원</span>' :
                '<span class="metric">청년창업지원, 취업역량강화, 문화활동 지원</span>'}이 필요합니다.</p>
        `;
    },
    
    generateMiddleReport(name, region, yearData) {
        const d = yearData;
        const caregiverRatio = d.middleCaregiver ? (d.middleCaregiver / d.middle * 100).toFixed(1) : '-';
        
        return `
            <p><strong>${name}</strong>의 ${DataStore.currentYear}년 기준 
            <span class="metric">35-64세 중장년층은 ${d.middle?.toLocaleString() || '-'}명</span>으로 
            전체 인구의 <span class="metric">${(d.middleRatio || 0).toFixed(1)}%</span>를 차지합니다.</p>
            
            <p>이 중 <span class="metric">가족돌봄자(추정)는 약 ${d.middleCaregiver?.toLocaleString() || '-'}명 (${caregiverRatio}%)</span>으로,
            돌봄 부담으로 인한 경력단절, 번아웃 위험에 노출되어 있습니다.</p>
            
            <p><strong>권장 복지서비스:</strong> 
            <span class="metric">가족돌봄휴가 지원, 중장년 일자리 연계, 건강검진 확대, 노후준비 교육</span>이 필요합니다.</p>
        `;
    },
    
    generateElderlyReport(name, region, yearData) {
        const d = yearData;
        const elderly = d.elderly || (d.youngOld + d.oldOld);
        const agingRatio = d.elderlyRatio || (elderly / d.totalPopulation * 100);
        const oldOldRatio = (d.oldOld / elderly * 100).toFixed(1);
        const firstYear = region.data[2021];
        const firstElderly = firstYear.elderly || (firstYear.youngOld + firstYear.oldOld);
        const change = ((elderly - firstElderly) / firstElderly * 100).toFixed(1);
        
        const status = agingRatio >= 20 ? '<span class="critical">초고령사회에 진입한</span>' :
                      agingRatio >= 14 ? '<span class="warning">고령사회 단계인</span>' : '고령화가 진행 중인';
        
        return `
            <p><strong>${name}</strong>은(는) ${status} 지역으로, 
            <span class="metric">${DataStore.currentYear}년 기준 65세 이상 노인이 ${elderly.toLocaleString()}명</span>으로 
            전체 인구의 <span class="metric">${agingRatio.toFixed(1)}%</span>를 차지합니다.</p>
            
            <p>75세 이상 후기고령인구가 고령층의 <span class="metric">${oldOldRatio}%</span>를 차지하며,
            <span class="metric">독거노인은 ${d.elderlyAlone?.toLocaleString() || '-'}명</span>입니다.
            2021년 대비 <span class="warning">${change}% 증가</span>하였습니다.</p>
            
            <p><strong>권장 복지서비스:</strong> ${oldOldRatio > 45 ? 
                '<span class="metric">재가돌봄서비스, 치매전문돌봄, 장기요양 확충</span>' :
                '<span class="metric">노인일자리, 사회참여 프로그램, 건강증진사업</span>'}이 필요합니다.</p>
        `;
    },
    
    generateSingleReport(name, region, yearData) {
        const d = yearData;
        const firstYear = region.data[2021];
        const change = ((d.singleHousehold - firstYear.singleHousehold) / firstYear.singleHousehold * 100).toFixed(1);
        
        return `
            <p><strong>${name}</strong>의 ${DataStore.currentYear}년 기준 
            <span class="metric">1인가구는 ${d.singleHousehold?.toLocaleString() || '-'}가구</span>로 
            전체 가구의 <span class="metric">${(d.singleHouseholdRatio || 0).toFixed(1)}%</span>를 차지합니다.</p>
            
            <p>2021년 대비 <span class="warning">${change}% 증가</span>하였으며,
            청년 1인가구, 중년 1인가구, 노인 1인가구 등 다양한 유형이 있습니다.</p>
            
            <p><strong>권장 복지서비스:</strong> 
            <span class="metric">고독사 예방 안심서비스, 1인가구 네트워크 지원, 긴급돌봄서비스</span>가 필요합니다.</p>
        `;
    },
    
    generateMulticulturalReport(name, region, yearData) {
        const d = yearData;
        
        return `
            <p><strong>${name}</strong>의 ${DataStore.currentYear}년 기준 
            <span class="metric">다문화가구는 ${d.multicultural?.toLocaleString() || '-'}가구</span>로 
            전체 가구의 <span class="metric">${(d.multiculturalRatio || 0).toFixed(1)}%</span>를 차지합니다.</p>
            
            <p>다문화가정 구성원은 결혼이민자, 귀화자, 다문화가정 자녀 등으로 구성되며,
            언어, 문화 적응 및 사회통합 지원이 필요합니다.</p>
            
            <p><strong>권장 복지서비스:</strong> 
            <span class="metric">한국어교육, 다문화가족지원센터, 이중언어 환경조성, 취업연계</span>가 필요합니다.</p>
        `;
    },
    
    generateDisabledReport(name, region, yearData) {
        const d = yearData;
        const natDiff = ((d.disabledRatio || 0) - NATIONAL_REF.disabledRatio).toFixed(1);
        
        return `
            <p><strong>${name}</strong>의 ${DataStore.currentYear}년 기준 
            <span class="metric">등록 장애인은 ${d.disabled?.toLocaleString() || '-'}명</span>으로 
            전체 인구의 <span class="metric">${(d.disabledRatio || 0).toFixed(1)}%</span>입니다.</p>
            
            <p>전국 평균(${NATIONAL_REF.disabledRatio}%) 대비 
            <span class="${natDiff > 0 ? 'warning' : ''}">${natDiff > 0 ? '+' : ''}${natDiff}%p</span>이며,
            장애유형별 맞춤 지원이 필요합니다.</p>
            
            <p><strong>권장 복지서비스:</strong> 
            <span class="metric">활동지원서비스, 장애인일자리, 이동지원, 주거편의개선</span>이 필요합니다.</p>
        `;
    },
    
    generateBasicLivelihoodReport(name, region, yearData) {
        const d = yearData;
        const natDiff = ((d.basicLivelihoodRatio || 0) - NATIONAL_REF.basicLivelihoodRatio).toFixed(1);
        
        return `
            <p><strong>${name}</strong>의 ${DataStore.currentYear}년 기준 
            <span class="metric">기초생활수급자는 ${d.basicLivelihood?.toLocaleString() || '-'}명</span>으로 
            전체 인구의 <span class="metric">${(d.basicLivelihoodRatio || 0).toFixed(1)}%</span>입니다.</p>
            
            <p>전국 평균(${NATIONAL_REF.basicLivelihoodRatio}%) 대비 
            <span class="${natDiff > 0 ? 'warning' : ''}">${natDiff > 0 ? '+' : ''}${natDiff}%p</span>이며,
            빈곤 탈출을 위한 종합적 지원이 필요합니다.</p>
            
            <p><strong>권장 복지서비스:</strong> 
            <span class="metric">자활사업 연계, 긴급복지지원, 교육비·의료비 지원, 주거지원</span>이 필요합니다.</p>
        `;
    }
};

// ============================================
// UI CONTROLLER
// ============================================
const UI = {
    async init() {
        this.showLoading();
        
        // Initialize data store
        await DataStore.init();
        
        this.populateSido();
        this.bindEvents();
        this.loadNationalView();
        
        // Check API availability
        const apiAvailable = await APIClient.checkHealth();
        if (apiAvailable) {
            console.log('SODAPOP API connected');
            API_CONFIG.USE_REAL_API = true;
        } else {
            console.log('Using demo data (API not configured)');
        }
        
        this.hideLoading();
    },
    
    populateSido() {
        const select = document.getElementById('sidoSelect');
        if (!select) return;
        
        const sidoList = DataStore.getSidoList();
        sidoList.forEach(sido => {
            const option = document.createElement('option');
            option.value = sido.code;
            option.textContent = sido.name;
            select.appendChild(option);
        });
    },
    
    bindEvents() {
        // Sido change
        const sidoSelect = document.getElementById('sidoSelect');
        if (sidoSelect) {
            sidoSelect.addEventListener('change', e => this.onSidoChange(e.target.value));
        }
        
        // Sigungu change
        const sigunguSelect = document.getElementById('sigunguSelect');
        if (sigunguSelect) {
            sigunguSelect.addEventListener('change', e => this.onSigunguChange(e.target.value));
        }
        
        // Year change
        const yearSelect = document.getElementById('yearSelect');
        if (yearSelect) {
            yearSelect.addEventListener('change', e => {
                DataStore.currentYear = parseInt(e.target.value);
                this.refresh();
            });
        }
        
        // Data type change (검색 대체)
        const dataTypeSelect = document.getElementById('dataTypeSelect');
        if (dataTypeSelect) {
            dataTypeSelect.addEventListener('change', e => {
                DataStore.currentDataType = e.target.value;
                this.refresh();
                this.showToast(`${DATA_TYPES[e.target.value].name} 데이터로 전환`);
            });
        }
        
        // Trend metric change
        const trendMetric = document.getElementById('trendMetric');
        if (trendMetric) {
            trendMetric.addEventListener('change', e => this.updateTrendChart(e.target.value));
        }
        
        // Engine button
        const runBtn = document.getElementById('runEngineBtn');
        if (runBtn) {
            runBtn.addEventListener('click', () => {
                this.showLoading();
                setTimeout(() => {
                    this.refresh();
                    this.hideLoading();
                    this.showToast('데이터 분석 완료');
                }, 800);
            });
        }
        
        // Toggle compare
        const toggleCompare = document.getElementById('toggleCompare');
        if (toggleCompare) {
            toggleCompare.addEventListener('click', () => {
                DataStore.compareMode = !DataStore.compareMode;
                const badge = document.getElementById('compareStatus');
                if (badge) {
                    badge.textContent = DataStore.compareMode ? '비교 모드 ON' : '비교 모드 OFF';
                    badge.classList.toggle('active', DataStore.compareMode);
                }
                const compareLegend = document.getElementById('compareLegend');
                if (compareLegend) {
                    compareLegend.style.display = DataStore.compareMode ? 'flex' : 'none';
                }
                this.updatePyramid();
            });
        }
        
        // Generate report
        const generateBtn = document.getElementById('generateReportBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateReport());
        }
        
        // Copy report
        const copyBtn = document.getElementById('copyReportBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyReport());
        }
        
        // Ranking scope
        const rankingScope = document.getElementById('rankingScope');
        if (rankingScope) {
            rankingScope.addEventListener('change', () => this.updateRankings());
        }
    },
    
    onSidoChange(code) {
        const sigunguSelect = document.getElementById('sigunguSelect');
        const dongSelect = document.getElementById('dongSelect');
        
        if (sigunguSelect) {
            sigunguSelect.innerHTML = '<option value="">시/군/구 선택</option>';
        }
        if (dongSelect) {
            dongSelect.disabled = true;
        }
        
        if (!code) {
            if (sigunguSelect) sigunguSelect.disabled = true;
            this.loadNationalView();
            return;
        }
        
        const sigunguList = DataStore.getSigunguList(code);
        sigunguList.forEach(sg => {
            const opt = document.createElement('option');
            opt.value = sg.code;
            opt.textContent = sg.name;
            sigunguSelect.appendChild(opt);
        });
        if (sigunguSelect) sigunguSelect.disabled = false;
        
        // Load Sido data
        const region = DataStore.getRegion(code);
        if (region) {
            DataStore.currentRegion = region;
            this.updateDisplay(region);
            this.updateBreadcrumb([region.name]);
        }
    },
    
    onSigunguChange(code) {
        if (!code) return;
        
        let region = DataStore.getRegion(code);
        if (!region) {
            // Generate if not exists
            const sidoCode = code.substring(0, 2);
            const list = DataStore.getSigunguList(sidoCode.padEnd(10, '0'));
            const info = list.find(s => s.code === code);
            if (info) {
                region = DataStore.generateRegionData(code, info.name, 'urban');
                DataStore.regions.set(code, region);
            }
        }
        
        if (region) {
            DataStore.currentRegion = region;
            this.updateDisplay(region);
            const sidoInfo = DataStore.sidoCodes[code.substring(0, 2)];
            const sidoName = sidoInfo ? sidoInfo.name : '시/도';
            this.updateBreadcrumb([sidoName, region.name]);
        }
    },
    
    loadNationalView() {
        DataStore.currentRegion = null;
        
        // Aggregate national data - 전 세대 데이터
        let total = 0, children = 0, youth = 0, middle = 0, elderly = 0;
        let productive = 0, youngOld = 0, oldOld = 0;
        let totalHouseholds = 0, singleHousehold = 0, multicultural = 0;
        let elderlyAlone = 0, disabled = 0, basicLivelihood = 0;
        let childrenVulnerable = 0, youthUnemployed = 0, middleCaregiver = 0;
        
        DataStore.getSidoList().forEach(sido => {
            const region = DataStore.getRegion(sido.code);
            if (region) {
                const d = region.data[DataStore.currentYear];
                total += d.totalPopulation;
                children += d.children || 0;
                youth += d.youth || 0;
                middle += d.middle || 0;
                elderly += d.elderly || 0;
                productive += d.productive || 0;
                youngOld += d.youngOld || 0;
                oldOld += d.oldOld || 0;
                totalHouseholds += d.totalHouseholds || 0;
                singleHousehold += d.singleHousehold || 0;
                multicultural += d.multicultural || 0;
                elderlyAlone += d.elderlyAlone || 0;
                disabled += d.disabled || 0;
                basicLivelihood += d.basicLivelihood || 0;
                childrenVulnerable += d.childrenVulnerable || 0;
                youthUnemployed += d.youthUnemployed || 0;
                middleCaregiver += d.middleCaregiver || 0;
            }
        });
        
        const dataForStats = {
            totalPopulation: total,
            totalHouseholds,
            children,
            childrenRatio: (children / total * 100),
            youth,
            youthRatio: (youth / total * 100),
            middle,
            middleRatio: (middle / total * 100),
            elderly,
            elderlyRatio: (elderly / total * 100),
            productive, youngOld, oldOld,
            urgency: 50,
            singleHousehold,
            singleHouseholdRatio: totalHouseholds > 0 ? (singleHousehold / totalHouseholds * 100) : 0,
            multicultural,
            multiculturalRatio: totalHouseholds > 0 ? (multicultural / totalHouseholds * 100) : 0,
            elderlyAlone,
            elderlyAloneRatio: elderly > 0 ? (elderlyAlone / elderly * 100) : 0,
            disabled,
            disabledRatio: (disabled / total * 100),
            basicLivelihood,
            basicLivelihoodRatio: (basicLivelihood / total * 100),
            childrenVulnerable,
            youthUnemployed,
            middleCaregiver
        };
        
        this.updateStats(dataForStats);
        
        // National pyramid
        const nationalDist = this.generateNationalDistribution(total);
        ChartManager.initPyramid(nationalDist);
        
        // 전 세대 클러스터 차트 (아동/청년/중장년/노인)
        ChartManager.initCluster({ 
            children, 
            productive: youth + middle,  // 청년+중장년 
            youngOld, 
            oldOld 
        });
        
        this.updateTrendChart('totalPop', true);
        this.updateTargetCard(dataForStats);
        
        this.updateBreadcrumb(['전국']);
        this.updateRankings();
    },
    
    generateNationalDistribution(total) {
        const weights = [0.035, 0.04, 0.045, 0.05, 0.055, 0.065, 0.07, 0.075, 
                        0.08, 0.085, 0.085, 0.08, 0.075, 0.065, 0.055, 0.04, 0.025, 0.015];
        const male = [], female = [];
        weights.forEach((w, i) => {
            const pop = Math.round(total * w);
            const mRatio = i > 14 ? 0.38 : i > 12 ? 0.45 : 0.51;
            male.push(Math.round(pop * mRatio));
            female.push(Math.round(pop * (1 - mRatio)));
        });
        return { male, female };
    },
    
    updateDisplay(region) {
        const d = region.data[DataStore.currentYear];
        const elderly = d.elderly || (d.youngOld + d.oldOld);
        const elderlyRatio = d.elderlyRatio || (elderly / d.totalPopulation * 100);
        const urgency = DataStore.calculateUrgency(d, elderlyRatio);
        
        // 전 세대 데이터를 Stats에 전달
        const dataForStats = { 
            totalPopulation: d.totalPopulation, 
            totalHouseholds: d.totalHouseholds,
            
            // 전 세대 인구
            children: d.children,
            childrenRatio: d.childrenRatio || (d.children / d.totalPopulation * 100),
            youth: d.youth,
            youthRatio: d.youthRatio || (d.youth / d.totalPopulation * 100),
            middle: d.middle,
            middleRatio: d.middleRatio || (d.middle / d.totalPopulation * 100),
            elderly,
            elderlyRatio,
            
            // 레거시
            productive: d.productive,
            youngOld: d.youngOld,
            oldOld: d.oldOld,
            
            urgency,
            
            // 가구 유형
            singleHousehold: d.singleHousehold,
            singleHouseholdRatio: d.singleHouseholdRatio,
            multicultural: d.multicultural,
            multiculturalRatio: d.multiculturalRatio,
            
            // 취약계층
            elderlyAlone: d.elderlyAlone,
            elderlyAloneRatio: d.elderlyAloneRatio,
            disabled: d.disabled,
            disabledRatio: d.disabledRatio,
            basicLivelihood: d.basicLivelihood,
            basicLivelihoodRatio: d.basicLivelihoodRatio,
            
            // 세대별 취약계층
            childrenVulnerable: d.childrenVulnerable,
            youthUnemployed: d.youthUnemployed,
            middleCaregiver: d.middleCaregiver
        };
        
        this.updateStats(dataForStats);
        this.updatePyramid();
        
        // 전 세대 클러스터 차트
        ChartManager.initCluster({
            children: d.children,
            productive: d.youth + d.middle,
            youngOld: d.youngOld,
            oldOld: d.oldOld
        });
        
        // 데이터 유형에 따른 추세 차트
        const metricMap = {
            all: 'totalPop',
            children: 'childRatio',
            youth: 'youthRatio',
            middle: 'totalPop',
            elderly: 'elderlyRatio',
            single: 'singleRatio',
            multicultural: 'totalPop',
            disabled: 'totalPop',
            basic_livelihood: 'totalPop'
        };
        this.updateTrendChart(metricMap[DataStore.currentDataType] || 'totalPop');
        
        // Target card 업데이트
        this.updateTargetCard(dataForStats);
        
        this.updateRankings();
    },
    
    updateStats(data) {
        const dataType = DataStore.currentDataType;
        
        // 긴급도 점수는 항상 표시
        const urgencyScore = document.getElementById('urgencyScore');
        if (urgencyScore) urgencyScore.textContent = data.urgency || 50;
        
        const urgencyMeter = document.getElementById('urgencyMeter');
        if (urgencyMeter) urgencyMeter.style.width = (data.urgency || 50) + '%';
        
        // 데이터 유형별 Stats 카드 업데이트
        const statsConfig = this.getStatsConfig(dataType, data);
        
        // Stat 1
        const stat1Icon = document.getElementById('stat1Icon');
        const stat1Value = document.getElementById('stat1Value');
        const stat1Label = document.getElementById('stat1Label');
        if (stat1Icon) stat1Icon.textContent = statsConfig.stat1.icon;
        if (stat1Value) stat1Value.textContent = statsConfig.stat1.value;
        if (stat1Label) stat1Label.textContent = statsConfig.stat1.label;
        
        // Stat 2
        const stat2Icon = document.getElementById('stat2Icon');
        const stat2Value = document.getElementById('stat2Value');
        const stat2Label = document.getElementById('stat2Label');
        if (stat2Icon) stat2Icon.textContent = statsConfig.stat2.icon;
        if (stat2Value) stat2Value.textContent = statsConfig.stat2.value;
        if (stat2Label) stat2Label.textContent = statsConfig.stat2.label;
        
        // Stat 3
        const stat3Icon = document.getElementById('stat3Icon');
        const stat3Value = document.getElementById('stat3Value');
        const stat3Label = document.getElementById('stat3Label');
        const stat3Badge = document.getElementById('stat3Badge');
        if (stat3Icon) stat3Icon.textContent = statsConfig.stat3.icon;
        if (stat3Value) stat3Value.textContent = statsConfig.stat3.value;
        if (stat3Label) stat3Label.textContent = statsConfig.stat3.label;
        if (stat3Badge) {
            stat3Badge.textContent = statsConfig.stat3.badge;
            stat3Badge.className = 'stat-badge ' + (statsConfig.stat3.badgeClass || '');
        }
    },
    
    getStatsConfig(dataType, data) {
        switch (dataType) {
            case 'children':
                return {
                    stat1: { icon: '👶', value: data.children?.toLocaleString() || '-', label: '아동·청소년 (0-18)' },
                    stat2: { icon: '⚠️', value: data.childrenVulnerable?.toLocaleString() || '-', label: '취약계층 아동' },
                    stat3: { 
                        icon: '📊', 
                        value: (data.childrenRatio?.toFixed(1) || '-') + '%', 
                        label: '아동 비율',
                        badge: data.childrenRatio >= 18 ? '양호' : data.childrenRatio >= 14 ? '저출산' : '심각',
                        badgeClass: data.childrenRatio < 14 ? 'critical' : ''
                    }
                };
            case 'youth':
                return {
                    stat1: { icon: '🧑', value: data.youth?.toLocaleString() || '-', label: '청년 (19-34)' },
                    stat2: { icon: '💼', value: data.youthUnemployed?.toLocaleString() || '-', label: '청년 실업자(추정)' },
                    stat3: { 
                        icon: '📊', 
                        value: (data.youthRatio?.toFixed(1) || '-') + '%', 
                        label: '청년 비율',
                        badge: data.youthRatio >= 18 ? '양호' : data.youthRatio >= 15 ? '감소중' : '유출심각',
                        badgeClass: data.youthRatio < 15 ? 'critical' : ''
                    }
                };
            case 'middle':
                return {
                    stat1: { icon: '👨‍💼', value: data.middle?.toLocaleString() || '-', label: '중장년 (35-64)' },
                    stat2: { icon: '🏠', value: data.middleCaregiver?.toLocaleString() || '-', label: '가족돌봄자(추정)' },
                    stat3: { 
                        icon: '📊', 
                        value: (data.middleRatio?.toFixed(1) || '-') + '%', 
                        label: '중장년 비율',
                        badge: data.middleRatio >= 45 ? '높음' : data.middleRatio >= 38 ? '보통' : '낮음',
                        badgeClass: ''
                    }
                };
            case 'elderly':
                return {
                    stat1: { icon: '👴', value: data.elderly?.toLocaleString() || '-', label: '노인 (65+)' },
                    stat2: { icon: '🏠', value: data.elderlyAlone?.toLocaleString() || '-', label: '독거노인' },
                    stat3: { 
                        icon: '📈', 
                        value: (data.elderlyRatio?.toFixed(1) || '-') + '%', 
                        label: '고령화율',
                        badge: data.elderlyRatio >= 20 ? '초고령' : data.elderlyRatio >= 14 ? '고령사회' : '고령화',
                        badgeClass: data.elderlyRatio >= 20 ? 'critical' : ''
                    }
                };
            case 'single':
                return {
                    stat1: { icon: '🏠', value: data.singleHousehold?.toLocaleString() || '-', label: '1인가구 수' },
                    stat2: { icon: '👥', value: data.totalHouseholds?.toLocaleString() || '-', label: '총 가구수' },
                    stat3: { 
                        icon: '📊', 
                        value: (data.singleHouseholdRatio?.toFixed(1) || '-') + '%', 
                        label: '1인가구 비율',
                        badge: data.singleHouseholdRatio >= 35 ? '높음' : data.singleHouseholdRatio >= 30 ? '보통' : '낮음',
                        badgeClass: data.singleHouseholdRatio >= 35 ? 'critical' : ''
                    }
                };
            case 'multicultural':
                return {
                    stat1: { icon: '🌍', value: data.multicultural?.toLocaleString() || '-', label: '다문화가구' },
                    stat2: { icon: '👥', value: data.totalHouseholds?.toLocaleString() || '-', label: '총 가구수' },
                    stat3: { 
                        icon: '📊', 
                        value: (data.multiculturalRatio?.toFixed(1) || '-') + '%', 
                        label: '다문화 비율',
                        badge: data.multiculturalRatio >= 2 ? '높음' : '보통',
                        badgeClass: ''
                    }
                };
            case 'disabled':
                return {
                    stat1: { icon: '♿', value: data.disabled?.toLocaleString() || '-', label: '등록 장애인' },
                    stat2: { icon: '👥', value: data.totalPopulation?.toLocaleString() || '-', label: '총 인구' },
                    stat3: { 
                        icon: '📊', 
                        value: (data.disabledRatio?.toFixed(1) || '-') + '%', 
                        label: '장애인 비율',
                        badge: data.disabledRatio >= 6 ? '높음' : '보통',
                        badgeClass: data.disabledRatio >= 6 ? 'critical' : ''
                    }
                };
            case 'basic_livelihood':
                return {
                    stat1: { icon: '💰', value: data.basicLivelihood?.toLocaleString() || '-', label: '수급자 수' },
                    stat2: { icon: '👥', value: data.totalPopulation?.toLocaleString() || '-', label: '총 인구' },
                    stat3: { 
                        icon: '📊', 
                        value: (data.basicLivelihoodRatio?.toFixed(1) || '-') + '%', 
                        label: '수급률',
                        badge: data.basicLivelihoodRatio >= 6 ? '높음' : data.basicLivelihoodRatio >= 4 ? '보통' : '낮음',
                        badgeClass: data.basicLivelihoodRatio >= 6 ? 'critical' : ''
                    }
                };
            case 'all':
            default:
                // 전체 인구 현황 (전 세대 분포 요약)
                return {
                    stat1: { icon: '👥', value: data.totalPopulation?.toLocaleString() || '-', label: '총 인구' },
                    stat2: { icon: '🏠', value: data.totalHouseholds?.toLocaleString() || '-', label: '총 가구수' },
                    stat3: { 
                        icon: '📊', 
                        value: `${(data.childrenRatio || 0).toFixed(0)}/${(data.youthRatio || 0).toFixed(0)}/${(data.middleRatio || 0).toFixed(0)}/${(data.elderlyRatio || 0).toFixed(0)}`, 
                        label: '세대 비율 (아/청/중/노)',
                        badge: '전 세대 분석',
                        badgeClass: 'primary'
                    }
                };
        }
    },
    
    updatePyramid() {
        const region = DataStore.currentRegion;
        const year = DataStore.currentYear;
        
        let data;
        if (region) {
            data = region.data[year].ageDistribution;
        } else {
            let total = 0;
            DataStore.getSidoList().forEach(sido => {
                const r = DataStore.getRegion(sido.code);
                if (r) total += r.data[year].totalPopulation;
            });
            data = this.generateNationalDistribution(total);
        }
        
        const compareData = DataStore.compareMode ? this.generateNationalDistribution(NATIONAL_REF.totalPopulation) : null;
        ChartManager.initPyramid(data, compareData);
    },
    
    updateTrendChart(metric = 'totalPop', isNational = false) {
        const region = DataStore.currentRegion;
        
        // 전 세대 추세 데이터 (전국 참조값)
        const nationalValues = {
            totalPop: [51800, 51750, 51700, 51650, 51600].map(v => v / 1000),  // 천명 단위
            childRatio: [17.8, 17.3, 16.8, 16.5, 16.2],
            youthRatio: [18.2, 17.8, 17.4, 17.1, 16.8],
            elderlyRatio: [16.5, 17.4, 18.2, 18.8, 19.2],
            singleRatio: [29.5, 30.3, 31.0, 31.5, 31.9],
            dependency: [40.2, 41.5, 42.8, 44.0, 45.0]
        }[metric] || [16.5, 17.4, 18.2, 18.8, 19.2];
        
        const metricLabels = {
            totalPop: '총인구 (백만명)',
            childRatio: '아동·청소년 비율',
            youthRatio: '청년 비율',
            elderlyRatio: '노인 비율',
            singleRatio: '1인가구 비율',
            dependency: '부양비'
        };
        
        let values, label;
        if (isNational || !region) {
            values = nationalValues;
            label = '전국';
        } else {
            values = Object.values(region.data).map(d => {
                switch (metric) {
                    case 'totalPop': return d.totalPopulation / 1000000;  // 백만명 단위
                    case 'childRatio': return d.childrenRatio || (d.children / d.totalPopulation * 100);
                    case 'youthRatio': return d.youthRatio || (d.youth / d.totalPopulation * 100);
                    case 'elderlyRatio': return d.elderlyRatio || ((d.youngOld + d.oldOld) / d.totalPopulation * 100);
                    case 'singleRatio': return d.singleHouseholdRatio || 0;
                    case 'dependency': return ((d.children + d.youngOld + d.oldOld) / d.productive * 100);
                    default: return d.elderlyRatio || 0;
                }
            });
            label = region.name;
        }
        
        ChartManager.initTrend({ 
            years: [2021, 2022, 2023, 2024, 2025], 
            values, 
            label: `${label} ${metricLabels[metric] || ''}` 
        }, nationalValues);
        
        // Update summary
        const change = values[4] - values[0];
        const trendChange = document.getElementById('trendChange');
        if (trendChange) {
            const isPopMetric = metric === 'totalPop';
            const unit = isPopMetric ? '만명' : '%p';
            trendChange.textContent = (change >= 0 ? '+' : '') + change.toFixed(isPopMetric ? 2 : 1) + unit;
            // 아동/청년 감소는 빨간색, 노인 증가도 빨간색
            const isNegativeTrend = (metric === 'childRatio' || metric === 'youthRatio') ? change < 0 : change > 0;
            trendChange.style.color = isNegativeTrend ? '#f87171' : '#34d399';
        }
        
        const cagr = values[0] !== 0 ? (Math.pow(values[4] / values[0], 0.25) - 1) * 100 : 0;
        const trendCAGR = document.getElementById('trendCAGR');
        if (trendCAGR) trendCAGR.textContent = (cagr >= 0 ? '+' : '') + cagr.toFixed(1) + '%';
    },
    
    updateTargetCard(data) {
        const dataType = DataStore.currentDataType;
        const config = DATA_TYPES[dataType] || DATA_TYPES.all;
        
        const targetLabel = document.getElementById('targetLabel');
        const targetValue = document.getElementById('targetValue');
        const targetTrendBadge = document.getElementById('targetTrendBadge');
        const targetCard = document.getElementById('targetCard');
        
        let value, ratio, badge, badgeClass;
        
        switch (dataType) {
            case 'children':
                value = data.children;
                ratio = data.childrenRatio;
                badge = ratio < 15 ? '▼ 저출산 위기' : '아동복지 대상';
                badgeClass = ratio < 15 ? 'danger' : 'info';
                break;
            case 'youth':
                value = data.youth;
                ratio = data.youthRatio;
                badge = ratio < 16 ? '▼ 청년 유출' : '청년정책 대상';
                badgeClass = ratio < 16 ? 'danger' : 'info';
                break;
            case 'middle':
                value = data.middle;
                ratio = data.middleRatio;
                badge = '핵심생산인구';
                badgeClass = 'success';
                break;
            case 'elderly':
                value = data.elderly;
                ratio = data.elderlyRatio;
                badge = ratio >= 20 ? '▲ 초고령사회' : ratio >= 14 ? '고령사회' : '고령화 진행';
                badgeClass = ratio >= 20 ? 'danger' : 'warning';
                break;
            case 'single':
                value = data.singleHousehold;
                ratio = data.singleHouseholdRatio;
                badge = ratio >= 35 ? '▲ 1인가구 급증' : '1인가구 증가';
                badgeClass = ratio >= 35 ? 'danger' : 'warning';
                break;
            case 'multicultural':
                value = data.multicultural;
                ratio = data.multiculturalRatio;
                badge = '다문화정책 대상';
                badgeClass = 'info';
                break;
            case 'disabled':
                value = data.disabled;
                ratio = data.disabledRatio;
                badge = '장애인복지 대상';
                badgeClass = 'info';
                break;
            case 'basic_livelihood':
                value = data.basicLivelihood;
                ratio = data.basicLivelihoodRatio;
                badge = ratio >= 5 ? '▲ 높은 수급률' : '사회보장 대상';
                badgeClass = ratio >= 5 ? 'danger' : 'info';
                break;
            default:
                value = data.totalPopulation;
                ratio = null;
                badge = '전국 기준';
                badgeClass = 'primary';
        }
        
        if (targetLabel) targetLabel.textContent = `${config.name} 현황`;
        if (targetValue) targetValue.textContent = value?.toLocaleString() + (ratio ? ` (${ratio.toFixed(1)}%)` : '');
        if (targetTrendBadge) {
            targetTrendBadge.textContent = badge;
            targetTrendBadge.className = `trend-badge ${badgeClass}`;
        }
        if (targetCard) {
            targetCard.className = `ag-card highlight-${badgeClass === 'danger' ? 'danger' : badgeClass === 'warning' ? 'warning' : 'primary'}`;
        }
        
        // Mini trend chart
        this.updateMiniTrendForType(dataType);
    },
    
    updateMiniTrendForType(dataType) {
        const region = DataStore.currentRegion;
        let values;
        
        if (region) {
            values = Object.values(region.data).map(d => {
                switch (dataType) {
                    case 'children': return d.childrenRatio || 0;
                    case 'youth': return d.youthRatio || 0;
                    case 'middle': return d.middleRatio || 0;
                    case 'elderly': return d.elderlyRatio || 0;
                    case 'single': return d.singleHouseholdRatio || 0;
                    case 'multicultural': return d.multiculturalRatio || 0;
                    case 'disabled': return d.disabledRatio || 0;
                    case 'basic_livelihood': return d.basicLivelihoodRatio || 0;
                    default: return d.totalPopulation / 1000000;  // 백만명 단위
                }
            });
        } else {
            // 전국 추세
            values = {
                children: [17.8, 17.3, 16.8, 16.5, 16.2],
                youth: [18.2, 17.8, 17.4, 17.1, 16.8],
                middle: [41.0, 41.2, 41.4, 41.5, 41.5],
                elderly: [16.5, 17.4, 18.2, 18.8, 19.2],
                single: [29.5, 30.3, 31.0, 31.5, 31.9],
                multicultural: [1.5, 1.6, 1.6, 1.7, 1.7],
                disabled: [5.0, 5.1, 5.1, 5.2, 5.2],
                basic_livelihood: [4.4, 4.5, 4.5, 4.6, 4.6],
                all: [51.8, 51.75, 51.7, 51.65, 51.6]
            }[dataType] || [51.8, 51.75, 51.7, 51.65, 51.6];
        }
        
        // Mini chart 색상 결정
        const ctx = document.getElementById('targetTrendMini')?.getContext('2d');
        if (!ctx) return;
        
        // 감소 추세면 빨간색 (아동, 청년), 증가 추세면 주황색 (노인, 1인가구)
        const isDecreasing = values[4] < values[0];
        const concerningTypes = ['children', 'youth', 'elderly', 'single', 'basic_livelihood'];
        const isConcerning = concerningTypes.includes(dataType);
        const color = isConcerning ? (dataType === 'children' || dataType === 'youth' ? '#60a5fa' : '#f87171') : '#34d399';
        
        if (ChartManager.miniChart) ChartManager.miniChart.destroy();
        
        ChartManager.miniChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['2021', '2022', '2023', '2024', '2025'],
                datasets: [{
                    data: values,
                    borderColor: color,
                    backgroundColor: color.replace(')', ', 0.1)').replace('rgb', 'rgba'),
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
    },
    
    updateBreadcrumb(path) {
        const container = document.getElementById('breadcrumb');
        if (!container) return;
        
        container.innerHTML = path.map((name, i) => 
            `<span class="breadcrumb-item ${i === path.length - 1 ? 'active' : ''}">${name}</span>`
        ).join('');
    },
    
    updateRankings() {
        const rankings = DataStore.getRankings(8);
        const container = document.getElementById('rankingList');
        if (!container) return;
        
        container.innerHTML = rankings.map((item, i) => `
            <div class="ranking-item" data-code="${item.code}">
                <span class="ranking-rank">${i + 1}</span>
                <div class="ranking-info">
                    <span class="ranking-name">${item.name}</span>
                    <span class="ranking-meta">고령화율 ${item.agingRatio.toFixed(1)}%</span>
                </div>
                <span class="ranking-score">${item.score}</span>
                <div class="ranking-bar">
                    <div class="ranking-bar-fill" style="width:${item.score}%; 
                        background:${item.score >= 80 ? '#dc2626' : item.score >= 60 ? '#f97316' : item.score >= 40 ? '#fbbf24' : '#34d399'}"></div>
                </div>
            </div>
        `).join('');
        
        // Click to select
        container.querySelectorAll('.ranking-item').forEach(el => {
            el.addEventListener('click', () => {
                const code = el.dataset.code;
                const sidoCode = code.substring(0, 2).padEnd(10, '0');
                const sidoSelect = document.getElementById('sidoSelect');
                if (sidoSelect) {
                    sidoSelect.value = sidoCode;
                    this.onSidoChange(sidoCode);
                    setTimeout(() => {
                        const sigunguSelect = document.getElementById('sigunguSelect');
                        if (sigunguSelect) {
                            sigunguSelect.value = code;
                            this.onSigunguChange(code);
                        }
                    }, 100);
                }
            });
        });
    },
    
    generateReport() {
        const region = DataStore.currentRegion;
        if (!region) {
            this.showToast('먼저 지역을 선택해주세요');
            return;
        }
        
        const yearData = region.data[DataStore.currentYear];
        const report = ReportGenerator.generate(region, yearData);
        
        const reportEl = document.getElementById('aiReport');
        if (reportEl) reportEl.innerHTML = report;
        
        const copyBtn = document.getElementById('copyReportBtn');
        if (copyBtn) copyBtn.style.display = 'block';
    },
    
    copyReport() {
        const reportEl = document.getElementById('aiReport');
        if (!reportEl) return;
        
        const text = reportEl.innerText;
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                this.showToast('클립보드에 복사되었습니다');
            }).catch(() => {
                this.fallbackCopy(text);
            });
        } else {
            this.fallbackCopy(text);
        }
    },
    
    fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            this.showToast('클립보드에 복사되었습니다');
        } catch (e) {
            this.showToast('복사에 실패했습니다');
        }
        document.body.removeChild(textarea);
    },
    
    refresh() {
        if (DataStore.currentRegion) {
            this.updateDisplay(DataStore.currentRegion);
        } else {
            this.loadNationalView();
        }
    },
    
    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.add('show');
    },
    
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.remove('show');
    },
    
    showToast(message) {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        if (toast && toastMessage) {
            toastMessage.textContent = message;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
    }
};

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});
