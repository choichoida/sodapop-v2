"""
SODAPOP 2.0 Configuration

Central configuration for the platform including:
- Analysis parameters
- Visualization settings
- National reference values
- Threshold definitions
"""

from dataclasses import dataclass, field
from typing import Dict, List
from enum import Enum


@dataclass
class AnalysisConfig:
    """Configuration for demographic analysis"""
    
    # Analysis time range
    start_year: int = 2021
    end_year: int = 2025
    
    # Age group definitions for welfare clusters
    age_clusters: Dict[str, tuple] = field(default_factory=lambda: {
        "children_youth": (0, 18),
        "productive": (19, 64),
        "young_old": (65, 74),
        "old_old": (75, 120),
    })
    
    # Velocity classification thresholds (annual % change)
    velocity_thresholds: Dict[str, float] = field(default_factory=lambda: {
        "rapid": 5.0,
        "moderate": 2.0,
        "stable": -2.0,
    })
    
    # Urgency scoring weights
    urgency_weights: Dict[str, float] = field(default_factory=lambda: {
        "aging_velocity": 0.25,
        "old_old_ratio": 0.25,
        "absolute_elderly": 0.15,
        "dependency_ratio": 0.15,
        "trend_acceleration": 0.10,
        "youth_decline": 0.10,
    })


@dataclass
class NationalReference:
    """National reference values for comparison (2024 estimates)"""
    
    # Population structure
    total_population: int = 51_700_000
    elderly_population: int = 9_930_000
    
    # Key ratios
    aging_ratio: float = 19.2           # % of 65+
    old_old_ratio: float = 42.5         # % of 75+ among elderly
    youth_ratio: float = 11.8           # % of 0-18
    dependency_ratio: float = 45.0      # (children + elderly) / productive
    
    # Trend metrics
    aging_velocity: float = 4.2         # Annual % growth of elderly
    old_old_velocity: float = 6.8       # Annual % growth of 75+
    population_growth: float = -0.2     # Annual % total population change
    
    # Thresholds for society classification
    aged_society_threshold: float = 14.0      # Aged society (고령사회)
    super_aged_threshold: float = 20.0        # Super-aged society (초고령사회)


@dataclass
class VisualizationConfig:
    """Configuration for visualizations"""
    
    # Color schemes
    theme: str = "plotly_white"
    
    # Welfare cluster colors
    cluster_colors: Dict[str, str] = field(default_factory=lambda: {
        "children_youth": "#4ECDC4",    # Teal
        "productive": "#45B7D1",        # Blue  
        "young_old": "#F7B731",         # Amber
        "old_old": "#FC5C65",           # Coral
    })
    
    # Urgency level colors
    urgency_colors: Dict[str, str] = field(default_factory=lambda: {
        "CRITICAL": "#DC2626",          # Red
        "HIGH": "#F97316",              # Orange
        "ELEVATED": "#FBBF24",          # Yellow
        "MODERATE": "#34D399",          # Green
        "LOW": "#60A5FA",               # Blue
    })
    
    # Gender colors
    male_color: str = "#3498db"
    female_color: str = "#e74c3c"
    
    # Chart dimensions
    default_height: int = 500
    pyramid_height: int = 600
    dashboard_height: int = 800
    
    # Font settings
    font_family: str = "Pretendard, Noto Sans KR, sans-serif"
    title_font_size: int = 18
    label_font_size: int = 12


@dataclass
class TextConfig:
    """Configuration for text generation"""
    
    language: str = "ko"  # "ko" or "en"
    
    # Template phrases (Korean)
    trend_phrases: Dict[str, str] = field(default_factory=lambda: {
        "rapid_increase": "급격히 증가",
        "moderate_increase": "꾸준히 증가",
        "stable": "안정적 추이",
        "moderate_decrease": "점진적 감소",
        "rapid_decrease": "급격히 감소",
    })
    
    urgency_descriptions: Dict[str, str] = field(default_factory=lambda: {
        "CRITICAL": "즉각적인 정책 개입이 필요한 위험 수준입니다",
        "HIGH": "우선적인 관심과 자원 배분이 요구됩니다",
        "ELEVATED": "지속적인 모니터링과 선제적 대응이 필요합니다",
        "MODERATE": "현행 서비스 수준의 유지와 점진적 확대가 적절합니다",
        "LOW": "현재 안정적인 상태로 예방적 관리가 권장됩니다",
    })
    
    # Service recommendations
    service_recommendations: Dict[str, str] = field(default_factory=lambda: {
        "home_care": "재가돌봄서비스",
        "day_care": "주간보호서비스",
        "long_term_care": "장기요양서비스",
        "dementia_care": "치매전문돌봄",
        "social_participation": "사회참여프로그램",
        "health_management": "건강관리서비스",
        "transportation": "이동지원서비스",
        "meal_service": "식사배달서비스",
        "emergency_response": "응급안전서비스",
        "caregiver_support": "가족돌봄자지원",
    })


# Global configuration instances
ANALYSIS_CONFIG = AnalysisConfig()
NATIONAL_REFERENCE = NationalReference()
VISUALIZATION_CONFIG = VisualizationConfig()
TEXT_CONFIG = TextConfig()


def get_config() -> Dict:
    """Get all configuration as dictionary"""
    return {
        "analysis": ANALYSIS_CONFIG,
        "national_reference": NATIONAL_REFERENCE,
        "visualization": VISUALIZATION_CONFIG,
        "text": TEXT_CONFIG,
    }
