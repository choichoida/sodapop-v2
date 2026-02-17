"""
SODAPOP 2.0 - Social Demographic Analysis Platform for Optimal Planning

A nationwide demographic analysis system built on the "Antigravity" philosophy.
Eliminating the weight of complex raw data for evidence-based social welfare insights.
"""

__version__ = "2.0.0"
__author__ = "SODAPOP Team"

from sodapop.core.hierarchy import KIKcdHierarchy
from sodapop.core.processor import DemographicProcessor
from sodapop.core.analyzer import TrendAnalyzer
from sodapop.generators.rationale import WelfareRationaleGenerator

__all__ = [
    "KIKcdHierarchy",
    "DemographicProcessor", 
    "TrendAnalyzer",
    "WelfareRationaleGenerator",
]
