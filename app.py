"""
SODAPOP 2.0 - Main Dashboard Application

Social Demographic Analysis Platform for Optimal Planning

Built on the "Google Antigravity" philosophy:
- Fluid Navigation across administrative levels
- Zero-Inertia Data Processing
- Lifted Insights via floating cards

Streamlit-based interactive dashboard for social welfare analysts.
"""

import streamlit as st
import pandas as pd
import numpy as np
from typing import Dict, List, Optional
import json

# SODAPOP modules
from sodapop.core.hierarchy import KIKcdHierarchy, AdminLevel, Region
from sodapop.core.processor import DemographicProcessor, DemographicData, WelfareCluster
from sodapop.core.analyzer import TrendAnalyzer, TrendMetrics, UrgencyLevel
from sodapop.visualization.pyramid import PopulationPyramid
from sodapop.visualization.rankings import RankingCharts
from sodapop.generators.rationale import WelfareRationaleGenerator, RationaleType


# ============================================================================
# Page Configuration
# ============================================================================

st.set_page_config(
    page_title="SODAPOP 2.0",
    page_icon="🎯",
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={
        'About': "SODAPOP 2.0 - 사회복지 인구분석 플랫폼"
    }
)

# Custom CSS for Antigravity aesthetics
st.markdown("""
<style>
    /* Main theme - professional, futuristic */
    .stApp {
        background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
    }
    
    /* Floating cards effect */
    .floating-card {
        background: rgba(30, 41, 59, 0.8);
        border: 1px solid rgba(99, 102, 241, 0.3);
        border-radius: 16px;
        padding: 20px;
        margin: 10px 0;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .floating-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 40px rgba(99, 102, 241, 0.2);
    }
    
    /* Metric cards */
    .metric-container {
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
        border-radius: 12px;
        padding: 16px;
        text-align: center;
        border: 1px solid rgba(148, 163, 184, 0.2);
    }
    
    .metric-value {
        font-size: 2.5rem;
        font-weight: 700;
        color: #f1f5f9;
        line-height: 1.2;
    }
    
    .metric-label {
        font-size: 0.875rem;
        color: #94a3b8;
        margin-top: 4px;
    }
    
    /* Urgency badges */
    .urgency-critical { background: #dc2626; color: white; }
    .urgency-high { background: #f97316; color: white; }
    .urgency-elevated { background: #fbbf24; color: #1e293b; }
    .urgency-moderate { background: #34d399; color: #1e293b; }
    .urgency-low { background: #60a5fa; color: white; }
    
    .urgency-badge {
        padding: 4px 12px;
        border-radius: 20px;
        font-weight: 600;
        font-size: 0.75rem;
        display: inline-block;
    }
    
    /* Navigation breadcrumb */
    .breadcrumb {
        display: flex;
        gap: 8px;
        align-items: center;
        padding: 12px 16px;
        background: rgba(30, 41, 59, 0.6);
        border-radius: 8px;
        margin-bottom: 20px;
    }
    
    .breadcrumb-item {
        color: #94a3b8;
        cursor: pointer;
        transition: color 0.2s;
    }
    
    .breadcrumb-item:hover {
        color: #f1f5f9;
    }
    
    .breadcrumb-separator {
        color: #475569;
    }
    
    /* Sidebar styling */
    .css-1d391kg {
        background: #0f172a;
    }
    
    /* Headers */
    h1, h2, h3 {
        color: #f1f5f9 !important;
    }
    
    /* Rationale text box */
    .rationale-box {
        background: #1e293b;
        border-left: 4px solid #6366f1;
        padding: 16px 20px;
        border-radius: 0 8px 8px 0;
        font-size: 1rem;
        line-height: 1.7;
        color: #e2e8f0;
    }
    
    /* Copy button */
    .copy-btn {
        background: #6366f1;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
    }
    
    .copy-btn:hover {
        background: #4f46e5;
    }
</style>
""", unsafe_allow_html=True)


# ============================================================================
# Session State Initialization
# ============================================================================

def init_session_state():
    """Initialize session state variables"""
    if 'hierarchy' not in st.session_state:
        st.session_state.hierarchy = KIKcdHierarchy()
    
    if 'processor' not in st.session_state:
        st.session_state.processor = DemographicProcessor()
    
    if 'analyzer' not in st.session_state:
        st.session_state.analyzer = TrendAnalyzer()
    
    if 'pyramid_viz' not in st.session_state:
        st.session_state.pyramid_viz = PopulationPyramid()
    
    if 'ranking_viz' not in st.session_state:
        st.session_state.ranking_viz = RankingCharts()
    
    if 'rationale_gen' not in st.session_state:
        st.session_state.rationale_gen = WelfareRationaleGenerator()
    
    if 'current_level' not in st.session_state:
        st.session_state.current_level = AdminLevel.SIDO
    
    if 'selected_region' not in st.session_state:
        st.session_state.selected_region = None
    
    if 'demo_data' not in st.session_state:
        st.session_state.demo_data = generate_demo_data()

init_session_state()


# ============================================================================
# Demo Data Generation
# ============================================================================

@st.cache_data
def generate_demo_data() -> Dict[str, Dict[int, DemographicData]]:
    """
    Generate demonstration data for the platform
    
    In production, this would be replaced with actual KOSIS data loading.
    """
    processor = DemographicProcessor()
    hierarchy = KIKcdHierarchy()
    
    # Sample regions with realistic data
    sample_regions = [
        ("1100000000", "서울특별시"),
        ("1168000000", "서울 강남구"),
        ("1165000000", "서울 서초구"),
        ("1174000000", "서울 노원구"),
        ("1171000000", "서울 송파구"),
        ("2600000000", "부산광역시"),
        ("2626000000", "부산 해운대구"),
        ("2623000000", "부산 동래구"),
        ("2711000000", "대구 중구"),
        ("2800000000", "인천광역시"),
        ("4100000000", "경기도"),
        ("4111000000", "경기 수원시"),
        ("4113000000", "경기 성남시"),
        ("4115000000", "경기 고양시"),
        ("4117000000", "경기 용인시"),
        ("4119000000", "경기 안양시"),
        ("4121000000", "경기 부천시"),
        ("4273000000", "강원 홍천군"),
        ("4272000000", "강원 평창군"),
        ("4337000000", "충북 옥천군"),
        ("4372000000", "충북 영동군"),
        ("4461000000", "충남 계룡시"),
        ("4582000000", "전북 순창군"),
        ("4677000000", "전남 신안군"),
        ("4790000000", "경북 군위군"),
        ("4883000000", "경남 합천군"),
        ("5000000000", "제주특별자치도"),
    ]
    
    all_data = {}
    np.random.seed(42)  # For reproducibility
    
    for code, name in sample_regions:
        # Add to hierarchy
        hierarchy.add_region(code, name)
        
        # Generate 5-year data with varying patterns
        region_data = {}
        
        # Base parameters vary by region type
        if "군" in name:  # Rural
            base_pop = np.random.randint(15000, 50000)
            base_aging = np.random.uniform(25, 40)
            aging_velocity = np.random.uniform(3, 8)
            pop_decline = np.random.uniform(-2, -0.5)
        elif "구" in name:  # Urban district
            base_pop = np.random.randint(200000, 500000)
            base_aging = np.random.uniform(12, 22)
            aging_velocity = np.random.uniform(2, 5)
            pop_decline = np.random.uniform(-1, 1)
        else:  # City/Province
            base_pop = np.random.randint(500000, 3000000)
            base_aging = np.random.uniform(15, 25)
            aging_velocity = np.random.uniform(2.5, 5.5)
            pop_decline = np.random.uniform(-0.5, 0.5)
        
        for i, year in enumerate(range(2021, 2026)):
            pop_factor = 1 + (pop_decline / 100 * i)
            age_factor = 1 + (aging_velocity / 100 * i)
            
            total_pop = int(base_pop * pop_factor)
            aging_ratio = base_aging * age_factor
            
            # Calculate cluster populations
            elderly = int(total_pop * (aging_ratio / 100))
            young_old_ratio = np.random.uniform(0.55, 0.65)
            young_old = int(elderly * young_old_ratio)
            old_old = elderly - young_old
            
            youth_ratio = max(8, 18 - aging_ratio * 0.3 - i * 0.5)
            children_youth = int(total_pop * (youth_ratio / 100))
            
            productive = total_pop - children_youth - elderly
            
            demo = DemographicData(
                region_code=code,
                region_name=name,
                year=year,
                total_population=total_pop,
                male_population=int(total_pop * 0.49),
                female_population=int(total_pop * 0.51),
                children_youth=children_youth,
                productive=productive,
                young_old=young_old,
                old_old=old_old,
            )
            
            region_data[year] = demo
        
        all_data[code] = region_data
    
    return all_data


# ============================================================================
# UI Components
# ============================================================================

def render_metric_card(label: str, value: str, delta: Optional[str] = None, 
                       delta_color: str = "normal") -> str:
    """Render a styled metric card"""
    delta_html = ""
    if delta:
        color = {"normal": "#94a3b8", "positive": "#34d399", "negative": "#f87171"}[delta_color]
        delta_html = f'<div style="color: {color}; font-size: 0.875rem;">{delta}</div>'
    
    return f"""
    <div class="metric-container">
        <div class="metric-value">{value}</div>
        <div class="metric-label">{label}</div>
        {delta_html}
    </div>
    """


def render_urgency_badge(level: UrgencyLevel) -> str:
    """Render urgency level badge"""
    level_names = {
        UrgencyLevel.CRITICAL: "위험",
        UrgencyLevel.HIGH: "높음",
        UrgencyLevel.ELEVATED: "주의",
        UrgencyLevel.MODERATE: "보통",
        UrgencyLevel.LOW: "낮음",
    }
    return f'<span class="urgency-badge urgency-{level.name.lower()}">{level_names[level]}</span>'


def render_breadcrumb(regions: List[Region]) -> None:
    """Render navigation breadcrumb"""
    items = ["전국"]
    for region in regions:
        items.append(region.name)
    
    breadcrumb_html = '<div class="breadcrumb">'
    for i, item in enumerate(items):
        if i > 0:
            breadcrumb_html += '<span class="breadcrumb-separator">›</span>'
        breadcrumb_html += f'<span class="breadcrumb-item">{item}</span>'
    breadcrumb_html += '</div>'
    
    st.markdown(breadcrumb_html, unsafe_allow_html=True)


def render_floating_card(content: str, title: Optional[str] = None) -> None:
    """Render content in a floating card"""
    title_html = f'<h3 style="margin-bottom: 12px; color: #f1f5f9;">{title}</h3>' if title else ""
    st.markdown(f"""
    <div class="floating-card">
        {title_html}
        {content}
    </div>
    """, unsafe_allow_html=True)


# ============================================================================
# Main Application
# ============================================================================

def main():
    # Sidebar - Navigation & Controls
    with st.sidebar:
        st.image("https://via.placeholder.com/200x60/1e293b/f1f5f9?text=SODAPOP+2.0", 
                 use_container_width=True)
        st.markdown("---")
        
        st.markdown("### 🎯 지역 선택")
        
        # Level 1: Sido selection
        sido_options = {code: name for code, name in KIKcdHierarchy.SIDO_CODES.items()}
        selected_sido = st.selectbox(
            "시/도",
            options=list(sido_options.keys()),
            format_func=lambda x: sido_options[x],
            key="sido_select"
        )
        
        # Filter available regions by selected sido
        available_regions = [
            (code, data[max(data.keys())].region_name) 
            for code, data in st.session_state.demo_data.items()
            if code.startswith(selected_sido)
        ]
        
        if available_regions:
            selected_region_code = st.selectbox(
                "시/군/구",
                options=[code for code, _ in available_regions],
                format_func=lambda x: next(name for code, name in available_regions if code == x),
                key="region_select"
            )
            st.session_state.selected_region = selected_region_code
        
        st.markdown("---")
        
        st.markdown("### ⚙️ 분석 설정")
        
        analysis_years = st.slider(
            "분석 기간",
            min_value=2021,
            max_value=2025,
            value=(2021, 2025),
            key="year_range"
        )
        
        show_national_comparison = st.checkbox("전국 평균 비교", value=True)
        
        st.markdown("---")
        
        st.markdown("### 📊 빠른 통계")
        total_regions = len(st.session_state.demo_data)
        st.metric("분석 대상 지역", f"{total_regions}개")
        
        # Calculate critical regions
        analyzer = st.session_state.analyzer
        critical_count = 0
        for code, data in st.session_state.demo_data.items():
            metrics = analyzer.analyze_region(data)
            if metrics.urgency_level in [UrgencyLevel.CRITICAL, UrgencyLevel.HIGH]:
                critical_count += 1
        
        st.metric("주의 필요 지역", f"{critical_count}개", delta="즉시 검토 필요")
    
    # Main Content Area
    st.title("🎯 SODAPOP 2.0")
    st.markdown("**Social Demographic Analysis Platform for Optimal Planning**")
    st.markdown("*Evidence-Based Practice를 위한 인구구조 분석 플랫폼*")
    
    # Tabs for different views
    tab1, tab2, tab3, tab4 = st.tabs([
        "📊 대시보드", 
        "🏛️ 지역 분석", 
        "📈 순위 & 트렌드",
        "📝 근거문 생성"
    ])
    
    # ========================================================================
    # Tab 1: Dashboard
    # ========================================================================
    with tab1:
        st.markdown("## 전체 현황 대시보드")
        
        # Top metrics row
        col1, col2, col3, col4 = st.columns(4)
        
        # Calculate aggregate metrics
        total_pop = sum(
            data[max(data.keys())].total_population 
            for data in st.session_state.demo_data.values()
        )
        total_elderly = sum(
            data[max(data.keys())].elderly_total 
            for data in st.session_state.demo_data.values()
        )
        avg_aging_ratio = total_elderly / total_pop * 100 if total_pop > 0 else 0
        
        with col1:
            st.markdown(render_metric_card("분석 대상 인구", f"{total_pop:,}명"), 
                       unsafe_allow_html=True)
        
        with col2:
            st.markdown(render_metric_card("고령인구 (65+)", f"{total_elderly:,}명"), 
                       unsafe_allow_html=True)
        
        with col3:
            st.markdown(render_metric_card("평균 고령화율", f"{avg_aging_ratio:.1f}%"), 
                       unsafe_allow_html=True)
        
        with col4:
            st.markdown(render_metric_card("위험 지역", f"{critical_count}개"), 
                       unsafe_allow_html=True)
        
        st.markdown("---")
        
        # Rankings and Bubble Chart
        col_left, col_right = st.columns([1, 1])
        
        with col_left:
            st.markdown("### 🎯 복지 긴급도 TOP 10")
            
            # Calculate rankings
            all_metrics = []
            for code, data in st.session_state.demo_data.items():
                metrics = st.session_state.analyzer.analyze_region(data)
                all_metrics.append((code, metrics))
            
            rankings = sorted(all_metrics, key=lambda x: x[1].urgency_score, reverse=True)
            
            # Create urgency ranking chart
            fig = st.session_state.ranking_viz.create_urgency_ranking(rankings, top_n=10)
            st.plotly_chart(fig, use_container_width=True)
        
        with col_right:
            st.markdown("### 🗺️ 고령화 현황 맵")
            
            # Create bubble chart
            fig = st.session_state.ranking_viz.create_geographic_bubble(
                st.session_state.demo_data,
                all_metrics
            )
            st.plotly_chart(fig, use_container_width=True)
    
    # ========================================================================
    # Tab 2: Regional Analysis
    # ========================================================================
    with tab2:
        if st.session_state.selected_region:
            region_code = st.session_state.selected_region
            region_data = st.session_state.demo_data.get(region_code, {})
            
            if region_data:
                latest_year = max(region_data.keys())
                demo = region_data[latest_year]
                metrics = st.session_state.analyzer.analyze_region(region_data)
                
                # Region header
                st.markdown(f"## {demo.region_name} 인구구조 분석")
                
                # Breadcrumb
                render_breadcrumb([Region(region_code, demo.region_name, demo.region_name, 
                                          AdminLevel.SIGUNGU)])
                
                # Key metrics
                col1, col2, col3, col4, col5 = st.columns(5)
                
                with col1:
                    st.metric("총인구", f"{demo.total_population:,}명",
                             delta=f"{metrics.total_change_percent:+.1f}% (5년)")
                
                with col2:
                    st.metric("고령화율", f"{demo.aging_ratio:.1f}%",
                             delta=f"전국 대비 {demo.aging_ratio - 19.2:+.1f}%p")
                
                with col3:
                    st.metric("고령화 속도", f"{metrics.aging_velocity:.1f}%/년",
                             delta=f"전국 대비 {metrics.aging_velocity - 4.2:+.1f}%p")
                
                with col4:
                    st.metric("후기고령 비율", f"{demo.old_old_ratio:.1f}%")
                
                with col5:
                    st.markdown(f"**긴급도**: {render_urgency_badge(metrics.urgency_level)}",
                               unsafe_allow_html=True)
                    st.metric("긴급도 점수", f"{metrics.urgency_score:.0f}/100")
                
                st.markdown("---")
                
                # Visualizations
                col_left, col_right = st.columns([1, 1])
                
                with col_left:
                    st.markdown("### 👥 인구 피라미드")
                    pyramid_fig = st.session_state.pyramid_viz.create_basic_pyramid(
                        demo, show_clusters=True
                    )
                    st.plotly_chart(pyramid_fig, use_container_width=True)
                
                with col_right:
                    st.markdown("### 🎯 복지대상 구성")
                    cluster_fig = st.session_state.pyramid_viz.create_cluster_breakdown(demo)
                    st.plotly_chart(cluster_fig, use_container_width=True)
                
                # Temporal analysis
                st.markdown("### 📈 시계열 변화 (2021-2025)")
                temporal_fig = st.session_state.pyramid_viz.create_temporal_pyramid(
                    region_data, animate=True
                )
                st.plotly_chart(temporal_fig, use_container_width=True)
                
                # Urgency factors
                if metrics.urgency_factors:
                    st.markdown("### ⚠️ 주요 위험 요인")
                    for factor in metrics.urgency_factors:
                        st.warning(factor)
        else:
            st.info("👈 사이드바에서 분석할 지역을 선택해주세요.")
    
    # ========================================================================
    # Tab 3: Rankings & Trends
    # ========================================================================
    with tab3:
        st.markdown("## 📈 전국 순위 및 트렌드 분석")
        
        # Ranking type selection
        ranking_type = st.selectbox(
            "순위 기준",
            ["긴급도 점수", "고령화 속도", "후기고령 비율", "인구감소율"],
            key="ranking_type"
        )
        
        top_n = st.slider("표시 지역 수", 5, 30, 15, key="top_n")
        
        # Calculate all metrics
        all_metrics = []
        for code, data in st.session_state.demo_data.items():
            metrics = st.session_state.analyzer.analyze_region(data)
            all_metrics.append((code, metrics))
        
        # Sort based on selection
        if ranking_type == "긴급도 점수":
            rankings = sorted(all_metrics, key=lambda x: x[1].urgency_score, reverse=True)
        elif ranking_type == "고령화 속도":
            rankings = sorted(all_metrics, key=lambda x: x[1].aging_velocity, reverse=True)
        elif ranking_type == "후기고령 비율":
            rankings = sorted(all_metrics, key=lambda x: x[1].old_old_velocity, reverse=True)
        else:
            rankings = sorted(all_metrics, key=lambda x: x[1].total_change_percent)
        
        col1, col2 = st.columns([1, 1])
        
        with col1:
            if ranking_type == "긴급도 점수":
                fig = st.session_state.ranking_viz.create_urgency_ranking(rankings, top_n=top_n)
            else:
                fig = st.session_state.ranking_viz.create_aging_velocity_chart(rankings, top_n=top_n)
            st.plotly_chart(fig, use_container_width=True)
        
        with col2:
            # Summary table with sparklines
            fig = st.session_state.ranking_viz.create_sparkline_table(
                st.session_state.demo_data, rankings, top_n=top_n
            )
            st.plotly_chart(fig, use_container_width=True)
        
        # Trend dashboard
        st.markdown("### 📊 종합 트렌드 대시보드")
        dashboard_fig = st.session_state.ranking_viz.create_trend_dashboard(
            st.session_state.demo_data, all_metrics, top_n=8
        )
        st.plotly_chart(dashboard_fig, use_container_width=True)
    
    # ========================================================================
    # Tab 4: Rationale Generator
    # ========================================================================
    with tab4:
        st.markdown("## 📝 복지 근거문 생성기")
        st.markdown("*Evidence-Based Practice를 위한 자동 근거문 생성*")
        
        if st.session_state.selected_region:
            region_code = st.session_state.selected_region
            region_data = st.session_state.demo_data.get(region_code, {})
            
            if region_data:
                latest_year = max(region_data.keys())
                demo = region_data[latest_year]
                metrics = st.session_state.analyzer.analyze_region(region_data)
                
                st.markdown(f"### 선택된 지역: **{demo.region_name}**")
                
                # Generation options
                col1, col2 = st.columns([1, 1])
                
                with col1:
                    output_type = st.selectbox(
                        "출력 유형",
                        ["사업계획서 삽입용 문구", "요약 보고서", "전체 분석 보고서"],
                        key="output_type"
                    )
                
                with col2:
                    target_service = st.selectbox(
                        "타겟 서비스 (선택)",
                        ["자동 추천", "재가돌봄서비스", "주간보호서비스", "치매전문돌봄", 
                         "사회참여프로그램", "이동지원서비스"],
                        key="target_service"
                    )
                
                if st.button("✨ 근거문 생성", type="primary", use_container_width=True):
                    generator = st.session_state.rationale_gen
                    
                    with st.spinner("근거문 생성 중..."):
                        if output_type == "사업계획서 삽입용 문구":
                            # Generate proposal snippet
                            snippet = generator.generate_proposal_snippet(demo, metrics)
                            
                            st.markdown("### 📋 생성된 근거문")
                            st.markdown(f"""
                            <div class="rationale-box">
                                {snippet}
                            </div>
                            """, unsafe_allow_html=True)
                            
                            # Copy button
                            st.text_area("복사용 텍스트", snippet, height=150, key="copy_snippet")
                            st.info("💡 위 텍스트를 선택하여 복사 후, 사업계획서에 붙여넣기 하세요.")
                        
                        elif output_type == "요약 보고서":
                            # Generate executive summary
                            output = generator.generate_executive_summary(demo, metrics)
                            
                            st.markdown("### 📊 요약 보고서")
                            st.markdown(output.full_text)
                            
                            # Key statistics
                            st.markdown("#### 핵심 통계")
                            stats_df = pd.DataFrame([output.statistics]).T
                            stats_df.columns = ["값"]
                            st.dataframe(stats_df, use_container_width=True)
                        
                        else:
                            # Generate full report
                            report = generator.generate_full_report(demo, metrics, region_data)
                            
                            st.markdown("### 📑 전체 분석 보고서")
                            st.markdown(report)
                            
                            # Download button
                            st.download_button(
                                "📥 보고서 다운로드 (Markdown)",
                                report,
                                file_name=f"{demo.region_name}_분석보고서_{latest_year}.md",
                                mime="text/markdown"
                            )
                
                # Quick insights
                st.markdown("---")
                st.markdown("### 💡 Quick Insights")
                
                col1, col2, col3 = st.columns(3)
                
                with col1:
                    render_floating_card(
                        f"""
                        <p style="color: #94a3b8; margin-bottom: 8px;">후기고령 증가율</p>
                        <p style="font-size: 1.5rem; font-weight: bold; color: #f87171;">
                            {metrics.old_old_velocity:.1f}%/년
                        </p>
                        <p style="color: #94a3b8; font-size: 0.875rem;">
                            전국 평균 대비 {metrics.old_old_velocity - 4.5:+.1f}%p
                        </p>
                        """,
                        title="🔺 고령화 가속"
                    )
                
                with col2:
                    render_floating_card(
                        f"""
                        <p style="color: #94a3b8; margin-bottom: 8px;">돌봄 필요 인구</p>
                        <p style="font-size: 1.5rem; font-weight: bold; color: #fbbf24;">
                            {demo.old_old:,}명
                        </p>
                        <p style="color: #94a3b8; font-size: 0.875rem;">
                            전체 인구의 {demo.old_old/demo.total_population*100:.1f}%
                        </p>
                        """,
                        title="👴 75세 이상"
                    )
                
                with col3:
                    render_floating_card(
                        f"""
                        <p style="color: #94a3b8; margin-bottom: 8px;">부양 부담</p>
                        <p style="font-size: 1.5rem; font-weight: bold; color: #60a5fa;">
                            {demo.dependency_ratio:.1f}%
                        </p>
                        <p style="color: #94a3b8; font-size: 0.875rem;">
                            생산인구 100명당 피부양인구
                        </p>
                        """,
                        title="⚖️ 부양비"
                    )
        else:
            st.info("👈 사이드바에서 근거문을 생성할 지역을 선택해주세요.")
    
    # Footer
    st.markdown("---")
    st.markdown("""
    <div style="text-align: center; color: #64748b; font-size: 0.875rem;">
        <p>SODAPOP 2.0 - Social Demographic Analysis Platform for Optimal Planning</p>
        <p>Built with ❤️ for Evidence-Based Social Welfare Practice</p>
    </div>
    """, unsafe_allow_html=True)


if __name__ == "__main__":
    main()
