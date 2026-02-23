/**
 * SODAPOP 2.0 - 한국사회보장정보원 중앙부처복지서비스 API Proxy
 *
 * 환경변수: WELFARE_API_KEY
 * 원본 API: https://apis.data.go.kr/B554287/WlfareInfoService/getWlfareInfoList
 * 응답 형식: XML 전용 (JSON 미지원)
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

function extractLifeCode(keyword) {
  for (const [k, v] of Object.entries(LIFE_CODE_MAP)) {
    if (keyword.includes(k)) return v;
  }
  return null;
}

// XML에서 특정 태그 값 추출 (CDATA 포함)
function getXMLTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : '';
}

// XML에서 반복 태그 배열 추출
function getAllXMLTags(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const results = [];
  let m;
  while ((m = re.exec(xml)) !== null) results.push(m[1]);
  return results;
}

// 공공데이터포털 XML 응답 파싱
function parseWelfareXML(xml) {
  const resultCode = getXMLTag(xml, 'resultCode');
  const resultMsg  = getXMLTag(xml, 'resultMsg');
  const totalCount = parseInt(getXMLTag(xml, 'totalCount'), 10) || 0;

  const itemsXML = getAllXMLTags(xml, 'item');
  const items = itemsXML.map(item => ({
    servId:          getXMLTag(item, 'servId'),
    servNm:          getXMLTag(item, 'servNm'),
    servDgst:        getXMLTag(item, 'servDgst'),
    jurMnofNm:       getXMLTag(item, 'jurMnofNm'),
    trgterIndvdlNm:  getXMLTag(item, 'trgterIndvdlNm'),
    lifeNmArray:     getXMLTag(item, 'lifeNmArray'),
    servDtlLink:     getXMLTag(item, 'servDtlLink'),
  }));

  return { resultCode, resultMsg, totalCount, items };
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
    keyword    = '',
    life       = '',
    siCode     = '',
    sigunguCode = '',
    page       = 1,
    size       = 10
  } = req.query;

  const lifeCode = life || extractLifeCode(keyword);

  // 공공데이터포털 키는 이미 URL인코딩 상태로 발급 → 이중 인코딩 방지
  const decodedKey = decodeURIComponent(serviceKey);

  let url = `${WELFARE_BASE}/getWlfareInfoList?serviceKey=${decodedKey}`;
  url += `&pageNo=${page}&numOfRows=${size}`;
  if (keyword)     url += `&srchKeyword=${encodeURIComponent(keyword)}`;
  if (lifeCode)    url += `&lifeArray=${encodeURIComponent(lifeCode)}`;
  if (siCode)      url += `&rsdAreaSiCode=${encodeURIComponent(siCode)}`;
  if (sigunguCode) url += `&rsdAreaSigunguCode=${encodeURIComponent(sigunguCode)}`;

  try {
    const response = await fetch(url, { headers: { Accept: 'application/xml, text/xml' } });
    const xmlText  = await response.text();

    // 공공데이터포털 인증 오류는 XML 형태로 반환됨
    const { resultCode, resultMsg, totalCount, items } = parseWelfareXML(xmlText);

    if (resultCode && resultCode !== '00') {
      throw new Error(`API 오류 [${resultCode}]: ${resultMsg}`);
    }

    return res.status(200).json({
      success: true,
      totalCount,
      page:    Number(page),
      size:    Number(size),
      keyword,
      lifeCode,
      items: items.map(item => ({
        id:       item.servId,
        name:     item.servNm,
        summary:  item.servDgst,
        ministry: item.jurMnofNm,
        target:   item.trgterIndvdlNm,
        life:     item.lifeNmArray,
        link:     item.servDtlLink ||
          `https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=${item.servId}`
      }))
    });

  } catch (error) {
    console.error('Welfare API Error:', error);
    return res.status(500).json({
      error:   '복지서비스 API 호출 실패',
      message: error.message,
      code:    'API_ERROR'
    });
  }
}
