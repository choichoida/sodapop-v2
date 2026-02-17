/**
 * SODAPOP 2.0 - Administrative Hierarchy API
 * Serverless function to serve KIKcd_H regional hierarchy data
 * 
 * This endpoint serves static hierarchy data from the public folder
 * and can optionally fetch real-time updates from KOSIS
 */

import { promises as fs } from 'fs';
import path from 'path';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
};

/**
 * Load hierarchy data from local JSON files
 * Uses path relative to project root for Vercel deployment
 */
async function loadHierarchyData(type) {
  const dataPath = path.join(process.cwd(), 'public', 'data', `${type}.json`);
  
  try {
    const data = await fs.readFile(dataPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Return default data if file not found
    if (type === 'sido_codes') {
      return getDefaultSidoCodes();
    }
    throw error;
  }
}

/**
 * Default Sido codes (fallback)
 */
function getDefaultSidoCodes() {
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
    },
    metadata: {
      version: "2024",
      total_sido: 17,
      source: "행정안전부 행정구역코드",
      last_updated: "2024-01-01"
    }
  };
}

/**
 * Get child regions for a given parent code
 */
function getChildRegions(sidoData, parentCode) {
  // If no parent code, return all Sido
  if (!parentCode || parentCode === 'ALL') {
    const sidos = Object.entries(sidoData.sido_codes).map(([code, info]) => ({
      code: code,
      code_10digit: info.code_10digit,
      name: info.name,
      name_en: info.name_en,
      type: info.type,
      level: 'sido'
    }));
    return sidos;
  }

  // For now, return demo sigungu data
  // In production, this would query KOSIS or a database
  return getDemoSigungu(parentCode);
}

/**
 * Demo Sigungu data (for development)
 */
function getDemoSigungu(sidoCode) {
  const demoData = {
    '11': [ // Seoul
      { code: '11010', name: '종로구', level: 'sigungu' },
      { code: '11020', name: '중구', level: 'sigungu' },
      { code: '11030', name: '용산구', level: 'sigungu' },
      { code: '11040', name: '성동구', level: 'sigungu' },
      { code: '11050', name: '광진구', level: 'sigungu' },
      { code: '11060', name: '동대문구', level: 'sigungu' },
      { code: '11070', name: '중랑구', level: 'sigungu' },
      { code: '11080', name: '성북구', level: 'sigungu' },
      { code: '11090', name: '강북구', level: 'sigungu' },
      { code: '11100', name: '도봉구', level: 'sigungu' },
      { code: '11110', name: '노원구', level: 'sigungu' },
      { code: '11120', name: '은평구', level: 'sigungu' },
      { code: '11130', name: '서대문구', level: 'sigungu' },
      { code: '11140', name: '마포구', level: 'sigungu' },
      { code: '11150', name: '양천구', level: 'sigungu' },
      { code: '11160', name: '강서구', level: 'sigungu' },
      { code: '11170', name: '구로구', level: 'sigungu' },
      { code: '11180', name: '금천구', level: 'sigungu' },
      { code: '11190', name: '영등포구', level: 'sigungu' },
      { code: '11200', name: '동작구', level: 'sigungu' },
      { code: '11210', name: '관악구', level: 'sigungu' },
      { code: '11220', name: '서초구', level: 'sigungu' },
      { code: '11230', name: '강남구', level: 'sigungu' },
      { code: '11240', name: '송파구', level: 'sigungu' },
      { code: '11250', name: '강동구', level: 'sigungu' }
    ],
    '26': [ // Busan
      { code: '26010', name: '중구', level: 'sigungu' },
      { code: '26020', name: '서구', level: 'sigungu' },
      { code: '26030', name: '동구', level: 'sigungu' },
      { code: '26040', name: '영도구', level: 'sigungu' },
      { code: '26050', name: '부산진구', level: 'sigungu' },
      { code: '26060', name: '동래구', level: 'sigungu' },
      { code: '26070', name: '남구', level: 'sigungu' },
      { code: '26080', name: '북구', level: 'sigungu' },
      { code: '26090', name: '해운대구', level: 'sigungu' },
      { code: '26100', name: '사하구', level: 'sigungu' },
      { code: '26110', name: '금정구', level: 'sigungu' },
      { code: '26120', name: '강서구', level: 'sigungu' },
      { code: '26130', name: '연제구', level: 'sigungu' },
      { code: '26140', name: '수영구', level: 'sigungu' },
      { code: '26150', name: '사상구', level: 'sigungu' },
      { code: '26160', name: '기장군', level: 'sigungu' }
    ],
    '41': [ // Gyeonggi
      { code: '41010', name: '수원시', level: 'sigungu' },
      { code: '41020', name: '성남시', level: 'sigungu' },
      { code: '41030', name: '의정부시', level: 'sigungu' },
      { code: '41040', name: '안양시', level: 'sigungu' },
      { code: '41050', name: '부천시', level: 'sigungu' },
      { code: '41060', name: '광명시', level: 'sigungu' },
      { code: '41070', name: '평택시', level: 'sigungu' },
      { code: '41080', name: '동두천시', level: 'sigungu' },
      { code: '41090', name: '안산시', level: 'sigungu' },
      { code: '41100', name: '고양시', level: 'sigungu' },
      { code: '41110', name: '과천시', level: 'sigungu' },
      { code: '41120', name: '구리시', level: 'sigungu' },
      { code: '41130', name: '남양주시', level: 'sigungu' },
      { code: '41140', name: '오산시', level: 'sigungu' },
      { code: '41150', name: '시흥시', level: 'sigungu' },
      { code: '41160', name: '군포시', level: 'sigungu' },
      { code: '41170', name: '의왕시', level: 'sigungu' },
      { code: '41180', name: '하남시', level: 'sigungu' },
      { code: '41190', name: '용인시', level: 'sigungu' },
      { code: '41200', name: '파주시', level: 'sigungu' },
      { code: '41210', name: '이천시', level: 'sigungu' },
      { code: '41220', name: '안성시', level: 'sigungu' },
      { code: '41230', name: '김포시', level: 'sigungu' },
      { code: '41240', name: '화성시', level: 'sigungu' },
      { code: '41250', name: '광주시', level: 'sigungu' },
      { code: '41260', name: '양주시', level: 'sigungu' },
      { code: '41270', name: '포천시', level: 'sigungu' },
      { code: '41280', name: '여주시', level: 'sigungu' },
      { code: '41290', name: '연천군', level: 'sigungu' },
      { code: '41300', name: '가평군', level: 'sigungu' },
      { code: '41310', name: '양평군', level: 'sigungu' }
    ]
  };

  return demoData[sidoCode] || [];
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    return res.status(200).end();
  }

  // Set headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  const { type, parent } = req.query;

  try {
    // Load base Sido data
    const sidoData = await loadHierarchyData('sido_codes');

    switch (type) {
      case 'sido':
        const sidos = getChildRegions(sidoData, null);
        return res.status(200).json({
          success: true,
          data: sidos,
          meta: { type: 'sido', count: sidos.length }
        });

      case 'sigungu':
        if (!parent) {
          return res.status(400).json({
            error: 'Missing parent parameter',
            message: 'Please provide a sido code as parent parameter'
          });
        }
        const sigungus = getChildRegions(sidoData, parent);
        return res.status(200).json({
          success: true,
          data: sigungus,
          meta: { type: 'sigungu', parent, count: sigungus.length }
        });

      case 'all':
        return res.status(200).json({
          success: true,
          data: sidoData,
          meta: { type: 'all' }
        });

      default:
        // Default: return all sido
        const defaultSidos = getChildRegions(sidoData, null);
        return res.status(200).json({
          success: true,
          data: defaultSidos,
          meta: { type: 'sido', count: defaultSidos.length }
        });
    }

  } catch (error) {
    console.error('Hierarchy API Error:', error);
    return res.status(500).json({
      error: 'Failed to load hierarchy data',
      message: error.message
    });
  }
}
