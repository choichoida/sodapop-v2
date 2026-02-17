/**
 * SODAPOP 2.0 - KOSIS API Proxy
 * Serverless function to securely handle KOSIS OpenAPI requests
 * 
 * Environment Variables Required:
 * - KOSIS_API_KEY: Your KOSIS OpenAPI key
 */

// CORS headers for frontend access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// KOSIS API Base URL
const KOSIS_BASE_URL = 'https://kosis.kr/openapi';

/**
 * Fetch population data by age from KOSIS
 * @param {string} region - Region code (H-Code)
 * @param {string} year - Year (e.g., "2024")
 */
async function fetchPopulationByAge(apiKey, region, year) {
  const params = new URLSearchParams({
    method: 'getList',
    apiKey: apiKey,
    itmId: 'T20',
    objL1: 'ALL',
    objL2: region || 'ALL',
    objL3: '',
    objL4: '',
    objL5: '',
    objL6: '',
    objL7: '',
    objL8: '',
    format: 'json',
    jsonVD: 'Y',
    prdSe: 'Y',
    startPrdDe: year || '2021',
    endPrdDe: year || '2025',
    orgId: '101',
    tblId: 'DT_1B04005N'
  });

  const response = await fetch(`${KOSIS_BASE_URL}/Idx/getIdx?${params}`);
  
  if (!response.ok) {
    throw new Error(`KOSIS API error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Fetch regional hierarchy data (Sido/Sigungu/EMD)
 */
async function fetchRegionHierarchy(apiKey, parentCode) {
  const params = new URLSearchParams({
    method: 'getList',
    apiKey: apiKey,
    format: 'json',
    jsonVD: 'Y',
    parentCode: parentCode || ''
  });

  const response = await fetch(`${KOSIS_BASE_URL}/statisticsList?${params}`);
  
  if (!response.ok) {
    throw new Error(`KOSIS API error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Main handler for Vercel Serverless Function
 */
export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).json({ status: 'ok' });
    return;
  }

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Check API Key exists
  const apiKey = process.env.KOSIS_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'KOSIS_API_KEY is not configured. Please set it in Vercel environment variables.',
      code: 'MISSING_API_KEY'
    });
  }

  // Parse request
  const { action, region, year, parentCode } = req.query;

  try {
    let data;

    switch (action) {
      case 'population':
        data = await fetchPopulationByAge(apiKey, region, year);
        // Filter out '계' (Total) items
        if (data && Array.isArray(data)) {
          data = data.filter(item => {
            const name = item.ITM_NM || item.C1_NM || '';
            return !name.includes('계');
          });
        }
        break;

      case 'regions':
        data = await fetchRegionHierarchy(apiKey, parentCode);
        break;

      case 'health':
        // Health check endpoint
        return res.status(200).json({
          status: 'ok',
          message: 'SODAPOP 2.0 API is running',
          timestamp: new Date().toISOString(),
          hasApiKey: !!apiKey
        });

      default:
        return res.status(400).json({
          error: 'Invalid action',
          message: 'Supported actions: population, regions, health',
          code: 'INVALID_ACTION'
        });
    }

    return res.status(200).json({
      success: true,
      data: data,
      meta: {
        action,
        region,
        year,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('KOSIS API Error:', error);
    
    return res.status(500).json({
      error: 'API request failed',
      message: error.message,
      code: 'API_ERROR'
    });
  }
}
