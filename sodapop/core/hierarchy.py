"""
KIKcd_H Administrative Hierarchy Mapping System

Fluid navigation across all administrative levels in South Korea:
- Level 1 (Sido): First 2 digits - 시도 (Metropolitan cities/Provinces)
- Level 2 (Sigungu): First 5 digits - 시군구 (Cities/Counties/Districts)  
- Level 3 (EMD): Full 10 digits - 읍면동 (Towns/Townships/Neighborhoods)

Implements the "Antigravity" principle of seamless traversal.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum
import re


class AdminLevel(Enum):
    """Administrative hierarchy levels"""
    NATIONAL = 0  # 전국
    SIDO = 1      # 시도 (17 regions)
    SIGUNGU = 2   # 시군구 (250+ regions)
    EMD = 3       # 읍면동 (3,500+ regions)


@dataclass
class Region:
    """Represents an administrative region with H-Code"""
    code: str           # 10-digit H-Code
    name: str           # Korean name
    name_full: str      # Full hierarchical name
    level: AdminLevel
    parent_code: Optional[str] = None
    is_active: bool = True
    expired_date: Optional[str] = None
    
    @property
    def sido_code(self) -> str:
        """Extract Sido (시도) code - first 2 digits"""
        return self.code[:2].ljust(10, '0')
    
    @property
    def sigungu_code(self) -> str:
        """Extract Sigungu (시군구) code - first 5 digits"""
        return self.code[:5].ljust(10, '0')
    
    @property
    def emd_code(self) -> str:
        """Full EMD code - all 10 digits"""
        return self.code


@dataclass
class HierarchyNode:
    """Node in the administrative hierarchy tree"""
    region: Region
    children: Dict[str, 'HierarchyNode'] = field(default_factory=dict)
    
    def add_child(self, node: 'HierarchyNode') -> None:
        """Add a child region"""
        self.children[node.region.code] = node
    
    def get_descendants(self) -> List[Region]:
        """Get all descendant regions (DFS)"""
        result = []
        for child in self.children.values():
            result.append(child.region)
            result.extend(child.get_descendants())
        return result


class KIKcdHierarchy:
    """
    KIKcd_H (행정구역코드) Hierarchy Manager
    
    Enables fluid, zero-friction navigation across South Korea's 
    administrative structure following the Antigravity principle.
    
    Example codes:
    - Seoul: 1100000000 (Sido)
    - Gangnam-gu: 1168000000 (Sigungu)
    - Yeoksam 1-dong: 1168010100 (EMD)
    """
    
    # Standard Sido (시도) codes - 17 metropolitan/provincial regions
    SIDO_CODES = {
        "11": "서울특별시",
        "26": "부산광역시",
        "27": "대구광역시",
        "28": "인천광역시",
        "29": "광주광역시",
        "30": "대전광역시",
        "31": "울산광역시",
        "36": "세종특별자치시",
        "41": "경기도",
        "42": "강원특별자치도",  # Updated 2023
        "43": "충청북도",
        "44": "충청남도",
        "45": "전북특별자치도",  # Updated 2024
        "46": "전라남도",
        "47": "경상북도",
        "48": "경상남도",
        "50": "제주특별자치도",
    }
    
    # Patterns to identify "Total" entries to filter out
    TOTAL_PATTERNS = [
        r'.*계$',           # Ends with 계
        r'^계$',            # Just 계
        r'.*소계.*',        # Contains 소계
        r'.*합계.*',        # Contains 합계
        r'전국',            # National total
    ]
    
    def __init__(self):
        self._regions: Dict[str, Region] = {}
        self._hierarchy_root: Optional[HierarchyNode] = None
        self._sido_index: Dict[str, List[str]] = {}      # sido_code -> [sigungu_codes]
        self._sigungu_index: Dict[str, List[str]] = {}   # sigungu_code -> [emd_codes]
        self._initialize_sido()
    
    def _initialize_sido(self) -> None:
        """Initialize the 17 Sido regions"""
        for code_prefix, name in self.SIDO_CODES.items():
            full_code = code_prefix.ljust(10, '0')
            region = Region(
                code=full_code,
                name=name,
                name_full=name,
                level=AdminLevel.SIDO,
                parent_code=None,
                is_active=True
            )
            self._regions[full_code] = region
            self._sido_index[full_code] = []
    
    def parse_code(self, code: str) -> Tuple[AdminLevel, str, str, str]:
        """
        Parse a 10-digit H-Code into its components
        
        Returns: (level, sido_part, sigungu_part, emd_part)
        """
        # Normalize code to 10 digits
        code = str(code).ljust(10, '0')[:10]
        
        sido = code[:2]
        sigungu = code[2:5]
        emd = code[5:10]
        
        # Determine level based on which parts are non-zero
        if emd != "00000":
            level = AdminLevel.EMD
        elif sigungu != "000":
            level = AdminLevel.SIGUNGU
        elif sido != "00":
            level = AdminLevel.SIDO
        else:
            level = AdminLevel.NATIONAL
            
        return level, sido, sigungu, emd
    
    def normalize_code(self, code: str, target_level: AdminLevel) -> str:
        """
        Normalize a code to a specific administrative level
        
        Example: normalize_code("1168010100", SIGUNGU) -> "1168000000"
        """
        code = str(code).ljust(10, '0')[:10]
        
        if target_level == AdminLevel.SIDO:
            return code[:2].ljust(10, '0')
        elif target_level == AdminLevel.SIGUNGU:
            return code[:5].ljust(10, '0')
        else:
            return code
    
    def get_parent_code(self, code: str) -> Optional[str]:
        """Get the parent region's code"""
        level, sido, sigungu, emd = self.parse_code(code)
        
        if level == AdminLevel.EMD:
            return f"{sido}{sigungu}".ljust(10, '0')
        elif level == AdminLevel.SIGUNGU:
            return sido.ljust(10, '0')
        elif level == AdminLevel.SIDO:
            return None  # Sido has no parent (except national)
        return None
    
    def get_children_codes(self, code: str) -> List[str]:
        """Get all direct children region codes"""
        normalized = self.normalize_code(code, self._get_level(code))
        level = self._get_level(code)
        
        if level == AdminLevel.SIDO:
            return self._sido_index.get(normalized, [])
        elif level == AdminLevel.SIGUNGU:
            return self._sigungu_index.get(normalized, [])
        return []
    
    def _get_level(self, code: str) -> AdminLevel:
        """Determine the administrative level of a code"""
        return self.parse_code(code)[0]
    
    def add_region(self, code: str, name: str, is_active: bool = True,
                   expired_date: Optional[str] = None) -> Region:
        """
        Add a region to the hierarchy
        
        Automatically determines level and parent from code structure.
        """
        code = str(code).ljust(10, '0')[:10]
        level, sido, sigungu, emd = self.parse_code(code)
        
        # Build full hierarchical name
        sido_code = sido.ljust(10, '0')
        sido_name = self._regions.get(sido_code, Region(sido_code, "", "", AdminLevel.SIDO)).name
        
        if level == AdminLevel.SIGUNGU:
            name_full = f"{sido_name} {name}"
            parent_code = sido_code
            # Index under sido
            if sido_code not in self._sido_index:
                self._sido_index[sido_code] = []
            if code not in self._sido_index[sido_code]:
                self._sido_index[sido_code].append(code)
                
        elif level == AdminLevel.EMD:
            sigungu_code = f"{sido}{sigungu}".ljust(10, '0')
            sigungu_region = self._regions.get(sigungu_code)
            sigungu_name = sigungu_region.name if sigungu_region else ""
            name_full = f"{sido_name} {sigungu_name} {name}"
            parent_code = sigungu_code
            # Index under sigungu
            if sigungu_code not in self._sigungu_index:
                self._sigungu_index[sigungu_code] = []
            if code not in self._sigungu_index[sigungu_code]:
                self._sigungu_index[sigungu_code].append(code)
        else:
            name_full = name
            parent_code = None
        
        region = Region(
            code=code,
            name=name,
            name_full=name_full,
            level=level,
            parent_code=parent_code,
            is_active=is_active,
            expired_date=expired_date
        )
        
        self._regions[code] = region
        return region
    
    def get_region(self, code: str) -> Optional[Region]:
        """Get a region by its code"""
        code = str(code).ljust(10, '0')[:10]
        return self._regions.get(code)
    
    def is_total_entry(self, name: str) -> bool:
        """
        Check if a region name represents a "Total" entry
        
        Following Zero-Inertia principle: automatically filter aggregates
        """
        for pattern in self.TOTAL_PATTERNS:
            if re.match(pattern, name):
                return True
        return False
    
    def filter_active_regions(self, codes: List[str], 
                              reference_year: int = 2025) -> List[str]:
        """
        Filter out expired codes based on reference year
        
        Zero-Inertia: Remove codes that were expired before the reference period
        """
        active = []
        for code in codes:
            region = self.get_region(code)
            if region is None:
                continue
            if not region.is_active:
                # Check if expired before our analysis period
                if region.expired_date:
                    try:
                        exp_year = int(region.expired_date[:4])
                        if exp_year < reference_year - 5:  # Outside 5-year window
                            continue
                    except (ValueError, IndexError):
                        pass
            active.append(code)
        return active
    
    def navigate_up(self, code: str) -> Optional[Region]:
        """
        Fluid navigation: Move up one level in hierarchy
        
        EMD -> Sigungu -> Sido -> None
        """
        parent_code = self.get_parent_code(code)
        if parent_code:
            return self.get_region(parent_code)
        return None
    
    def navigate_down(self, code: str) -> List[Region]:
        """
        Fluid navigation: Get all direct children
        
        Sido -> [Sigungus] or Sigungu -> [EMDs]
        """
        children_codes = self.get_children_codes(code)
        return [self.get_region(c) for c in children_codes if self.get_region(c)]
    
    def get_siblings(self, code: str) -> List[Region]:
        """Get all regions at the same level with the same parent"""
        parent_code = self.get_parent_code(code)
        if parent_code:
            return self.navigate_down(parent_code)
        elif self._get_level(code) == AdminLevel.SIDO:
            # Return all Sido regions
            return [r for r in self._regions.values() if r.level == AdminLevel.SIDO]
        return []
    
    def get_all_by_level(self, level: AdminLevel) -> List[Region]:
        """Get all regions at a specific administrative level"""
        return [r for r in self._regions.values() if r.level == level]
    
    def build_breadcrumb(self, code: str) -> List[Region]:
        """
        Build navigation breadcrumb from national to current region
        
        Returns: [Sido, Sigungu?, EMD?] path
        """
        breadcrumb = []
        current = self.get_region(code)
        
        while current:
            breadcrumb.insert(0, current)
            if current.parent_code:
                current = self.get_region(current.parent_code)
            else:
                break
                
        return breadcrumb
    
    def search_by_name(self, query: str, level: Optional[AdminLevel] = None) -> List[Region]:
        """
        Search regions by name (supports partial matching)
        """
        query_lower = query.lower()
        results = []
        
        for region in self._regions.values():
            if level and region.level != level:
                continue
            if query_lower in region.name.lower() or query_lower in region.name_full.lower():
                results.append(region)
                
        return sorted(results, key=lambda r: (r.level.value, r.name))
    
    def get_statistics(self) -> Dict[str, int]:
        """Get count statistics by administrative level"""
        stats = {level.name: 0 for level in AdminLevel}
        for region in self._regions.values():
            stats[region.level.name] += 1
        return stats
    
    def to_dict(self) -> Dict[str, dict]:
        """Export hierarchy as dictionary"""
        return {
            code: {
                "name": r.name,
                "name_full": r.name_full,
                "level": r.level.name,
                "parent_code": r.parent_code,
                "is_active": r.is_active,
            }
            for code, r in self._regions.items()
        }


# Convenience function for fluid access
def create_hierarchy() -> KIKcdHierarchy:
    """Factory function to create a pre-initialized hierarchy"""
    return KIKcdHierarchy()
