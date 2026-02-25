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
    /* Google Antigravity Design System */
    @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
    
    :root {
        --primary: #6366f1;
        --primary-glow: rgba(99, 102, 241, 0.4);
        --bg-dark: #0f172a;
        --card-bg: rgba(30, 41, 59, 0.7);
        --border-color: rgba(99, 102, 241, 0.2);
        --text-main: #f1f5f9;
        --text-dim: #94a3b8;
        --glass-blur: blur(12px);
    }

    .stApp {
        background: radial-gradient(circle at 50% 0%, #1e1b4b 0%, #0f172a 100%);
        color: var(--text-main);
        font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
    }

    /* GNB - Global Navigation Bar */
    .gnb-container {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 64px;
        background: rgba(15, 23, 42, 0.8);
        backdrop-filter: var(--glass-blur);
        border-bottom: 1px solid var(--border-color);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 40px;
        z-index: 1000;
        transition: all 0.3s ease;
    }

    .logo-container {
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
    }

    .logo-text {
        font-size: 1.5rem;
        font-weight: 800;
        background: linear-gradient(90deg, #818cf8, #c084fc);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        letter-spacing: -0.05em;
    }

    .gnb-menu {
        display: flex;
        gap: 32px;
    }

    .gnb-menu-item {
        color: var(--text-dim);
        font-weight: 500;
        font-size: 0.95rem;
        cursor: pointer;
        transition: color 0.2s;
    }

    .gnb-menu-item:hover, .gnb-menu-item.active {
        color: var(--text-main);
    }

    .byok-button {
        background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
        color: white;
        border: none;
        padding: 8px 18px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.875rem;
        box-shadow: 0 4px 12px var(--primary-glow);
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
    }

    .byok-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px var(--primary-glow);
    }
    
    /* Floating cards effect */
    .floating-card {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 20px;
        padding: 24px;
        margin: 10px 0;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        backdrop-filter: var(--glass-blur);
        transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease;
    }
    
    .floating-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 16px 48px rgba(99, 102, 241, 0.2);
        border-color: rgba(99, 102, 241, 0.5);
    }
    
    /* Sidebar Overhaul */
    section[data-testid="stSidebar"] {
        background: rgba(15, 23, 42, 0.95) !important;
        border-right: 1px solid var(--border-color);
        backdrop-filter: var(--glass-blur);
    }

    /* Population Pyramid Styling */
    .elderly-highlight {
        color: #FC5C65;
        font-weight: bold;
    }

    /* Rationale box */
    .rationale-box {
        background: rgba(30, 41, 59, 0.5);
        border-left: 4px solid var(--primary);
        padding: 20px;
        border-radius: 4px 12px 12px 4px;
        font-size: 1.05rem;
        line-height: 1.8;
        color: #e2e8f0;
        margin: 16px 0;
    }

    /* Hide default Streamlit elements if needed */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
</style>
""", unsafe_allow_html=True)

# Render Constant GNB
st.markdown("""
    <div class="gnb-container">
        <div class="logo-container" onclick="window.location.reload()">
            <span style="font-size: 24px;">🎯</span>
            <span class="logo-text">SODAPOP 2.0</span>
        </div>
        <div class="gnb-menu">
            <span class="gnb-menu-item active">인구심층분석</span>
            <span class="gnb-menu-item">복지서비스 검색</span>
            <span class="gnb-menu-item">복지 캘린더</span>
            <span class="gnb-menu-item">AI 인사이트</span>
        </div>
        <button class="byok-button">🔑 AI/API 설정</button>
    </div>
    <div style="height: 80px;"></div>
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
    
    if 'gemini_analyzer' not in st.session_state:
        from sodapop.generators.gemini import GeminiAnalyzer
        st.session_state.gemini_analyzer = GeminiAnalyzer(api_key=st.session_state.gemini_api_key)
    
    if 'current_level' not in st.session_state:
        st.session_state.current_level = AdminLevel.SIDO
    
    if 'selected_region' not in st.session_state:
        st.session_state.selected_region = None
    
    if 'demo_data' not in st.session_state:
        st.session_state.demo_data = generate_demo_data()
    
    # API Keys (BYOK)
    if 'kosis_api_key' not in st.session_state:
        st.session_state.kosis_api_key = os.getenv("KOSIS_API_KEY", "")
    
    if 'gemini_api_key' not in st.session_state:
        st.session_state.gemini_api_key = os.getenv("GEMINI_API_KEY", "")

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
# API & Real-time Data Loading
# ============================================================================

def load_real_data(region_code: str):
    """Fetch and process data from KOSIS API"""
    from sodapop.api.kosis import KosisClient
    
    client = KosisClient(api_key=st.session_state.kosis_api_key)
    processor = st.session_state.processor
    
    with st.spinner(f"KOSIS API에서 {region_code} 데이터를 불러오는 중..."):
        try:
            # 1. Fetch population by age & gender
            df = client.get_population_by_age(region_code)
            if not df.empty:
                processed = processor.process_kosis_dataframe(df)
                if processed:
                    # Update session data
                    st.session_state.demo_data.update(processed)
                    st.success(f"✅ {region_code} 데이터 로드 완료 (newEst=Y)")
                    return True
            else:
                st.error("데이터를 찾을 수 없습니다. (KOSIS 연동 확인 필요)")
        except Exception as e:
            st.error(f"데이터 로드 중 오류 발생: {e}")
    return False


# ============================================================================
# UI Components
# ============================================================================

def render_api_settings():
    """Render API configuration settings in sidebar"""
    with st.expander("🔑 AI/API 설정 (BYOK)", expanded=False):
        st.markdown("*사용자 본인의 API 키를 입력하세요.*")
        
        kosis_key = st.text_input(
            "KOSIS OpenAPI Key", 
            value=st.session_state.kosis_api_key,
            type="password",
            help="https://kosis.kr/openapi/ 에서 발급 가능"
        )
        if kosis_key != st.session_state.kosis_api_key:
            st.session_state.kosis_api_key = kosis_key
            st.toast("KOSIS 키가 업데이트되었습니다.")
            
        gemini_key = st.text_input(
            "Gemini API Key", 
            value=st.session_state.gemini_api_key,
            type="password",
            help="https://ai.google.dev/ 에서 발급 가능"
        )
        if gemini_key != st.session_state.gemini_api_key:
            st.session_state.gemini_api_key = gemini_key
            st.toast("Gemini 키가 업데이트되었습니다.")

        if st.session_state.kosis_api_key or st.session_state.gemini_api_key:
            st.success("인증키 등록됨")
        else:
            st.warning("인증키를 등록해 주세요.")

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
        
        # BYOK Settings
        render_api_settings()
        
        st.markdown("### 🎯 지역 선택")
        
        # ... (rest of the sidebar selection logic)
        
        # Level 1: Sido selection
        sido_options = {code: name for code, name in KIKcdHierarchy.SIDO_CODES.items()}
        selected_sido = st.selectbox(
            "시/도",
            options=list(sido_options.keys()),
            format_func=lambda x: sido_options[x],
            key="sido_select"
        )
        
        # Level 2: Sigungu selection
        available_sigungu = [
            (code, data[max(data.keys())].region_name) 
            for code, data in st.session_state.demo_data.items()
            if code.startswith(selected_sido) and code[2:5] != "000" and code[5:] == "00000"
        ]
        
        # Add a default option if none found
        if not available_sigungu:
            available_sigungu = [(selected_sido, "전체")]
            
        selected_sigungu_code = st.selectbox(
            "시/군/구",
            options=[code for code, _ in available_sigungu],
            format_func=lambda x: next(name for code, name in available_sigungu if code == x),
            key="sigungu_select"
        )
        
        # Trigger real data load if not present and key is available
        if selected_sigungu_code not in st.session_state.demo_data:
            if st.session_state.kosis_api_key:
                load_real_data(selected_sigungu_code)
            else:
                st.info("💡 KOSIS API 키를 등록하면 실시간 데이터를 불러올 수 있습니다.")
        
        # Level 3: EMD selection (Placeholder for now until Data Engine is ready)
        st.selectbox(
            "읍/면/동",
            options=["전체"],
            index=0,
            disabled=True,
            help="읍면동 레벨 데이터는 KOSIS API 연동 시 활성화됩니다."
        )
        
        st.session_state.selected_region = selected_sigungu_code
        
        st.markdown("---")
        
        st.markdown("### 👥 대상자 필터")
        target_options = ["아동", "청년", "중장년", "노인", "1인가구", "다문화", "장애인"]
        selected_targets = st.multiselect(
            "관심 대상 선택",
            options=target_options,
            default=["노인"],
            key="target_filter"
        )
        
        st.markdown("---")
        
        st.markdown("### 📅 연도/시점")
        selected_year = st.select_slider(
            "분석 시점",
            options=list(range(2021, 2026)),
            value=2025,
            key="analysis_year"
        )
        
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
    tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
        "📊 대시보드", 
        "🏛️ 지역 분석", 
        "📈 순위 & 트렌드",
        "📝 근거문 생성",
        "💡 AI 인사이트",
        "📘 분석 가이드"
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
                
                # AI Option
                use_gemini = st.checkbox("✨ Gemini AI를 사용하여 심층 Rationale 생성", value=True)
                
                if st.button("🚀 근거문 생성", type="primary", use_container_width=True):
                    if use_gemini:
                        with st.spinner("Gemini AI가 인구 데이터를 심층 분석 중..."):
                            rationale = st.session_state.gemini_analyzer.analyze_insight(demo, metrics)
                            st.session_state.last_rationale = rationale
                    else:
                        with st.spinner("데이터 기반 근거문 생성 중..."):
                            if output_type == "사업계획서 삽입용 문구":
                                rationale = st.session_state.rationale_gen.generate_proposal_snippet(demo, metrics)
                            elif output_type == "요약 보고서":
                                rationale = st.session_state.rationale_gen.generate_executive_summary(demo, metrics).full_text
                            else:
                                rationale = st.session_state.rationale_gen.generate_full_report(demo, metrics, region_data)
                            st.session_state.last_rationale = rationale
                
                if 'last_rationale' in st.session_state:
                    st.markdown("---")
                    st.success("✅ 생성 완료")
                    st.markdown(f"""
                    <div class="rationale-box">
                        {st.session_state.last_rationale}
                    </div>
                    """, unsafe_allow_html=True)
                    
                    st.text_area("복사용 텍스트", st.session_state.last_rationale, height=200)
                    st.info("💡 위 텍스트를 선택하여 복사 후, 사업계획서에 붙여넣기 하세요.")
                
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

    # ========================================================================
    # Tab 5: AI Insight (Gemini)
    # ========================================================================
    with tab5:
        st.markdown("## 💡 AI 인사이트 & 지능형 질의")
        st.markdown("*Gemini API를 활용한 맞춤형 데이터 질문과 인사이트 도출*")
        
        if st.session_state.selected_region:
            region_code = st.session_state.selected_region
            region_data = st.session_state.demo_data.get(region_code, {})
            
            if region_data:
                demo = region_data[max(region_data.keys())]
                
                render_floating_card(f"""
                    <h4 style='color:#818cf8'>데이터 컨텍스트: {demo.region_name} ({demo.year}년)</h4>
                    <p>현재 인구 {demo.total_population:,}명, 고령화율 {demo.aging_ratio:.1f}% 데이터가 분석 대상입니다.</p>
                """)
                
                st.markdown("### 💬 데이터에게 물어보세요")
                user_query = st.text_input("질문을 입력하세요", 
                                          placeholder="이 지역의 고령화 속도는 전국 평균과 비교했을 때 어느 정도인가요?")
                
                if st.button("질문하기", key="gemini_ask_query"):
                    if user_query:
                        with st.spinner("AI가 데이터를 분석하며 답변을 생성 중..."):
                            context = {
                                "region": demo.region_name,
                                "population": demo.total_population,
                                "aging_ratio": demo.aging_ratio,
                                "old_old": demo.old_old,
                            }
                            answer = st.session_state.gemini_analyzer.ask_natural_query(user_query, context)
                            st.markdown("#### 🤖 AI 답변")
                            st.info(answer)
                    else:
                        st.warning("질문을 입력해 주세요.")
        else:
            st.info("👈 좌측에서 지역을 선택하면 AI 인사이트를 활성화할 수 있습니다.")

    # ========================================================================
    # Tab 6: Analysis Guide
    # ========================================================================
    with tab6:
        st.markdown("## 📘 SODAPOP 2.0 분석 가이드")
        st.markdown("""
        ### 🎯 서비스 개요
        SODAPOP(Social Demographic Analysis Platform for Optimal Planning)은 복지 현장의 데이터 격차를 해소하기 위해 설계되었습니다.
        
        ### 🔍 주요 지표 설명
        - **고령화 속도 (Aging Velocity)**: 단순 비율이 아닌, 고령 인구의 연간 복합 성장률(CAGR)을 의미합니다.
        - **후기고령 비율**: 고령인구 내 75세 이상의 비중으로, 돌봄 강도가 높은 대상을 식별합니다.
        - **긴급도 점수 (Urgency Score)**: 고령화 속도, 후기고령 비중, 부양비 등을 종합한 복지 개입 우선순위입니다.
        
        ### 💡 디자인 원칙: Antigravity
        - **Zero Inertia**: 복잡한 데이터 조작 없이 직관적인 인사이트를 제공합니다.
        - **Fluid Experience**: Glassmorphism과 부드러운 전환을 통해 전문적이고 미래지향적인 경험을 제공합니다.
        """)
    
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
