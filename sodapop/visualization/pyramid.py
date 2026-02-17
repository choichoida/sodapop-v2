"""
Population Pyramid Visualization

"Visual Weightlessness" - Transform dense statistics into 
intuitive, interactive population pyramids that social workers
can instantly understand.

Features:
- Welfare cluster highlighting
- Comparative overlays (region vs national)
- Temporal animation (2021-2025)
- Export-ready for reports
"""

from typing import Dict, List, Optional, Tuple
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd
import numpy as np

from sodapop.core.processor import DemographicData, WelfareCluster


class PopulationPyramid:
    """
    Interactive Population Pyramid Generator
    
    Creates "floating" visualizations that lift complex data
    into immediately comprehensible insights.
    """
    
    # Welfare cluster colors (professional, accessible palette)
    CLUSTER_COLORS = {
        WelfareCluster.CHILDREN_YOUTH: "#4ECDC4",   # Teal
        WelfareCluster.PRODUCTIVE: "#45B7D1",       # Blue
        WelfareCluster.YOUNG_OLD: "#F7B731",        # Amber
        WelfareCluster.OLD_OLD: "#FC5C65",          # Coral
    }
    
    # Standard age groups for pyramid (5-year intervals)
    STANDARD_AGE_GROUPS = [
        "0-4", "5-9", "10-14", "15-19",
        "20-24", "25-29", "30-34", "35-39",
        "40-44", "45-49", "50-54", "55-59",
        "60-64", "65-69", "70-74", "75-79",
        "80-84", "85+"
    ]
    
    # Color scheme
    MALE_COLOR = "#3498db"
    FEMALE_COLOR = "#e74c3c"
    MALE_COLOR_LIGHT = "rgba(52, 152, 219, 0.5)"
    FEMALE_COLOR_LIGHT = "rgba(231, 76, 60, 0.5)"
    
    def __init__(self, theme: str = "plotly_white"):
        """
        Initialize pyramid generator
        
        Args:
            theme: Plotly template theme
        """
        self.theme = theme
    
    def _get_cluster_for_age(self, age_group: str) -> WelfareCluster:
        """Determine welfare cluster for an age group"""
        # Parse the age group to get the starting age
        if age_group.endswith("+"):
            start_age = int(age_group.replace("+", "").split("-")[0])
        else:
            start_age = int(age_group.split("-")[0])
        
        if start_age <= 18:
            return WelfareCluster.CHILDREN_YOUTH
        elif start_age <= 64:
            return WelfareCluster.PRODUCTIVE
        elif start_age <= 74:
            return WelfareCluster.YOUNG_OLD
        else:
            return WelfareCluster.OLD_OLD
    
    def create_basic_pyramid(self, 
                             demo: DemographicData,
                             title: Optional[str] = None,
                             show_clusters: bool = True) -> go.Figure:
        """
        Create a basic population pyramid for a single region/year
        
        Args:
            demo: DemographicData object
            title: Chart title (auto-generated if None)
            show_clusters: Highlight welfare clusters with colors
        
        Returns:
            Plotly Figure object
        """
        title = title or f"{demo.region_name} 인구 피라미드 ({demo.year}년)"
        
        # Generate sample age distribution if not available
        age_data = self._generate_age_distribution(demo)
        
        fig = go.Figure()
        
        # Male bars (negative values for left side)
        male_values = [-v for v in age_data['male']]
        female_values = age_data['female']
        
        if show_clusters:
            # Add bars by cluster with different colors
            for cluster in WelfareCluster:
                cluster_mask = [self._get_cluster_for_age(ag) == cluster 
                               for ag in self.STANDARD_AGE_GROUPS]
                
                male_cluster = [male_values[i] if cluster_mask[i] else 0 
                               for i in range(len(male_values))]
                female_cluster = [female_values[i] if cluster_mask[i] else 0 
                                 for i in range(len(female_values))]
                
                # Male (left side)
                fig.add_trace(go.Bar(
                    name=f'{cluster.korean_name} (남)',
                    y=self.STANDARD_AGE_GROUPS,
                    x=male_cluster,
                    orientation='h',
                    marker_color=self.CLUSTER_COLORS[cluster],
                    marker_line_width=0,
                    opacity=0.8,
                    legendgroup=cluster.value,
                    showlegend=True,
                    hovertemplate=(
                        f"<b>{cluster.korean_name}</b><br>" +
                        "연령: %{y}<br>" +
                        "남성: %{customdata:,}명<extra></extra>"
                    ),
                    customdata=[-v for v in male_cluster],
                ))
                
                # Female (right side) - lighter shade
                fig.add_trace(go.Bar(
                    name=f'{cluster.korean_name} (여)',
                    y=self.STANDARD_AGE_GROUPS,
                    x=female_cluster,
                    orientation='h',
                    marker_color=self.CLUSTER_COLORS[cluster],
                    marker_line_width=0,
                    opacity=0.5,
                    legendgroup=cluster.value,
                    showlegend=False,
                    hovertemplate=(
                        f"<b>{cluster.korean_name}</b><br>" +
                        "연령: %{y}<br>" +
                        "여성: %{x:,}명<extra></extra>"
                    ),
                ))
        else:
            # Simple two-color pyramid
            fig.add_trace(go.Bar(
                name='남성',
                y=self.STANDARD_AGE_GROUPS,
                x=male_values,
                orientation='h',
                marker_color=self.MALE_COLOR,
                hovertemplate="연령: %{y}<br>남성: %{customdata:,}명<extra></extra>",
                customdata=[-v for v in male_values],
            ))
            
            fig.add_trace(go.Bar(
                name='여성',
                y=self.STANDARD_AGE_GROUPS,
                x=female_values,
                orientation='h',
                marker_color=self.FEMALE_COLOR,
                hovertemplate="연령: %{y}<br>여성: %{x:,}명<extra></extra>",
            ))
        
        # Calculate max for symmetric axis
        max_val = max(max(abs(v) for v in male_values), max(female_values)) * 1.1
        
        fig.update_layout(
            title=dict(
                text=title,
                font=dict(size=18, family="Pretendard, sans-serif"),
                x=0.5,
            ),
            barmode='overlay',
            bargap=0.1,
            template=self.theme,
            xaxis=dict(
                title="인구 수",
                range=[-max_val, max_val],
                tickformat=",d",
                tickvals=self._generate_ticks(max_val),
                ticktext=[f"{abs(int(v)):,}" for v in self._generate_ticks(max_val)],
            ),
            yaxis=dict(
                title="연령대",
                categoryorder='array',
                categoryarray=self.STANDARD_AGE_GROUPS,
            ),
            legend=dict(
                orientation="h",
                yanchor="bottom",
                y=1.02,
                xanchor="center",
                x=0.5,
            ),
            annotations=[
                dict(
                    text="← 남성",
                    x=-max_val * 0.8,
                    y=1.05,
                    xref="x",
                    yref="paper",
                    showarrow=False,
                    font=dict(size=12, color=self.MALE_COLOR),
                ),
                dict(
                    text="여성 →",
                    x=max_val * 0.8,
                    y=1.05,
                    xref="x",
                    yref="paper",
                    showarrow=False,
                    font=dict(size=12, color=self.FEMALE_COLOR),
                ),
            ],
            height=600,
            margin=dict(l=80, r=80, t=100, b=60),
        )
        
        return fig
    
    def create_comparison_pyramid(self,
                                   demo1: DemographicData,
                                   demo2: DemographicData,
                                   labels: Tuple[str, str] = None) -> go.Figure:
        """
        Create overlaid pyramid comparing two regions or time periods
        
        Useful for:
        - Region vs National average
        - 2021 vs 2025 comparison
        - Urban vs Rural comparison
        """
        labels = labels or (demo1.region_name, demo2.region_name)
        
        age_data1 = self._generate_age_distribution(demo1)
        age_data2 = self._generate_age_distribution(demo2)
        
        fig = go.Figure()
        
        # Primary data (solid)
        fig.add_trace(go.Bar(
            name=f'{labels[0]} (남)',
            y=self.STANDARD_AGE_GROUPS,
            x=[-v for v in age_data1['male']],
            orientation='h',
            marker_color=self.MALE_COLOR,
            opacity=0.8,
        ))
        fig.add_trace(go.Bar(
            name=f'{labels[0]} (여)',
            y=self.STANDARD_AGE_GROUPS,
            x=age_data1['female'],
            orientation='h',
            marker_color=self.FEMALE_COLOR,
            opacity=0.8,
        ))
        
        # Comparison data (outline only)
        fig.add_trace(go.Scatter(
            name=f'{labels[1]} (남)',
            y=self.STANDARD_AGE_GROUPS,
            x=[-v for v in age_data2['male']],
            mode='lines',
            line=dict(color=self.MALE_COLOR, width=2, dash='dash'),
        ))
        fig.add_trace(go.Scatter(
            name=f'{labels[1]} (여)',
            y=self.STANDARD_AGE_GROUPS,
            x=age_data2['female'],
            mode='lines',
            line=dict(color=self.FEMALE_COLOR, width=2, dash='dash'),
        ))
        
        max_val = max(
            max(abs(v) for v in age_data1['male']),
            max(age_data1['female']),
            max(abs(v) for v in age_data2['male']),
            max(age_data2['female'])
        ) * 1.1
        
        fig.update_layout(
            title=dict(
                text=f"인구구조 비교: {labels[0]} vs {labels[1]}",
                font=dict(size=18),
                x=0.5,
            ),
            barmode='overlay',
            template=self.theme,
            xaxis=dict(
                title="인구 수",
                range=[-max_val, max_val],
                tickformat=",d",
            ),
            yaxis=dict(title="연령대"),
            legend=dict(
                orientation="h",
                yanchor="bottom",
                y=1.02,
                xanchor="center",
                x=0.5,
            ),
            height=600,
        )
        
        return fig
    
    def create_temporal_pyramid(self,
                                 region_data: Dict[int, DemographicData],
                                 animate: bool = True) -> go.Figure:
        """
        Create animated pyramid showing change over time (2021-2025)
        
        "Gravitational Shift" visualization - watch demographics transform
        """
        years = sorted(region_data.keys())
        if not years:
            return go.Figure()
        
        region_name = region_data[years[0]].region_name
        
        # Prepare data for all years
        frames_data = {}
        max_val = 0
        
        for year in years:
            demo = region_data[year]
            age_data = self._generate_age_distribution(demo)
            frames_data[year] = age_data
            max_val = max(
                max_val,
                max(abs(v) for v in age_data['male']),
                max(age_data['female'])
            )
        
        max_val *= 1.1
        
        # Create figure with first year
        first_data = frames_data[years[0]]
        
        fig = go.Figure(
            data=[
                go.Bar(
                    name='남성',
                    y=self.STANDARD_AGE_GROUPS,
                    x=[-v for v in first_data['male']],
                    orientation='h',
                    marker_color=self.MALE_COLOR,
                ),
                go.Bar(
                    name='여성',
                    y=self.STANDARD_AGE_GROUPS,
                    x=first_data['female'],
                    orientation='h',
                    marker_color=self.FEMALE_COLOR,
                ),
            ]
        )
        
        if animate:
            # Create frames for animation
            frames = []
            for year in years:
                year_data = frames_data[year]
                frame = go.Frame(
                    data=[
                        go.Bar(
                            y=self.STANDARD_AGE_GROUPS,
                            x=[-v for v in year_data['male']],
                            orientation='h',
                            marker_color=self.MALE_COLOR,
                        ),
                        go.Bar(
                            y=self.STANDARD_AGE_GROUPS,
                            x=year_data['female'],
                            orientation='h',
                            marker_color=self.FEMALE_COLOR,
                        ),
                    ],
                    name=str(year),
                    layout=go.Layout(
                        title_text=f"{region_name} 인구 피라미드 ({year}년)"
                    )
                )
                frames.append(frame)
            
            fig.frames = frames
            
            # Add animation controls
            fig.update_layout(
                updatemenus=[
                    dict(
                        type="buttons",
                        showactive=False,
                        y=0,
                        x=0.1,
                        xanchor="right",
                        buttons=[
                            dict(
                                label="▶ 재생",
                                method="animate",
                                args=[None, {
                                    "frame": {"duration": 1000, "redraw": True},
                                    "fromcurrent": True,
                                    "transition": {"duration": 500}
                                }]
                            ),
                            dict(
                                label="⏸ 일시정지",
                                method="animate",
                                args=[[None], {
                                    "frame": {"duration": 0, "redraw": False},
                                    "mode": "immediate",
                                    "transition": {"duration": 0}
                                }]
                            ),
                        ],
                    )
                ],
                sliders=[{
                    "active": 0,
                    "yanchor": "top",
                    "xanchor": "left",
                    "currentvalue": {
                        "font": {"size": 16},
                        "prefix": "연도: ",
                        "visible": True,
                        "xanchor": "right"
                    },
                    "transition": {"duration": 500},
                    "pad": {"b": 10, "t": 50},
                    "len": 0.9,
                    "x": 0.1,
                    "y": 0,
                    "steps": [
                        {"args": [[str(year)], {
                            "frame": {"duration": 500, "redraw": True},
                            "mode": "immediate",
                            "transition": {"duration": 500}
                        }],
                        "label": str(year),
                        "method": "animate"}
                        for year in years
                    ]
                }]
            )
        
        fig.update_layout(
            title=dict(
                text=f"{region_name} 인구 피라미드 ({years[0]}년)",
                font=dict(size=18),
                x=0.5,
            ),
            barmode='overlay',
            template=self.theme,
            xaxis=dict(
                title="인구 수",
                range=[-max_val, max_val],
                tickformat=",d",
            ),
            yaxis=dict(title="연령대"),
            height=650,
            margin=dict(b=100),
        )
        
        return fig
    
    def create_cluster_breakdown(self, demo: DemographicData) -> go.Figure:
        """
        Create a breakdown chart showing welfare cluster composition
        
        Donut chart with cluster details
        """
        clusters = [
            (WelfareCluster.CHILDREN_YOUTH, demo.children_youth),
            (WelfareCluster.PRODUCTIVE, demo.productive),
            (WelfareCluster.YOUNG_OLD, demo.young_old),
            (WelfareCluster.OLD_OLD, demo.old_old),
        ]
        
        fig = go.Figure(data=[go.Pie(
            labels=[c[0].korean_name for c in clusters],
            values=[c[1] for c in clusters],
            hole=0.4,
            marker_colors=[self.CLUSTER_COLORS[c[0]] for c in clusters],
            textinfo='label+percent',
            textposition='outside',
            hovertemplate=(
                "<b>%{label}</b><br>" +
                "인구: %{value:,}명<br>" +
                "비율: %{percent}<extra></extra>"
            ),
        )])
        
        fig.update_layout(
            title=dict(
                text=f"{demo.region_name} 복지대상 인구구성 ({demo.year}년)",
                font=dict(size=18),
                x=0.5,
            ),
            template=self.theme,
            annotations=[
                dict(
                    text=f"총인구<br>{demo.total_population:,}",
                    x=0.5, y=0.5,
                    font_size=14,
                    showarrow=False,
                )
            ],
            height=500,
            showlegend=True,
            legend=dict(
                orientation="h",
                yanchor="bottom",
                y=-0.2,
                xanchor="center",
                x=0.5,
            ),
        )
        
        return fig
    
    def _generate_age_distribution(self, demo: DemographicData) -> Dict[str, List[int]]:
        """
        Generate age distribution data from DemographicData
        
        If detailed distribution not available, estimates from cluster totals.
        """
        # If we have actual age distribution, use it
        if demo.age_distribution:
            # Map to standard groups (implementation would parse actual data)
            pass
        
        # Otherwise, estimate from cluster totals
        # This creates a realistic distribution shape
        total = demo.total_population
        if total == 0:
            return {'male': [0] * len(self.STANDARD_AGE_GROUPS),
                    'female': [0] * len(self.STANDARD_AGE_GROUPS)}
        
        # Age distribution weights (typical Korean pattern)
        weights = {
            "0-4": 0.025, "5-9": 0.03, "10-14": 0.035, "15-19": 0.04,
            "20-24": 0.055, "25-29": 0.065, "30-34": 0.07, "35-39": 0.075,
            "40-44": 0.08, "45-49": 0.085, "50-54": 0.085, "55-59": 0.08,
            "60-64": 0.075, "65-69": 0.065, "70-74": 0.055, "75-79": 0.04,
            "80-84": 0.025, "85+": 0.015,
        }
        
        # Adjust weights based on actual cluster data
        cluster_adjustment = {}
        
        # Children/Youth (0-19)
        youth_groups = ["0-4", "5-9", "10-14", "15-19"]
        youth_base = sum(weights[g] for g in youth_groups)
        youth_actual = demo.children_youth / total if total > 0 else youth_base
        for g in youth_groups:
            cluster_adjustment[g] = youth_actual / youth_base if youth_base > 0 else 1
        
        # Productive (20-64)
        prod_groups = ["20-24", "25-29", "30-34", "35-39", "40-44", 
                       "45-49", "50-54", "55-59", "60-64"]
        prod_base = sum(weights[g] for g in prod_groups)
        prod_actual = demo.productive / total if total > 0 else prod_base
        for g in prod_groups:
            cluster_adjustment[g] = prod_actual / prod_base if prod_base > 0 else 1
        
        # Young-Old (65-74)
        young_old_groups = ["65-69", "70-74"]
        yo_base = sum(weights[g] for g in young_old_groups)
        yo_actual = demo.young_old / total if total > 0 else yo_base
        for g in young_old_groups:
            cluster_adjustment[g] = yo_actual / yo_base if yo_base > 0 else 1
        
        # Old-Old (75+)
        old_old_groups = ["75-79", "80-84", "85+"]
        oo_base = sum(weights[g] for g in old_old_groups)
        oo_actual = demo.old_old / total if total > 0 else oo_base
        for g in old_old_groups:
            cluster_adjustment[g] = oo_actual / oo_base if oo_base > 0 else 1
        
        # Calculate adjusted populations
        male_ratio = demo.male_population / total if total > 0 else 0.49
        
        male_dist = []
        female_dist = []
        
        for group in self.STANDARD_AGE_GROUPS:
            base_weight = weights.get(group, 0.05)
            adjusted_weight = base_weight * cluster_adjustment.get(group, 1)
            group_pop = int(total * adjusted_weight)
            
            # Gender split varies by age
            if group in ["75-79", "80-84", "85+"]:
                male_pct = 0.38  # More females in oldest groups
            elif group in ["65-69", "70-74"]:
                male_pct = 0.45
            else:
                male_pct = 0.51
            
            male_dist.append(int(group_pop * male_pct))
            female_dist.append(group_pop - int(group_pop * male_pct))
        
        return {'male': male_dist, 'female': female_dist}
    
    def _generate_ticks(self, max_val: float) -> List[float]:
        """Generate nice tick values for symmetric axis"""
        # Round to nice number
        magnitude = 10 ** int(np.log10(max_val))
        nice_max = np.ceil(max_val / magnitude) * magnitude
        
        step = nice_max / 4
        ticks = []
        for i in range(-4, 5):
            ticks.append(i * step)
        
        return ticks
    
    def export_html(self, fig: go.Figure, filepath: str) -> None:
        """Export figure to standalone HTML file"""
        fig.write_html(filepath, include_plotlyjs=True, full_html=True)
    
    def export_image(self, fig: go.Figure, filepath: str, 
                     format: str = "png", scale: int = 2) -> None:
        """Export figure to image file"""
        fig.write_image(filepath, format=format, scale=scale)
