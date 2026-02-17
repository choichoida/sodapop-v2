"""
Demographic Data Processor

Zero-Inertia Data Processing following the Antigravity Framework:
- Automatic filtering of "Total(계)" items
- Expired code detection and removal  
- Welfare-centric demographic segmentation

Age Clusters:
- Children/Youth (0-18): Development & Protection
- Productive Population (19-64): Employment & Family Support
- Young-Old (65-74): Active Participation Focus
- Old-Old (75+): Intensive Care Focus
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Union
from enum import Enum
import pandas as pd
import numpy as np
from datetime import datetime


class WelfareCluster(Enum):
    """Welfare-centric demographic clusters"""
    CHILDREN_YOUTH = "children_youth"       # 0-18
    PRODUCTIVE = "productive"               # 19-64
    YOUNG_OLD = "young_old"                 # 65-74
    OLD_OLD = "old_old"                     # 75+
    
    @property
    def age_range(self) -> Tuple[int, int]:
        """Return (min_age, max_age) for this cluster"""
        ranges = {
            "children_youth": (0, 18),
            "productive": (19, 64),
            "young_old": (65, 74),
            "old_old": (75, 120),
        }
        return ranges[self.value]
    
    @property
    def korean_name(self) -> str:
        """Korean display name"""
        names = {
            "children_youth": "아동·청소년",
            "productive": "생산가능인구",
            "young_old": "전기고령",
            "old_old": "후기고령",
        }
        return names[self.value]
    
    @property
    def focus_area(self) -> str:
        """Primary welfare focus for this cluster"""
        focus = {
            "children_youth": "발달 및 보호",
            "productive": "고용 및 가족지원",
            "young_old": "사회참여 활성화",
            "old_old": "집중돌봄",
        }
        return focus[self.value]


@dataclass
class DemographicData:
    """Container for processed demographic data"""
    region_code: str
    region_name: str
    year: int
    
    # Raw totals
    total_population: int = 0
    male_population: int = 0
    female_population: int = 0
    
    # Welfare clusters
    children_youth: int = 0          # 0-18
    productive: int = 0              # 19-64
    young_old: int = 0               # 65-74
    old_old: int = 0                 # 75+
    
    # By gender and cluster
    male_by_cluster: Dict[str, int] = field(default_factory=dict)
    female_by_cluster: Dict[str, int] = field(default_factory=dict)
    
    # Age detail (5-year groups)
    age_distribution: Dict[str, int] = field(default_factory=dict)
    
    @property
    def elderly_total(self) -> int:
        """Total elderly (65+)"""
        return self.young_old + self.old_old
    
    @property
    def aging_ratio(self) -> float:
        """Aging ratio: elderly / total * 100"""
        if self.total_population == 0:
            return 0.0
        return (self.elderly_total / self.total_population) * 100
    
    @property
    def old_old_ratio(self) -> float:
        """Old-Old ratio among elderly: 75+ / 65+ * 100"""
        if self.elderly_total == 0:
            return 0.0
        return (self.old_old / self.elderly_total) * 100
    
    @property
    def dependency_ratio(self) -> float:
        """Dependency ratio: (children + elderly) / productive * 100"""
        if self.productive == 0:
            return 0.0
        return ((self.children_youth + self.elderly_total) / self.productive) * 100
    
    @property
    def youth_ratio(self) -> float:
        """Youth ratio: children / total * 100"""
        if self.total_population == 0:
            return 0.0
        return (self.children_youth / self.total_population) * 100
    
    @property
    def gender_ratio(self) -> float:
        """Gender ratio: male / female * 100"""
        if self.female_population == 0:
            return 0.0
        return (self.male_population / self.female_population) * 100


class DemographicProcessor:
    """
    Zero-Inertia Demographic Data Processor
    
    Transforms raw KOSIS data into welfare-centric insights,
    automatically filtering noise and organizing by welfare clusters.
    """
    
    # Standard KOSIS age group patterns
    AGE_PATTERNS = {
        # Single year ages
        r'^(\d+)세$': lambda m: (int(m.group(1)), int(m.group(1))),
        # Range ages  
        r'^(\d+)[~-](\d+)세?$': lambda m: (int(m.group(1)), int(m.group(2))),
        r'^(\d+)세[~-](\d+)세$': lambda m: (int(m.group(1)), int(m.group(2))),
        # 5-year groups
        r'^(\d+)[~-](\d+)$': lambda m: (int(m.group(1)), int(m.group(2))),
        # Open-ended
        r'^(\d+)세?\s*이상$': lambda m: (int(m.group(1)), 120),
        r'^(\d+)\+$': lambda m: (int(m.group(1)), 120),
    }
    
    # Columns to exclude (totals, subtotals)
    EXCLUDE_PATTERNS = [
        '계', '합계', '소계', '총계', '전체', 'Total', 'total'
    ]
    
    def __init__(self, analysis_years: List[int] = None):
        """
        Initialize processor
        
        Args:
            analysis_years: Years to analyze (default: 2021-2025)
        """
        self.analysis_years = analysis_years or list(range(2021, 2026))
        self._cache: Dict[str, DemographicData] = {}
    
    def _parse_age_group(self, age_str: str) -> Optional[Tuple[int, int]]:
        """Parse age group string to (min, max) tuple"""
        import re
        
        age_str = str(age_str).strip()
        
        for pattern, extractor in self.AGE_PATTERNS.items():
            match = re.match(pattern, age_str)
            if match:
                return extractor(match)
        
        return None
    
    def _classify_to_cluster(self, min_age: int, max_age: int) -> List[Tuple[WelfareCluster, float]]:
        """
        Classify an age range to welfare clusters with proportional weights
        
        Returns list of (cluster, proportion) for overlapping ranges
        """
        results = []
        
        for cluster in WelfareCluster:
            c_min, c_max = cluster.age_range
            
            # Calculate overlap
            overlap_min = max(min_age, c_min)
            overlap_max = min(max_age, c_max)
            
            if overlap_min <= overlap_max:
                # There is overlap
                overlap_range = overlap_max - overlap_min + 1
                total_range = max_age - min_age + 1
                proportion = overlap_range / total_range
                results.append((cluster, proportion))
        
        return results
    
    def _is_total_entry(self, value: str) -> bool:
        """Check if value is a total/subtotal entry to exclude"""
        if pd.isna(value):
            return False
        value_str = str(value).strip()
        return any(pattern in value_str for pattern in self.EXCLUDE_PATTERNS)
    
    def process_kosis_dataframe(self, df: pd.DataFrame, 
                                 region_col: str = 'region',
                                 region_code_col: str = 'region_code',
                                 year_col: str = 'year',
                                 age_col: str = 'age_group',
                                 gender_col: str = 'gender',
                                 population_col: str = 'population') -> Dict[str, Dict[int, DemographicData]]:
        """
        Process a KOSIS-format DataFrame into DemographicData objects
        
        Expected DataFrame structure:
        - region: Region name
        - region_code: KIKcd H-Code
        - year: Year (2021-2025)
        - age_group: Age group string (e.g., "0~4세", "75세 이상")
        - gender: Gender ("남", "여", "계")
        - population: Population count
        
        Returns:
            Dict[region_code, Dict[year, DemographicData]]
        """
        results: Dict[str, Dict[int, DemographicData]] = {}
        
        # Filter out total entries
        df_filtered = df[
            ~df[region_col].apply(self._is_total_entry) &
            ~df[age_col].apply(self._is_total_entry)
        ].copy()
        
        # Filter to analysis years
        df_filtered = df_filtered[df_filtered[year_col].isin(self.analysis_years)]
        
        # Group by region and year
        for (region_code, year), group in df_filtered.groupby([region_code_col, year_col]):
            region_code = str(region_code).ljust(10, '0')[:10]
            region_name = group[region_col].iloc[0] if len(group) > 0 else ""
            
            demo = DemographicData(
                region_code=region_code,
                region_name=region_name,
                year=int(year),
                male_by_cluster={c.value: 0 for c in WelfareCluster},
                female_by_cluster={c.value: 0 for c in WelfareCluster},
                age_distribution={}
            )
            
            # Process each age/gender combination
            for _, row in group.iterrows():
                age_str = str(row[age_col])
                gender = str(row[gender_col]) if gender_col in row else "계"
                pop = int(row[population_col]) if pd.notna(row[population_col]) else 0
                
                # Parse age range
                age_range = self._parse_age_group(age_str)
                if age_range is None:
                    continue
                
                min_age, max_age = age_range
                
                # Store in age distribution
                demo.age_distribution[age_str] = demo.age_distribution.get(age_str, 0) + pop
                
                # Classify to welfare clusters
                cluster_weights = self._classify_to_cluster(min_age, max_age)
                
                for cluster, weight in cluster_weights:
                    weighted_pop = int(pop * weight)
                    
                    if gender in ['남', 'male', 'Male', 'M']:
                        demo.male_by_cluster[cluster.value] += weighted_pop
                        demo.male_population += weighted_pop
                    elif gender in ['여', 'female', 'Female', 'F']:
                        demo.female_by_cluster[cluster.value] += weighted_pop
                        demo.female_population += weighted_pop
                    else:  # Total or unspecified
                        # Add to cluster totals
                        if cluster == WelfareCluster.CHILDREN_YOUTH:
                            demo.children_youth += weighted_pop
                        elif cluster == WelfareCluster.PRODUCTIVE:
                            demo.productive += weighted_pop
                        elif cluster == WelfareCluster.YOUNG_OLD:
                            demo.young_old += weighted_pop
                        elif cluster == WelfareCluster.OLD_OLD:
                            demo.old_old += weighted_pop
                        demo.total_population += weighted_pop
            
            # If we only have gender-specific data, compute totals
            if demo.total_population == 0 and (demo.male_population > 0 or demo.female_population > 0):
                demo.total_population = demo.male_population + demo.female_population
                for cluster in WelfareCluster:
                    cluster_total = (demo.male_by_cluster.get(cluster.value, 0) + 
                                   demo.female_by_cluster.get(cluster.value, 0))
                    if cluster == WelfareCluster.CHILDREN_YOUTH:
                        demo.children_youth = cluster_total
                    elif cluster == WelfareCluster.PRODUCTIVE:
                        demo.productive = cluster_total
                    elif cluster == WelfareCluster.YOUNG_OLD:
                        demo.young_old = cluster_total
                    elif cluster == WelfareCluster.OLD_OLD:
                        demo.old_old = cluster_total
            
            # Store result
            if region_code not in results:
                results[region_code] = {}
            results[region_code][year] = demo
        
        return results
    
    def create_sample_data(self, region_code: str, region_name: str) -> Dict[int, DemographicData]:
        """
        Create sample demographic data for testing/demo purposes
        
        Generates realistic 5-year trend data showing aging patterns.
        """
        import random
        
        base_population = random.randint(30000, 500000)
        data = {}
        
        for i, year in enumerate(self.analysis_years):
            # Simulate aging trend
            aging_factor = 1 + (i * 0.02)  # 2% annual increase in elderly
            youth_factor = 1 - (i * 0.015)  # 1.5% annual decrease in youth
            
            demo = DemographicData(
                region_code=region_code,
                region_name=region_name,
                year=year,
                total_population=int(base_population * (1 - i * 0.005)),
                children_youth=int(base_population * 0.15 * youth_factor),
                productive=int(base_population * 0.65 * (1 - i * 0.01)),
                young_old=int(base_population * 0.12 * aging_factor),
                old_old=int(base_population * 0.08 * (aging_factor ** 1.5)),
            )
            
            # Add gender split (roughly 48:52 M:F for elderly)
            demo.male_population = int(demo.total_population * 0.49)
            demo.female_population = demo.total_population - demo.male_population
            
            demo.male_by_cluster = {
                WelfareCluster.CHILDREN_YOUTH.value: int(demo.children_youth * 0.51),
                WelfareCluster.PRODUCTIVE.value: int(demo.productive * 0.50),
                WelfareCluster.YOUNG_OLD.value: int(demo.young_old * 0.45),
                WelfareCluster.OLD_OLD.value: int(demo.old_old * 0.38),
            }
            demo.female_by_cluster = {
                WelfareCluster.CHILDREN_YOUTH.value: demo.children_youth - demo.male_by_cluster[WelfareCluster.CHILDREN_YOUTH.value],
                WelfareCluster.PRODUCTIVE.value: demo.productive - demo.male_by_cluster[WelfareCluster.PRODUCTIVE.value],
                WelfareCluster.YOUNG_OLD.value: demo.young_old - demo.male_by_cluster[WelfareCluster.YOUNG_OLD.value],
                WelfareCluster.OLD_OLD.value: demo.old_old - demo.male_by_cluster[WelfareCluster.OLD_OLD.value],
            }
            
            data[year] = demo
        
        return data
    
    def aggregate_to_parent(self, children_data: List[Dict[int, DemographicData]], 
                            parent_code: str, parent_name: str) -> Dict[int, DemographicData]:
        """
        Aggregate child region data to parent level
        
        Example: Aggregate all Sigungu data to Sido level
        """
        aggregated = {}
        
        for year in self.analysis_years:
            demo = DemographicData(
                region_code=parent_code,
                region_name=parent_name,
                year=year,
                male_by_cluster={c.value: 0 for c in WelfareCluster},
                female_by_cluster={c.value: 0 for c in WelfareCluster},
            )
            
            for child_data in children_data:
                if year in child_data:
                    child = child_data[year]
                    demo.total_population += child.total_population
                    demo.male_population += child.male_population
                    demo.female_population += child.female_population
                    demo.children_youth += child.children_youth
                    demo.productive += child.productive
                    demo.young_old += child.young_old
                    demo.old_old += child.old_old
                    
                    for cluster in WelfareCluster:
                        demo.male_by_cluster[cluster.value] += child.male_by_cluster.get(cluster.value, 0)
                        demo.female_by_cluster[cluster.value] += child.female_by_cluster.get(cluster.value, 0)
            
            aggregated[year] = demo
        
        return aggregated
    
    def to_dataframe(self, data: Dict[str, Dict[int, DemographicData]]) -> pd.DataFrame:
        """Convert processed data to pandas DataFrame"""
        records = []
        
        for region_code, years_data in data.items():
            for year, demo in years_data.items():
                records.append({
                    'region_code': demo.region_code,
                    'region_name': demo.region_name,
                    'year': demo.year,
                    'total_population': demo.total_population,
                    'male_population': demo.male_population,
                    'female_population': demo.female_population,
                    'children_youth': demo.children_youth,
                    'productive': demo.productive,
                    'young_old': demo.young_old,
                    'old_old': demo.old_old,
                    'elderly_total': demo.elderly_total,
                    'aging_ratio': demo.aging_ratio,
                    'old_old_ratio': demo.old_old_ratio,
                    'dependency_ratio': demo.dependency_ratio,
                    'youth_ratio': demo.youth_ratio,
                })
        
        return pd.DataFrame(records)
    
    def get_cluster_summary(self, demo: DemographicData) -> Dict[str, dict]:
        """Get detailed summary for each welfare cluster"""
        return {
            cluster.value: {
                'korean_name': cluster.korean_name,
                'focus_area': cluster.focus_area,
                'age_range': f"{cluster.age_range[0]}-{cluster.age_range[1] if cluster.age_range[1] < 120 else ''}세",
                'population': getattr(demo, cluster.value.replace('-', '_'), 0),
                'male': demo.male_by_cluster.get(cluster.value, 0),
                'female': demo.female_by_cluster.get(cluster.value, 0),
                'ratio': (getattr(demo, cluster.value.replace('-', '_'), 0) / demo.total_population * 100) if demo.total_population > 0 else 0,
            }
            for cluster in WelfareCluster
        }
