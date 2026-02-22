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

  const serviceKey = process.env.MOHW_KEY;
  if (!serviceKey) {
    return res.status(500).json({
      error: 'MOHW_KEY가 설정되지 않았습니다.',
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

  const params = new URLSearchParams({ serviceKey, pageNo: page, numOfRows: size });
  if (keyword)     params.append('srchKeyword', keyword);
  if (lifeCode)    params.append('lifeArray', lifeCode);
  if (siCode)      params.append('rsdAreaSiCode', siCode);
  if (sigunguCode) params.append('rsdAreaSigunguCode', sigunguCode);

  try {
    const response = await fetch(
      `${WELFARE_BASE}/getWlfareInfoList?${params}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      throw new Error(`복지서비스 API 오류: ${response.status}`);
    }

    const raw = await response.json();

    // 공공데이터포털 응답 구조 정규화
    const items = raw?.response?.body?.items?.item || raw?.items?.item || [];
    const totalCount = raw?.response?.body?.totalCount ?? raw?.totalCount ?? 0;

    const list = Array.isArray(items) ? items : [items];

    return res.status(200).json({
      success: true,
      totalCount,
      page: Number(page),
      size: Number(size),
      keyword,
      lifeCode,
      items: list.map(item => ({
        id:       item.servId   || '',
        name:     item.servNm   || '',
        summary:  item.servDgst || '',
        ministry: item.jurMnofNm || item.jurOrgNm || '',
        target:   item.trgterIndvdlNm || '',
        life:     item.lifeNmArray || '',
        link:     item.servDtlLink || `https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=${item.servId}`
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
