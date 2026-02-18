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
// CHART MANAGER (Light Theme)
// ============================================
const ChartManager = {
    populationTrendChart: null,
    ratioTrendChart: null,
    compositionChart: null,
    clusterChart: null,
    
    // 라이트 테마 공통 설정
    lightTheme: {
        textColor: '#64748b',
        gridColor: 'rgba(226, 232, 240, 0.8)',
        tooltipBg: 'rgba(30, 41, 59, 0.95)',
        colors: {
            primary: '#3b82f6',
            rose: '#f43f5e',
            emerald: '#10b981',
            amber: '#f59e0b',
            violet: '#8b5cf6',
            children: '#60a5fa',
            youth: '#34d399',
            middle: '#a78bfa',
            elderly: '#fb7185'
        }
    },
    
    // 인구 추이 차트 (Area Chart)
    initPopulationTrend(data, nationalData, label = '선택 지역') {
        const ctx = document.getElementById('populationTrendChart')?.getContext('2d');
        if (!ctx) return;
        
        if (this.populationTrendChart) this.populationTrendChart.destroy();
        
        const years = ['2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023'];
        
        this.populationTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [
                    {
                        label: label,
                        data: data,
                        borderColor: this.lightTheme.colors.primary,
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                        pointBackgroundColor: this.lightTheme.colors.primary
                    },
                    {
                        label: '전국 평균',
                        data: nationalData,
                        borderColor: this.lightTheme.textColor,
                        borderWidth: 1.5,
                        borderDash: [4, 4],
                        tension: 0.3,
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: this.lightTheme.tooltipBg,
                        titleColor: '#f1f5f9',
                        bodyColor: '#94a3b8',
                        padding: 12,
                        cornerRadius: 8
                    }
                },
                scales: {
                    x: { 
                        grid: { display: false },
                        ticks: { color: this.lightTheme.textColor, font: { size: 11 } }
                    },
                    y: { 
                        grid: { color: this.lightTheme.gridColor },
                        ticks: { 
                            color: this.lightTheme.textColor,
                            font: { size: 11 },
                            callback: v => v >= 10000 ? (v/10000).toFixed(0) + '만' : v.toLocaleString()
                        }
                    }
                }
            }
        });
        
        // 범례 레이블 업데이트
        const legendLabel = document.getElementById('trendLegendLabel');
        if (legendLabel) legendLabel.textContent = label;
    },
    
    // 비율 추이 차트 (Line + 점)
    initRatioTrend(data, title = '비율 변화 (%)') {
        const ctx = document.getElementById('ratioTrendChart')?.getContext('2d');
        if (!ctx) return;
        
        if (this.ratioTrendChart) this.ratioTrendChart.destroy();
        
        const years = ['2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023'];
        
        this.ratioTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    data: data,
                    borderColor: this.lightTheme.colors.rose,
                    backgroundColor: 'rgba(244, 63, 94, 0.05)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 5,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: this.lightTheme.colors.rose,
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: this.lightTheme.tooltipBg,
                        callbacks: {
                            label: ctx => `${ctx.parsed.y.toFixed(1)}%`
                        }
                    }
                },
                scales: {
                    x: { 
                        grid: { display: false },
                        ticks: { color: this.lightTheme.textColor, font: { size: 11 } }
                    },
                    y: { 
                        grid: { color: this.lightTheme.gridColor },
                        ticks: { 
                            color: this.lightTheme.textColor,
                            font: { size: 11 },
                            callback: v => v + '%'
                        }
                    }
                }
            }
        });
        
        // 차트 제목 업데이트
        const chartTitle = document.getElementById('ratioChartTitle');
        if (chartTitle) chartTitle.textContent = title;
    },
    
    // 인구 구성비 변화 (Stacked Bar)
    initComposition(yearlyData) {
        const ctx = document.getElementById('compositionChart')?.getContext('2d');
        if (!ctx) return;
        
        if (this.compositionChart) this.compositionChart.destroy();
        
        const years = ['2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023'];
        
        this.compositionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: years,
                datasets: [
                    {
                        label: '노인 (65+)',
                        data: yearlyData.elderly,
                        backgroundColor: this.lightTheme.colors.elderly,
                        borderRadius: 2
                    },
                    {
                        label: '중장년 (35-64)',
                        data: yearlyData.middle,
                        backgroundColor: this.lightTheme.colors.middle,
                        borderRadius: 2
                    },
                    {
                        label: '청년 (19-34)',
                        data: yearlyData.youth,
                        backgroundColor: this.lightTheme.colors.youth,
                        borderRadius: 2
                    },
                    {
                        label: '아동·청소년 (0-18)',
                        data: yearlyData.children,
                        backgroundColor: this.lightTheme.colors.children,
                        borderRadius: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: this.lightTheme.tooltipBg,
                        callbacks: {
                            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}%`
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { color: this.lightTheme.textColor, font: { size: 11 } }
                    },
                    y: {
                        stacked: true,
                        max: 100,
                        grid: { color: this.lightTheme.gridColor },
                        ticks: { 
                            color: this.lightTheme.textColor,
                            font: { size: 11 },
                            callback: v => v + '%'
                        }
                    }
                }
            }
        });
    },
    
    // 세대별 분포 차트 (Doughnut)
    initCluster(data) {
        const ctx = document.getElementById('clusterChart')?.getContext('2d');
        if (!ctx) return;
        
        if (this.clusterChart) this.clusterChart.destroy();
        
        const labels = ['아동·청소년', '청년', '중장년', '노인'];
        const values = [
            data.children || 0, 
            data.youth || Math.round((data.productive || 0) * 0.35),
            data.middle || Math.round((data.productive || 0) * 0.65),
            (data.youngOld || 0) + (data.oldOld || 0)
        ];
        const colors = [
            this.lightTheme.colors.children,
            this.lightTheme.colors.youth,
            this.lightTheme.colors.middle,
            this.lightTheme.colors.elderly
        ];
        
        this.clusterChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '60%',
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: this.lightTheme.tooltipBg,
                        callbacks: {
                            label: ctx => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = ((ctx.parsed / total) * 100).toFixed(1);
                                return `${ctx.label}: ${pct}%`;
                            }
                        }
                    }
                }
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
        
        // 새로운 차트 시스템
        this.initAllCharts(dataForStats, '전국');
        
        this.updateBreadcrumb(['전국']);
        this.updateRankings();
        this.updateAIReport(dataForStats, '전국');
    },
    
    initAllCharts(data, regionName) {
        // 1. 인구 추이 차트 (10년)
        const popTrend = this.generateTrendData('population');
        const nationalPopTrend = this.generateTrendData('population', true);
        ChartManager.initPopulationTrend(popTrend, nationalPopTrend, regionName);
        
        // 2. 비율 추이 차트
        const dataType = DataStore.currentDataType;
        const ratioTrend = this.generateTrendData(dataType === 'all' ? 'elderlyRatio' : dataType);
        const titleMap = {
            all: '고령화율 변화 (%)',
            children: '아동·청소년 비율 변화 (%)',
            youth: '청년 비율 변화 (%)',
            middle: '중장년 비율 변화 (%)',
            elderly: '고령화율 변화 (%)',
            single: '1인가구 비율 변화 (%)',
            multicultural: '다문화가구 비율 변화 (%)',
            disabled: '장애인 비율 변화 (%)',
            basic_livelihood: '수급률 변화 (%)'
        };
        ChartManager.initRatioTrend(ratioTrend, titleMap[dataType] || '비율 변화 (%)');
        
        // 3. 인구 구성비 변화 (Stacked Bar)
        const compositionData = this.generateCompositionData();
        ChartManager.initComposition(compositionData);
        
        // 4. 세대별 분포 차트
        ChartManager.initCluster({
            children: data.children || 0,
            youth: data.youth || 0,
            middle: data.middle || 0,
            productive: (data.youth || 0) + (data.middle || 0),
            youngOld: data.youngOld || 0,
            oldOld: data.oldOld || 0
        });
        
        // 비율 차트 노트 업데이트
        this.updateRatioNote(data);
    },
    
    generateTrendData(type, isNational = false) {
        const region = isNational ? null : DataStore.currentRegion;
        
        // 10년 데이터 시뮬레이션
        const baseTrends = {
            population: isNational ? 
                [50000, 50500, 51000, 51200, 51400, 51500, 51600, 51650, 51700, 51650] :
                [45000, 46000, 47000, 47500, 48000, 48200, 48500, 48700, 49000, 48800],
            elderlyRatio: isNational ?
                [12.5, 13.2, 14.0, 14.9, 15.8, 16.5, 17.4, 18.2, 18.8, 19.2] :
                [11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0, 19.0, 20.0],
            children: [20.5, 19.8, 19.2, 18.5, 18.0, 17.5, 17.0, 16.5, 16.2, 15.8],
            youth: [20.0, 19.5, 19.0, 18.5, 18.0, 17.6, 17.2, 16.9, 16.6, 16.3],
            middle: [40.0, 40.5, 41.0, 41.2, 41.4, 41.5, 41.5, 41.4, 41.3, 41.2],
            elderly: [12.5, 13.2, 14.0, 14.9, 15.8, 16.5, 17.4, 18.2, 18.8, 19.2],
            single: [26.0, 27.0, 28.0, 29.0, 29.5, 30.0, 30.5, 31.0, 31.5, 32.0],
            multicultural: [1.2, 1.3, 1.4, 1.5, 1.5, 1.6, 1.6, 1.7, 1.7, 1.8],
            disabled: [4.8, 4.9, 5.0, 5.0, 5.1, 5.1, 5.1, 5.2, 5.2, 5.2],
            basic_livelihood: [3.8, 4.0, 4.2, 4.3, 4.4, 4.5, 4.5, 4.6, 4.6, 4.6]
        };
        
        // 지역이 있으면 약간의 변동 추가
        let data = baseTrends[type] || baseTrends.elderlyRatio;
        
        if (region && !isNational) {
            const factor = 0.9 + Math.random() * 0.2;
            data = data.map(v => Math.round(v * factor * 10) / 10);
        }
        
        return data;
    },
    
    generateCompositionData() {
        // 10년간 인구 구성비 변화 데이터
        return {
            elderly: [12.5, 13.2, 14.0, 14.9, 15.8, 16.5, 17.4, 18.2, 18.8, 19.2],
            middle: [40.0, 40.5, 41.0, 41.2, 41.4, 41.5, 41.5, 41.4, 41.3, 41.2],
            youth: [20.0, 19.5, 19.0, 18.5, 18.0, 17.6, 17.2, 16.9, 16.6, 16.3],
            children: [20.5, 19.8, 19.2, 18.5, 18.0, 17.5, 17.0, 16.5, 16.2, 15.8]
        };
    },
    
    updateRatioNote(data) {
        const note = document.getElementById('ratioChartNote');
        if (!note) return;
        
        const dataType = DataStore.currentDataType;
        const year = DataStore.currentYear;
        
        const notes = {
            all: `📍 ${year}년 기준 고령화율 ${(data.elderlyRatio || 19.2).toFixed(1)}%, 매년 상승 추세`,
            children: `📍 저출산으로 아동인구 지속 감소, ${year}년 ${(data.childrenRatio || 16).toFixed(1)}%`,
            youth: `📍 청년 인구 유출 심화, ${year}년 ${(data.youthRatio || 17).toFixed(1)}%`,
            middle: `📍 핵심 생산인구, ${year}년 ${(data.middleRatio || 41).toFixed(1)}%`,
            elderly: `📍 초고령사회 진입, ${year}년 고령화율 ${(data.elderlyRatio || 19.2).toFixed(1)}%`,
            single: `📍 1인가구 급증, ${year}년 ${(data.singleHouseholdRatio || 32).toFixed(1)}%`,
            multicultural: `📍 다문화가구 증가 추세, ${year}년 ${(data.multiculturalRatio || 1.7).toFixed(1)}%`,
            disabled: `📍 장애인 비율 안정적, ${year}년 ${(data.disabledRatio || 5.2).toFixed(1)}%`,
            basic_livelihood: `📍 기초생활수급률, ${year}년 ${(data.basicLivelihoodRatio || 4.6).toFixed(1)}%`
        };
        
        note.textContent = notes[dataType] || notes.all;
    },
    
    updateAIReport(data, regionName) {
        const dataType = DataStore.currentDataType;
        const typeInfo = DATA_TYPES[dataType] || DATA_TYPES.all;
        
        // 종합 현안
        const summary = document.getElementById('aiReportSummary');
        if (summary) {
            const summaryText = this.getAISummary(data, regionName, dataType);
            summary.innerHTML = `<p>${summaryText}</p>`;
        }
        
        // 위험요소
        const risks = document.getElementById('aiReportRisks');
        if (risks) {
            risks.innerHTML = this.getAIRisks(data, dataType);
        }
        
        // 필요 대책
        const actions = document.getElementById('aiReportActions');
        if (actions) {
            actions.innerHTML = this.getAIActions(data, dataType);
        }
        
        // 향후 전망
        const forecast = document.getElementById('aiReportForecast');
        if (forecast) {
            forecast.textContent = this.getAIForecast(data, regionName, dataType);
        }
    },
    
    getAISummary(data, regionName, dataType) {
        const summaries = {
            all: `${regionName}은(는) 총 인구 ${(data.totalPopulation/10000).toFixed(1)}만명으로, 전체 가구 중 1인가구 비율이 ${(data.singleHouseholdRatio || 32).toFixed(1)}%에 달하며, 고령화율 ${(data.elderlyRatio || 19.2).toFixed(1)}%로 전 세대에 걸친 종합적인 복지 대책이 필요합니다.`,
            children: `${regionName}의 아동·청소년 인구는 ${(data.children/10000).toFixed(1)}만명(${(data.childrenRatio || 16).toFixed(1)}%)으로, 저출산 심화로 인해 아동복지 인프라 재편과 돌봄서비스 강화가 시급합니다.`,
            youth: `${regionName}의 청년 인구는 ${(data.youth/10000).toFixed(1)}만명(${(data.youthRatio || 17).toFixed(1)}%)으로, 일자리·주거·결혼 등 복합적 어려움에 직면해 있어 맞춤형 청년정책이 필요합니다.`,
            middle: `${regionName}의 중장년 인구는 ${(data.middle/10000).toFixed(1)}만명(${(data.middleRatio || 41).toFixed(1)}%)으로, 가족돌봄 부담과 노후준비 이중고에 시달리는 '샌드위치 세대'입니다.`,
            elderly: `${regionName}의 65세 이상 노인 인구는 ${((data.elderly || 0)/10000).toFixed(1)}만명(${(data.elderlyRatio || 19.2).toFixed(1)}%)으로, 독거노인 ${(data.elderlyAlone/10000).toFixed(1)}만명에 대한 돌봄 강화가 시급합니다.`,
            single: `${regionName}의 1인가구는 ${(data.singleHousehold/10000).toFixed(1)}만 가구(${(data.singleHouseholdRatio || 32).toFixed(1)}%)로, 고독사 예방과 사회적 연결망 구축이 핵심 과제입니다.`,
            multicultural: `${regionName}의 다문화가구는 약 ${(data.multicultural/1000).toFixed(1)}천 가구로, 언어·문화 적응 지원과 자녀 교육 지원이 필요합니다.`,
            disabled: `${regionName}의 등록 장애인은 ${(data.disabled/10000).toFixed(1)}만명(${(data.disabledRatio || 5.2).toFixed(1)}%)으로, 활동지원과 일자리 확대가 필요합니다.`,
            basic_livelihood: `${regionName}의 기초생활수급자는 ${(data.basicLivelihood/10000).toFixed(1)}만명(${(data.basicLivelihoodRatio || 4.6).toFixed(1)}%)으로, 빈곤 탈출 지원과 자활 연계가 필요합니다.`
        };
        return summaries[dataType] || summaries.all;
    },
    
    getAIRisks(data, dataType) {
        const riskLists = {
            all: ['고령화 가속으로 사회보장 비용 급증', '생산가능인구 감소로 경제활력 저하', '1인가구 증가로 고독사 위험 확대', '세대간 갈등 심화 우려'],
            children: ['저출산으로 학교 통폐합 불가피', '아동돌봄 인프라 과잉 우려', '취약계층 아동 지원 사각지대', '청소년 정신건강 문제 증가'],
            youth: ['청년 일자리 미스매치 심화', '주거비 부담으로 자립 지연', '결혼·출산 기피로 저출산 악순환', '청년층 지방 이탈 가속화'],
            middle: ['가족돌봄 부담으로 경력단절', '노후준비 부족으로 빈곤 위험', '중년 우울증·번아웃 증가', '고용불안정으로 조기 퇴직 증가'],
            elderly: ['독거노인 고독사 위험 증가', '치매 환자 급증으로 돌봄 부담', '노인빈곤율 OECD 최고 수준', '의료·요양 비용 급증'],
            single: ['사회적 고립으로 우울증 증가', '경제적 불안정 심화', '고독사 사각지대 확대', '주거·돌봄 지원 체계 미비'],
            multicultural: ['언어장벽으로 사회통합 지연', '다문화가정 자녀 학습 부진', '이중문화 정체성 혼란', '취업 차별로 경제적 어려움'],
            disabled: ['활동지원 인력 부족', '장애인 일자리 부족', '이동권 보장 미흡', '장애인 학대·방임 우려'],
            basic_livelihood: ['빈곤의 대물림 우려', '근로빈곤층 증가', '복지 사각지대 존재', '자활 의지 저하 우려']
        };
        return (riskLists[dataType] || riskLists.all).map(r => `<li>${r}</li>`).join('');
    },
    
    getAIActions(data, dataType) {
        const actionLists = {
            all: ['전 세대 맞춤형 복지 전달체계 구축', 'AI 기반 복지 수요 예측 시스템 도입', '세대통합 프로그램 활성화', '지역사회 돌봄 네트워크 강화'],
            children: ['온종일돌봄체계 확대', '아동학대 조기발견 시스템 강화', '취약계층 아동 맞춤 지원', '청소년 활동 공간 확충'],
            youth: ['청년 일자리 창출 및 역량 강화', '청년 주거비 지원 확대', '청년정책 참여 플랫폼 구축', '청년 정신건강 지원 강화'],
            middle: ['가족돌봄휴가 확대', '중장년 재취업 지원 강화', '노후준비 교육 프로그램 확대', '건강검진 확대 및 관리'],
            elderly: ['재가돌봄서비스 확충', '치매안심센터 기능 강화', '노인일자리 및 사회참여 확대', '노인학대 예방 체계 강화'],
            single: ['고독사 예방 안부확인 서비스', '긴급돌봄 네트워크 구축', '1인가구 커뮤니티 프로그램', '주거안정 지원 강화'],
            multicultural: ['한국어 교육 확대', '다문화가족지원센터 서비스 강화', '이중언어 환경 조성 지원', '결혼이민자 취업연계 강화'],
            disabled: ['활동지원서비스 확대', '장애인 고용 촉진 지원', '이동지원 서비스 강화', '장애인 권익옹호 체계 구축'],
            basic_livelihood: ['자활프로그램 다양화', '긴급복지지원 확대', '교육비·의료비 지원 강화', '주거급여 현실화']
        };
        return (actionLists[dataType] || actionLists.all).map(a => `<li>${a}</li>`).join('');
    },
    
    getAIForecast(data, regionName, dataType) {
        const forecasts = {
            all: `${regionName}은(는) 2030년까지 초고령사회가 심화될 전망이며, 전 세대 맞춤형 복지 투자 없이는 사회적 비용이 급증할 것으로 예상됩니다.`,
            children: `저출산 추세가 지속될 경우, ${regionName}의 아동 인구는 향후 10년간 추가 20% 감소가 예상되며, 아동복지 인프라 재편이 불가피합니다.`,
            youth: `일자리·주거 문제 해결 없이는 청년 유출이 가속화되어, ${regionName}의 지역 활력이 크게 저하될 전망입니다.`,
            middle: `중장년층의 돌봄 부담 경감과 노후준비 지원 없이는 향후 노인빈곤 문제가 심화될 것으로 예상됩니다.`,
            elderly: `${regionName}은(는) 2030년경 고령화율 25% 돌파가 예상되며, 돌봄 인력 및 시설 확충이 시급합니다.`,
            single: `1인가구 증가 추세가 지속될 경우, 2030년에는 전체 가구의 40%를 넘어설 것으로 전망됩니다.`,
            multicultural: `다문화가구 지원 체계 강화를 통해 사회통합을 이루면, 지역 활력 제고에 기여할 수 있습니다.`,
            disabled: `장애인 자립 지원 강화로 사회참여를 확대하면, 복지비용 절감과 사회통합 효과를 얻을 수 있습니다.`,
            basic_livelihood: `자활 프로그램 내실화와 취업연계 강화로 빈곤 탈출 성공률을 높이는 것이 핵심입니다.`
        };
        return forecasts[dataType] || forecasts.all;
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
        
        // 새로운 차트 시스템
        this.initAllCharts(dataForStats, region.name);
        
        this.updateRankings();
        this.updateAIReport(dataForStats, region.name);
    },
    
    updateStats(data) {
        const dataType = DataStore.currentDataType;
        const statsConfig = this.getStatsConfig(dataType, data);
        
        // Stat 1: 총 인구 / 대상 인구
        this.setStatCard(1, statsConfig.stat1);
        
        // Stat 2: 주요 지표
        this.setStatCard(2, statsConfig.stat2);
        
        // Stat 3: 비율
        this.setStatCard(3, statsConfig.stat3);
        
        // Stat 4: 긴급도
        const stat4Value = document.getElementById('stat4Value');
        const stat4Label = document.getElementById('stat4Label');
        const stat4Sub = document.getElementById('stat4Sub');
        if (stat4Value) stat4Value.textContent = (data.urgency || 50).toFixed(1);
        if (stat4Label) stat4Label.textContent = '복지 긴급도';
        if (stat4Sub) stat4Sub.textContent = data.urgency >= 70 ? '⚠️ 높음' : data.urgency >= 40 ? '보통' : '양호';
    },
    
    setStatCard(num, config) {
        const icon = document.getElementById(`stat${num}Icon`);
        const value = document.getElementById(`stat${num}Value`);
        const label = document.getElementById(`stat${num}Label`);
        const sub = document.getElementById(`stat${num}Sub`);
        const change = document.getElementById(`stat${num}Change`);
        
        if (icon) icon.textContent = config.icon || '';
        if (value) value.textContent = config.value || '-';
        if (label) label.textContent = config.label || '';
        if (sub) sub.textContent = config.sub || '';
        if (change && config.change) {
            change.textContent = config.change;
            change.className = `stat-change ${config.changeDir || 'down'}`;
        }
    },
    
    getStatsConfig(dataType, data) {
        const formatPop = (n) => {
            if (!n) return '-';
            if (n >= 10000000) return (n / 10000000).toFixed(1) + '천만';
            if (n >= 10000) return (n / 10000).toFixed(1) + '만';
            if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
            return n.toLocaleString();
        };
        
        switch (dataType) {
            case 'children':
                return {
                    stat1: { icon: '👥', value: formatPop(data.totalPopulation), label: '총 인구 (추계)', sub: '전체 인구' },
                    stat2: { icon: '👶', value: formatPop(data.children), label: '아동·청소년 수', sub: '0-18세', change: '▼ 2.1%', changeDir: 'down' },
                    stat3: { icon: '📊', value: (data.childrenRatio?.toFixed(1) || '-') + '%', label: '아동 비율', sub: data.childrenRatio < 15 ? '저출산 심각' : '전국 평균' }
                };
            case 'youth':
                return {
                    stat1: { icon: '👥', value: formatPop(data.totalPopulation), label: '총 인구 (추계)', sub: '전체 인구' },
                    stat2: { icon: '🧑', value: formatPop(data.youth), label: '청년 수', sub: '19-34세', change: '▼ 1.8%', changeDir: 'down' },
                    stat3: { icon: '📊', value: (data.youthRatio?.toFixed(1) || '-') + '%', label: '청년 비율', sub: data.youthRatio < 16 ? '청년 유출' : '전국 평균' }
                };
            case 'middle':
                return {
                    stat1: { icon: '👥', value: formatPop(data.totalPopulation), label: '총 인구 (추계)', sub: '전체 인구' },
                    stat2: { icon: '👨‍💼', value: formatPop(data.middle), label: '중장년 수', sub: '35-64세', change: '▲ 0.5%', changeDir: 'up' },
                    stat3: { icon: '📊', value: (data.middleRatio?.toFixed(1) || '-') + '%', label: '중장년 비율', sub: '핵심 생산인구' }
                };
            case 'elderly':
                return {
                    stat1: { icon: '👥', value: formatPop(data.totalPopulation), label: '총 인구 (추계)', sub: '전체 인구' },
                    stat2: { icon: '👴', value: formatPop(data.elderly || (data.youngOld + data.oldOld)), label: '노인 인구', sub: '65세 이상', change: '▲ 4.2%', changeDir: 'up' },
                    stat3: { icon: '📊', value: (data.elderlyRatio?.toFixed(1) || '-') + '%', label: '고령화율', sub: data.elderlyRatio >= 20 ? '초고령사회' : '고령사회' }
                };
            case 'single':
                return {
                    stat1: { icon: '👥', value: formatPop(data.totalHouseholds), label: '총 가구수', sub: '전체 가구' },
                    stat2: { icon: '🏠', value: formatPop(data.singleHousehold), label: '1인가구', sub: '단독 거주', change: '▲ 3.5%', changeDir: 'up' },
                    stat3: { icon: '📊', value: (data.singleHouseholdRatio?.toFixed(1) || '-') + '%', label: '1인가구 비율', sub: data.singleHouseholdRatio >= 35 ? '급증 추세' : '증가 중' }
                };
            case 'multicultural':
                return {
                    stat1: { icon: '👥', value: formatPop(data.totalHouseholds), label: '총 가구수', sub: '전체 가구' },
                    stat2: { icon: '🌍', value: formatPop(data.multicultural), label: '다문화가구', sub: '결혼이민 등', change: '▲ 2.1%', changeDir: 'up' },
                    stat3: { icon: '📊', value: (data.multiculturalRatio?.toFixed(1) || '-') + '%', label: '다문화 비율', sub: '사회통합 대상' }
                };
            case 'disabled':
                return {
                    stat1: { icon: '👥', value: formatPop(data.totalPopulation), label: '총 인구 (추계)', sub: '전체 인구' },
                    stat2: { icon: '♿', value: formatPop(data.disabled), label: '등록 장애인', sub: '복지카드 소지', change: '▲ 0.8%', changeDir: 'up' },
                    stat3: { icon: '📊', value: (data.disabledRatio?.toFixed(1) || '-') + '%', label: '장애인 비율', sub: '전국 평균 5.2%' }
                };
            case 'basic_livelihood':
                return {
                    stat1: { icon: '👥', value: formatPop(data.totalPopulation), label: '총 인구 (추계)', sub: '전체 인구' },
                    stat2: { icon: '💰', value: formatPop(data.basicLivelihood), label: '수급자 수', sub: '생계·의료급여', change: '▲ 1.2%', changeDir: 'up' },
                    stat3: { icon: '📊', value: (data.basicLivelihoodRatio?.toFixed(1) || '-') + '%', label: '수급률', sub: data.basicLivelihoodRatio >= 5 ? '빈곤 위험' : '전국 평균' }
                };
            case 'all':
            default:
                return {
                    stat1: { icon: '👥', value: formatPop(data.totalPopulation), label: '총 인구 (추계)', sub: '전국 기준' },
                    stat2: { icon: '👶', value: formatPop(data.children), label: '기준 인구 수', sub: '아동·청소년', change: '▼ 2.1%', changeDir: 'down' },
                    stat3: { icon: '📊', value: (data.childrenRatio?.toFixed(1) || '-') + '%', label: '비율', sub: '전국 평균 대비' }
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
        const rankings = DataStore.getRankings(6);
        const container = document.getElementById('rankingList');
        if (!container) return;
        
        container.innerHTML = rankings.map((item, i) => `
            <div class="ranking-item" data-code="${item.code}">
                <span class="ranking-rank">${i + 1}</span>
                <div class="ranking-info">
                    <span class="ranking-name">${item.name}</span>
                    <span class="ranking-meta">긴급도 ${item.score}점</span>
                </div>
                <span class="ranking-value">${item.agingRatio.toFixed(1)}%</span>
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
        this.showLoading();
        
        setTimeout(() => {
            const region = DataStore.currentRegion;
            const regionName = region ? region.name : '전국';
            const yearData = region ? region.data[DataStore.currentYear] : this.getNationalData();
            
            this.updateAIReport(yearData, regionName);
            
            const copyBtn = document.getElementById('copyReportBtn');
            if (copyBtn) copyBtn.style.display = 'block';
            
            this.hideLoading();
            this.showToast('AI 분석이 생성되었습니다');
        }, 1000);
    },
    
    getNationalData() {
        let total = 0, children = 0, youth = 0, middle = 0, elderly = 0;
        let totalHouseholds = 0, singleHousehold = 0, multicultural = 0;
        let elderlyAlone = 0, disabled = 0, basicLivelihood = 0;
        
        DataStore.getSidoList().forEach(sido => {
            const region = DataStore.getRegion(sido.code);
            if (region) {
                const d = region.data[DataStore.currentYear];
                total += d.totalPopulation;
                children += d.children || 0;
                youth += d.youth || 0;
                middle += d.middle || 0;
                elderly += d.elderly || 0;
                totalHouseholds += d.totalHouseholds || 0;
                singleHousehold += d.singleHousehold || 0;
                multicultural += d.multicultural || 0;
                elderlyAlone += d.elderlyAlone || 0;
                disabled += d.disabled || 0;
                basicLivelihood += d.basicLivelihood || 0;
            }
        });
        
        return {
            totalPopulation: total,
            totalHouseholds,
            children, childrenRatio: (children / total * 100),
            youth, youthRatio: (youth / total * 100),
            middle, middleRatio: (middle / total * 100),
            elderly, elderlyRatio: (elderly / total * 100),
            singleHousehold, singleHouseholdRatio: (singleHousehold / totalHouseholds * 100),
            multicultural, multiculturalRatio: (multicultural / totalHouseholds * 100),
            elderlyAlone, disabled, basicLivelihood,
            basicLivelihoodRatio: (basicLivelihood / total * 100),
            disabledRatio: (disabled / total * 100)
        };
    },
    
    copyReport() {
        const sections = ['aiReportSummary', 'aiReportRisks', 'aiReportActions', 'aiReportForecast'];
        let text = '=== SODAPOP AI 분석 보고서 ===\n\n';
        
        const summary = document.getElementById('aiReportSummary');
        if (summary) text += '【종합 현안】\n' + summary.innerText + '\n\n';
        
        const risks = document.getElementById('aiReportRisks');
        if (risks) text += '【주요 위험요소】\n' + risks.innerText + '\n\n';
        
        const actions = document.getElementById('aiReportActions');
        if (actions) text += '【필요한 복지 대책】\n' + actions.innerText + '\n\n';
        
        const forecast = document.getElementById('aiReportForecast');
        if (forecast) text += '【향후 전망】\n' + forecast.innerText + '\n';
        
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
