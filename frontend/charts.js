/**
 * SODAPOP 2.0 - Chart.js Visualizations
 * Antigravity Edition
 * 
 * Population Pyramids, Trend Charts, and Cluster Distributions
 * with aging-focused color highlighting
 */

// Register Chart.js plugins
Chart.register(ChartDataLabels);

// ============================================
// COLOR CONFIGURATION
// ============================================
const ChartColors = {
    // Gender
    male: 'rgba(59, 130, 246, 0.8)',
    maleLight: 'rgba(59, 130, 246, 0.4)',
    maleBorder: 'rgb(59, 130, 246)',
    female: 'rgba(236, 72, 153, 0.8)',
    femaleLight: 'rgba(236, 72, 153, 0.4)',
    femaleBorder: 'rgb(236, 72, 153)',
    
    // Comparison
    compareBase: 'rgba(255, 255, 255, 0.3)',
    compareBorder: 'rgba(255, 255, 255, 0.6)',
    
    // Welfare Clusters
    children: '#4ECDC4',
    productive: '#45B7D1',
    youngOld: '#F7B731',
    oldOld: '#FC5C65',
    
    // Aging Highlight (Red tones for elderly emphasis)
    agingHighlight: 'rgba(248, 113, 113, 0.3)',
    agingBorder: 'rgb(220, 38, 38)',
    
    // Trend colors
    primary: '#6366f1',
    secondary: '#a855f7',
    accent: '#22d3ee',
    warning: '#fbbf24',
    danger: '#f87171',
    success: '#34d399',
    
    // Grid & Text
    gridColor: 'rgba(148, 163, 184, 0.1)',
    textColor: '#94a3b8',
    textLight: '#64748b',
};

// ============================================
// STANDARD AGE GROUPS (5-year intervals)
// ============================================
const AGE_GROUPS = [
    '0-4', '5-9', '10-14', '15-19',
    '20-24', '25-29', '30-34', '35-39',
    '40-44', '45-49', '50-54', '55-59',
    '60-64', '65-69', '70-74', '75-79',
    '80-84', '85+'
];

// Age groups that are "elderly" (65+) - for red highlighting
const ELDERLY_GROUPS = ['65-69', '70-74', '75-79', '80-84', '85+'];
const OLD_OLD_GROUPS = ['75-79', '80-84', '85+']; // 후기고령

// ============================================
// CHART INSTANCES (Global references)
// ============================================
let pyramidChart = null;
let trendChart = null;
let clusterChart = null;

// ============================================
// POPULATION PYRAMID CHART
// ============================================
class PopulationPyramidChart {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.chart = null;
        this.compareData = null;
    }
    
    /**
     * Create/update the population pyramid
     * @param {Object} data - { male: number[], female: number[], labels: string[] }
     * @param {Object} options - { regionName, year, highlightElderly }
     */
    render(data, options = {}) {
        const {
            regionName = '',
            year = 2025,
            highlightElderly = true,
            compareData = null
        } = options;
        
        // Store compare data for toggle
        this.compareData = compareData;
        
        // Prepare datasets
        const datasets = this._buildDatasets(data, highlightElderly, compareData);
        
        // Calculate max for symmetric axis
        const allValues = [...data.male, ...data.female];
        if (compareData) {
            allValues.push(...compareData.male, ...compareData.female);
        }
        const maxValue = Math.max(...allValues) * 1.15;
        
        // Chart configuration
        const config = {
            type: 'bar',
            data: {
                labels: AGE_GROUPS,
                datasets: datasets
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 800,
                    easing: 'easeOutQuart'
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        titleColor: '#f1f5f9',
                        bodyColor: '#94a3b8',
                        borderColor: 'rgba(99, 102, 241, 0.3)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            title: (items) => `연령대: ${items[0].label}`,
                            label: (context) => {
                                const value = Math.abs(context.raw);
                                const label = context.dataset.label;
                                return `${label}: ${value.toLocaleString()}명`;
                            }
                        }
                    },
                    datalabels: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        stacked: false,
                        min: -maxValue,
                        max: maxValue,
                        grid: {
                            color: ChartColors.gridColor,
                            drawBorder: false
                        },
                        ticks: {
                            color: ChartColors.textColor,
                            font: { size: 10 },
                            callback: (value) => {
                                const absValue = Math.abs(value);
                                if (absValue >= 1000000) {
                                    return (absValue / 1000000).toFixed(1) + 'M';
                                } else if (absValue >= 1000) {
                                    return (absValue / 1000).toFixed(0) + 'K';
                                }
                                return absValue;
                            }
                        },
                        title: {
                            display: true,
                            text: '← 남성          인구 수          여성 →',
                            color: ChartColors.textLight,
                            font: { size: 11 }
                        }
                    },
                    y: {
                        stacked: false,
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: (context) => {
                                // Highlight elderly age groups in red
                                if (highlightElderly && ELDERLY_GROUPS.includes(AGE_GROUPS[context.index])) {
                                    return ChartColors.danger;
                                }
                                return ChartColors.textColor;
                            },
                            font: (context) => ({
                                size: 11,
                                weight: ELDERLY_GROUPS.includes(AGE_GROUPS[context.index]) ? 'bold' : 'normal'
                            })
                        }
                    }
                }
            },
            plugins: [this._createElderlyHighlightPlugin(highlightElderly)]
        };
        
        // Destroy existing chart if any
        if (this.chart) {
            this.chart.destroy();
        }
        
        // Create new chart
        this.chart = new Chart(this.ctx, config);
        pyramidChart = this.chart;
        
        return this.chart;
    }
    
    _buildDatasets(data, highlightElderly, compareData) {
        const datasets = [];
        
        // Male data (negative values for left side)
        const maleData = data.male.map((v, i) => {
            // Apply aging highlight color for elderly groups
            return -v;
        });
        
        // Female data (positive values for right side)
        const femaleData = data.female;
        
        // Background colors with elderly highlighting
        const maleColors = AGE_GROUPS.map(group => {
            if (highlightElderly && OLD_OLD_GROUPS.includes(group)) {
                return 'rgba(220, 38, 38, 0.8)'; // Deep red for 75+
            } else if (highlightElderly && ELDERLY_GROUPS.includes(group)) {
                return 'rgba(248, 113, 113, 0.8)'; // Light red for 65-74
            }
            return ChartColors.male;
        });
        
        const femaleColors = AGE_GROUPS.map(group => {
            if (highlightElderly && OLD_OLD_GROUPS.includes(group)) {
                return 'rgba(220, 38, 38, 0.7)'; // Deep red for 75+
            } else if (highlightElderly && ELDERLY_GROUPS.includes(group)) {
                return 'rgba(248, 113, 113, 0.7)'; // Light red for 65-74
            }
            return ChartColors.female;
        });
        
        datasets.push({
            label: '남성',
            data: maleData,
            backgroundColor: maleColors,
            borderColor: maleColors.map(c => c.replace(/[\d.]+\)$/, '1)')),
            borderWidth: 1,
            borderRadius: 2,
            barPercentage: 0.85,
            categoryPercentage: 0.9
        });
        
        datasets.push({
            label: '여성',
            data: femaleData,
            backgroundColor: femaleColors,
            borderColor: femaleColors.map(c => c.replace(/[\d.]+\)$/, '1)')),
            borderWidth: 1,
            borderRadius: 2,
            barPercentage: 0.85,
            categoryPercentage: 0.9
        });
        
        // Add comparison overlay if provided
        if (compareData) {
            datasets.push({
                label: '비교 (남성)',
                data: compareData.male.map(v => -v),
                backgroundColor: 'transparent',
                borderColor: ChartColors.compareBorder,
                borderWidth: 2,
                borderDash: [5, 5],
                barPercentage: 0.85,
                categoryPercentage: 0.9,
                order: 0
            });
            
            datasets.push({
                label: '비교 (여성)',
                data: compareData.female,
                backgroundColor: 'transparent',
                borderColor: ChartColors.compareBorder,
                borderWidth: 2,
                borderDash: [5, 5],
                barPercentage: 0.85,
                categoryPercentage: 0.9,
                order: 0
            });
        }
        
        return datasets;
    }
    
    _createElderlyHighlightPlugin(enabled) {
        return {
            id: 'elderlyHighlight',
            beforeDraw: (chart) => {
                if (!enabled) return;
                
                const ctx = chart.ctx;
                const yAxis = chart.scales.y;
                const chartArea = chart.chartArea;
                
                // Find the y-position of first elderly group (65-69)
                const elderlyStartIndex = AGE_GROUPS.indexOf('65-69');
                if (elderlyStartIndex === -1) return;
                
                const startY = yAxis.getPixelForValue(elderlyStartIndex) - (yAxis.height / AGE_GROUPS.length / 2);
                const endY = chartArea.bottom;
                
                // Draw highlight zone
                ctx.save();
                ctx.fillStyle = ChartColors.agingHighlight;
                ctx.fillRect(chartArea.left, startY, chartArea.width, endY - startY);
                ctx.restore();
            }
        };
    }
    
    toggleCompare(compareData) {
        if (this.chart) {
            // Update or remove comparison datasets
            const currentDatasets = this.chart.data.datasets;
            
            if (compareData) {
                // Add comparison datasets
                if (currentDatasets.length === 2) {
                    currentDatasets.push({
                        label: '비교 (남성)',
                        data: compareData.male.map(v => -v),
                        backgroundColor: 'transparent',
                        borderColor: ChartColors.compareBorder,
                        borderWidth: 2,
                        borderDash: [5, 5],
                        barPercentage: 0.85,
                        categoryPercentage: 0.9
                    });
                    currentDatasets.push({
                        label: '비교 (여성)',
                        data: compareData.female,
                        backgroundColor: 'transparent',
                        borderColor: ChartColors.compareBorder,
                        borderWidth: 2,
                        borderDash: [5, 5],
                        barPercentage: 0.85,
                        categoryPercentage: 0.9
                    });
                }
            } else {
                // Remove comparison datasets
                this.chart.data.datasets = currentDatasets.slice(0, 2);
            }
            
            this.chart.update('active');
        }
    }
    
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}

// ============================================
// TREND LINE CHART
// ============================================
class TrendLineChart {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.chart = null;
    }
    
    /**
     * Render trend chart
     * @param {Object} data - { years: number[], values: number[], label: string }
     * @param {Object} options - { metric, unit, showNational }
     */
    render(data, options = {}) {
        const {
            metric = 'aging_ratio',
            unit = '%',
            showNational = true,
            nationalData = null
        } = options;
        
        const datasets = [{
            label: data.label || '선택 지역',
            data: data.values,
            borderColor: ChartColors.primary,
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointBackgroundColor: ChartColors.primary,
            pointBorderColor: '#fff',
            pointBorderWidth: 2
        }];
        
        // Add national average line if provided
        if (showNational && nationalData) {
            datasets.push({
                label: '전국 평균',
                data: nationalData.values,
                borderColor: ChartColors.textLight,
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: ChartColors.textLight
            });
        }
        
        const config = {
            type: 'line',
            data: {
                labels: data.years,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: datasets.length > 1,
                        position: 'top',
                        labels: {
                            color: ChartColors.textColor,
                            usePointStyle: true,
                            padding: 15,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        titleColor: '#f1f5f9',
                        bodyColor: '#94a3b8',
                        borderColor: 'rgba(99, 102, 241, 0.3)',
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: (context) => {
                                return `${context.dataset.label}: ${context.raw.toFixed(1)}${unit}`;
                            }
                        }
                    },
                    datalabels: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: ChartColors.gridColor,
                            drawBorder: false
                        },
                        ticks: {
                            color: ChartColors.textColor,
                            font: { size: 11 }
                        }
                    },
                    y: {
                        grid: {
                            color: ChartColors.gridColor,
                            drawBorder: false
                        },
                        ticks: {
                            color: ChartColors.textColor,
                            font: { size: 11 },
                            callback: (value) => value + unit
                        }
                    }
                }
            }
        };
        
        if (this.chart) {
            this.chart.destroy();
        }
        
        this.chart = new Chart(this.ctx, config);
        trendChart = this.chart;
        
        return this.chart;
    }
    
    updateMetric(newData) {
        if (this.chart) {
            this.chart.data.datasets[0].data = newData.values;
            this.chart.update('active');
        }
    }
    
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}

// ============================================
// CLUSTER DOUGHNUT CHART
// ============================================
class ClusterDoughnutChart {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.chart = null;
    }
    
    /**
     * Render welfare cluster distribution
     * @param {Object} data - { children, productive, youngOld, oldOld }
     */
    render(data) {
        const clusterData = [
            { label: '아동·청소년 (0-18)', value: data.children, color: ChartColors.children },
            { label: '생산가능 (19-64)', value: data.productive, color: ChartColors.productive },
            { label: '전기고령 (65-74)', value: data.youngOld, color: ChartColors.youngOld },
            { label: '후기고령 (75+)', value: data.oldOld, color: ChartColors.oldOld }
        ];
        
        const config = {
            type: 'doughnut',
            data: {
                labels: clusterData.map(d => d.label),
                datasets: [{
                    data: clusterData.map(d => d.value),
                    backgroundColor: clusterData.map(d => d.color),
                    borderColor: 'rgba(15, 23, 42, 0.8)',
                    borderWidth: 3,
                    hoverBorderColor: '#fff',
                    hoverBorderWidth: 3,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1000,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        display: false // Using custom legend
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        titleColor: '#f1f5f9',
                        bodyColor: '#94a3b8',
                        borderColor: 'rgba(99, 102, 241, 0.3)',
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${context.raw.toLocaleString()}명 (${percentage}%)`;
                            }
                        }
                    },
                    datalabels: {
                        color: '#fff',
                        font: {
                            weight: 'bold',
                            size: 11
                        },
                        formatter: (value, context) => {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return percentage + '%';
                        }
                    }
                }
            },
            plugins: [this._createCenterTextPlugin(data)]
        };
        
        if (this.chart) {
            this.chart.destroy();
        }
        
        this.chart = new Chart(this.ctx, config);
        clusterChart = this.chart;
        
        // Update cluster details
        this._updateClusterDetails(clusterData);
        
        return this.chart;
    }
    
    _createCenterTextPlugin(data) {
        const total = data.children + data.productive + data.youngOld + data.oldOld;
        return {
            id: 'centerText',
            afterDraw: (chart) => {
                const ctx = chart.ctx;
                const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
                const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;
                
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Total label
                ctx.fillStyle = ChartColors.textLight;
                ctx.font = '11px Inter, sans-serif';
                ctx.fillText('총인구', centerX, centerY - 12);
                
                // Total value
                ctx.fillStyle = '#f1f5f9';
                ctx.font = 'bold 18px Inter, sans-serif';
                ctx.fillText(total.toLocaleString(), centerX, centerY + 8);
                
                ctx.restore();
            }
        };
    }
    
    _updateClusterDetails(clusterData) {
        const container = document.getElementById('clusterDetails');
        if (!container) return;
        
        const total = clusterData.reduce((sum, d) => sum + d.value, 0);
        
        container.innerHTML = clusterData.map(d => `
            <div class="cluster-item">
                <span class="cluster-dot" style="background: ${d.color}"></span>
                <div class="cluster-info">
                    <span class="cluster-name">${d.label}</span>
                    <span class="cluster-value">${d.value.toLocaleString()}명</span>
                </div>
            </div>
        `).join('');
    }
    
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}

// ============================================
// CHART FACTORY
// ============================================
const ChartFactory = {
    pyramid: null,
    trend: null,
    cluster: null,
    
    initAll() {
        this.pyramid = new PopulationPyramidChart('pyramidChart');
        this.trend = new TrendLineChart('trendChart');
        this.cluster = new ClusterDoughnutChart('clusterChart');
    },
    
    destroyAll() {
        if (this.pyramid) this.pyramid.destroy();
        if (this.trend) this.trend.destroy();
        if (this.cluster) this.cluster.destroy();
    }
};

// ============================================
// EXPORT
// ============================================
window.ChartColors = ChartColors;
window.AGE_GROUPS = AGE_GROUPS;
window.ELDERLY_GROUPS = ELDERLY_GROUPS;
window.OLD_OLD_GROUPS = OLD_OLD_GROUPS;
window.PopulationPyramidChart = PopulationPyramidChart;
window.TrendLineChart = TrendLineChart;
window.ClusterDoughnutChart = ClusterDoughnutChart;
window.ChartFactory = ChartFactory;
