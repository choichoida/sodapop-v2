/**
 * SODAPOP 2.0 - 한국사회보장정보원 중앙부처복지서비스 API Proxy
 *
 * 환경변수: WELFARE_API_KEY
 * 원본 API: https://apis.data.go.kr/B554287/NationalWelfareInformationsV001
 * 응답 형식: XML 전용 (JSON 미지원)
 */

const WELFARE_BASE = 'https://apis.data.go.kr/B554287/NationalWelfareInformationsV001';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// ── 코드 매핑 ──────────────────────────────────────────────

// 생애주기 (lifeArray)
const LIFE_CODE_MAP = {
  '영유아': '001', '아동': '002', '어린이': '002',
  '청소년': '003', '청년': '004', '중장년': '005',
  '노인': '006', '노년': '006', '어르신': '006',
  '임산부': '007', '임신': '007', '출산': '007'
};

// 가구유형 (trgterIndvdlArray)
const TRGT_CODE_MAP = {
  '다문화': '010', '탈북': '010',
  '다자녀': '020',
  '보훈': '030', '국가유공': '030',
  '장애인': '040', '장애': '040',
  '저소득': '050', '기초수급': '050', '수급자': '050', '차상위': '050',
  '한부모': '060', '조손': '060'
};

// 관심주제 (intrsThemaArray)
const THEME_CODE_MAP = {
  '건강': '010', '의료': '010', '병원': '010',
  '정신': '020', '우울': '020',
  '생활': '030', '생계': '030',
  '주거': '040', '집': '040', '임대': '040',
  '취업': '050', '일자리': '050', '고용': '050',
  '문화': '060', '여가': '060',
  '안전': '070', '위기': '070', '긴급': '070',
  '보육': '090', '어린이집': '090', '육아': '090',
  '교육': '100', '학교': '100',
  '입양': '110', '위탁': '110',
  '돌봄': '120', '요양': '120', '간병': '120',
  '금융': '130', '대출': '130', '서민금융': '130',
  '법률': '140',
  '에너지': '160', '전기': '160', '가스': '160'
};

function extractCode(text, map) {
  for (const [k, v] of Object.entries(map)) {
    if (text.includes(k)) return v;
  }
  return null;
}

// ── XML 파싱 헬퍼 ──────────────────────────────────────────

// 특정 태그 값 추출 (CDATA 포함)
function getXMLTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : '';
}

// 반복 태그 배열 추출
function getAllXMLTags(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const results = [];
  let m;
  while ((m = re.exec(xml)) !== null) results.push(m[1]);
  return results;
}

// 복지서비스 목록 XML 파싱 (wantedList/servList 구조)
function parseListXML(xml) {
  const resultCode    = getXMLTag(xml, 'resultCode');
  const resultMessage = getXMLTag(xml, 'resultMessage');
  const totalCount    = parseInt(getXMLTag(xml, 'totalCount'), 10) || 0;

  const servListItems = getAllXMLTags(xml, 'servList');
  const items = servListItems.map(s => ({
    servId:            getXMLTag(s, 'servId'),
    servNm:            getXMLTag(s, 'servNm'),
    servDgst:          getXMLTag(s, 'servDgst'),
    jurMnofNm:         getXMLTag(s, 'jurMnofNm'),
    jurOrgNm:          getXMLTag(s, 'jurOrgNm'),
    trgterIndvdlArray: getXMLTag(s, 'trgterIndvdlArray'),
    lifeArray:         getXMLTag(s, 'lifeArray'),
    intrsThemaArray:   getXMLTag(s, 'intrsThemaArray'),
    sprtCycNm:         getXMLTag(s, 'sprtCycNm'),
    srvPvsnNm:         getXMLTag(s, 'srvPvsnNm'),
    onapPsbltYn:       getXMLTag(s, 'onapPsbltYn'),
    servDtlLink:       getXMLTag(s, 'servDtlLink'),
    inqNum:            getXMLTag(s, 'inqNum'),
  }));

  return { resultCode, resultMessage, totalCount, items };
}

// ── 메인 핸들러 ────────────────────────────────────────────

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
    keyword     = '',
    life        = '',
    trgt        = '',
    theme       = '',
    srchKeyCode = '003',    // 001=제목, 002=내용, 003=제목+내용
    orderBy     = 'popular',
    page        = 1,
    size        = 10
  } = req.query;

  // 자연어에서 코드 자동 추출 (명시적 파라미터 우선)
  const lifeCode  = life  || extractCode(keyword, LIFE_CODE_MAP)  || '';
  const trgtCode  = trgt  || extractCode(keyword, TRGT_CODE_MAP)  || '';
  const themeCode = theme || extractCode(keyword, THEME_CODE_MAP) || '';

  // 이중 인코딩 방지: 포털 키는 이미 URL인코딩 상태로 발급됨
  const decodedKey = decodeURIComponent(serviceKey);

  let url = `${WELFARE_BASE}/NationalWelfarelistV001?serviceKey=${decodedKey}`;
  url += `&callTp=L`;
  url += `&pageNo=${page}&numOfRows=${size}`;
  url += `&srchKeyCode=${srchKeyCode}`;
  if (keyword)   url += `&searchWrd=${encodeURIComponent(keyword)}`;
  if (lifeCode)  url += `&lifeArray=${encodeURIComponent(lifeCode)}`;
  if (trgtCode)  url += `&trgterIndvdlArray=${encodeURIComponent(trgtCode)}`;
  if (themeCode) url += `&intrsThemaArray=${encodeURIComponent(themeCode)}`;
  if (orderBy)   url += `&orderBy=${encodeURIComponent(orderBy)}`;

  try {
    const response = await fetch(url, { headers: { Accept: 'application/xml, text/xml' } });
    const xmlText  = await response.text();

    const { resultCode, resultMessage, totalCount, items } = parseListXML(xmlText);

    // 성공 코드: '0' (신규 API)
    if (resultCode && resultCode !== '0' && resultCode !== '00') {
      throw new Error(`API 오류 [${resultCode}]: ${resultMessage}`);
    }

    return res.status(200).json({
      success: true,
      totalCount,
      page:      Number(page),
      size:      Number(size),
      keyword,
      lifeCode,
      trgtCode,
      themeCode,
      items: items.map(item => ({
        id:        item.servId,
        name:      item.servNm,
        summary:   item.servDgst,
        ministry:  item.jurMnofNm,
        org:       item.jurOrgNm,
        target:    item.trgterIndvdlArray,
        life:      item.lifeArray,
        theme:     item.intrsThemaArray,
        cycle:     item.sprtCycNm,
        provision: item.srvPvsnNm,
        online:    item.onapPsbltYn === 'Y',
        views:     parseInt(item.inqNum, 10) || 0,
        link:      item.servDtlLink ||
          `https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=${item.servId}&wlfareInfoReldBztpCd=01`
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
