"""
Gemini AI Insight Generator

Powered by Google Gemini for:
- Natural language statistical querying.
- Contextual welfare rationale generation.
- Demographic trend analysis.
"""

import os
import google.generativeai as genai
from typing import Dict, List, Optional, Any
from sodapop.core.processor import DemographicData
from sodapop.core.analyzer import TrendMetrics

class GeminiAnalyzer:
    """
    AI Insight System for SODAPOP 2.0 using Google Gemini API.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Gemini client.
        """
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        else:
            self.model = None
            print("Warning: GEMINI_API_KEY not found.")

    def analyze_insight(self, data: DemographicData, metrics: TrendMetrics) -> str:
        """
        Generate a deep demographic insight and welfare rationale.
        """
        if not self.model:
            return "Gemini API 키가 설정되지 않았습니다. [AI/API 설정]에서 키를 등록해 주세요."
            
        prompt = f"""
        당신은 대한민국 사회복지 분야의 데이터 분석 전문가입니다. 
        다음 통계 데이터를 바탕으로 해당 지역의 인구학적 변화 추이를 분석하고, 
        사회복지사가 사업 기획서에 즉시 활용할 수 있는 '복지 근거문(Rationale)'을 작성해 주세요.

        지역: {data.region_name}
        기준 연도: {data.year}
        
        통계 지표:
        - 총인구: {data.total_population:,}명
        - 고령화율: {data.aging_ratio:.1f}%
        - 후기고령(75세 이상) 인구: {data.old_old:,}명 ({data.old_old_ratio:.1f}%)
        - 고령화 속도: {metrics.aging_velocity:.1f}%/년
        - 부양비: {data.dependency_ratio:.1f}%
        
        주요 위험 요인:
        {", ".join(metrics.urgency_factors)}
        
        형식:
        1. [인구학적 추이 요약]: 현재 상태와 최근 추세를 전문가적 관점에서 요약.
        2. [복지 Rationale]: 사업 계획서에 바로 사용할 수 있는 설득력 있는 문장.
        3. [긴급 제언]: 가장 시급한 사회복지 서비스 1-2가지 추천.

        언어: 한국어
        분위기: 전문적, 논리적, 데이터 기반.
        """
        
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Gemini API 호출 중 오류가 발생했습니다: {e}"

    def ask_natural_query(self, query: str, context_data: Dict[str, Any]) -> str:
        """
        Handle natural language queries about the statistical data.
        """
        if not self.model:
            return "Gemini API 키가 설정되지 않았습니다."
            
        prompt = f"""
        사용자가 지역 통계 데이터에 대해 다음과 같은 질문을 했습니다: "{query}"
        
        제공된 데이터 컨텍스트:
        {context_data}
        
        데이터에 기반하여 정확하고 친절하게 답변해 주세요. 
        만약 데이터에 없는 내용이라면 추측하지 말고 모른다고 답변하세요.
        답변은 300자 이내로 간결하게 작성하세요.
        """
        
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"오류 발생: {e}"
