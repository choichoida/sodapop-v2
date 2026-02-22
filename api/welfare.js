/**
 * SODAPOP 2.0 - 한국사회보장정보원 중앙부처복지서비스 API Proxy
 *
 * 환경변수: WELFARE_API_KEY (Vercel 프로젝트 설정에서 등록)
 * 원본 API: https://apis.data.go.kr/B554287/WlfareInfoService/getWlfareInfoList
 */

const WELFARE_BASE = 'https://apis.data.go.kr/B554287/WlfareInfoService';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// 생애주기 코드 매핑
const LIFE_CODE_MAP = {
  '영유아': '001', '아동': '002', '청소년': '003',
  '청년': '004', '중장년': '005', '노년': '006',
  '노인': '006', '어르신': '006',
  '임산부': '007', '임신': '007',
  '한부모': '008', '다문화': '008'
};

// 복지 키워드 → lifeArray 코드 추출
function extractLifeCode(keyword) {
  for (const [k, v] of Object.entries(LIFE_CODE_MAP)) {
    if (keyword.includes(k)) return v;
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }

  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  const serviceKey = process.env.WELFARE_API_KEY;
  if (!serviceKey) {
    return res.status(500).json({
      error: 'WELFARE_API_KEY가 설정되지 않았습니다.',
      code: 'MISSING_API_KEY'
    });
  }

  const {
    keyword = '',
    life = '',
    siCode = '',
    sigunguCode = '',
    page = 1,
    size = 10
  } = req.query;

  // 키워드에서 생애주기 자동 추출 (life 파라미터가 없을 때)
  const lifeCode = life || extractLifeCode(keyword);

  // 공공데이터포털 키는 이미 URL인코딩 상태로 발급됨 → 이중 인코딩 방지를 위해 디코딩 후 사용
  const decodedKey = decodeURIComponent(serviceKey);

  // URL을 수동으로 구성해 serviceKey 인코딩 제어
  let url = `${WELFARE_BASE}/getWlfareInfoList?serviceKey=${decodedKey}`;
  url += `&pageNo=${page}&numOfRows=${size}&_type=json`;
  if (keyword)     url += `&srchKeyword=${encodeURIComponent(keyword)}`;
  if (lifeCode)    url += `&lifeArray=${encodeURIComponent(lifeCode)}`;
  if (siCode)      url += `&rsdAreaSiCode=${encodeURIComponent(siCode)}`;
  if (sigunguCode) url += `&rsdAreaSigunguCode=${encodeURIComponent(sigunguCode)}`;

  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });

    const rawText = await response.text();

    // 응답이 XML이거나 에러인 경우를 위해 텍스트로 먼저 수신
    let raw;
    try {
      raw = JSON.parse(rawText);
    } catch {
      console.error('Non-JSON response:', rawText.slice(0, 300));
      throw new Error(`API가 JSON이 아닌 응답을 반환했습니다. 상태: ${response.status}`);
    }

    // 공공데이터포털 에러 응답 처리
    if (raw?.response?.header?.resultCode && raw.response.header.resultCode !== '00') {
      throw new Error(`API 오류 코드 ${raw.response.header.resultCode}: ${raw.response.header.resultMsg}`);
    }

    // 응답 구조 정규화 (공공데이터포털 표준 구조)
    const body = raw?.response?.body || raw;
    const rawItems = body?.items?.item || body?.items || [];
    const totalCount = body?.totalCount ?? 0;

    const list = Array.isArray(rawItems) ? rawItems : (rawItems ? [rawItems] : []);

    return res.status(200).json({
      success: true,
      totalCount: Number(totalCount),
      page: Number(page),
      size: Number(size),
      keyword,
      lifeCode,
      items: list.map(item => ({
        id:       item.servId        || '',
        name:     item.servNm        || '',
        summary:  item.servDgst      || '',
        ministry: item.jurMnofNm     || item.jurOrgNm || '',
        target:   item.trgterIndvdlNm || '',
        life:     item.lifeNmArray   || '',
        link:     item.servDtlLink   || `https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=${item.servId}`
      }))
    });

  } catch (error) {
    console.error('Welfare API Error:', error);
    return res.status(500).json({
      error: '복지서비스 API 호출 실패',
      message: error.message,
      code: 'API_ERROR'
    });
  }
}
