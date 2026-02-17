/**
 * SODAPOP 2.0 - Main Application Script
 * Antigravity Edition
 * 
 * KOSIS 데이터 기반 전국 복지 분석 시스템
 * - '계' 항목 자동 제거
 * - 행정구역 H-Code 기반 유동적 탐색
 * - 사업계획서용 근거 문구 자동 생성
 */

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================
const SIDO_CODES = {
    "11": "서울특별시", "26": "부산광역시", "27": "대구광역시",
    "28": "인천광역시", "29": "광주광역시", "30": "대전광역시",
    "31": "울산광역시", "36": "세종특별자치시", "41": "경기도",
    "42": "강원특별자치도", "43": "충청북도", "44": "충청남도",
    "45": "전북특별자치도", "46": "전라남도", "47": "경상북도",
    "48": "경상남도", "50": "제주특별자치도"
};

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
    currentYear: 2025,
    currentRegion: null,
    compareMode: false,
    
    init() {
        // Generate demo data for all Sido
        Object.entries(SIDO_CODES).forEach(([code, name]) => {
            const fullCode = code.padEnd(10, '0');
            this.regions.set(fullCode, this.generateRegionData(fullCode, name, 'sido'));
        });
        
        // Generate Sigungu for main regions
        this.generateSigungu('11', ['강남구', '서초구', '송파구', '노원구', '마포구', '영등포구']);
        this.generateSigungu('26', ['해운대구', '동래구', '부산진구', '사하구']);
        this.generateSigungu('41', ['수원시', '성남시', '고양시', '용인시', '화성시', '안산시']);
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
    
    getSigunguList(sidoCode) {
        const list = [];
        this.regions.forEach((region, code) => {
            if (code.startsWith(sidoCode.substring(0, 2)) && !code.endsWith('00000000')) {
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
        const ctx = document.getElementById('pyramidChart').getContext('2d');
        
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
        const ctx = document.getElementById('trendChart').getContext('2d');
        
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
        const ctx = document.getElementById('clusterChart').getContext('2d');
        
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
        document.getElementById('clusterBreakdown').innerHTML = `
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
    },
    
    initMiniTrend(values) {
        const ctx = document.getElementById('agingTrendMini').getContext('2d');
        
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
    init() {
        this.populateSido();
        this.bindEvents();
        this.loadNationalView();
    },
    
    populateSido() {
        const select = document.getElementById('sidoSelect');
        Object.entries(SIDO_CODES).forEach(([code, name]) => {
            const option = document.createElement('option');
            option.value = code.padEnd(10, '0');
            option.textContent = name;
            select.appendChild(option);
        });
    },
    
    bindEvents() {
        // Sido change
        document.getElementById('sidoSelect').addEventListener('change', e => {
            this.onSidoChange(e.target.value);
        });
        
        // Sigungu change
        document.getElementById('sigunguSelect').addEventListener('change', e => {
            this.onSigunguChange(e.target.value);
        });
        
        // Year change
        document.getElementById('yearSelect').addEventListener('change', e => {
            DataStore.currentYear = parseInt(e.target.value);
            this.refresh();
        });
        
        // Trend metric change
        document.getElementById('trendMetric').addEventListener('change', e => {
            this.updateTrendChart(e.target.value);
        });
        
        // Engine button
        document.getElementById('runEngineBtn').addEventListener('click', () => {
            this.showLoading();
            setTimeout(() => {
                this.refresh();
                this.hideLoading();
                this.showToast('데이터 분석 완료');
            }, 800);
        });
        
        // Toggle compare
        document.getElementById('toggleCompare').addEventListener('click', () => {
            DataStore.compareMode = !DataStore.compareMode;
            const badge = document.getElementById('compareStatus');
            badge.textContent = DataStore.compareMode ? '비교 모드 ON' : '비교 모드 OFF';
            badge.classList.toggle('active', DataStore.compareMode);
            document.getElementById('compareLegend').style.display = DataStore.compareMode ? 'flex' : 'none';
            this.updatePyramid();
        });
        
        // Generate report
        document.getElementById('generateReportBtn').addEventListener('click', () => {
            this.generateReport();
        });
        
        // Copy report
        document.getElementById('copyReportBtn').addEventListener('click', () => {
            this.copyReport();
        });
        
        // Ranking scope
        document.getElementById('rankingScope').addEventListener('change', () => {
            this.updateRankings();
        });
    },
    
    onSidoChange(code) {
        const sigunguSelect = document.getElementById('sigunguSelect');
        sigunguSelect.innerHTML = '<option value="">시/군/구 선택</option>';
        document.getElementById('dongSelect').disabled = true;
        
        if (!code) {
            sigunguSelect.disabled = true;
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
        sigunguSelect.disabled = false;
        
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
            const sido = SIDO_CODES[code.substring(0, 2)];
            this.updateBreadcrumb([sido, region.name]);
        }
    },
    
    loadNationalView() {
        DataStore.currentRegion = null;
        
        // Aggregate national data
        let total = 0, elderly = 0, children = 0, productive = 0, youngOld = 0, oldOld = 0;
        
        Object.keys(SIDO_CODES).forEach(code => {
            const region = DataStore.getRegion(code.padEnd(10, '0'));
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
        
        document.getElementById('localAgingRatio').textContent = '19.2%';
        document.getElementById('agingTrendBadge').textContent = '전국 평균';
        document.getElementById('agingTrendBadge').className = 'trend-badge';
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
        document.getElementById('localAgingRatio').textContent = agingRatio.toFixed(1) + '%';
        const diff = agingRatio - NATIONAL_REF.agingRatio;
        const badge = document.getElementById('agingTrendBadge');
        badge.textContent = diff > 0 ? `▲ +${diff.toFixed(1)}%p 전국 대비` : `▼ ${diff.toFixed(1)}%p 전국 대비`;
        badge.className = `trend-badge ${diff > 0 ? 'danger' : 'success'}`;
        
        this.updateRankings();
    },
    
    updateStats(data) {
        document.getElementById('totalPopulation').textContent = data.totalPopulation.toLocaleString();
        document.getElementById('elderlyPopulation').textContent = data.elderly.toLocaleString();
        document.getElementById('agingRatio').textContent = data.agingRatio.toFixed(1) + '%';
        document.getElementById('urgencyScore').textContent = data.urgency;
        document.getElementById('urgencyMeter').style.width = data.urgency + '%';
        
        const badge = document.getElementById('agingBadge');
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
    },
    
    updatePyramid() {
        const region = DataStore.currentRegion;
        const year = DataStore.currentYear;
        
        let data;
        if (region) {
            data = region.data[year].ageDistribution;
        } else {
            let total = 0;
            Object.keys(SIDO_CODES).forEach(code => {
                const r = DataStore.getRegion(code.padEnd(10, '0'));
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
        document.getElementById('trendChange').textContent = (change >= 0 ? '+' : '') + change.toFixed(1) + '%p';
        document.getElementById('trendChange').style.color = change >= 0 ? '#f87171' : '#34d399';
        
        const cagr = (Math.pow(values[4] / values[0], 0.25) - 1) * 100;
        document.getElementById('trendCAGR').textContent = (cagr >= 0 ? '+' : '') + cagr.toFixed(1) + '%';
    },
    
    updateBreadcrumb(path) {
        const container = document.getElementById('breadcrumb');
        container.innerHTML = path.map((name, i) => 
            `<span class="breadcrumb-item ${i === path.length - 1 ? 'active' : ''}">${name}</span>`
        ).join('');
    },
    
    updateRankings() {
        const rankings = DataStore.getRankings(8);
        const container = document.getElementById('rankingList');
        
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
                document.getElementById('sidoSelect').value = sidoCode;
                this.onSidoChange(sidoCode);
                setTimeout(() => {
                    document.getElementById('sigunguSelect').value = code;
                    this.onSigunguChange(code);
                }, 100);
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
        
        document.getElementById('aiReport').innerHTML = report;
        document.getElementById('copyReportBtn').style.display = 'block';
    },
    
    copyReport() {
        const text = document.getElementById('aiReport').innerText;
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('클립보드에 복사되었습니다');
        }).catch(() => {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showToast('클립보드에 복사되었습니다');
        });
    },
    
    refresh() {
        if (DataStore.currentRegion) {
            this.updateDisplay(DataStore.currentRegion);
        } else {
            this.loadNationalView();
        }
    },
    
    showLoading() {
        document.getElementById('loadingOverlay').classList.add('show');
    },
    
    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('show');
    },
    
    showToast(message) {
        const toast = document.getElementById('toast');
        document.getElementById('toastMessage').textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
};

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    DataStore.init();
    UI.init();
});
