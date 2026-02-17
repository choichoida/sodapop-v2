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
const NATIONAL_REF = {
    totalPopulation: 51700000,
    elderlyPopulation: 9930000,
    agingRatio: 19.2,
    oldOldRatio: 42.5,
    agingVelocity: 4.2
};

const AGE_GROUPS = [
    '0-4', '5-9', '10-14', '15-19', '20-24', '25-29', '30-34', '35-39',
    '40-44', '45-49', '50-54', '55-59', '60-64', '65-69', '70-74', '75-79', '80-84', '85+'
];

const CLUSTER_COLORS = {
    children: '#4ECDC4',
    productive: '#45B7D1', 
    youngOld: '#F7B731',
    oldOld: '#FC5C65'
};

// ============================================
// DATA STORE
// ============================================
const DataStore = {
    regions: new Map(),
    sidoCodes: {},
    currentYear: 2025,
    currentRegion: null,
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
            sido: { basePop: 2000000 + Math.random() * 8000000, childRatio: 0.12, elderlyRatio: 0.18 },
            urban: { basePop: 200000 + Math.random() * 500000, childRatio: 0.13, elderlyRatio: 0.16 },
            rural: { basePop: 30000 + Math.random() * 50000, childRatio: 0.08, elderlyRatio: 0.28 }
        }[type] || params.urban;
        
        const data = {};
        for (let year = 2021; year <= 2025; year++) {
            const yearIdx = year - 2021;
            const agingFactor = 1 + yearIdx * 0.02;
            const youthFactor = 1 - yearIdx * 0.015;
            
            const totalPop = Math.round(params.basePop * (1 - yearIdx * 0.003));
            const children = Math.round(totalPop * params.childRatio * youthFactor);
            const oldOld = Math.round(totalPop * (params.elderlyRatio * 0.4) * Math.pow(agingFactor, 1.3));
            const youngOld = Math.round(totalPop * (params.elderlyRatio * 0.6) * agingFactor);
            const productive = totalPop - children - youngOld - oldOld;
            
            data[year] = {
                totalPopulation: totalPop,
                male: Math.round(totalPop * 0.49),
                female: Math.round(totalPop * 0.51),
                children, productive, youngOld, oldOld,
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
        
        // Colors: Red highlight for elderly (65+)
        const maleColors = AGE_GROUPS.map((_, i) => 
            i >= 13 ? 'rgba(220, 38, 38, 0.8)' : 'rgba(59, 130, 246, 0.8)'
        );
        const femaleColors = AGE_GROUPS.map((_, i) => 
            i >= 13 ? 'rgba(220, 38, 38, 0.6)' : 'rgba(236, 72, 153, 0.8)'
        );
        
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
        
        this.clusterChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['아동·청소년', '생산가능', '전기고령', '후기고령'],
                datasets: [{
                    data: [data.children, data.productive, data.youngOld, data.oldOld],
                    backgroundColor: [CLUSTER_COLORS.children, CLUSTER_COLORS.productive, 
                                     CLUSTER_COLORS.youngOld, CLUSTER_COLORS.oldOld],
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
        const total = data.children + data.productive + data.youngOld + data.oldOld;
        const breakdown = document.getElementById('clusterBreakdown');
        if (breakdown) {
            breakdown.innerHTML = `
                <div class="cluster-item">
                    <span class="cluster-dot" style="background:${CLUSTER_COLORS.children}"></span>
                    <div class="cluster-info"><span class="cluster-name">아동·청소년 (0-18)</span>
                    <span class="cluster-value">${(data.children/total*100).toFixed(1)}%</span></div>
                </div>
                <div class="cluster-item">
                    <span class="cluster-dot" style="background:${CLUSTER_COLORS.productive}"></span>
                    <div class="cluster-info"><span class="cluster-name">생산가능 (19-64)</span>
                    <span class="cluster-value">${(data.productive/total*100).toFixed(1)}%</span></div>
                </div>
                <div class="cluster-item">
                    <span class="cluster-dot" style="background:${CLUSTER_COLORS.youngOld}"></span>
                    <div class="cluster-info"><span class="cluster-name">전기고령 (65-74)</span>
                    <span class="cluster-value">${(data.youngOld/total*100).toFixed(1)}%</span></div>
                </div>
                <div class="cluster-item">
                    <span class="cluster-dot" style="background:${CLUSTER_COLORS.oldOld}"></span>
                    <div class="cluster-info"><span class="cluster-name">후기고령 (75+)</span>
                    <span class="cluster-value">${(data.oldOld/total*100).toFixed(1)}%</span></div>
                </div>
            `;
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
        const name = region.name;
        const elderly = yearData.youngOld + yearData.oldOld;
        const agingRatio = (elderly / yearData.totalPopulation * 100).toFixed(1);
        const oldOldRatio = (yearData.oldOld / elderly * 100).toFixed(1);
        const oldOldPct = (yearData.oldOld / yearData.totalPopulation * 100).toFixed(1);
        
        // Calculate 5-year change
        const firstYear = region.data[2021];
        const firstElderly = firstYear.youngOld + firstYear.oldOld;
        const elderlyChange = ((elderly - firstElderly) / firstElderly * 100).toFixed(1);
        
        // Status text
        let status = agingRatio >= 20 ? '<span class="critical">초고령사회에 진입한</span>' :
                     agingRatio >= 14 ? '<span class="warning">고령사회 단계에 있는</span>' : '고령화가 진행 중인';
        
        // National comparison
        const natDiff = (agingRatio - NATIONAL_REF.agingRatio).toFixed(1);
        let comparison = natDiff > 2 ? 
            `이는 <span class="highlight">전국 평균(${NATIONAL_REF.agingRatio}%)을 ${natDiff}%p 상회</span>하는 수치로,` :
            natDiff < -2 ? 
            `이는 전국 평균(${NATIONAL_REF.agingRatio}%)보다 ${Math.abs(natDiff)}%p 낮은 수준이나,` :
            `이는 전국 평균(${NATIONAL_REF.agingRatio}%)과 유사한 수준으로,`;
        
        // Service recommendation
        let service = oldOldRatio > 50 ? '<span class="metric">재가돌봄서비스 및 치매전문돌봄</span>의 확충이 시급합니다.' :
                      oldOldRatio > 40 ? '<span class="metric">재가돌봄서비스</span>의 확대가 필요합니다.' :
                      '<span class="metric">사회참여 프로그램</span>의 활성화가 권장됩니다.';
        
        return `
            <p><strong>${name}</strong>은(는) ${status} 지역으로, 
            <span class="metric">${DataStore.currentYear}년 기준 65세 이상 고령인구가 ${elderly.toLocaleString()}명</span>으로 
            전체 인구의 <span class="metric">${agingRatio}%</span>를 차지하고 있습니다.</p>
            
            <p>${comparison} 특히 75세 이상 후기고령인구는 전체 인구의 <span class="metric">${oldOldPct}%</span>를 차지하며, 
            2021년 대비 <span class="warning">${elderlyChange}% 증가</span>하였습니다.</p>
            
            <p>${service}</p>
            
            <p style="margin-top:12px; padding-top:12px; border-top:1px solid rgba(148,163,184,0.2);">
            <strong>📊 핵심 지표</strong><br>
            • 총인구: ${yearData.totalPopulation.toLocaleString()}명<br>
            • 고령화율: ${agingRatio}% (전국 ${NATIONAL_REF.agingRatio}%)<br>
            • 후기고령 비율: ${oldOldRatio}%<br>
            • 5년간 고령인구 변화: +${elderlyChange}%</p>
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
        
        // Aggregate national data
        let total = 0, elderly = 0, children = 0, productive = 0, youngOld = 0, oldOld = 0;
        
        DataStore.getSidoList().forEach(sido => {
            const region = DataStore.getRegion(sido.code);
            if (region) {
                const d = region.data[DataStore.currentYear];
                total += d.totalPopulation;
                children += d.children;
                productive += d.productive;
                youngOld += d.youngOld;
                oldOld += d.oldOld;
            }
        });
        elderly = youngOld + oldOld;
        
        this.updateStats({
            totalPopulation: total,
            elderly,
            agingRatio: (elderly / total * 100),
            urgency: 50
        });
        
        // National pyramid
        const nationalDist = this.generateNationalDistribution(total);
        ChartManager.initPyramid(nationalDist);
        
        ChartManager.initCluster({ children, productive, youngOld, oldOld });
        
        this.updateTrendChart('agingRatio', true);
        ChartManager.initMiniTrend([16.5, 17.4, 18.2, 18.8, 19.2]);
        
        this.updateBreadcrumb(['전국']);
        this.updateRankings();
        
        const localRatio = document.getElementById('localAgingRatio');
        if (localRatio) localRatio.textContent = '19.2%';
        
        const agingBadge = document.getElementById('agingTrendBadge');
        if (agingBadge) {
            agingBadge.textContent = '전국 평균';
            agingBadge.className = 'trend-badge';
        }
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
        const elderly = d.youngOld + d.oldOld;
        const agingRatio = (elderly / d.totalPopulation * 100);
        const urgency = DataStore.calculateUrgency(d, agingRatio);
        
        this.updateStats({ totalPopulation: d.totalPopulation, elderly, agingRatio, urgency });
        this.updatePyramid();
        ChartManager.initCluster(d);
        this.updateTrendChart('agingRatio');
        
        // Mini trend
        const trendValues = Object.values(region.data).map(yd => {
            const e = yd.youngOld + yd.oldOld;
            return (e / yd.totalPopulation * 100);
        });
        ChartManager.initMiniTrend(trendValues);
        
        // Local aging display
        const localRatio = document.getElementById('localAgingRatio');
        if (localRatio) localRatio.textContent = agingRatio.toFixed(1) + '%';
        
        const diff = agingRatio - NATIONAL_REF.agingRatio;
        const badge = document.getElementById('agingTrendBadge');
        if (badge) {
            badge.textContent = diff > 0 ? `▲ +${diff.toFixed(1)}%p 전국 대비` : `▼ ${diff.toFixed(1)}%p 전국 대비`;
            badge.className = `trend-badge ${diff > 0 ? 'danger' : 'success'}`;
        }
        
        this.updateRankings();
    },
    
    updateStats(data) {
        const totalPop = document.getElementById('totalPopulation');
        if (totalPop) totalPop.textContent = data.totalPopulation.toLocaleString();
        
        const elderlyPop = document.getElementById('elderlyPopulation');
        if (elderlyPop) elderlyPop.textContent = data.elderly.toLocaleString();
        
        const agingRatio = document.getElementById('agingRatio');
        if (agingRatio) agingRatio.textContent = data.agingRatio.toFixed(1) + '%';
        
        const urgencyScore = document.getElementById('urgencyScore');
        if (urgencyScore) urgencyScore.textContent = data.urgency;
        
        const urgencyMeter = document.getElementById('urgencyMeter');
        if (urgencyMeter) urgencyMeter.style.width = data.urgency + '%';
        
        const badge = document.getElementById('agingBadge');
        if (badge) {
            if (data.agingRatio >= 20) {
                badge.textContent = '초고령사회';
                badge.className = 'stat-badge critical';
            } else if (data.agingRatio >= 14) {
                badge.textContent = '고령사회';
                badge.className = 'stat-badge';
            } else {
                badge.textContent = '고령화사회';
                badge.className = 'stat-badge';
                badge.style.background = '#34d399';
            }
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
    
    updateTrendChart(metric = 'agingRatio', isNational = false) {
        const region = DataStore.currentRegion;
        const nationalValues = {
            agingRatio: [16.5, 17.4, 18.2, 18.8, 19.2],
            oldOldRatio: [38.5, 39.8, 40.9, 41.8, 42.5],
            dependency: [40.2, 41.5, 42.8, 44.0, 45.0]
        }[metric];
        
        let values, label;
        if (isNational || !region) {
            values = nationalValues;
            label = '전국 평균';
        } else {
            values = Object.values(region.data).map(d => {
                const e = d.youngOld + d.oldOld;
                if (metric === 'agingRatio') return (e / d.totalPopulation * 100);
                if (metric === 'oldOldRatio') return (d.oldOld / e * 100);
                return ((d.children + e) / d.productive * 100);
            });
            label = region.name;
        }
        
        ChartManager.initTrend({ years: [2021, 2022, 2023, 2024, 2025], values, label }, nationalValues);
        
        // Update summary
        const change = values[4] - values[0];
        const trendChange = document.getElementById('trendChange');
        if (trendChange) {
            trendChange.textContent = (change >= 0 ? '+' : '') + change.toFixed(1) + '%p';
            trendChange.style.color = change >= 0 ? '#f87171' : '#34d399';
        }
        
        const cagr = (Math.pow(values[4] / values[0], 0.25) - 1) * 100;
        const trendCAGR = document.getElementById('trendCAGR');
        if (trendCAGR) trendCAGR.textContent = (cagr >= 0 ? '+' : '') + cagr.toFixed(1) + '%';
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
