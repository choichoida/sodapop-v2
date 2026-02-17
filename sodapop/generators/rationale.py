"""
Welfare Rationale Logic Generator

"Lifted Insights" - Convert dense statistical values into 
evidence-based rationales that social workers can copy-paste 
directly into business proposals.

Following Evidence-Based Practice (EBP) principles:
1. Data-Driven: All claims backed by KOSIS statistics
2. Contextual: Regional comparisons with national averages
3. Actionable: Clear welfare service recommendations
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from datetime import datetime

from sodapop.core.processor import DemographicData, WelfareCluster
from sodapop.core.analyzer import TrendMetrics, UrgencyLevel, ComparativeAnalysis


class RationaleType(Enum):
    """Types of welfare rationale documents"""
    EXECUTIVE_SUMMARY = "executive_summary"
    DETAILED_ANALYSIS = "detailed_analysis"
    PROPOSAL_SNIPPET = "proposal_snippet"
    COMPARISON_BRIEF = "comparison_brief"
    TREND_ALERT = "trend_alert"


class ServiceRecommendation(Enum):
    """Welfare service categories"""
    HOME_CARE = "재가돌봄서비스"
    DAY_CARE = "주간보호서비스"
    LONG_TERM_CARE = "장기요양서비스"
    DEMENTIA_CARE = "치매전문돌봄"
    SOCIAL_PARTICIPATION = "사회참여프로그램"
    HEALTH_MANAGEMENT = "건강관리서비스"
    TRANSPORTATION = "이동지원서비스"
    MEAL_SERVICE = "식사배달서비스"
    EMERGENCY_RESPONSE = "응급안전서비스"
    CAREGIVER_SUPPORT = "가족돌봄자지원"
    YOUTH_WELFARE = "아동청소년복지"
    EMPLOYMENT_SUPPORT = "고용지원서비스"


@dataclass
class RationaleOutput:
    """Generated rationale document"""
    type: RationaleType
    region_name: str
    generated_at: str
    title: str
    summary: str
    key_findings: List[str]
    statistics: Dict[str, str]
    recommendations: List[str]
    full_text: str
    citations: List[str]


class WelfareRationaleGenerator:
    """
    Evidence-Based Welfare Rationale Generator
    
    Transforms statistical analysis into professional, copy-paste ready
    text for social welfare proposals and reports.
    
    Example output:
    "경기도 고양시의 75세 이상 인구는 2021년 대비 15.3% 증가하여 
    전국 평균(12.1%)을 크게 상회하고 있습니다. 이는 재가돌봄서비스의 
    즉각적인 확대 필요성을 시사합니다."
    """
    
    # Template phrases for different contexts
    TEMPLATES = {
        # Trend descriptions
        "rapid_increase": "{metric}이(가) {period} 동안 {value}% 급증하여",
        "moderate_increase": "{metric}이(가) {period} 동안 {value}% 증가하여",
        "stable": "{metric}이(가) {period} 동안 {value}% 수준을 유지하며",
        "moderate_decrease": "{metric}이(가) {period} 동안 {value}% 감소하여",
        "rapid_decrease": "{metric}이(가) {period} 동안 {value}% 급감하여",
        
        # Comparisons
        "above_national": "전국 평균({national}%)을 {diff}%p 상회",
        "below_national": "전국 평균({national}%)보다 {diff}%p 하회",
        "similar_national": "전국 평균({national}%)과 유사한 수준",
        
        # Urgency
        "critical": "즉각적인 정책 개입이 필요한 위험 수준입니다",
        "high": "우선적인 관심과 자원 배분이 요구됩니다",
        "elevated": "지속적인 모니터링과 선제적 대응이 필요합니다",
        "moderate": "현행 서비스 수준의 유지와 점진적 확대가 적절합니다",
        "low": "현재 안정적인 상태로 예방적 관리가 권장됩니다",
    }
    
    # Service recommendation triggers
    SERVICE_TRIGGERS = {
        ServiceRecommendation.HOME_CARE: {
            "old_old_ratio": 45,
            "aging_ratio": 20,
        },
        ServiceRecommendation.DEMENTIA_CARE: {
            "old_old_ratio": 50,
            "aging_velocity": 5,
        },
        ServiceRecommendation.SOCIAL_PARTICIPATION: {
            "young_old_ratio": 8,  # % of total population
            "aging_ratio": 15,
        },
        ServiceRecommendation.TRANSPORTATION: {
            "aging_ratio": 25,
        },
        ServiceRecommendation.CAREGIVER_SUPPORT: {
            "dependency_ratio": 50,
        },
        ServiceRecommendation.YOUTH_WELFARE: {
            "youth_decline_rate": -3,
        },
    }
    
    # National reference values (2024)
    NATIONAL_REF = {
        "aging_ratio": 19.2,
        "old_old_ratio": 42.5,
        "aging_velocity": 4.2,
        "dependency_ratio": 45.0,
        "youth_ratio": 11.8,
    }
    
    def __init__(self, language: str = "ko"):
        """
        Initialize generator
        
        Args:
            language: Output language ("ko" for Korean, "en" for English)
        """
        self.language = language
        self._generated_count = 0
    
    def generate_executive_summary(self,
                                    demo: DemographicData,
                                    metrics: TrendMetrics,
                                    comparison: Optional[ComparativeAnalysis] = None) -> RationaleOutput:
        """
        Generate executive summary for a region
        
        A concise, high-level overview suitable for executive briefings.
        """
        # Build key findings
        findings = self._extract_key_findings(demo, metrics)
        
        # Get recommendations
        recommendations = self._generate_recommendations(demo, metrics)
        
        # Build summary paragraph
        summary = self._build_summary_paragraph(demo, metrics, comparison)
        
        # Build full text
        full_text = self._format_executive_summary(
            demo, metrics, findings, recommendations, summary
        )
        
        return RationaleOutput(
            type=RationaleType.EXECUTIVE_SUMMARY,
            region_name=demo.region_name,
            generated_at=datetime.now().isoformat(),
            title=f"{demo.region_name} 인구구조 분석 요약",
            summary=summary,
            key_findings=findings,
            statistics=self._format_statistics(demo, metrics),
            recommendations=recommendations,
            full_text=full_text,
            citations=self._generate_citations(demo.year),
        )
    
    def generate_proposal_snippet(self,
                                   demo: DemographicData,
                                   metrics: TrendMetrics,
                                   target_service: Optional[ServiceRecommendation] = None) -> str:
        """
        Generate a copy-paste ready paragraph for business proposals
        
        This is the core "Lifted Insight" - a single paragraph that 
        social workers can directly paste into their proposals.
        
        Example:
        "○○구의 75세 이상 후기고령인구는 2021년 대비 15.3% 증가하여
        현재 전체 인구의 8.2%를 차지하고 있습니다. 이는 전국 평균(6.8%)을
        크게 상회하는 수치로, 재가돌봄서비스의 즉각적인 확대가 필요합니다."
        """
        region = demo.region_name
        year = demo.year
        start_year = metrics.start_year
        
        # Calculate key metrics
        old_old_pct = (demo.old_old / demo.total_population * 100) if demo.total_population > 0 else 0
        elderly_pct = demo.aging_ratio
        
        # Determine comparison to national
        nat_comparison = self._compare_to_national(demo, metrics)
        
        # Determine urgency description
        urgency_desc = self.TEMPLATES[metrics.urgency_level.name.lower()]
        
        # Build the snippet
        if metrics.old_old_velocity > 10:
            trend_phrase = "급격히 증가"
        elif metrics.old_old_velocity > 5:
            trend_phrase = "빠르게 증가"
        elif metrics.old_old_velocity > 0:
            trend_phrase = "꾸준히 증가"
        else:
            trend_phrase = "감소"
        
        snippet = f"{region}의 75세 이상 후기고령인구는 {start_year}년 대비 {abs(metrics.old_old_velocity):.1f}% {trend_phrase}하여 "
        snippet += f"현재 전체 인구의 {old_old_pct:.1f}%를 차지하고 있습니다. "
        snippet += f"{nat_comparison} "
        
        # Add recommendation based on target service or auto-detect
        if target_service:
            snippet += f"이에 따라 {target_service.value}의 확충이 시급합니다."
        else:
            primary_rec = self._get_primary_recommendation(demo, metrics)
            if primary_rec:
                snippet += f"이에 따라 {primary_rec.value}의 확충이 필요합니다."
        
        return snippet
    
    def generate_trend_alert(self,
                              metrics: TrendMetrics,
                              anomalies: List[str]) -> str:
        """
        Generate alert text for significant demographic changes
        
        Used for notification systems and dashboards.
        """
        region = metrics.region_name
        
        if not anomalies:
            return f"✅ {region}: 인구구조 안정적 추이"
        
        alert_level = "🚨" if metrics.urgency_level in [UrgencyLevel.CRITICAL, UrgencyLevel.HIGH] else "⚠️"
        
        alert = f"{alert_level} {region} 인구구조 변동 감지\n\n"
        
        for anomaly in anomalies:
            alert += f"• {anomaly}\n"
        
        alert += f"\n권장 조치: {self.TEMPLATES[metrics.urgency_level.name.lower()]}"
        
        return alert
    
    def generate_comparison_brief(self,
                                   region1_demo: DemographicData,
                                   region1_metrics: TrendMetrics,
                                   region2_demo: DemographicData,
                                   region2_metrics: TrendMetrics) -> str:
        """
        Generate comparative analysis between two regions
        """
        r1 = region1_demo.region_name
        r2 = region2_demo.region_name
        
        brief = f"## {r1} vs {r2} 비교 분석\n\n"
        
        # Population comparison
        pop_diff = region1_demo.total_population - region2_demo.total_population
        brief += f"**인구 규모**: {r1}({region1_demo.total_population:,}명) "
        brief += f"{'>' if pop_diff > 0 else '<'} {r2}({region2_demo.total_population:,}명)\n\n"
        
        # Aging comparison
        brief += f"**고령화율**: {r1}({region1_demo.aging_ratio:.1f}%) vs {r2}({region2_demo.aging_ratio:.1f}%)\n"
        if region1_demo.aging_ratio > region2_demo.aging_ratio:
            diff = region1_demo.aging_ratio - region2_demo.aging_ratio
            brief += f"→ {r1}이(가) {diff:.1f}%p 더 고령화됨\n\n"
        else:
            diff = region2_demo.aging_ratio - region1_demo.aging_ratio
            brief += f"→ {r2}이(가) {diff:.1f}%p 더 고령화됨\n\n"
        
        # Velocity comparison
        brief += f"**고령화 속도**: {r1}({region1_metrics.aging_velocity:.1f}%/년) vs {r2}({region2_metrics.aging_velocity:.1f}%/년)\n"
        if region1_metrics.aging_velocity > region2_metrics.aging_velocity:
            brief += f"→ {r1}의 고령화가 더 빠르게 진행 중\n\n"
        else:
            brief += f"→ {r2}의 고령화가 더 빠르게 진행 중\n\n"
        
        # Policy implication
        brief += "### 정책적 시사점\n\n"
        if region1_metrics.urgency_score > region2_metrics.urgency_score:
            brief += f"{r1}에 대한 우선적 복지자원 배분이 필요합니다."
        else:
            brief += f"{r2}에 대한 우선적 복지자원 배분이 필요합니다."
        
        return brief
    
    def generate_full_report(self,
                              demo: DemographicData,
                              metrics: TrendMetrics,
                              historical_data: Dict[int, DemographicData]) -> str:
        """
        Generate comprehensive analysis report
        
        Full markdown report suitable for official documents.
        """
        region = demo.region_name
        year = demo.year
        
        report = f"""# {region} 인구구조 분석 보고서

**분석 기준일**: {year}년
**생성일시**: {datetime.now().strftime('%Y년 %m월 %d일')}

---

## 1. 요약 (Executive Summary)

{self._build_summary_paragraph(demo, metrics, None)}

### 핵심 지표

| 지표 | 값 | 전국 대비 |
|------|-----|----------|
| 총인구 | {demo.total_population:,}명 | - |
| 고령화율 | {demo.aging_ratio:.1f}% | {self._format_diff(demo.aging_ratio, self.NATIONAL_REF['aging_ratio'])} |
| 후기고령 비율 | {demo.old_old_ratio:.1f}% | {self._format_diff(demo.old_old_ratio, self.NATIONAL_REF['old_old_ratio'])} |
| 고령화 속도 | {metrics.aging_velocity:.1f}%/년 | {self._format_diff(metrics.aging_velocity, self.NATIONAL_REF['aging_velocity'])} |
| 부양비 | {demo.dependency_ratio:.1f}% | {self._format_diff(demo.dependency_ratio, self.NATIONAL_REF['dependency_ratio'])} |

---

## 2. 인구구조 현황

### 2.1 복지대상 인구 분포

| 구분 | 연령대 | 인구수 | 비율 | 복지 초점 |
|------|--------|--------|------|----------|
| 아동·청소년 | 0-18세 | {demo.children_youth:,}명 | {demo.youth_ratio:.1f}% | 발달 및 보호 |
| 생산가능인구 | 19-64세 | {demo.productive:,}명 | {(demo.productive/demo.total_population*100) if demo.total_population else 0:.1f}% | 고용 및 가족지원 |
| 전기고령 | 65-74세 | {demo.young_old:,}명 | {(demo.young_old/demo.total_population*100) if demo.total_population else 0:.1f}% | 사회참여 활성화 |
| 후기고령 | 75세 이상 | {demo.old_old:,}명 | {(demo.old_old/demo.total_population*100) if demo.total_population else 0:.1f}% | 집중돌봄 |

### 2.2 성별 분포

- **남성**: {demo.male_population:,}명 ({(demo.male_population/demo.total_population*100) if demo.total_population else 0:.1f}%)
- **여성**: {demo.female_population:,}명 ({(demo.female_population/demo.total_population*100) if demo.total_population else 0:.1f}%)
- **성비**: {demo.gender_ratio:.1f} (여성 100명당 남성 수)

---

## 3. 추세 분석 ({metrics.start_year}-{metrics.end_year})

### 3.1 고령화 추세

{self._generate_trend_narrative(metrics)}

### 3.2 연도별 변화

| 연도 | 총인구 | 고령인구 | 고령화율 |
|------|--------|----------|----------|
"""
        # Add yearly data
        for year in sorted(historical_data.keys()):
            d = historical_data[year]
            report += f"| {year} | {d.total_population:,} | {d.elderly_total:,} | {d.aging_ratio:.1f}% |\n"
        
        report += f"""
---

## 4. 복지 긴급도 평가

### 긴급도 점수: **{metrics.urgency_score:.0f}/100** ({metrics.urgency_level.name})

{self.TEMPLATES[metrics.urgency_level.name.lower()]}

### 주요 위험 요인

"""
        for factor in metrics.urgency_factors:
            report += f"- {factor}\n"
        
        report += f"""
---

## 5. 정책 권고사항

"""
        recommendations = self._generate_recommendations(demo, metrics)
        for i, rec in enumerate(recommendations, 1):
            report += f"{i}. {rec}\n"
        
        report += f"""
---

## 6. 데이터 출처

"""
        citations = self._generate_citations(demo.year)
        for citation in citations:
            report += f"- {citation}\n"
        
        report += f"""
---

*본 보고서는 SODAPOP 2.0 시스템에 의해 자동 생성되었습니다.*
*분석 결과의 해석과 정책 결정은 전문가의 검토가 필요합니다.*
"""
        
        return report
    
    def _extract_key_findings(self, demo: DemographicData, 
                               metrics: TrendMetrics) -> List[str]:
        """Extract key findings from analysis"""
        findings = []
        
        # Aging status
        if demo.aging_ratio > 20:
            findings.append(f"초고령사회 진입 (고령화율 {demo.aging_ratio:.1f}%)")
        elif demo.aging_ratio > 14:
            findings.append(f"고령사회 단계 (고령화율 {demo.aging_ratio:.1f}%)")
        
        # Old-old concentration
        if demo.old_old_ratio > 50:
            findings.append(f"후기고령 인구 비중 50% 초과 ({demo.old_old_ratio:.1f}%)")
        
        # Velocity
        if metrics.aging_velocity > self.NATIONAL_REF['aging_velocity']:
            diff = metrics.aging_velocity - self.NATIONAL_REF['aging_velocity']
            findings.append(f"전국 평균 대비 {diff:.1f}%p 빠른 고령화 진행")
        
        # Youth decline
        if metrics.youth_velocity < -3:
            findings.append(f"아동·청소년 인구 급감 ({metrics.youth_velocity:.1f}%/년)")
        
        # Dependency
        if demo.dependency_ratio > 60:
            findings.append(f"높은 부양부담 (부양비 {demo.dependency_ratio:.1f}%)")
        
        return findings if findings else ["특이사항 없음"]
    
    def _generate_recommendations(self, demo: DemographicData,
                                    metrics: TrendMetrics) -> List[str]:
        """Generate service recommendations based on analysis"""
        recommendations = []
        
        # Old-old focused services
        if demo.old_old_ratio > 45:
            recommendations.append(
                f"75세 이상 후기고령인구({demo.old_old:,}명) 대상 재가돌봄서비스 확충"
            )
        
        if demo.old_old_ratio > 50:
            recommendations.append(
                "치매안심센터 연계 치매전문돌봄 프로그램 강화"
            )
        
        # Young-old focused services
        young_old_ratio = (demo.young_old / demo.total_population * 100) if demo.total_population else 0
        if young_old_ratio > 8:
            recommendations.append(
                f"전기고령인구({demo.young_old:,}명) 사회참여 활성화 프로그램 개발"
            )
        
        # Transportation
        if demo.aging_ratio > 25:
            recommendations.append(
                "고령친화 이동지원서비스 확대 (교통취약지역 중점)"
            )
        
        # Caregiver support
        if demo.dependency_ratio > 50:
            recommendations.append(
                "가족돌봄자 휴식지원 및 상담서비스 강화"
            )
        
        # Youth services
        if metrics.youth_velocity < -3:
            recommendations.append(
                "아동·청소년 유입을 위한 정주여건 개선 및 보육서비스 확충"
            )
        
        # Emergency response
        if metrics.urgency_level in [UrgencyLevel.CRITICAL, UrgencyLevel.HIGH]:
            recommendations.append(
                "독거노인 응급안전서비스 및 안부확인 체계 강화"
            )
        
        return recommendations if recommendations else ["현행 서비스 수준 유지"]
    
    def _build_summary_paragraph(self, demo: DemographicData,
                                   metrics: TrendMetrics,
                                   comparison: Optional[ComparativeAnalysis]) -> str:
        """Build a cohesive summary paragraph"""
        region = demo.region_name
        
        # Opening - current status
        if demo.aging_ratio > 20:
            status = "초고령사회에 진입한"
        elif demo.aging_ratio > 14:
            status = "고령사회 단계에 있는"
        else:
            status = "고령화가 진행 중인"
        
        summary = f"{region}은(는) {status} 지역으로, "
        summary += f"현재 65세 이상 고령인구가 전체 인구의 {demo.aging_ratio:.1f}%를 차지하고 있습니다. "
        
        # Trend description
        if metrics.aging_velocity > 5:
            trend_desc = "급속한 고령화가 진행되고 있으며"
        elif metrics.aging_velocity > self.NATIONAL_REF['aging_velocity']:
            trend_desc = "전국 평균을 상회하는 고령화가 진행 중이며"
        else:
            trend_desc = "비교적 완만한 고령화 추이를 보이고 있으며"
        
        summary += f"최근 {metrics.end_year - metrics.start_year}년간 {trend_desc}, "
        summary += f"특히 75세 이상 후기고령인구는 연평균 {metrics.old_old_velocity:.1f}%씩 증가하고 있습니다. "
        
        # Policy implication
        summary += self.TEMPLATES[metrics.urgency_level.name.lower()] + "."
        
        return summary
    
    def _compare_to_national(self, demo: DemographicData, 
                              metrics: TrendMetrics) -> str:
        """Generate national comparison phrase"""
        national_old_old = 6.8  # Approximate national 75+ ratio
        
        old_old_pct = (demo.old_old / demo.total_population * 100) if demo.total_population else 0
        diff = old_old_pct - national_old_old
        
        if diff > 2:
            return f"이는 전국 평균({national_old_old:.1f}%)을 {diff:.1f}%p 상회하는 수치입니다."
        elif diff < -2:
            return f"이는 전국 평균({national_old_old:.1f}%)보다 {abs(diff):.1f}%p 낮은 수준입니다."
        else:
            return f"이는 전국 평균({national_old_old:.1f}%)과 유사한 수준입니다."
    
    def _get_primary_recommendation(self, demo: DemographicData,
                                     metrics: TrendMetrics) -> Optional[ServiceRecommendation]:
        """Determine the most appropriate service recommendation"""
        if demo.old_old_ratio > 50:
            return ServiceRecommendation.DEMENTIA_CARE
        elif demo.old_old_ratio > 45:
            return ServiceRecommendation.HOME_CARE
        elif demo.dependency_ratio > 55:
            return ServiceRecommendation.CAREGIVER_SUPPORT
        elif demo.aging_ratio > 25:
            return ServiceRecommendation.TRANSPORTATION
        elif metrics.youth_velocity < -3:
            return ServiceRecommendation.YOUTH_WELFARE
        else:
            return ServiceRecommendation.HEALTH_MANAGEMENT
    
    def _format_statistics(self, demo: DemographicData,
                            metrics: TrendMetrics) -> Dict[str, str]:
        """Format key statistics as dictionary"""
        return {
            "총인구": f"{demo.total_population:,}명",
            "고령인구(65+)": f"{demo.elderly_total:,}명",
            "후기고령(75+)": f"{demo.old_old:,}명",
            "고령화율": f"{demo.aging_ratio:.1f}%",
            "후기고령비율": f"{demo.old_old_ratio:.1f}%",
            "고령화속도": f"{metrics.aging_velocity:.1f}%/년",
            "부양비": f"{demo.dependency_ratio:.1f}%",
            "긴급도점수": f"{metrics.urgency_score:.0f}/100",
        }
    
    def _format_executive_summary(self, demo: DemographicData,
                                   metrics: TrendMetrics,
                                   findings: List[str],
                                   recommendations: List[str],
                                   summary: str) -> str:
        """Format complete executive summary"""
        text = f"# {demo.region_name} 인구구조 분석 요약\n\n"
        text += f"## 개요\n\n{summary}\n\n"
        
        text += "## 핵심 발견사항\n\n"
        for finding in findings:
            text += f"• {finding}\n"
        
        text += "\n## 권고사항\n\n"
        for i, rec in enumerate(recommendations, 1):
            text += f"{i}. {rec}\n"
        
        return text
    
    def _generate_citations(self, year: int) -> List[str]:
        """Generate data source citations"""
        return [
            f"통계청, 「주민등록인구현황」, {year}년",
            f"통계청, 「장래인구추계」, {year}년",
            "행정안전부, 「행정구역코드」",
            f"국가통계포털(KOSIS), 인구총조사, {year}년",
        ]
    
    def _generate_trend_narrative(self, metrics: TrendMetrics) -> str:
        """Generate narrative description of trends"""
        narrative = f"{metrics.start_year}년부터 {metrics.end_year}년까지 "
        
        if metrics.aging_velocity > 5:
            narrative += f"고령인구는 연평균 {metrics.aging_velocity:.1f}%의 급격한 증가세를 보였습니다. "
        elif metrics.aging_velocity > 0:
            narrative += f"고령인구는 연평균 {metrics.aging_velocity:.1f}%씩 꾸준히 증가했습니다. "
        else:
            narrative += f"고령인구 증가율은 {metrics.aging_velocity:.1f}%로 안정적인 추이를 보였습니다. "
        
        if metrics.old_old_acceleration > 2:
            narrative += "특히 최근 들어 고령화 속도가 가속화되는 경향이 뚜렷합니다."
        elif metrics.old_old_acceleration < -2:
            narrative += "다만 최근 고령화 속도는 다소 둔화되는 추세입니다."
        
        return narrative
    
    def _format_diff(self, value: float, reference: float) -> str:
        """Format difference from reference"""
        diff = value - reference
        if diff > 0:
            return f"+{diff:.1f}%p"
        else:
            return f"{diff:.1f}%p"
