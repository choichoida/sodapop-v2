"""
KOSIS OpenAPI Client

Data Engine for SODAPOP 2.0:
- Fetches real-time demographic data from KOSIS.
- Uses newEst=Y to ensure data freshness.
- Supports hierarchical administrative levels (Sido, Sigungu, EMD).
"""

import os
import requests
import pandas as pd
from typing import Dict, List, Optional, Union
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class KosisClient:
    """
    Client for the KOSIS (Korean Statistical Information Service) OpenAPI.
    """
    
    BASE_URL = "https://kosis.kr/openapi/statisticsData.do"
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the KOSIS client.
        
        Args:
            api_key: KOSIS OpenAPI key. If not provided, it will look for KOSIS_API_KEY env var.
        """
        self.api_key = api_key or os.getenv("KOSIS_API_KEY")
        if not self.api_key:
            print("Warning: KOSIS_API_KEY not found in environment or arguments.")
            
    def get_statistics(self, 
                       adm_code: str, 
                       org_id: str = "101", 
                       tbl_id: str = "DT_1B040M5", 
                       start_prde: str = "2021", 
                       end_prde: str = "2025") -> pd.DataFrame:
        """
        Get demographic statistics for a specific region.
        
        Args:
            adm_code: Administrative code (KIKcd).
            org_id: Organization ID (default: 101 - Statistics Korea).
            tbl_id: Table ID (default: DT_1B040M5 - Population by Age and Gender).
            start_prde: Start period (YYYY).
            end_prde: End period (YYYY).
            
        Returns:
            DataFrame containing the statistical data.
        """
        if not self.api_key:
            raise ValueError("KOSIS API key is required.")
            
        # Normalize code (KOSIS often uses 2 or 5 digits for Sido/Sigungu)
        # For DT_1B040M5, it usually expects the administrative code parts.
        
        params = {
            "method": "getList",
            "apiKey": self.api_key,
            "format": "json",
            "jsonVD": "Y",
            "userStatsId": "your_user_id", # This might be required for some users
            "prdSe": "M", # Monthly data
            "startPrdDe": f"{start_prde}01",
            "endPrdDe": f"{end_prde}12",
            "orgId": org_id,
            "tblId": tbl_id,
            "itmId": "ALL",
            "objL1": adm_code,
            "objL2": "ALL",
            "objL3": "ALL",
            "newEst": "Y" # Force newest data
        }
        
        try:
            response = requests.get(self.BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()
            
            if not data or "err" in str(data).lower():
                print(f"KOSIS API Error: {data}")
                return pd.DataFrame()
                
            return pd.DataFrame(data)
            
        except Exception as e:
            print(f"Exception during KOSIS API call: {e}")
            return pd.DataFrame()

    def get_population_by_age(self, adm_code: str) -> pd.DataFrame:
        """
        Specialized helper to get population by age groups.
        """
        return self.get_statistics(adm_code, tbl_id="DT_1B040M5")
    
    def get_special_targets(self, adm_code: str, target: str = "1person") -> pd.DataFrame:
        """
        Fetch data for special targets like 1-person households, multicultural, etc.
        """
        # Table IDs for special targets (Example mapping)
        table_mapping = {
            "1person": "DT_1B08001",
            "multicultural": "DT_1B040P3",
            "disabled": "DT_1B040P4" # Placeholders
        }
        
        tbl_id = table_mapping.get(target, "DT_1B040M5")
        return self.get_statistics(adm_code, tbl_id=tbl_id)
