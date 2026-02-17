"""
Ranking Charts Visualization

"Lifted Insights" - Transform regional comparisons into 
intuitive rankings that surface welfare priorities instantly.

Features:
- Urgency ranking bars
- Aging velocity comparisons
- Geographic heatmaps
- Trend sparklines
"""

from typing import Dict, List, Optional, Tuple, Any
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import plotly.express as px
import pandas as pd
import numpy as np

from sodapop.core.analyzer import TrendMetrics, UrgencyLevel, TrendDirection
from sodapop.core.processor import DemographicData


class RankingCharts:
    """
    Regional Ranking Visualization Generator
    
    Creates comparative visualizations that immediately surface
    which regions require priority welfare attention.
    """
    
    # Urgency level colors
    URGENCY_COLORS = {
        UrgencyLevel.CRITICAL: "#DC2626",    # Red
        UrgencyLevel.HIGH: "#F97316",        # Orange
        UrgencyLevel.ELEVATED: "#FBBF24",    # Yellow
        UrgencyLevel.MODERATE: "#34D399",    # Green
        UrgencyLevel.LOW: "#60A5FA",         # Blue
    }
    
    # Trend direction colors
    TREND_COLORS = {
        TrendDirection.RAPID_INCREASE: "#DC2626",
        TrendDirection.MODERATE_INCREASE: "#F97316",
        TrendDirection.STABLE: "#9CA3AF",
        TrendDirection.MODERATE_DECREASE: "#34D399",
        TrendDirection.RAPID_DECREASE: "#3B82F6",
    }
    
    def __init__(self, theme: str = "plotly_white"):
        self.theme = theme
    
    def create_urgency_ranking(self,
                                rankings: List[Tuple[str, TrendMetrics]],
                                top_n: int = 20,
                                show_factors: bool = True) -> go.Figure:
        """
        Create horizontal bar chart ranking regions by welfare urgency
        
        Args:
            rankings: List of (region_code, TrendMetrics) sorted by urgency
            top_n: Number of top regions to show
            show_factors: Include urgency factor annotations
        
        Returns:
            Plotly Figure
        """
        # Take top N regions
        top_regions = rankings[:top_n]
        
        # Prepare data
        region_names = [m.region_name for _, m in top_regions]
        urgency_scores = [m.urgency_score for _, m in top_regions]
        urgency_levels = [m.urgency_level for _, m in top_regions]
        factors = ["; ".join(m.urgency_factors[:2]) for _, m in top_regions]
        
        # Colors based on urgency level
        colors = [self.URGENCY_COLORS[level] for level in urgency_levels]
        
        fig = go.Figure()
        
        fig.add_trace(go.Bar(
            y=region_names[::-1],  # Reverse for top-to-bottom ranking
            x=urgency_scores[::-1],
            orientation='h',
            marker_color=colors[::-1],
            text=[f"{s:.1f}" for s in urgency_scores[::-1]],
            textposition='outside',
            hovertemplate=(
                "<b>%{y}</b><br>" +
                "긴급도 점수: %{x:.1f}<br>" +
                "<extra></extra>"
            ),
            customdata=factors[::-1],
        ))
        
        # Add urgency level annotations
        shapes = []
        annotations = []
        
        # Background zones for urgency levels
        zone_boundaries = [(80, 100, "위험", "#FEE2E2"),
                          (60, 80, "높음", "#FFEDD5"),
                          (40, 60, "주의", "#FEF9C3"),
                          (0, 40, "보통", "#ECFDF5")]
        
        for x0, x1, label, color in zone_boundaries:
            shapes.append(dict(
                type="rect",
                xref="x",
                yref="paper",
                x0=x0,
                x1=x1,
                y0=0,
                y1=1,
                fillcolor=color,
                opacity=0.3,
                layer="below",
                line_width=0,
            ))
        
        fig.update_layout(
            title=dict(
                text="🎯 복지 긴급도 순위 (Welfare Urgency Ranking)",
                font=dict(size=20, family="Pretendard, sans-serif"),
                x=0.5,
            ),
            template=self.theme,
            xaxis=dict(
                title="긴급도 점수 (0-100)",
                range=[0, 105],
                dtick=20,
            ),
            yaxis=dict(
                title="",
                tickfont=dict(size=11),
            ),
            shapes=shapes,
            height=max(400, 30 * top_n),
            margin=dict(l=150, r=50, t=80, b=60),
            showlegend=False,
        )
        
        # Add legend for urgency levels
        for level, color in self.URGENCY_COLORS.items():
            fig.add_trace(go.Scatter(
                x=[None],
                y=[None],
                mode='markers',
                marker=dict(size=12, color=color),
                name=level.name,
                showlegend=True,
            ))
        
        fig.update_layout(
            legend=dict(
                title="긴급도 수준",
                orientation="h",
                yanchor="bottom",
                y=1.02,
                xanchor="center",
                x=0.5,
            )
        )
        
        return fig
    
    def create_aging_velocity_chart(self,
                                     rankings: List[Tuple[str, TrendMetrics]],
                                     top_n: int = 15,
                                     include_national: bool = True,
                                     national_velocity: float = 4.2) -> go.Figure:
        """
        Create lollipop chart showing aging velocity by region
        
        Shows how fast each region is aging compared to national average.
        """
        top_regions = rankings[:top_n]
        
        region_names = [m.region_name for _, m in top_regions]
        velocities = [m.aging_velocity for _, m in top_regions]
        trends = [m.aging_velocity_trend for _, m in top_regions]
        
        fig = go.Figure()
        
        # Add lollipop stems
        for i, (name, vel, trend) in enumerate(zip(region_names, velocities, trends)):
            color = self.TREND_COLORS[trend]
            
            # Stem
            fig.add_trace(go.Scatter(
                x=[0, vel],
                y=[name, name],
                mode='lines',
                line=dict(color=color, width=2),
                showlegend=False,
                hoverinfo='skip',
            ))
            
            # Dot
            fig.add_trace(go.Scatter(
                x=[vel],
                y=[name],
                mode='markers+text',
                marker=dict(size=14, color=color, line=dict(width=2, color='white')),
                text=[f"{vel:.1f}%"],
                textposition='middle right',
                textfont=dict(size=10),
                showlegend=False,
                hovertemplate=f"<b>{name}</b><br>고령화속도: {vel:.1f}%/년<extra></extra>",
            ))
        
        # Add national average line
        if include_national:
            fig.add_vline(
                x=national_velocity,
                line_dash="dash",
                line_color="#6B7280",
                annotation_text=f"전국 평균 ({national_velocity:.1f}%)",
                annotation_position="top",
            )
        
        fig.update_layout(
            title=dict(
                text="📈 고령화 속도 비교 (Aging Velocity)",
                subtitle=dict(text="연평균 65세 이상 인구 증가율", font=dict(size=12, color="gray")),
                font=dict(size=18),
                x=0.5,
            ),
            template=self.theme,
            xaxis=dict(
                title="연평균 증가율 (%)",
                zeroline=True,
                zerolinewidth=1,
                zerolinecolor='gray',
            ),
            yaxis=dict(
                title="",
                categoryorder='array',
                categoryarray=region_names[::-1],
            ),
            height=max(400, 40 * top_n),
            margin=dict(l=150, r=100, t=100, b=60),
        )
        
        return fig
    
    def create_trend_dashboard(self,
                                all_data: Dict[str, Dict[int, DemographicData]],
                                all_metrics: List[Tuple[str, TrendMetrics]],
                                top_n: int = 10) -> go.Figure:
        """
        Create a comprehensive dashboard with multiple trend indicators
        
        2x2 grid showing:
        - Urgency ranking
        - Aging velocity
        - Population change
        - Old-old ratio
        """
        fig = make_subplots(
            rows=2, cols=2,
            subplot_titles=[
                "긴급도 상위 지역",
                "고령화 속도 상위 지역",
                "인구감소 상위 지역",
                "후기고령 비율 상위 지역"
            ],
            horizontal_spacing=0.15,
            vertical_spacing=0.12,
        )
        
        top_urgency = all_metrics[:top_n]
        top_velocity = sorted(all_metrics, key=lambda x: x[1].aging_velocity, reverse=True)[:top_n]
        top_decline = sorted(all_metrics, key=lambda x: x[1].total_change_percent)[:top_n]
        
        # Get old-old ratios from latest data
        old_old_data = []
        for code, metrics in all_metrics:
            if code in all_data:
                latest_year = max(all_data[code].keys())
                old_old_ratio = all_data[code][latest_year].old_old_ratio
                old_old_data.append((code, metrics, old_old_ratio))
        top_old_old = sorted(old_old_data, key=lambda x: x[2], reverse=True)[:top_n]
        
        # 1. Urgency ranking
        fig.add_trace(
            go.Bar(
                y=[m.region_name for _, m in top_urgency][::-1],
                x=[m.urgency_score for _, m in top_urgency][::-1],
                orientation='h',
                marker_color=[self.URGENCY_COLORS[m.urgency_level] for _, m in top_urgency][::-1],
                name="긴급도",
                showlegend=False,
            ),
            row=1, col=1
        )
        
        # 2. Aging velocity
        fig.add_trace(
            go.Bar(
                y=[m.region_name for _, m in top_velocity][::-1],
                x=[m.aging_velocity for _, m in top_velocity][::-1],
                orientation='h',
                marker_color='#F97316',
                name="고령화속도",
                showlegend=False,
            ),
            row=1, col=2
        )
        
        # 3. Population decline
        fig.add_trace(
            go.Bar(
                y=[m.region_name for _, m in top_decline][::-1],
                x=[m.total_change_percent for _, m in top_decline][::-1],
                orientation='h',
                marker_color='#DC2626',
                name="인구변화",
                showlegend=False,
            ),
            row=2, col=1
        )
        
        # 4. Old-old ratio
        fig.add_trace(
            go.Bar(
                y=[m.region_name for _, m, _ in top_old_old][::-1],
                x=[ratio for _, _, ratio in top_old_old][::-1],
                orientation='h',
                marker_color='#7C3AED',
                name="후기고령비율",
                showlegend=False,
            ),
            row=2, col=2
        )
        
        fig.update_layout(
            title=dict(
                text="🎯 복지 우선순위 대시보드",
                font=dict(size=22),
                x=0.5,
            ),
            template=self.theme,
            height=800,
            margin=dict(l=120, r=40, t=100, b=40),
        )
        
        # Update axis labels
        fig.update_xaxes(title_text="긴급도 점수", row=1, col=1)
        fig.update_xaxes(title_text="연증가율 (%)", row=1, col=2)
        fig.update_xaxes(title_text="인구변화율 (%)", row=2, col=1)
        fig.update_xaxes(title_text="후기고령 비율 (%)", row=2, col=2)
        
        return fig
    
    def create_sparkline_table(self,
                                all_data: Dict[str, Dict[int, DemographicData]],
                                all_metrics: List[Tuple[str, TrendMetrics]],
                                top_n: int = 15) -> go.Figure:
        """
        Create a table with embedded sparklines showing trends
        
        Visual summary table with mini-charts for quick scanning.
        """
        top_regions = all_metrics[:top_n]
        
        # Prepare table data
        headers = ["순위", "지역", "인구", "고령화율", "긴급도", "추세"]
        
        ranks = list(range(1, top_n + 1))
        names = [m.region_name for _, m in top_regions]
        
        populations = []
        aging_ratios = []
        urgencies = []
        
        for code, metrics in top_regions:
            if code in all_data:
                latest_year = max(all_data[code].keys())
                latest = all_data[code][latest_year]
                populations.append(f"{latest.total_population:,}")
                aging_ratios.append(f"{latest.aging_ratio:.1f}%")
            else:
                populations.append("-")
                aging_ratios.append("-")
            
            urgencies.append(f"{metrics.urgency_score:.0f}")
        
        # Create trend indicators (unicode sparklines)
        trends = []
        for code, metrics in top_regions:
            if code in all_data:
                years = sorted(all_data[code].keys())
                ratios = [all_data[code][y].aging_ratio for y in years]
                # Simple sparkline using unicode blocks
                sparkline = self._create_text_sparkline(ratios)
                trends.append(sparkline)
            else:
                trends.append("─" * 5)
        
        fig = go.Figure(data=[go.Table(
            header=dict(
                values=headers,
                fill_color='#1F2937',
                font=dict(color='white', size=13),
                align='center',
                height=35,
            ),
            cells=dict(
                values=[ranks, names, populations, aging_ratios, urgencies, trends],
                fill_color=[
                    ['white'] * top_n,
                    ['white'] * top_n,
                    ['white'] * top_n,
                    ['white'] * top_n,
                    [self._urgency_to_bgcolor(m.urgency_level) for _, m in top_regions],
                    ['white'] * top_n,
                ],
                font=dict(size=12),
                align=['center', 'left', 'right', 'right', 'center', 'center'],
                height=30,
            ),
        )])
        
        fig.update_layout(
            title=dict(
                text="📋 복지 우선순위 요약표",
                font=dict(size=18),
                x=0.5,
            ),
            template=self.theme,
            height=50 + 35 + (30 * top_n),
            margin=dict(l=20, r=20, t=60, b=20),
        )
        
        return fig
    
    def create_geographic_bubble(self,
                                  all_data: Dict[str, Dict[int, DemographicData]],
                                  all_metrics: List[Tuple[str, TrendMetrics]],
                                  metric: str = "urgency_score") -> go.Figure:
        """
        Create bubble chart mapping regions by two dimensions
        
        X: Aging ratio (current state)
        Y: Aging velocity (rate of change)
        Size: Population
        Color: Urgency level
        """
        data_points = []
        
        for code, metrics in all_metrics:
            if code in all_data:
                latest_year = max(all_data[code].keys())
                latest = all_data[code][latest_year]
                
                data_points.append({
                    'region': metrics.region_name,
                    'aging_ratio': latest.aging_ratio,
                    'aging_velocity': metrics.aging_velocity,
                    'population': latest.total_population,
                    'urgency_score': metrics.urgency_score,
                    'urgency_level': metrics.urgency_level.name,
                    'color': self.URGENCY_COLORS[metrics.urgency_level],
                })
        
        df = pd.DataFrame(data_points)
        
        fig = go.Figure()
        
        for level in UrgencyLevel:
            level_df = df[df['urgency_level'] == level.name]
            if len(level_df) > 0:
                fig.add_trace(go.Scatter(
                    x=level_df['aging_ratio'],
                    y=level_df['aging_velocity'],
                    mode='markers+text',
                    marker=dict(
                        size=level_df['population'] / level_df['population'].max() * 50 + 10,
                        color=self.URGENCY_COLORS[level],
                        opacity=0.7,
                        line=dict(width=1, color='white'),
                    ),
                    text=level_df['region'],
                    textposition='top center',
                    textfont=dict(size=9),
                    name=level.name,
                    hovertemplate=(
                        "<b>%{text}</b><br>" +
                        "고령화율: %{x:.1f}%<br>" +
                        "고령화속도: %{y:.1f}%<br>" +
                        "<extra></extra>"
                    ),
                ))
        
        # Add reference lines
        fig.add_hline(y=4.2, line_dash="dash", line_color="gray",
                      annotation_text="전국 평균 속도")
        fig.add_vline(x=19.2, line_dash="dash", line_color="gray",
                      annotation_text="전국 평균 비율")
        
        # Add quadrant labels
        fig.add_annotation(x=25, y=8, text="⚠️ 고위험군",
                          showarrow=False, font=dict(size=12, color="red"))
        fig.add_annotation(x=12, y=8, text="📈 급속고령화",
                          showarrow=False, font=dict(size=12, color="orange"))
        fig.add_annotation(x=25, y=2, text="📊 고령사회",
                          showarrow=False, font=dict(size=12, color="purple"))
        fig.add_annotation(x=12, y=2, text="✅ 안정권",
                          showarrow=False, font=dict(size=12, color="green"))
        
        fig.update_layout(
            title=dict(
                text="🗺️ 지역별 고령화 현황 맵",
                subtitle=dict(text="버블 크기 = 인구 규모", font=dict(size=12, color="gray")),
                font=dict(size=18),
                x=0.5,
            ),
            template=self.theme,
            xaxis=dict(
                title="고령화율 (65세 이상 비율 %)",
                range=[5, 35],
            ),
            yaxis=dict(
                title="고령화 속도 (연평균 증가율 %)",
                range=[-2, 12],
            ),
            legend=dict(
                title="긴급도 수준",
                orientation="h",
                yanchor="bottom",
                y=1.02,
                xanchor="center",
                x=0.5,
            ),
            height=600,
        )
        
        return fig
    
    def _create_text_sparkline(self, values: List[float]) -> str:
        """Create a simple text-based sparkline using unicode blocks"""
        if not values or len(values) < 2:
            return "─" * 5
        
        # Normalize values to 0-7 range for block characters
        min_val = min(values)
        max_val = max(values)
        range_val = max_val - min_val if max_val != min_val else 1
        
        blocks = " ▁▂▃▄▅▆▇█"
        sparkline = ""
        
        for v in values:
            idx = int((v - min_val) / range_val * 7)
            sparkline += blocks[idx + 1]
        
        return sparkline
    
    def _urgency_to_bgcolor(self, level: UrgencyLevel) -> str:
        """Convert urgency level to lighter background color"""
        color_map = {
            UrgencyLevel.CRITICAL: "#FEE2E2",
            UrgencyLevel.HIGH: "#FFEDD5",
            UrgencyLevel.ELEVATED: "#FEF9C3",
            UrgencyLevel.MODERATE: "#D1FAE5",
            UrgencyLevel.LOW: "#DBEAFE",
        }
        return color_map.get(level, "white")
    
    def export_html(self, fig: go.Figure, filepath: str) -> None:
        """Export figure to standalone HTML file"""
        fig.write_html(filepath, include_plotlyjs=True, full_html=True)
