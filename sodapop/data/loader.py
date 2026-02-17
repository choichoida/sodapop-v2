"""
KOSIS Data Loader

Utilities for loading demographic data from various sources:
- KOSIS API (Korean Statistical Information Service)
- Local CSV/Excel files
- Cached processed data

Implements Zero-Inertia principle by automatic filtering and preprocessing.
"""

import os
import json
from typing import Dict, List, Optional, Union
from pathlib import Path
import pandas as pd
import numpy as np
from datetime import datetime

from sodapop.core.hierarchy import KIKcdHierarchy, AdminLevel
from sodapop.core.processor import DemographicProcessor, DemographicData


class KOSISDataLoader:
    """
    KOSIS (Korean Statistical Information Service) Data Loader
    
    Provides seamless data acquisition from multiple sources
    with automatic preprocessing for the Antigravity framework.
    """
    
    # KOSIS API endpoints (for reference)
    KOSIS_BASE_URL = "https://kosis.kr/openapi"
    
    # Standard KOSIS table IDs for demographic data
    KOSIS_TABLES = {
        "population_by_age": "DT_1B040A3",
        "population_by_district": "DT_1B040M1", 
        "population_movement": "DT_1B26001",
        "household_composition": "DT_1JC1501",
    }
    
    # Column mappings for different data formats
    COLUMN_MAPPINGS = {
        "standard": {
            "행정구역코드": "region_code",
            "행정구역": "region",
            "시점": "year",
            "연령": "age_group",
            "성별": "gender",
            "인구수": "population",
        },
        "simple": {
            "code": "region_code",
            "name": "region",
            "year": "year",
            "age": "age_group",
            "sex": "gender",
            "pop": "population",
        }
    }
    
    def __init__(self, data_dir: Optional[str] = None, api_key: Optional[str] = None):
        """
        Initialize data loader
        
        Args:
            data_dir: Directory containing local data files
            api_key: KOSIS API key for live data fetching
        """
        self.data_dir = Path(data_dir) if data_dir else Path("data")
        self.api_key = api_key or os.environ.get("KOSIS_API_KEY")
        self.hierarchy = KIKcdHierarchy()
        self.processor = DemographicProcessor()
        self._cache: Dict[str, pd.DataFrame] = {}
    
    def load_from_csv(self, filepath: str, 
                       column_mapping: Optional[Dict[str, str]] = None,
                       encoding: str = "utf-8") -> pd.DataFrame:
        """
        Load demographic data from CSV file
        
        Args:
            filepath: Path to CSV file
            column_mapping: Custom column name mapping
            encoding: File encoding (default: utf-8)
        
        Returns:
            Preprocessed pandas DataFrame
        """
        df = pd.read_csv(filepath, encoding=encoding)
        
        # Apply column mapping
        if column_mapping:
            df = df.rename(columns=column_mapping)
        else:
            # Try to detect and apply standard mapping
            for mapping_type, mapping in self.COLUMN_MAPPINGS.items():
                if set(mapping.keys()).intersection(df.columns):
                    df = df.rename(columns=mapping)
                    break
        
        # Preprocess
        df = self._preprocess_dataframe(df)
        
        return df
    
    def load_from_excel(self, filepath: str, 
                         sheet_name: Union[str, int] = 0,
                         column_mapping: Optional[Dict[str, str]] = None) -> pd.DataFrame:
        """
        Load demographic data from Excel file
        
        Args:
            filepath: Path to Excel file
            sheet_name: Sheet name or index
            column_mapping: Custom column name mapping
        
        Returns:
            Preprocessed pandas DataFrame
        """
        df = pd.read_excel(filepath, sheet_name=sheet_name)
        
        if column_mapping:
            df = df.rename(columns=column_mapping)
        
        df = self._preprocess_dataframe(df)
        
        return df
    
    def load_from_kosis_api(self, table_id: str, 
                            start_year: int = 2021,
                            end_year: int = 2025,
                            region_codes: Optional[List[str]] = None) -> pd.DataFrame:
        """
        Load data from KOSIS API
        
        Args:
            table_id: KOSIS statistical table ID
            start_year: Start year for data
            end_year: End year for data
            region_codes: List of region codes to filter
        
        Returns:
            Preprocessed pandas DataFrame
        """
        if not self.api_key:
            raise ValueError("KOSIS API key not provided. Set KOSIS_API_KEY environment variable.")
        
        # Build API request
        # Note: This is a placeholder - actual implementation would use requests
        import requests
        
        params = {
            "method": "getList",
            "apiKey": self.api_key,
            "format": "json",
            "jsonVD": "Y",
            "orgId": "101",
            "tblId": table_id,
            "prdSe": "Y",
            "startPrdDe": str(start_year),
            "endPrdDe": str(end_year),
        }
        
        # Placeholder response handling
        # In production, this would make actual API calls
        raise NotImplementedError(
            "KOSIS API integration requires valid API key. "
            "Please load data from local files or configure API access."
        )
    
    def _preprocess_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Apply Zero-Inertia preprocessing to DataFrame
        
        - Filter out "계" (total) entries
        - Normalize region codes
        - Convert data types
        - Handle missing values
        """
        # Filter out total entries
        if 'region' in df.columns:
            total_patterns = ['계', '소계', '합계', '전국', '전체']
            for pattern in total_patterns:
                df = df[~df['region'].str.contains(pattern, na=False)]
        
        if 'age_group' in df.columns:
            df = df[~df['age_group'].str.contains('계|합계|전체', na=False)]
        
        # Normalize region codes to 10 digits
        if 'region_code' in df.columns:
            df['region_code'] = df['region_code'].astype(str).str.ljust(10, '0').str[:10]
        
        # Convert year to int
        if 'year' in df.columns:
            df['year'] = pd.to_numeric(df['year'], errors='coerce').astype('Int64')
        
        # Convert population to int
        if 'population' in df.columns:
            df['population'] = pd.to_numeric(
                df['population'].astype(str).str.replace(',', ''), 
                errors='coerce'
            ).fillna(0).astype(int)
        
        return df
    
    def process_to_demographic_data(self, df: pd.DataFrame) -> Dict[str, Dict[int, DemographicData]]:
        """
        Convert preprocessed DataFrame to DemographicData objects
        
        Args:
            df: Preprocessed DataFrame with columns:
                region_code, region, year, age_group, gender, population
        
        Returns:
            Dict[region_code, Dict[year, DemographicData]]
        """
        return self.processor.process_kosis_dataframe(df)
    
    def generate_sample_data(self, n_regions: int = 20) -> Dict[str, Dict[int, DemographicData]]:
        """
        Generate synthetic sample data for testing
        
        Creates realistic demographic patterns based on Korean statistics.
        """
        # Sample region definitions
        sample_regions = [
            ("1100000000", "서울특별시", "metro"),
            ("1168000000", "서울 강남구", "urban"),
            ("1165000000", "서울 서초구", "urban"),
            ("2600000000", "부산광역시", "metro"),
            ("2711000000", "대구 중구", "urban"),
            ("4100000000", "경기도", "metro"),
            ("4111000000", "경기 수원시", "urban"),
            ("4273000000", "강원 홍천군", "rural"),
            ("4582000000", "전북 순창군", "rural"),
            ("4677000000", "전남 신안군", "rural"),
            ("4883000000", "경남 합천군", "rural"),
        ]
        
        np.random.seed(42)
        all_data = {}
        
        for code, name, region_type in sample_regions[:n_regions]:
            region_data = self.processor.create_sample_data(code, name)
            all_data[code] = region_data
            self.hierarchy.add_region(code, name)
        
        return all_data
    
    def save_to_cache(self, data: Dict[str, Dict[int, DemographicData]], 
                      cache_name: str = "processed_data") -> str:
        """
        Save processed data to cache file
        
        Returns path to cached file.
        """
        cache_dir = self.data_dir / "cache"
        cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Convert to serializable format
        serializable = {}
        for code, years_data in data.items():
            serializable[code] = {}
            for year, demo in years_data.items():
                serializable[code][str(year)] = {
                    "region_code": demo.region_code,
                    "region_name": demo.region_name,
                    "year": demo.year,
                    "total_population": demo.total_population,
                    "male_population": demo.male_population,
                    "female_population": demo.female_population,
                    "children_youth": demo.children_youth,
                    "productive": demo.productive,
                    "young_old": demo.young_old,
                    "old_old": demo.old_old,
                }
        
        filepath = cache_dir / f"{cache_name}.json"
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(serializable, f, ensure_ascii=False, indent=2)
        
        return str(filepath)
    
    def load_from_cache(self, cache_name: str = "processed_data") -> Dict[str, Dict[int, DemographicData]]:
        """
        Load processed data from cache file
        """
        filepath = self.data_dir / "cache" / f"{cache_name}.json"
        
        if not filepath.exists():
            raise FileNotFoundError(f"Cache file not found: {filepath}")
        
        with open(filepath, 'r', encoding='utf-8') as f:
            serializable = json.load(f)
        
        # Convert back to DemographicData objects
        data = {}
        for code, years_data in serializable.items():
            data[code] = {}
            for year_str, demo_dict in years_data.items():
                demo = DemographicData(**demo_dict)
                data[code][int(year_str)] = demo
        
        return data


def load_sample_data() -> Dict[str, Dict[int, DemographicData]]:
    """
    Convenience function to load sample data
    
    Returns demonstration data for testing and development.
    """
    loader = KOSISDataLoader()
    return loader.generate_sample_data(n_regions=15)
