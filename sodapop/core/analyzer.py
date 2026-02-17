"""
Trend Analyzer - Detecting "Gravitational Shifts" in Demographics

Implements the Antigravity Framework's trend detection:
- Aging Velocity: Year-over-Year growth rate of elderly population
- Demographic Momentum: Rate of structural change
- Welfare Urgency Scoring: Composite index for resource allocation

5-year longitudinal analysis (2021-2025) to identify regions 
requiring immediate welfare intervention.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum
import numpy as np
from sodapop.core.processor import DemographicData, WelfareCluster


class TrendDirection(Enum):
    """Direction of demographic trend"""
    RAPID_INCREASE = "rapid_increase"      # > 5% annual
    MODERATE_INCREASE = "moderate_increase" # 2-5% annual
    STABLE = "stable"                       # -2% to 2% annual
    MODERATE_DECREASE = "moderate_decrease" # -5% to -2% annual
    RAPID_DECREASE = "rapid_decrease"       # < -5% annual


class UrgencyLevel(Enum):
    """Welfare intervention urgency level"""
    CRITICAL = 5    # Immediate action required
    HIGH = 4        # Priority attention needed
    ELEVATED = 3    # Above normal concern
    MODERATE = 2    # Standard monitoring
    LOW = 1         # Minimal intervention needed


@dataclass
class TrendMetrics:
    """Comprehensive trend analysis metrics"""
    region_code: str
    region_name: str
    start_year: int
    end_year: int
    
    # Population change
    total_change_absolute: int = 0
    total_change_percent: float = 0.0
    
    # Aging Velocity (core metric)
    aging_velocity: float = 0.0  # Annual % growth of 65+
    aging_velocity_trend: TrendDirection = TrendDirection.STABLE
    
    # Old-Old acceleration (75+ growth rate)
    old_old_velocity: float = 0.0
    old_old_acceleration: float = 0.0  # Change in velocity
    
    # Youth decline rate
    youth_velocity: float = 0.0
    
    # Dependency ratio change
    dependency_change: float = 0.0
    
    # Year-by-year data
    yearly_aging_ratios: Dict[int, float] = field(default_factory=dict)
    yearly_populations: Dict[int, int] = field(default_factory=dict)
    yearly_elderly: Dict[int, int] = field(default_factory=dict)
    
    # Urgency assessment
    urgency_level: UrgencyLevel = UrgencyLevel.MODERATE
    urgency_score: float = 0.0
    urgency_factors: List[str] = field(default_factory=list)


@dataclass
class ComparativeAnalysis:
    """Comparison with reference (national/regional) averages"""
    region_code: str
    reference_type: str  # "national" or parent region code
    
    aging_ratio_diff: float = 0.0      # vs reference
    aging_velocity_diff: float = 0.0   # vs reference
    old_old_ratio_diff: float = 0.0    # vs reference
    
    percentile_rank: float = 0.0       # 0-100 percentile
    deviation_severity: str = "normal" # "normal", "elevated", "severe"


class TrendAnalyzer:
    """
    Gravitational Shift Detector
    
    Analyzes 5-year demographic trends to identify regions experiencing
    significant structural changes requiring welfare intervention.
    """
    
    # Thresholds for trend classification
    VELOCITY_THRESHOLDS = {
        "rapid": 5.0,      # > 5% annual change
        "moderate": 2.0,   # 2-5% annual change
        "stable": -2.0,    # -2% to 2% 
    }
    
    # Urgency scoring weights
    URGENCY_WEIGHTS = {
        "aging_velocity": 0.25,
        "old_old_ratio": 0.25,
        "absolute_elderly": 0.15,
        "dependency_ratio": 0.15,
        "trend_acceleration": 0.10,
        "youth_decline": 0.10,
    }
    
    # National reference values (2024 estimates)
    NATIONAL_REFERENCE = {
        "aging_ratio": 19.2,       # % of 65+
        "old_old_ratio": 42.5,     # % of 75+ among elderly
        "aging_velocity": 4.2,     # Annual % growth
        "dependency_ratio": 45.0,
    }
    
    def __init__(self, analysis_years: List[int] = None):
        self.analysis_years = sorted(analysis_years or list(range(2021, 2026)))
        self.start_year = self.analysis_years[0]
        self.end_year = self.analysis_years[-1]
        self._national_data: Optional[Dict[int, DemographicData]] = None
    
    def set_national_reference(self, national_data: Dict[int, DemographicData]) -> None:
        """Set national-level data for comparative analysis"""
        self._national_data = national_data
        
        # Update reference values from actual data
        if self.end_year in national_data:
            latest = national_data[self.end_year]
            self.NATIONAL_REFERENCE["aging_ratio"] = latest.aging_ratio
            self.NATIONAL_REFERENCE["old_old_ratio"] = latest.old_old_ratio
            self.NATIONAL_REFERENCE["dependency_ratio"] = latest.dependency_ratio
        
        # Calculate national aging velocity
        if self.start_year in national_data and self.end_year in national_data:
            start_elderly = national_data[self.start_year].elderly_total
            end_elderly = national_data[self.end_year].elderly_total
            years = self.end_year - self.start_year
            if start_elderly > 0 and years > 0:
                self.NATIONAL_REFERENCE["aging_velocity"] = (
                    ((end_elderly / start_elderly) ** (1/years) - 1) * 100
                )
    
    def calculate_cagr(self, start_value: float, end_value: float, years: int) -> float:
        """Calculate Compound Annual Growth Rate"""
        if start_value <= 0 or years <= 0:
            return 0.0
        return ((end_value / start_value) ** (1/years) - 1) * 100
    
    def classify_trend(self, velocity: float) -> TrendDirection:
        """Classify velocity into trend direction"""
        if velocity > self.VELOCITY_THRESHOLDS["rapid"]:
            return TrendDirection.RAPID_INCREASE
        elif velocity > self.VELOCITY_THRESHOLDS["moderate"]:
            return TrendDirection.MODERATE_INCREASE
        elif velocity > self.VELOCITY_THRESHOLDS["stable"]:
            return TrendDirection.STABLE
        elif velocity > -self.VELOCITY_THRESHOLDS["rapid"]:
            return TrendDirection.MODERATE_DECREASE
        else:
            return TrendDirection.RAPID_DECREASE
    
    def analyze_region(self, region_data: Dict[int, DemographicData]) -> TrendMetrics:
        """
        Perform comprehensive trend analysis for a single region
        
        Args:
            region_data: Dict mapping year to DemographicData
        
        Returns:
            TrendMetrics with all calculated indicators
        """
        available_years = sorted([y for y in self.analysis_years if y in region_data])
        
        if len(available_years) < 2:
            # Not enough data for trend analysis
            if available_years:
                demo = region_data[available_years[0]]
                return TrendMetrics(
                    region_code=demo.region_code,
                    region_name=demo.region_name,
                    start_year=available_years[0],
                    end_year=available_years[0],
                )
            return TrendMetrics("", "", 0, 0)
        
        first_year = available_years[0]
        last_year = available_years[-1]
        years_span = last_year - first_year
        
        first_data = region_data[first_year]
        last_data = region_data[last_year]
        
        metrics = TrendMetrics(
            region_code=first_data.region_code,
            region_name=first_data.region_name,
            start_year=first_year,
            end_year=last_year,
        )
        
        # Populate yearly data
        for year in available_years:
            demo = region_data[year]
            metrics.yearly_populations[year] = demo.total_population
            metrics.yearly_elderly[year] = demo.elderly_total
            metrics.yearly_aging_ratios[year] = demo.aging_ratio
        
        # Total population change
        metrics.total_change_absolute = last_data.total_population - first_data.total_population
        if first_data.total_population > 0:
            metrics.total_change_percent = (
                (last_data.total_population - first_data.total_population) / 
                first_data.total_population * 100
            )
        
        # Core metric: Aging Velocity (CAGR of elderly population)
        metrics.aging_velocity = self.calculate_cagr(
            first_data.elderly_total, 
            last_data.elderly_total, 
            years_span
        )
        metrics.aging_velocity_trend = self.classify_trend(metrics.aging_velocity)
        
        # Old-Old velocity (75+ growth)
        metrics.old_old_velocity = self.calculate_cagr(
            first_data.old_old,
            last_data.old_old,
            years_span
        )
        
        # Calculate acceleration (change in velocity over time)
        if len(available_years) >= 3:
            mid_year = available_years[len(available_years) // 2]
            mid_data = region_data[mid_year]
            
            first_half_velocity = self.calculate_cagr(
                first_data.old_old,
                mid_data.old_old,
                mid_year - first_year
            ) if mid_year > first_year else 0
            
            second_half_velocity = self.calculate_cagr(
                mid_data.old_old,
                last_data.old_old,
                last_year - mid_year
            ) if last_year > mid_year else 0
            
            metrics.old_old_acceleration = second_half_velocity - first_half_velocity
        
        # Youth velocity (decline rate)
        metrics.youth_velocity = self.calculate_cagr(
            first_data.children_youth,
            last_data.children_youth,
            years_span
        )
        
        # Dependency ratio change
        metrics.dependency_change = last_data.dependency_ratio - first_data.dependency_ratio
        
        # Calculate urgency score
        metrics.urgency_score, metrics.urgency_factors = self._calculate_urgency(
            metrics, last_data
        )
        metrics.urgency_level = self._classify_urgency(metrics.urgency_score)
        
        return metrics
    
    def _calculate_urgency(self, metrics: TrendMetrics, 
                           current_data: DemographicData) -> Tuple[float, List[str]]:
        """
        Calculate composite Welfare Urgency Score (0-100)
        
        Higher score = more urgent need for welfare intervention
        """
        score = 0.0
        factors = []
        
        # 1. Aging velocity component (0-25)
        velocity_score = min(25, max(0, metrics.aging_velocity * 5))
        score += velocity_score * self.URGENCY_WEIGHTS["aging_velocity"] * 4
        if metrics.aging_velocity > self.NATIONAL_REFERENCE["aging_velocity"]:
            factors.append(f"고령화속도 전국평균 초과 ({metrics.aging_velocity:.1f}%)")
        
        # 2. Old-old ratio component (0-25)
        old_old_score = min(25, max(0, (current_data.old_old_ratio - 30) * 2))
        score += old_old_score * self.URGENCY_WEIGHTS["old_old_ratio"] * 4
        if current_data.old_old_ratio > 50:
            factors.append(f"후기고령 비율 50% 초과 ({current_data.old_old_ratio:.1f}%)")
        
        # 3. Absolute elderly population (scaled)
        elderly_thousands = current_data.elderly_total / 1000
        elderly_score = min(25, elderly_thousands / 10)
        score += elderly_score * self.URGENCY_WEIGHTS["absolute_elderly"] * 4
        if current_data.elderly_total > 50000:
            factors.append(f"고령인구 5만명 이상 ({current_data.elderly_total:,}명)")
        
        # 4. Dependency ratio
        dep_score = min(25, max(0, (current_data.dependency_ratio - 40) / 2))
        score += dep_score * self.URGENCY_WEIGHTS["dependency_ratio"] * 4
        if current_data.dependency_ratio > 60:
            factors.append(f"부양비 60% 초과 ({current_data.dependency_ratio:.1f}%)")
        
        # 5. Trend acceleration
        if metrics.old_old_acceleration > 0:
            accel_score = min(25, metrics.old_old_acceleration * 5)
            score += accel_score * self.URGENCY_WEIGHTS["trend_acceleration"] * 4
            if metrics.old_old_acceleration > 2:
                factors.append(f"고령화 가속 추세 (가속도: {metrics.old_old_acceleration:.1f}%p)")
        
        # 6. Youth decline
        if metrics.youth_velocity < 0:
            youth_score = min(25, abs(metrics.youth_velocity) * 5)
            score += youth_score * self.URGENCY_WEIGHTS["youth_decline"] * 4
            if metrics.youth_velocity < -3:
                factors.append(f"아동·청소년 급감 ({metrics.youth_velocity:.1f}%)")
        
        return min(100, score), factors
    
    def _classify_urgency(self, score: float) -> UrgencyLevel:
        """Classify urgency score into level"""
        if score >= 80:
            return UrgencyLevel.CRITICAL
        elif score >= 60:
            return UrgencyLevel.HIGH
        elif score >= 40:
            return UrgencyLevel.ELEVATED
        elif score >= 20:
            return UrgencyLevel.MODERATE
        else:
            return UrgencyLevel.LOW
    
    def compare_to_reference(self, metrics: TrendMetrics,
                              current_data: DemographicData,
                              reference_type: str = "national") -> ComparativeAnalysis:
        """
        Compare region metrics to reference (national average or parent region)
        """
        analysis = ComparativeAnalysis(
            region_code=metrics.region_code,
            reference_type=reference_type,
        )
        
        if reference_type == "national":
            ref = self.NATIONAL_REFERENCE
            analysis.aging_ratio_diff = current_data.aging_ratio - ref["aging_ratio"]
            analysis.aging_velocity_diff = metrics.aging_velocity - ref["aging_velocity"]
            analysis.old_old_ratio_diff = current_data.old_old_ratio - ref["old_old_ratio"]
        
        # Classify severity
        total_deviation = (
            abs(analysis.aging_ratio_diff) + 
            abs(analysis.aging_velocity_diff) + 
            abs(analysis.old_old_ratio_diff)
        )
        
        if total_deviation > 15:
            analysis.deviation_severity = "severe"
        elif total_deviation > 8:
            analysis.deviation_severity = "elevated"
        else:
            analysis.deviation_severity = "normal"
        
        return analysis
    
    def rank_regions(self, all_data: Dict[str, Dict[int, DemographicData]],
                     rank_by: str = "urgency_score") -> List[Tuple[str, TrendMetrics]]:
        """
        Rank all regions by specified metric
        
        Args:
            all_data: Dict[region_code, Dict[year, DemographicData]]
            rank_by: Metric to rank by ("urgency_score", "aging_velocity", "old_old_ratio")
        
        Returns:
            Sorted list of (region_code, TrendMetrics)
        """
        results = []
        
        for region_code, region_data in all_data.items():
            metrics = self.analyze_region(region_data)
            results.append((region_code, metrics))
        
        # Sort by specified metric (descending)
        if rank_by == "urgency_score":
            results.sort(key=lambda x: x[1].urgency_score, reverse=True)
        elif rank_by == "aging_velocity":
            results.sort(key=lambda x: x[1].aging_velocity, reverse=True)
        elif rank_by == "old_old_velocity":
            results.sort(key=lambda x: x[1].old_old_velocity, reverse=True)
        
        # Assign percentile ranks
        total = len(results)
        for i, (code, metrics) in enumerate(results):
            # Higher urgency = higher percentile
            # The most urgent region gets percentile ~100
            metrics.urgency_score  # Already calculated
        
        return results
    
    def get_year_over_year(self, region_data: Dict[int, DemographicData]) -> List[Dict]:
        """
        Get year-over-year changes for detailed reporting
        """
        available_years = sorted([y for y in self.analysis_years if y in region_data])
        changes = []
        
        for i in range(1, len(available_years)):
            prev_year = available_years[i-1]
            curr_year = available_years[i]
            prev_data = region_data[prev_year]
            curr_data = region_data[curr_year]
            
            changes.append({
                "year": curr_year,
                "prev_year": prev_year,
                "population_change": curr_data.total_population - prev_data.total_population,
                "population_change_pct": ((curr_data.total_population - prev_data.total_population) / 
                                         prev_data.total_population * 100) if prev_data.total_population > 0 else 0,
                "elderly_change": curr_data.elderly_total - prev_data.elderly_total,
                "elderly_change_pct": ((curr_data.elderly_total - prev_data.elderly_total) / 
                                      prev_data.elderly_total * 100) if prev_data.elderly_total > 0 else 0,
                "aging_ratio_change": curr_data.aging_ratio - prev_data.aging_ratio,
                "old_old_change": curr_data.old_old - prev_data.old_old,
            })
        
        return changes
    
    def detect_anomalies(self, metrics: TrendMetrics, 
                         threshold_std: float = 2.0) -> List[str]:
        """
        Detect anomalous patterns that warrant special attention
        """
        anomalies = []
        
        # Check for sudden acceleration
        if metrics.old_old_acceleration > 5:
            anomalies.append("ACCELERATION_SPIKE: 후기고령 증가 가속화 감지")
        
        # Check for rapid aging
        if metrics.aging_velocity > 8:
            anomalies.append("RAPID_AGING: 초고속 고령화 진행 중")
        
        # Check for population cliff
        if metrics.total_change_percent < -5:
            anomalies.append("POPULATION_CLIFF: 급격한 인구 감소")
        
        # Check for youth collapse
        if metrics.youth_velocity < -5:
            anomalies.append("YOUTH_COLLAPSE: 아동·청소년 인구 급감")
        
        # Super-aged society threshold
        yearly_ratios = list(metrics.yearly_aging_ratios.values())
        if yearly_ratios and max(yearly_ratios) > 20:
            anomalies.append("SUPER_AGED: 초고령사회 진입 (고령화율 20% 초과)")
        
        return anomalies
    
    def get_summary_statistics(self, all_metrics: List[TrendMetrics]) -> Dict:
        """
        Calculate summary statistics across all analyzed regions
        """
        if not all_metrics:
            return {}
        
        velocities = [m.aging_velocity for m in all_metrics]
        urgencies = [m.urgency_score for m in all_metrics]
        
        return {
            "total_regions": len(all_metrics),
            "aging_velocity": {
                "mean": np.mean(velocities),
                "median": np.median(velocities),
                "std": np.std(velocities),
                "min": min(velocities),
                "max": max(velocities),
            },
            "urgency_distribution": {
                UrgencyLevel.CRITICAL.name: sum(1 for m in all_metrics if m.urgency_level == UrgencyLevel.CRITICAL),
                UrgencyLevel.HIGH.name: sum(1 for m in all_metrics if m.urgency_level == UrgencyLevel.HIGH),
                UrgencyLevel.ELEVATED.name: sum(1 for m in all_metrics if m.urgency_level == UrgencyLevel.ELEVATED),
                UrgencyLevel.MODERATE.name: sum(1 for m in all_metrics if m.urgency_level == UrgencyLevel.MODERATE),
                UrgencyLevel.LOW.name: sum(1 for m in all_metrics if m.urgency_level == UrgencyLevel.LOW),
            },
            "urgency_scores": {
                "mean": np.mean(urgencies),
                "median": np.median(urgencies),
                "top_10_threshold": np.percentile(urgencies, 90),
            }
        }
