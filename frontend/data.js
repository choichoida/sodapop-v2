/**
 * SODAPOP 2.0 - Data Module
 * 
 * KOSIS OpenAPI Integration with Zero-Inertia Processing:
 * - Automatic '계' filtering
 * - Service Area grouping
 * - Welfare target classification
 */

// ============================================
// ADMINISTRATIVE HIERARCHY (H-Code)
// ============================================
const SIDO_CODES = {
    "11": { name: "서울특별시", type: "metropolitan" },
    "26": { name: "부산광역시", type: "metropolitan" },
    "27": { name: "대구광역시", type: "metropolitan" },
    "28": { name: "인천광역시", type: "metropolitan" },
    "29": { name: "광주광역시", type: "metropolitan" },
    "30": { name: "대전광역시", type: "metropolitan" },
    "31": { name: "울산광역시", type: "metropolitan" },
    "36": { name: "세종특별자치시", type: "special" },
    "41": { name: "경기도", type: "province" },
    "42": { name: "강원특별자치도", type: "province" },
    "43": { name: "충청북도", type: "province" },
    "44": { name: "충청남도", type: "province" },
    "45": { name: "전북특별자치도", type: "province" },
    "46": { name: "전라남도", type: "province" },
    "47": { name: "경상북도", type: "province" },
    "48": { name: "경상남도", type: "province" },
    "50": { name: "제주특별자치도", type: "special" }
};

// National reference values (2024/2025 estimates)
const NATIONAL_REFERENCE = {
    totalPopulation: 51700000,
    elderlyPopulation: 9930000,
    agingRatio: 19.2,
    oldOldRatio: 42.5,
    youthRatio: 11.8,
    dependencyRatio: 45.0,
    agingVelocity: 4.2
};

// ============================================
// KOSIS API CONFIGURATION
// ============================================
const KOSIS_CONFIG = {
    baseUrl: 'https://kosis.kr/openapi/Param/statisticsParameterData.do',
    // Note: API key should be stored securely in production
    // This is a placeholder - replace with actual key
    apiKey: 'YOUR_KOSIS_API_KEY',
    format: 'json',
    
    // Common table IDs
    tables: {
        populationByAge: 'DT_1B040A3',
        populationByDistrict: 'DT_1B040M1',
        householdComposition: 'DT_1JC1501'
    }
};

// ============================================
// DATA PROCESSOR CLASS
// ============================================
class DataProcessor {
    /**
     * Filter out '계' (total) entries from data
     * Following Zero-Inertia principle
     */
    static filterTotals(data, field = 'name') {
        const totalPatterns = ['계', '소계', '합계', '전체', '전국'];
        return data.filter(item => {
            const value = item[field] || '';
            return !totalPatterns.some(pattern => value.includes(pattern));
        });
    }
    
    /**
     * Parse age string to numeric range
     * Handles formats: "0세", "0~4세", "85세 이상", "85+"
     */
    static parseAgeGroup(ageStr) {
        const str = String(ageStr).trim();
        
        // Single age: "25세"
        const singleMatch = str.match(/^(\d+)세?$/);
        if (singleMatch) {
            const age = parseInt(singleMatch[1]);
            return { min: age, max: age };
        }
        
        // Range: "0~4세" or "0-4"
        const rangeMatch = str.match(/^(\d+)[~\-](\d+)세?$/);
        if (rangeMatch) {
            return { 
                min: parseInt(rangeMatch[1]), 
                max: parseInt(rangeMatch[2]) 
            };
        }
        
        // Open-ended: "85세 이상" or "85+"
        const openMatch = str.match(/^(\d+)(세?\s*이상|\+)$/);
        if (openMatch) {
            return { 
                min: parseInt(openMatch[1]), 
                max: 120 
            };
        }
        
        return null;
    }
    
    /**
     * Classify age into welfare target clusters
     */
    static classifyWelfareTarget(minAge, maxAge) {
        const clusters = {
            children: { min: 0, max: 18, name: '아동·청소년', color: '#4ECDC4' },
            productive: { min: 19, max: 64, name: '생산가능인구', color: '#45B7D1' },
            youngOld: { min: 65, max: 74, name: '전기고령', color: '#F7B731' },
            oldOld: { min: 75, max: 120, name: '후기고령', color: '#FC5C65' }
        };
        
        const result = [];
        
        for (const [key, cluster] of Object.entries(clusters)) {
            const overlapMin = Math.max(minAge, cluster.min);
            const overlapMax = Math.min(maxAge, cluster.max);
            
            if (overlapMin <= overlapMax) {
                const overlapRange = overlapMax - overlapMin + 1;
                const totalRange = maxAge - minAge + 1;
                const proportion = overlapRange / totalRange;
                
                result.push({
                    cluster: key,
                    name: cluster.name,
                    color: cluster.color,
                    proportion: proportion
                });
            }
        }
        
        return result;
    }
    
    /**
     * Aggregate multiple administrative areas into a Service Area
     */
    static createServiceArea(regions, name) {
        const aggregated = {
            code: `SA_${Date.now()}`,
            name: name,
            type: 'service_area',
            regions: regions.map(r => r.code),
            data: {}
        };
        
        // Aggregate population data by year
        const years = new Set();
        regions.forEach(r => {
            if (r.data) {
                Object.keys(r.data).forEach(y => years.add(parseInt(y)));
            }
        });
        
        years.forEach(year => {
            aggregated.data[year] = {
                totalPopulation: 0,
                male: 0,
                female: 0,
                children: 0,
                productive: 0,
                youngOld: 0,
                oldOld: 0,
                ageDistribution: {}
            };
            
            regions.forEach(region => {
                if (region.data && region.data[year]) {
                    const rd = region.data[year];
                    aggregated.data[year].totalPopulation += rd.totalPopulation || 0;
                    aggregated.data[year].male += rd.male || 0;
                    aggregated.data[year].female += rd.female || 0;
                    aggregated.data[year].children += rd.children || 0;
                    aggregated.data[year].productive += rd.productive || 0;
                    aggregated.data[year].youngOld += rd.youngOld || 0;
                    aggregated.data[year].oldOld += rd.oldOld || 0;
                }
            });
        });
        
        return aggregated;
    }
    
    /**
     * Calculate derived metrics
     */
    static calculateMetrics(data) {
        const elderly = (data.youngOld || 0) + (data.oldOld || 0);
        const total = data.totalPopulation || 1;
        
        return {
            agingRatio: (elderly / total) * 100,
            oldOldRatio: elderly > 0 ? (data.oldOld / elderly) * 100 : 0,
            youthRatio: (data.children / total) * 100,
            dependencyRatio: data.productive > 0 
                ? ((data.children + elderly) / data.productive) * 100 
                : 0,
            genderRatio: data.female > 0 
                ? (data.male / data.female) * 100 
                : 0
        };
    }
    
    /**
     * Calculate CAGR (Compound Annual Growth Rate)
     */
    static calculateCAGR(startValue, endValue, years) {
        if (startValue <= 0 || years <= 0) return 0;
        return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
    }
    
    /**
     * Calculate urgency score (0-100)
     */
    static calculateUrgencyScore(metrics, trends) {
        let score = 0;
        
        // Aging ratio component (max 25)
        if (metrics.agingRatio > 20) score += 25;
        else if (metrics.agingRatio > 14) score += 15;
        else score += metrics.agingRatio * 0.5;
        
        // Old-old ratio component (max 25)
        if (metrics.oldOldRatio > 50) score += 25;
        else if (metrics.oldOldRatio > 40) score += 15;
        else score += metrics.oldOldRatio * 0.3;
        
        // Aging velocity component (max 25)
        if (trends && trends.agingVelocity) {
            if (trends.agingVelocity > 5) score += 25;
            else if (trends.agingVelocity > 3) score += 15;
            else score += trends.agingVelocity * 3;
        }
        
        // Dependency ratio component (max 25)
        if (metrics.dependencyRatio > 60) score += 25;
        else if (metrics.dependencyRatio > 45) score += 15;
        else score += metrics.dependencyRatio * 0.3;
        
        return Math.min(100, Math.max(0, score));
    }
}

// ============================================
// KOSIS API CLIENT
// ============================================
class KOSISClient {
    constructor(apiKey = null) {
        this.apiKey = apiKey || KOSIS_CONFIG.apiKey;
        this.cache = new Map();
    }
    
    /**
     * Fetch data from KOSIS API
     * Note: In production, this should go through a backend proxy
     */
    async fetchData(params) {
        const cacheKey = JSON.stringify(params);
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        const url = new URL(KOSIS_CONFIG.baseUrl);
        url.searchParams.append('method', 'getList');
        url.searchParams.append('apiKey', this.apiKey);
        url.searchParams.append('format', KOSIS_CONFIG.format);
        url.searchParams.append('jsonVD', 'Y');
        
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });
        
        try {
            const response = await fetch(url.toString());
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            
            // Filter out '계' entries
            const filtered = DataProcessor.filterTotals(data, 'C1_NM');
            
            this.cache.set(cacheKey, filtered);
            return filtered;
            
        } catch (error) {
            console.error('KOSIS API Error:', error);
            throw error;
        }
    }
    
    /**
     * Fetch population by age for a region
     */
    async fetchPopulationByAge(regionCode, startYear = 2021, endYear = 2025) {
        return this.fetchData({
            orgId: '101',
            tblId: KOSIS_CONFIG.tables.populationByAge,
            objL1: regionCode,
            prdSe: 'Y',
            startPrdDe: String(startYear),
            endPrdDe: String(endYear)
        });
    }
}

// ============================================
// DEMO DATA GENERATOR
// ============================================
class DemoDataGenerator {
    /**
     * Generate realistic demographic data for demo purposes
     */
    static generateRegionData(regionCode, regionName, type = 'urban') {
        const baseParams = this._getBaseParams(type);
        const data = {};
        
        for (let year = 2021; year <= 2025; year++) {
            const yearIndex = year - 2021;
            const agingFactor = 1 + (yearIndex * 0.02);
            const youthFactor = 1 - (yearIndex * 0.015);
            const popFactor = 1 - (yearIndex * baseParams.popDecline);
            
            const totalPop = Math.round(baseParams.basePop * popFactor);
            const children = Math.round(totalPop * baseParams.childrenRatio * youthFactor);
            const oldOld = Math.round(totalPop * baseParams.oldOldRatio * Math.pow(agingFactor, 1.5));
            const youngOld = Math.round(totalPop * baseParams.youngOldRatio * agingFactor);
            const productive = totalPop - children - youngOld - oldOld;
            
            // Generate age distribution for pyramid
            const ageDistribution = this._generateAgeDistribution(
                totalPop, children, productive, youngOld, oldOld
            );
            
            data[year] = {
                totalPopulation: totalPop,
                male: Math.round(totalPop * 0.49),
                female: Math.round(totalPop * 0.51),
                children: children,
                productive: productive,
                youngOld: youngOld,
                oldOld: oldOld,
                ageDistribution: ageDistribution
            };
        }
        
        return {
            code: regionCode,
            name: regionName,
            type: type,
            data: data
        };
    }
    
    static _getBaseParams(type) {
        const params = {
            urban: {
                basePop: 300000 + Math.random() * 400000,
                childrenRatio: 0.12 + Math.random() * 0.04,
                youngOldRatio: 0.08 + Math.random() * 0.04,
                oldOldRatio: 0.05 + Math.random() * 0.03,
                popDecline: 0.002
            },
            suburban: {
                basePop: 100000 + Math.random() * 200000,
                childrenRatio: 0.14 + Math.random() * 0.04,
                youngOldRatio: 0.10 + Math.random() * 0.04,
                oldOldRatio: 0.06 + Math.random() * 0.04,
                popDecline: 0.003
            },
            rural: {
                basePop: 20000 + Math.random() * 40000,
                childrenRatio: 0.08 + Math.random() * 0.04,
                youngOldRatio: 0.14 + Math.random() * 0.06,
                oldOldRatio: 0.12 + Math.random() * 0.08,
                popDecline: 0.01
            }
        };
        
        return params[type] || params.urban;
    }
    
    static _generateAgeDistribution(total, children, productive, youngOld, oldOld) {
        // Standard age group weights
        const weights = {
            '0-4': 0.04, '5-9': 0.045, '10-14': 0.05, '15-19': 0.055,
            '20-24': 0.06, '25-29': 0.07, '30-34': 0.075, '35-39': 0.08,
            '40-44': 0.085, '45-49': 0.09, '50-54': 0.085, '55-59': 0.08,
            '60-64': 0.075, '65-69': 0.06, '70-74': 0.05, '75-79': 0.035,
            '80-84': 0.02, '85+': 0.01
        };
        
        const distribution = { male: [], female: [] };
        
        Object.entries(weights).forEach(([group, weight]) => {
            let groupPop;
            
            // Adjust based on actual cluster totals
            if (['0-4', '5-9', '10-14', '15-19'].includes(group)) {
                groupPop = Math.round(children * weight * 4);
            } else if (['65-69', '70-74'].includes(group)) {
                groupPop = Math.round(youngOld * weight * 8);
            } else if (['75-79', '80-84', '85+'].includes(group)) {
                groupPop = Math.round(oldOld * weight * 15);
            } else {
                groupPop = Math.round(productive * weight * 1.5);
            }
            
            // Gender split (varies by age)
            let maleRatio = 0.51;
            if (['65-69', '70-74'].includes(group)) maleRatio = 0.45;
            if (['75-79', '80-84', '85+'].includes(group)) maleRatio = 0.38;
            
            distribution.male.push(Math.round(groupPop * maleRatio));
            distribution.female.push(Math.round(groupPop * (1 - maleRatio)));
        });
        
        return distribution;
    }
    
    /**
     * Generate sample sigungu data for a sido
     */
    static generateSigunguList(sidoCode) {
        const samples = {
            '11': [ // Seoul
                { code: '1168000000', name: '강남구', type: 'urban' },
                { code: '1165000000', name: '서초구', type: 'urban' },
                { code: '1171000000', name: '송파구', type: 'urban' },
                { code: '1174000000', name: '노원구', type: 'suburban' },
                { code: '1156000000', name: '영등포구', type: 'urban' },
                { code: '1162000000', name: '종로구', type: 'urban' },
                { code: '1114000000', name: '중구', type: 'urban' },
                { code: '1135000000', name: '마포구', type: 'urban' }
            ],
            '26': [ // Busan
                { code: '2626000000', name: '해운대구', type: 'urban' },
                { code: '2623000000', name: '동래구', type: 'urban' },
                { code: '2617000000', name: '부산진구', type: 'urban' },
                { code: '2650000000', name: '기장군', type: 'suburban' }
            ],
            '41': [ // Gyeonggi
                { code: '4111000000', name: '수원시', type: 'urban' },
                { code: '4113000000', name: '성남시', type: 'urban' },
                { code: '4115000000', name: '고양시', type: 'suburban' },
                { code: '4117000000', name: '용인시', type: 'suburban' },
                { code: '4139000000', name: '안산시', type: 'urban' },
                { code: '4145000000', name: '화성시', type: 'suburban' },
                { code: '4182000000', name: '가평군', type: 'rural' },
                { code: '4180000000', name: '연천군', type: 'rural' }
            ]
        };
        
        // Default sample for other regions
        const defaultSample = [
            { code: `${sidoCode}11000000`, name: '중앙구', type: 'urban' },
            { code: `${sidoCode}12000000`, name: '동부구', type: 'suburban' },
            { code: `${sidoCode}13000000`, name: '서부구', type: 'suburban' },
            { code: `${sidoCode}80000000`, name: '외곽군', type: 'rural' }
        ];
        
        return samples[sidoCode] || defaultSample;
    }
    
    /**
     * Generate trend data for charts
     */
    static generateTrendData(regionData, metric = 'agingRatio') {
        const years = Object.keys(regionData.data).map(Number).sort();
        const values = years.map(year => {
            const d = regionData.data[year];
            const metrics = DataProcessor.calculateMetrics(d);
            return metrics[metric] || 0;
        });
        
        return {
            years: years,
            values: values,
            label: regionData.name
        };
    }
    
    /**
     * Generate national average trend data
     */
    static generateNationalTrend(metric = 'agingRatio') {
        const baseValues = {
            agingRatio: [16.5, 17.4, 18.2, 18.8, 19.2],
            oldOldRatio: [38.5, 39.8, 40.9, 41.8, 42.5],
            dependencyRatio: [40.2, 41.5, 42.8, 44.0, 45.0],
            youthRatio: [12.8, 12.4, 12.1, 11.9, 11.8]
        };
        
        return {
            years: [2021, 2022, 2023, 2024, 2025],
            values: baseValues[metric] || baseValues.agingRatio,
            label: '전국 평균'
        };
    }
}

// ============================================
// GLOBAL DATA STORE
// ============================================
const DataStore = {
    regions: new Map(),
    currentRegion: null,
    currentYear: 2025,
    compareRegion: null,
    serviceAreas: new Map(),
    
    /**
     * Initialize with demo data
     */
    init() {
        // Load sido regions
        Object.entries(SIDO_CODES).forEach(([code, info]) => {
            const fullCode = code.padEnd(10, '0');
            const regionData = DemoDataGenerator.generateRegionData(
                fullCode, 
                info.name, 
                info.type === 'metropolitan' ? 'urban' : 'suburban'
            );
            this.regions.set(fullCode, regionData);
        });
        
        // Load sample sigungu for main regions
        ['11', '26', '41'].forEach(sidoCode => {
            const sigunguList = DemoDataGenerator.generateSigunguList(sidoCode);
            sigunguList.forEach(sg => {
                const regionData = DemoDataGenerator.generateRegionData(
                    sg.code, sg.name, sg.type
                );
                this.regions.set(sg.code, regionData);
            });
        });
    },
    
    getRegion(code) {
        return this.regions.get(code);
    },
    
    getSidoList() {
        return Object.entries(SIDO_CODES).map(([code, info]) => ({
            code: code.padEnd(10, '0'),
            shortCode: code,
            name: info.name,
            type: info.type
        }));
    },
    
    getSigunguList(sidoCode) {
        const shortCode = sidoCode.substring(0, 2);
        return DemoDataGenerator.generateSigunguList(shortCode);
    },
    
    getRankings(scope = 'sigungu', metric = 'urgency', limit = 10) {
        const rankings = [];
        
        this.regions.forEach((region, code) => {
            if (scope === 'sigungu' && code.endsWith('00000000')) return;
            if (scope === 'sido' && !code.endsWith('00000000')) return;
            
            const yearData = region.data[this.currentYear];
            if (!yearData) return;
            
            const metrics = DataProcessor.calculateMetrics(yearData);
            const trends = this._calculateTrends(region);
            const urgencyScore = DataProcessor.calculateUrgencyScore(metrics, trends);
            
            rankings.push({
                code: code,
                name: region.name,
                type: region.type,
                urgencyScore: urgencyScore,
                agingRatio: metrics.agingRatio,
                oldOldRatio: metrics.oldOldRatio,
                population: yearData.totalPopulation
            });
        });
        
        // Sort by specified metric
        rankings.sort((a, b) => {
            if (metric === 'urgency') return b.urgencyScore - a.urgencyScore;
            if (metric === 'agingRatio') return b.agingRatio - a.agingRatio;
            return b.urgencyScore - a.urgencyScore;
        });
        
        return rankings.slice(0, limit);
    },
    
    _calculateTrends(region) {
        const years = Object.keys(region.data).map(Number).sort();
        if (years.length < 2) return { agingVelocity: 0 };
        
        const first = region.data[years[0]];
        const last = region.data[years[years.length - 1]];
        
        const firstElderly = (first.youngOld || 0) + (first.oldOld || 0);
        const lastElderly = (last.youngOld || 0) + (last.oldOld || 0);
        
        return {
            agingVelocity: DataProcessor.calculateCAGR(
                firstElderly, lastElderly, years.length - 1
            )
        };
    }
};

// ============================================
// EXPORT
// ============================================
window.SIDO_CODES = SIDO_CODES;
window.NATIONAL_REFERENCE = NATIONAL_REFERENCE;
window.DataProcessor = DataProcessor;
window.KOSISClient = KOSISClient;
window.DemoDataGenerator = DemoDataGenerator;
window.DataStore = DataStore;
