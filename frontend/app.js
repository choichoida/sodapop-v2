/**
 * SODAPOP 2.0 - Main Application
 * Antigravity Edition
 * 
 * Fluid Navigation & Zero-Inertia UI Controller
 */

// ============================================
// APPLICATION STATE
// ============================================
const AppState = {
    currentYear: 2025,
    selectedSido: null,
    selectedSigungu: null,
    selectedDong: null,
    selectedTarget: 'all',
    keyword: '',
    compareMode: false,
    isLoading: false
};

// ============================================
// UI CONTROLLER
// ============================================
const UIController = {
    /**
     * Initialize all UI components
     */
    init() {
        this.initSuspensionBar();
        this.initCharts();
        this.initEventListeners();
        this.loadInitialData();
    },
    
    /**
     * Initialize Suspension Bar controls
     */
    initSuspensionBar() {
        // Populate Sido dropdown
        const sidoSelect = document.getElementById('sidoSelect');
        const sidoList = DataStore.getSidoList();
        
        sidoList.forEach(sido => {
            const option = document.createElement('option');
            option.value = sido.code;
            option.textContent = sido.name;
            sidoSelect.appendChild(option);
        });
    },
    
    /**
     * Initialize Chart.js charts
     */
    initCharts() {
        ChartFactory.initAll();
    },
    
    /**
     * Setup all event listeners
     */
    initEventListeners() {
        // Year selector
        document.querySelectorAll('.year-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                AppState.currentYear = parseInt(e.target.dataset.year);
                DataStore.currentYear = AppState.currentYear;
                this.refreshData();
            });
        });
        
        // Sido select
        document.getElementById('sidoSelect').addEventListener('change', (e) => {
            AppState.selectedSido = e.target.value;
            this.onSidoChange(e.target.value);
        });
        
        // Sigungu select
        document.getElementById('sigunguSelect').addEventListener('change', (e) => {
            AppState.selectedSigungu = e.target.value;
            this.onSigunguChange(e.target.value);
        });
        
        // Dong select
        document.getElementById('dongSelect').addEventListener('change', (e) => {
            AppState.selectedDong = e.target.value;
            this.onDongChange(e.target.value);
        });
        
        // Target filter chips
        document.querySelectorAll('.chip[data-target]').forEach(chip => {
            chip.addEventListener('click', (e) => {
                document.querySelectorAll('.chip[data-target]').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                AppState.selectedTarget = e.target.dataset.target;
                this.applyTargetFilter();
            });
        });
        
        // Keyword search
        const keywordInput = document.getElementById('keywordSearch');
        let searchTimeout;
        keywordInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                AppState.keyword = e.target.value;
                this.applyKeywordFilter();
            }, 300);
        });
        
        // Quick action buttons
        document.getElementById('compareBtn').addEventListener('click', () => {
            this.toggleCompareMode();
        });
        
        document.getElementById('reportBtn').addEventListener('click', () => {
            this.scrollToReport();
        });
        
        document.getElementById('analyzeBtn').addEventListener('click', () => {
            this.runAnalysis();
        });
        
        // Pyramid controls
        document.getElementById('pyramidCompare').addEventListener('click', () => {
            this.togglePyramidCompare();
        });
        
        // Trend metric selector
        document.getElementById('trendMetric').addEventListener('change', (e) => {
            this.updateTrendChart(e.target.value);
        });
        
        // Ranking scope selector
        document.getElementById('rankingScope').addEventListener('change', (e) => {
            this.updateRankings(e.target.value);
        });
        
        // Report generation
        document.getElementById('generateReport').addEventListener('click', () => {
            this.generateReport();
        });
        
        document.getElementById('copyReport').addEventListener('click', () => {
            this.copyReportToClipboard();
        });
        
        document.getElementById('downloadReport').addEventListener('click', () => {
            this.downloadReport();
        });
        
        // Modal close buttons
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.dataset.close;
                this.closeModal(modalId);
            });
        });
        
        // Close modal on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                }
            });
        });
    },
    
    /**
     * Load initial data
     */
    loadInitialData() {
        this.showLoading();
        
        // Initialize data store
        DataStore.init();
        
        // Show national overview
        this.showNationalOverview();
        
        // Load rankings
        this.updateRankings('sigungu');
        
        this.hideLoading();
    },
    
    /**
     * Handle Sido selection change
     */
    onSidoChange(sidoCode) {
        const sigunguSelect = document.getElementById('sigunguSelect');
        const dongSelect = document.getElementById('dongSelect');
        
        // Reset child selects
        sigunguSelect.innerHTML = '<option value="">시/군/구 선택</option>';
        dongSelect.innerHTML = '<option value="">읍/면/동 선택</option>';
        dongSelect.disabled = true;
        
        if (!sidoCode) {
            sigunguSelect.disabled = true;
            this.showNationalOverview();
            return;
        }
        
        // Load sigungu list
        const sigunguList = DataStore.getSigunguList(sidoCode);
        sigunguList.forEach(sg => {
            const option = document.createElement('option');
            option.value = sg.code;
            option.textContent = sg.name;
            sigunguSelect.appendChild(option);
        });
        sigunguSelect.disabled = false;
        
        // Update display for Sido level
        const regionData = DataStore.getRegion(sidoCode);
        if (regionData) {
            DataStore.currentRegion = regionData;
            this.updateDisplay(regionData);
            this.updateBreadcrumb([{ name: regionData.name, code: sidoCode }]);
        }
    },
    
    /**
     * Handle Sigungu selection change
     */
    onSigunguChange(sigunguCode) {
        const dongSelect = document.getElementById('dongSelect');
        
        // Reset dong select
        dongSelect.innerHTML = '<option value="">읍/면/동 선택</option>';
        
        if (!sigunguCode) {
            dongSelect.disabled = true;
            // Fall back to Sido level
            if (AppState.selectedSido) {
                this.onSidoChange(AppState.selectedSido);
            }
            return;
        }
        
        // For demo, we'll keep dong disabled but update display
        dongSelect.disabled = true;
        
        // Generate or get sigungu data
        let regionData = DataStore.getRegion(sigunguCode);
        if (!regionData) {
            // Generate data for this sigungu
            const sidoCode = sigunguCode.substring(0, 2);
            const sigunguList = DataStore.getSigunguList(sidoCode.padEnd(10, '0'));
            const sgInfo = sigunguList.find(s => s.code === sigunguCode);
            if (sgInfo) {
                regionData = DemoDataGenerator.generateRegionData(
                    sigunguCode, sgInfo.name, sgInfo.type
                );
                DataStore.regions.set(sigunguCode, regionData);
            }
        }
        
        if (regionData) {
            DataStore.currentRegion = regionData;
            this.updateDisplay(regionData);
            
            const sidoName = SIDO_CODES[sigunguCode.substring(0, 2)]?.name || '';
            this.updateBreadcrumb([
                { name: sidoName, code: AppState.selectedSido },
                { name: regionData.name, code: sigunguCode }
            ]);
        }
    },
    
    /**
     * Handle Dong selection change
     */
    onDongChange(dongCode) {
        // Placeholder for dong-level data
        console.log('Dong selected:', dongCode);
    },
    
    /**
     * Show national overview
     */
    showNationalOverview() {
        // Aggregate all sido data
        let totalPop = 0;
        let totalElderly = 0;
        let totalChildren = 0;
        let totalProductive = 0;
        let totalYoungOld = 0;
        let totalOldOld = 0;
        
        DataStore.getSidoList().forEach(sido => {
            const region = DataStore.getRegion(sido.code);
            if (region && region.data[AppState.currentYear]) {
                const d = region.data[AppState.currentYear];
                totalPop += d.totalPopulation;
                totalChildren += d.children;
                totalProductive += d.productive;
                totalYoungOld += d.youngOld;
                totalOldOld += d.oldOld;
            }
        });
        
        totalElderly = totalYoungOld + totalOldOld;
        
        // Update stats
        this.updateStats({
            totalPopulation: totalPop,
            elderly: totalElderly,
            agingRatio: (totalElderly / totalPop) * 100,
            urgencyScore: 50 // National average
        });
        
        // Update pyramid with national distribution
        this.updatePyramid({
            name: '전국',
            data: {
                [AppState.currentYear]: {
                    ageDistribution: this.generateNationalAgeDistribution(totalPop)
                }
            }
        });
        
        // Update cluster chart
        this.updateClusterChart({
            children: totalChildren,
            productive: totalProductive,
            youngOld: totalYoungOld,
            oldOld: totalOldOld
        });
        
        // Update trend chart
        this.updateTrendChart('agingRatio', true);
        
        this.updateBreadcrumb([{ name: '전국', code: null }]);
    },
    
    generateNationalAgeDistribution(totalPop) {
        const weights = {
            '0-4': 0.035, '5-9': 0.04, '10-14': 0.045, '15-19': 0.05,
            '20-24': 0.055, '25-29': 0.065, '30-34': 0.07, '35-39': 0.075,
            '40-44': 0.08, '45-49': 0.085, '50-54': 0.085, '55-59': 0.08,
            '60-64': 0.075, '65-69': 0.065, '70-74': 0.055, '75-79': 0.04,
            '80-84': 0.025, '85+': 0.015
        };
        
        const male = [];
        const female = [];
        
        Object.values(weights).forEach((w, i) => {
            const groupPop = Math.round(totalPop * w);
            const maleRatio = i >= 13 ? 0.42 : 0.51;
            male.push(Math.round(groupPop * maleRatio));
            female.push(Math.round(groupPop * (1 - maleRatio)));
        });
        
        return { male, female };
    },
    
    /**
     * Update all display elements
     */
    updateDisplay(regionData) {
        const year = AppState.currentYear;
        const yearData = regionData.data[year];
        
        if (!yearData) {
            console.warn('No data for year:', year);
            return;
        }
        
        const metrics = DataProcessor.calculateMetrics(yearData);
        const trends = this.calculateRegionTrends(regionData);
        const urgencyScore = DataProcessor.calculateUrgencyScore(metrics, trends);
        
        // Update stats
        this.updateStats({
            totalPopulation: yearData.totalPopulation,
            elderly: yearData.youngOld + yearData.oldOld,
            agingRatio: metrics.agingRatio,
            urgencyScore: urgencyScore,
            trends: trends
        });
        
        // Update pyramid
        this.updatePyramid(regionData);
        
        // Update cluster chart
        this.updateClusterChart({
            children: yearData.children,
            productive: yearData.productive,
            youngOld: yearData.youngOld,
            oldOld: yearData.oldOld
        });
        
        // Update trend chart
        this.updateTrendChart('agingRatio');
    },
    
    calculateRegionTrends(regionData) {
        const years = Object.keys(regionData.data).map(Number).sort();
        if (years.length < 2) return { agingVelocity: 0, populationChange: 0 };
        
        const first = regionData.data[years[0]];
        const last = regionData.data[years[years.length - 1]];
        
        const firstElderly = first.youngOld + first.oldOld;
        const lastElderly = last.youngOld + last.oldOld;
        
        return {
            agingVelocity: DataProcessor.calculateCAGR(
                firstElderly, lastElderly, years.length - 1
            ),
            populationChange: ((last.totalPopulation - first.totalPopulation) / 
                first.totalPopulation) * 100
        };
    },
    
    /**
     * Update statistics cards
     */
    updateStats(data) {
        // Total population
        document.getElementById('totalPopulation').textContent = 
            data.totalPopulation.toLocaleString() + '명';
        
        // Elderly population
        document.getElementById('elderlyPopulation').textContent = 
            data.elderly.toLocaleString() + '명';
        
        // Aging ratio
        const agingRatioEl = document.getElementById('agingRatio');
        agingRatioEl.textContent = data.agingRatio.toFixed(1) + '%';
        
        // Aging badge
        const agingBadge = document.getElementById('agingBadge');
        if (data.agingRatio >= 20) {
            agingBadge.textContent = '초고령';
            agingBadge.className = 'stat-badge super-aged';
        } else if (data.agingRatio >= 14) {
            agingBadge.textContent = '고령';
            agingBadge.className = 'stat-badge';
        } else {
            agingBadge.textContent = '고령화';
            agingBadge.className = 'stat-badge';
            agingBadge.style.background = '#34d399';
        }
        
        // Urgency score
        document.getElementById('urgencyScore').textContent = 
            Math.round(data.urgencyScore) + '/100';
        
        // Urgency meter
        document.getElementById('urgencyMeter').style.width = 
            data.urgencyScore + '%';
        
        // Trend indicators
        if (data.trends) {
            const trendEl = document.querySelector('.stat-card[data-metric="population"] .trend-value');
            if (trendEl) {
                const change = data.trends.populationChange;
                trendEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(1) + '%';
                trendEl.parentElement.className = 'stat-trend ' + (change >= 0 ? 'up' : 'down');
            }
            
            const elderlyTrendEl = document.querySelector('.stat-card[data-metric="elderly"] .trend-value');
            if (elderlyTrendEl) {
                const velocity = data.trends.agingVelocity;
                elderlyTrendEl.textContent = '+' + velocity.toFixed(1) + '%/년';
            }
        }
    },
    
    /**
     * Update population pyramid
     */
    updatePyramid(regionData) {
        const year = AppState.currentYear;
        const yearData = regionData.data[year];
        
        if (!yearData || !yearData.ageDistribution) {
            console.warn('No age distribution data');
            return;
        }
        
        ChartFactory.pyramid.render(
            {
                male: yearData.ageDistribution.male,
                female: yearData.ageDistribution.female
            },
            {
                regionName: regionData.name,
                year: year,
                highlightElderly: true
            }
        );
    },
    
    /**
     * Update cluster doughnut chart
     */
    updateClusterChart(data) {
        ChartFactory.cluster.render(data);
    },
    
    /**
     * Update trend line chart
     */
    updateTrendChart(metric = 'agingRatio', isNational = false) {
        const region = DataStore.currentRegion;
        
        let trendData;
        let nationalData = DemoDataGenerator.generateNationalTrend(metric);
        
        if (isNational || !region) {
            trendData = nationalData;
            trendData.label = '전국 평균';
            nationalData = null;
        } else {
            trendData = DemoDataGenerator.generateTrendData(region, metric);
        }
        
        const units = {
            agingRatio: '%',
            oldOldRatio: '%',
            dependencyRatio: '%',
            population: '명'
        };
        
        ChartFactory.trend.render(trendData, {
            metric: metric,
            unit: units[metric] || '%',
            showNational: !isNational,
            nationalData: nationalData
        });
        
        // Update trend summary
        this.updateTrendSummary(trendData);
    },
    
    updateTrendSummary(trendData) {
        const values = trendData.values;
        if (values.length < 2) return;
        
        const first = values[0];
        const last = values[values.length - 1];
        const change = last - first;
        const cagr = DataProcessor.calculateCAGR(first, last, values.length - 1);
        
        document.getElementById('trendChange').textContent = 
            (change >= 0 ? '+' : '') + change.toFixed(1) + '%p';
        document.getElementById('trendChange').style.color = 
            change >= 0 ? '#f87171' : '#34d399';
        
        document.getElementById('trendCAGR').textContent = 
            (cagr >= 0 ? '+' : '') + cagr.toFixed(1) + '%';
    },
    
    /**
     * Update breadcrumb navigation
     */
    updateBreadcrumb(path) {
        const breadcrumb = document.getElementById('breadcrumb');
        breadcrumb.innerHTML = path.map((item, index) => `
            <span class="breadcrumb-item ${index === path.length - 1 ? 'active' : ''}" 
                  data-code="${item.code || ''}">
                ${item.name}
            </span>
        `).join('');
        
        // Add click handlers
        breadcrumb.querySelectorAll('.breadcrumb-item').forEach(item => {
            item.addEventListener('click', () => {
                const code = item.dataset.code;
                if (!code) {
                    // Go to national view
                    document.getElementById('sidoSelect').value = '';
                    AppState.selectedSido = null;
                    this.showNationalOverview();
                }
            });
        });
    },
    
    /**
     * Update rankings list
     */
    updateRankings(scope = 'sigungu') {
        const rankings = DataStore.getRankings(scope, 'urgency', 10);
        const container = document.getElementById('rankingList');
        
        container.innerHTML = rankings.map((item, index) => `
            <div class="ranking-item" data-code="${item.code}">
                <span class="ranking-rank">${index + 1}</span>
                <div class="ranking-info">
                    <span class="ranking-name">${item.name}</span>
                    <span class="ranking-meta">고령화율 ${item.agingRatio.toFixed(1)}%</span>
                </div>
                <span class="ranking-score">${Math.round(item.urgencyScore)}</span>
                <div class="ranking-bar">
                    <div class="ranking-bar-fill" style="width: ${item.urgencyScore}%; 
                         background: ${this.getUrgencyColor(item.urgencyScore)}"></div>
                </div>
            </div>
        `).join('');
        
        // Add click handlers
        container.querySelectorAll('.ranking-item').forEach(item => {
            item.addEventListener('click', () => {
                const code = item.dataset.code;
                this.selectRegionByCode(code);
            });
        });
    },
    
    getUrgencyColor(score) {
        if (score >= 80) return '#dc2626';
        if (score >= 60) return '#f97316';
        if (score >= 40) return '#fbbf24';
        if (score >= 20) return '#34d399';
        return '#60a5fa';
    },
    
    selectRegionByCode(code) {
        const region = DataStore.getRegion(code);
        if (!region) return;
        
        DataStore.currentRegion = region;
        
        // Update selects
        const sidoCode = code.substring(0, 2).padEnd(10, '0');
        document.getElementById('sidoSelect').value = sidoCode;
        AppState.selectedSido = sidoCode;
        this.onSidoChange(sidoCode);
        
        if (code !== sidoCode) {
            document.getElementById('sigunguSelect').value = code;
            AppState.selectedSigungu = code;
            this.onSigunguChange(code);
        }
    },
    
    /**
     * Generate report
     */
    generateReport() {
        const region = DataStore.currentRegion;
        if (!region) {
            this.showToast('먼저 지역을 선택해주세요');
            return;
        }
        
        const year = AppState.currentYear;
        const yearData = region.data[year];
        const metrics = DataProcessor.calculateMetrics(yearData);
        const trends = this.calculateRegionTrends(region);
        const urgencyScore = DataProcessor.calculateUrgencyScore(metrics, trends);
        
        // Generate rationale text
        const report = this.generateRationaleText(region, yearData, metrics, trends);
        
        // Display report
        const outputEl = document.getElementById('reportOutput');
        outputEl.innerHTML = `<div class="report-content">${report}</div>`;
        
        // Show actions
        document.getElementById('reportActions').style.display = 'flex';
    },
    
    generateRationaleText(region, yearData, metrics, trends) {
        const name = region.name;
        const year = AppState.currentYear;
        const startYear = 2021;
        
        const elderly = yearData.youngOld + yearData.oldOld;
        const oldOldPct = ((yearData.oldOld / yearData.totalPopulation) * 100).toFixed(1);
        
        // Determine aging status
        let statusText = '';
        if (metrics.agingRatio >= 20) {
            statusText = `<span class="critical">초고령사회에 진입한</span>`;
        } else if (metrics.agingRatio >= 14) {
            statusText = `<span class="warning">고령사회 단계에 있는</span>`;
        } else {
            statusText = '고령화가 진행 중인';
        }
        
        // National comparison
        const nationalDiff = metrics.agingRatio - NATIONAL_REFERENCE.agingRatio;
        let comparisonText = '';
        if (nationalDiff > 2) {
            comparisonText = `이는 <span class="highlight">전국 평균(${NATIONAL_REFERENCE.agingRatio}%)을 ${nationalDiff.toFixed(1)}%p 상회</span>하는 수치로,`;
        } else if (nationalDiff < -2) {
            comparisonText = `이는 전국 평균(${NATIONAL_REFERENCE.agingRatio}%)보다 ${Math.abs(nationalDiff).toFixed(1)}%p 낮은 수준이나,`;
        } else {
            comparisonText = `이는 전국 평균(${NATIONAL_REFERENCE.agingRatio}%)과 유사한 수준으로,`;
        }
        
        // Trend description
        let trendText = '';
        if (trends.agingVelocity > 5) {
            trendText = `<span class="critical">급속한 고령화(연 ${trends.agingVelocity.toFixed(1)}% 증가)</span>가 진행되고 있어`;
        } else if (trends.agingVelocity > NATIONAL_REFERENCE.agingVelocity) {
            trendText = `전국 평균을 상회하는 고령화 속도(연 ${trends.agingVelocity.toFixed(1)}%)를 보이고 있어`;
        } else {
            trendText = `안정적인 고령화 추이를 보이고 있으나`;
        }
        
        // Service recommendation
        let serviceText = '';
        if (metrics.oldOldRatio > 50) {
            serviceText = '<span class="metric">재가돌봄서비스 및 치매전문돌봄</span>의 확충이 시급합니다.';
        } else if (metrics.oldOldRatio > 40) {
            serviceText = '<span class="metric">재가돌봄서비스</span>의 확대가 필요합니다.';
        } else {
            serviceText = '<span class="metric">사회참여 프로그램</span>의 활성화가 권장됩니다.';
        }
        
        return `
            <p>
                <strong>${name}</strong>은(는) ${statusText} 지역으로, 
                <span class="metric">${year}년 기준 65세 이상 고령인구가 ${elderly.toLocaleString()}명</span>으로 
                전체 인구의 <span class="metric">${metrics.agingRatio.toFixed(1)}%</span>를 차지하고 있습니다.
            </p>
            <p>
                ${comparisonText} 특히 75세 이상 후기고령인구는 
                전체 인구의 <span class="metric">${oldOldPct}%</span>를 차지하며, 
                ${startYear}년 대비 <span class="warning">${trends.agingVelocity > 0 ? '연평균 ' + trends.agingVelocity.toFixed(1) + '%씩 증가</span>하고 있습니다.
            </p>
            <p>
                ${trendText} ${serviceText}
            </p>
            <p style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(148, 163, 184, 0.2);">
                <strong>📊 핵심 지표 요약</strong><br>
                • 총인구: ${yearData.totalPopulation.toLocaleString()}명<br>
                • 고령화율: ${metrics.agingRatio.toFixed(1)}% (전국 ${NATIONAL_REFERENCE.agingRatio}%)<br>
                • 후기고령 비율: ${metrics.oldOldRatio.toFixed(1)}% (전국 ${NATIONAL_REFERENCE.oldOldRatio}%)<br>
                • 부양비: ${metrics.dependencyRatio.toFixed(1)}%<br>
                • 고령화 속도: 연 ${trends.agingVelocity.toFixed(1)}% 증가
            </p>
        `;
    },
    
    /**
     * Copy report to clipboard
     */
    async copyReportToClipboard() {
        const reportContent = document.querySelector('.report-content');
        if (!reportContent) return;
        
        // Get plain text version
        const text = reportContent.innerText;
        
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('클립보드에 복사되었습니다');
        } catch (err) {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showToast('클립보드에 복사되었습니다');
        }
    },
    
    /**
     * Download report as file
     */
    downloadReport() {
        const reportContent = document.querySelector('.report-content');
        if (!reportContent) return;
        
        const region = DataStore.currentRegion;
        const text = reportContent.innerText;
        
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${region ? region.name : '지역'}_인구분석_${AppState.currentYear}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('파일이 다운로드되었습니다');
    },
    
    /**
     * Toggle compare mode
     */
    toggleCompareMode() {
        AppState.compareMode = !AppState.compareMode;
        
        if (AppState.compareMode) {
            this.openModal('compareModal');
            
            // Update base region display
            const baseEl = document.getElementById('baseRegion');
            if (DataStore.currentRegion) {
                baseEl.textContent = DataStore.currentRegion.name;
            } else {
                baseEl.textContent = '전국';
            }
        } else {
            this.closeModal('compareModal');
        }
    },
    
    /**
     * Toggle pyramid comparison layer
     */
    togglePyramidCompare() {
        const compareLegend = document.getElementById('compareLegend');
        
        if (compareLegend.style.display === 'none') {
            // Add national comparison
            const nationalDist = this.generateNationalAgeDistribution(NATIONAL_REFERENCE.totalPopulation);
            ChartFactory.pyramid.toggleCompare(nationalDist);
            compareLegend.style.display = 'flex';
            compareLegend.querySelector('.legend-label').textContent = '전국 평균';
        } else {
            ChartFactory.pyramid.toggleCompare(null);
            compareLegend.style.display = 'none';
        }
    },
    
    /**
     * Apply target filter
     */
    applyTargetFilter() {
        // Highlight relevant data based on selected target
        console.log('Target filter:', AppState.selectedTarget);
        // In a full implementation, this would filter/highlight chart data
    },
    
    /**
     * Apply keyword filter
     */
    applyKeywordFilter() {
        const keyword = AppState.keyword.toLowerCase();
        if (!keyword) return;
        
        // Search in region names and metadata
        console.log('Keyword search:', keyword);
        // Placeholder for keyword-based filtering
    },
    
    /**
     * Refresh all data
     */
    refreshData() {
        if (DataStore.currentRegion) {
            this.updateDisplay(DataStore.currentRegion);
        } else {
            this.showNationalOverview();
        }
        this.updateRankings();
    },
    
    /**
     * Run full analysis
     */
    runAnalysis() {
        this.showLoading();
        
        setTimeout(() => {
            this.refreshData();
            this.hideLoading();
            this.showToast('분석이 완료되었습니다');
        }, 500);
    },
    
    /**
     * Scroll to report section
     */
    scrollToReport() {
        document.getElementById('reportSection').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    },
    
    /**
     * Modal controls
     */
    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    },
    
    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    },
    
    /**
     * Toast notification
     */
    showToast(message) {
        const toast = document.getElementById('toast');
        toast.querySelector('.toast-message').textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    },
    
    /**
     * Loading overlay
     */
    showLoading() {
        AppState.isLoading = true;
        document.getElementById('loadingOverlay').classList.add('active');
    },
    
    hideLoading() {
        AppState.isLoading = false;
        document.getElementById('loadingOverlay').classList.remove('active');
    }
};

// ============================================
// INITIALIZE ON DOM READY
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    UIController.init();
});

// ============================================
// EXPORT
// ============================================
window.AppState = AppState;
window.UIController = UIController;
