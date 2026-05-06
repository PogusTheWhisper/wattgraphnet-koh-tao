import numpy as np
import pandas as pd

import matplotlib.pyplot as plt
from matplotlib import font_manager
import matplotlib.dates as mdates
import pandas as pd

def compute_station_metrics(df_eval: pd.DataFrame, station_weights_df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute MAE, MSE, RMSE, and WAPE per station, plus a global 'all_station' row.
    
    Parameters:
    - df_eval: DataFrame with columns ['station_name','Date','Electricity(kW)','Predicted(kW)']
    - station_weights_df: DataFrame with columns ['station_name','normalized_reverse_weight']
    
    Returns:
    - station_metrics: DataFrame with columns ['station_name','MAE','MSE','RMSE','WAPE']
      including one extra row where station_name == 'all_station'
    """
    # 1) Merge predictions with weights
    df = df_eval.merge(station_weights_df, on='station_name')
    
    # 2) Metric helper
    def compute_metrics(g: pd.DataFrame) -> pd.Series:
        errors  = g['Predicted(kW)'] - g['Electricity(kW)']
        abs_err = errors.abs()
        sq_err  = errors.pow(2)
        w       = g['normalized_reverse_weight']
        mae     = abs_err.mean()
        mse     = sq_err.mean()
        rmse    = np.sqrt(mse)
        denom   = (w * g['Electricity(kW)']).sum()
        wape    = (w * abs_err).sum() / denom if denom != 0 else np.nan
        return pd.Series({'MAE': mae, 'MSE': mse, 'RMSE': rmse, 'WAPE': wape})
    
    # 3) Per-station metrics
    station_metrics = (
        df
        .groupby('station_name')
        .apply(compute_metrics)
        .reset_index()
    )
    
    # 4) Global metrics ("all_station")
    global_series = compute_metrics(df)
    global_series['station_name'] = 'all_station'
    global_df     = global_series.to_frame().T
    global_df     = global_df[['station_name','MAE','MSE','RMSE','WAPE']]
    
    # 5) Append and return
    station_metrics = pd.concat([station_metrics, global_df], ignore_index=True)
    return station_metrics



def plot_all_stations_with_overall(df_eval, metrics_df, font_path='Prompt_Font/Prompt-Regular.ttf'):
    """
    Plots actual vs predicted, residuals, and metrics for each station,
    with all subplots sharing the global date range.
    """
    # Register Thai font
    font_manager.fontManager.addfont(font_path)
    thai_fp = font_manager.FontProperties(fname=font_path)
    plt.rcParams['font.family'] = thai_fp.get_name()
    
    # Prepare data
    df = df_eval.copy()
    df['Date'] = pd.to_datetime(df['Date'])
    stations = [s for s in df['station_name'].unique() if s != 'all_station']
    n = len(stations)
    
    # Compute global date range
    min_date = df['Date'].min()
    max_date = df['Date'].max()
    
    # Create a figure with n+1 rows × 3 columns and custom width ratios
    fig, axes = plt.subplots(n+1, 3, figsize=(24, 3*(n+1)),
                             gridspec_kw={'width_ratios': [4, 2, 1]})
    fig.suptitle("การเปรียบเทียบจริง vs คาดการณ์, Residuals, และสถิติความแม่นยำ\n(รวมสถิติ all_station แถวล่างสุด)", 
                 fontsize=18, fontproperties=thai_fp, y=1.02)
    
    # Date formatting
    locator = mdates.AutoDateLocator(minticks=20, maxticks=50)
    formatter = mdates.ConciseDateFormatter(locator)
    
    # Plot each station
    for i, station in enumerate(stations):
        sub = df[df['station_name'] == station]
        dates = sub['Date']
        actual = sub['Electricity(kW)']
        pred   = sub['Predicted(kW)']
        resid  = pred - actual
        
        # Left: Actual vs Predicted
        ax1 = axes[i, 0]
        ax1.plot(dates, actual, label='จริง', linewidth=2)
        ax1.plot(dates, pred, linestyle='--', label='คาดการณ์', linewidth=1.5)
        ax1.set_xlim(min_date, max_date)
        ax1.set_ylabel('กำลังไฟ (kW)', fontproperties=thai_fp)
        ax1.set_title(f"สถานี: {station}", fontproperties=thai_fp, loc='left', fontsize=12)
        ax1.legend(prop=thai_fp, fontsize=10)
        ax1.grid(alpha=0.3)
        ax1.xaxis.set_major_locator(locator)
        ax1.xaxis.set_major_formatter(formatter)
        
        # Middle: Residuals
        ax2 = axes[i, 1]
        ax2.plot(dates, resid, label='Residual', linewidth=1.5)
        ax2.set_xlim(min_date, max_date)
        ax2.set_ylabel('Residual (kW)', fontproperties=thai_fp)
        if i == n-1:
            ax2.set_xlabel('เวลา', fontproperties=thai_fp)
        ax2.legend(prop=thai_fp, fontsize=10)
        ax2.grid(alpha=0.3)
        ax2.xaxis.set_major_locator(locator)
        ax2.xaxis.set_major_formatter(formatter)
        
        # Right: Station metrics
        ax3 = axes[i, 2]
        ax3.axis('off')
        m = metrics_df[metrics_df['station_name'] == station].iloc[0]
        text = (
            f"MAE:   {m['MAE']:.2f}\n"
            f"MSE:   {m['MSE']:.2f}\n"
            f"RMSE:  {m['RMSE']:.2f}\n"
            f"WAPE:  {m['WAPE']:.2f}"
        )
        ax3.text(0.05, 0.5, text, fontproperties=thai_fp, va='center', ha='left', fontsize=11,
                 bbox=dict(boxstyle='round', facecolor='white', edgecolor='black', linewidth=1))
    
    # Bottom row: overall all_station metrics
    ax3 = axes[n, 2]
    ax3.axis('off')
    m_all = metrics_df[metrics_df['station_name'] == 'all_station'].iloc[0]
    overall_text = (
        f"All Stations Metrics\n"
        f"MAE:   {m_all['MAE']:.2f}\n"
        f"MSE:   {m_all['MSE']:.2f}\n"
        f"RMSE:  {m_all['RMSE']:.2f}\n"
        f"WAPE:  {m_all['WAPE']:.2f}"
    )
    ax3.text(0.05, 0.5, overall_text, fontproperties=thai_fp, va='center', ha='left', fontsize=12,
             bbox=dict(boxstyle='round', facecolor='lightgrey', edgecolor='black', linewidth=1))
    
    plt.tight_layout()
    plt.show()


import matplotlib.pyplot as plt
from matplotlib import font_manager
import matplotlib.dates as mdates
import pandas as pd

def plot_all_stations_with_daily_ticks(df_eval, metrics_df, font_path='Prompt_Font/Prompt-Regular.ttf', 
                                     show_daily_grid=True, daily_tick_interval=1):
    """
    Plots actual vs predicted, residuals, and metrics for each station,
    with enhanced daily tick marks and customizable grid options.
    
    Parameters:
    -----------
    df_eval : DataFrame
        Evaluation data with columns: Date, station_name, Electricity(kW), Predicted(kW)
    metrics_df : DataFrame
        Metrics data with columns: station_name, MAE, MSE, RMSE, WAPE
    font_path : str
        Path to Thai font file
    show_daily_grid : bool
        Whether to show daily grid lines
    daily_tick_interval : int
        Interval for daily ticks (1 = every day, 2 = every 2 days, etc.)
    """
    # Register Thai font
    try:
        font_manager.fontManager.addfont(font_path)
        thai_fp = font_manager.FontProperties(fname=font_path)
        plt.rcParams['font.family'] = thai_fp.get_name()
    except:
        # Fallback to default font if Thai font not available
        thai_fp = font_manager.FontProperties()
        print("Warning: Thai font not found, using default font")
    
    # Prepare data
    df = df_eval.copy()
    df['Date'] = pd.to_datetime(df['Date'])
    stations = [s for s in df['station_name'].unique() if s != 'all_station']
    n = len(stations)
    
    # Create figure with better spacing
    fig, axes = plt.subplots(n+1, 3, figsize=(28, 4*(n+1)),
                             gridspec_kw={'width_ratios': [5, 3, 1.5]})
    fig.suptitle(
        "การเปรียบเทียบจริง vs คาดการณ์, Residuals, และสถิติความแม่นยำ\n"
        "(รวมสถิติ all_station แถวล่างสุด)",
        fontsize=20, fontproperties=thai_fp, y=0.98
    )
    
    # Enhanced tick locators and formatters
    daily_locator = mdates.DayLocator(interval=daily_tick_interval)
    monday_locator = mdates.WeekdayLocator(byweekday=mdates.MO, interval=1)
    monday_formatter = mdates.DateFormatter('%m-%d')
    daily_formatter = mdates.DateFormatter('%d')
    
    # Color scheme for better visibility
    actual_color = '#2E86AB'
    pred_color = '#A23B72'
    residual_color = '#F18F01'
    
    for i, station in enumerate(stations):
        sub = df[df['station_name'] == station]
        dates = sub['Date']
        actual = sub['Electricity(kW)']
        pred = sub['Predicted(kW)']
        resid = pred - actual
        
        start_date = dates.min()
        end_date = dates.max()
        
        # Helper to style axes with enhanced daily ticks
        def style_axis(ax, show_xlabel=False):
            ax.set_xlim(start_date, end_date)
            
            # Set daily minor ticks
            ax.xaxis.set_minor_locator(daily_locator)
            ax.xaxis.set_major_locator(monday_locator)
            ax.xaxis.set_major_formatter(monday_formatter)
            
            # Style the ticks
            ax.tick_params(axis='x', which='minor', length=3, width=0.5, color='gray')
            ax.tick_params(axis='x', which='major', length=6, width=1, 
                          labelsize=9, rotation=45, color='black')
            
            # Add daily grid if requested
            if show_daily_grid:
                ax.grid(True, which='minor', alpha=0.2, linestyle='-', linewidth=0.5)
                ax.grid(True, which='major', alpha=0.4, linestyle='-', linewidth=0.8)
            else:
                ax.grid(True, which='major', alpha=0.3)
            
            if show_xlabel:
                ax.set_xlabel('วันที่ (เดือน-วัน)', fontproperties=thai_fp, fontsize=11)
        
        # --- Left: Actual vs Predicted ---
        ax1 = axes[i, 0]
        ax1.plot(dates, actual, label='ค่าจริง', linewidth=2.5, color=actual_color, alpha=0.8)
        ax1.plot(dates, pred, linestyle='--', label='ค่าคาดการณ์', 
                linewidth=2, color=pred_color, alpha=0.9)
        ax1.set_ylabel('กำลังไฟฟ้า (kW)', fontproperties=thai_fp, fontsize=11)
        ax1.set_title(f"สถานี: {station}", fontproperties=thai_fp,
                      loc='left', fontsize=13, pad=10)
        ax1.legend(prop=thai_fp, fontsize=10, loc='upper right')
        
        # Add value range info
        y_range = actual.max() - actual.min()
        ax1.text(0.02, 0.98, f'Range: {y_range:.1f} kW', 
                transform=ax1.transAxes, fontproperties=thai_fp,
                bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.8),
                fontsize=9, va='top')
        
        style_axis(ax1, show_xlabel=(i == n-1))
        
        # --- Middle: Residuals ---
        ax2 = axes[i, 1]
        ax2.plot(dates, resid, label='ค่าความคลาดเคลื่อน', 
                linewidth=2, color=residual_color, alpha=0.8)
        ax2.axhline(y=0, color='black', linestyle='-', alpha=0.5, linewidth=1)
        ax2.set_ylabel('ความคลาดเคลื่อน (kW)', fontproperties=thai_fp, fontsize=11)
        ax2.legend(prop=thai_fp, fontsize=10)
        
        # Add residual statistics
        resid_mean = resid.mean()
        resid_std = resid.std()
        ax2.text(0.02, 0.98, f'Mean: {resid_mean:.2f}\nStd: {resid_std:.2f}', 
                transform=ax2.transAxes, fontproperties=thai_fp,
                bbox=dict(boxstyle='round,pad=0.3', facecolor='lightyellow', alpha=0.8),
                fontsize=9, va='top')
        
        style_axis(ax2, show_xlabel=(i == n-1))
        
        # --- Right: Station metrics ---
        ax3 = axes[i, 2]
        ax3.axis('off')
        m = metrics_df[metrics_df['station_name'] == station].iloc[0]
        
        # Enhanced metrics display
        metrics_text = (
            f"สถิติความแม่นยำ\n\n"
            f"MAE:   {m['MAE']:.2f} kW\n"
            f"MSE:   {m['MSE']:.0f}\n"
            f"RMSE:  {m['RMSE']:.2f} kW\n"
            f"WAPE:  {m['WAPE']:.2f}"
        )
        
        # Color-coded metrics box
        mae_color = 'lightgreen' if m['MAE'] < 50 else 'lightyellow' if m['MAE'] < 100 else 'lightcoral'
        
        ax3.text(0.05, 0.5, metrics_text,
                 fontproperties=thai_fp,
                 va='center', ha='left', fontsize=10,
                 bbox=dict(boxstyle='round,pad=0.5', facecolor=mae_color,
                           edgecolor='black', linewidth=1, alpha=0.8))
    
    # --- Bottom row: overall all_station metrics ---
    # Hide unused bottom plots
    axes[n, 0].axis('off')
    axes[n, 1].axis('off')
    
    ax_overall = axes[n, 2]
    ax_overall.axis('off')
    
    try:
        m_all = metrics_df[metrics_df['station_name'] == 'all_station'].iloc[0]
        overall_text = (
            f"สถิติรวมทุกสถานี\n\n"
            f"MAE:   {m_all['MAE']:.2f} kW\n"
            f"MSE:   {m_all['MSE']:.0f}\n"
            f"RMSE:  {m_all['RMSE']:.2f} kW\n"
            f"WAPE:  {m_all['WAPE']:.2f}"
        )
        
        ax_overall.text(0.05, 0.5, overall_text,
                        fontproperties=thai_fp, va='center',
                        ha='left', fontsize=12,
                        bbox=dict(boxstyle='round,pad=0.5',
                                  facecolor='lightblue',
                                  edgecolor='navy', linewidth=2, alpha=0.9))
    except IndexError:
        ax_overall.text(0.05, 0.5, "ไม่พบข้อมูลสถิติรวม",
                        fontproperties=thai_fp, va='center',
                        ha='left', fontsize=12)
    
    # Add date range info at the bottom
    date_range_text = f"ช่วงข้อมูล: {start_date.strftime('%Y-%m-%d')} ถึง {end_date.strftime('%Y-%m-%d')}"
    fig.text(0.5, 0.02, date_range_text, ha='center', fontproperties=thai_fp, 
             fontsize=12, bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.8))
    
    plt.tight_layout()
    plt.subplots_adjust(bottom=0.05, top=0.93)
    plt.show()




def plot_weekday_analysis(df_eval, metrics_df=None, font_path='Prompt_Font/Prompt-Regular.ttf'):
    """
    For each station, plot:
      - Left:  mean Actual vs Forecast by weekday (Mon→Sun)
      - Right: mean Residual by weekday
    """
    # 1) Prepare data
    df = df_eval.copy()
    df['Date'] = pd.to_datetime(df['Date'])
    # Extract weekday name and set as ordered categorical Mon–Sun
    weekdays = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
    df['weekday'] = pd.Categorical(df['Date'].dt.day_name(),
                                   categories=weekdays,
                                   ordered=True)
    df['residual'] = df['Predicted(kW)'] - df['Electricity(kW)']
    
    stations = [s for s in df['station_name'].unique() if s!='all_station']
    
    # 2) Aggregate by station & weekday
    agg = df.groupby(['station_name','weekday']).agg(
        actual_mean=('Electricity(kW)','mean'),
        pred_mean=('Predicted(kW)','mean'),
        resid_mean=('residual','mean')
    ).reset_index()
    
    # 3) Plot
    n = len(stations)
    fig, axes = plt.subplots(n, 2, figsize=(12, 3*n), sharex=True)
    
    for i, station in enumerate(stations):
        sub = agg[agg['station_name']==station]
        ax1, ax2 = axes[i]
        
        # Left: Actual vs Forecast
        ax1.plot(sub['weekday'], sub['actual_mean'], label='จริง',   linewidth=2)
        ax1.plot(sub['weekday'], sub['pred_mean'],   label='คาดการณ์', linestyle='--', linewidth=1.5)
        ax1.set_title(f"สถานี: {station}", loc='left')
        ax1.set_ylabel('กำลังไฟเฉลี่ย (kW)')
        ax1.legend()
        ax1.grid(alpha=0.3)
        
        # Right: Residual
        ax2.bar(sub['weekday'], sub['resid_mean'])
        ax2.set_title("Residual by Weekday", loc='left')
        ax2.set_ylabel('Residual เฉลี่ย (kW)')
        ax2.grid(alpha=0.3, axis='y')
    
    # Final formatting
    for ax in axes[-1]:
        ax.set_xlabel('วันในสัปดาห์')
        for label in ax.get_xticklabels():
            label.set_rotation(45)
    
    plt.tight_layout()
    plt.show()












import matplotlib.pyplot as plt
from matplotlib import font_manager
import matplotlib.dates as mdates
import pandas as pd

def plot_weekly_analysis_combined(df_eval, metrics_df, font_path='Prompt_Font/Prompt-Regular.ttf'):
    """
    One big figure:
      - rows = number of stations
      - cols = 2 (Actual vs Predicted | Residual)
    """
    # Register Thai font
    font_manager.fontManager.addfont(font_path)
    thai_fp = font_manager.FontProperties(fname=font_path)
    plt.rcParams['font.family'] = thai_fp.get_name()

    # Prepare data
    df = df_eval.copy()
    df['Date'] = pd.to_datetime(df['Date'])
    stations = [s for s in df['station_name'].unique() if s != 'all_station']
    n = len(stations)

    # Locators & formatters
    hour_locator = mdates.HourLocator(interval=6)
    hour_fmt     = mdates.DateFormatter('%H:%M\n%a')

    # Create combined figure
    fig, axes = plt.subplots(n, 2, figsize=(30, 6 * n), sharex=False, sharey=False)
    fig.suptitle("Weekly Analysis per Station", fontproperties=thai_fp, fontsize=18, y=0.98)

    def style_week_axis(ax, week_start, week_end):
        ax.set_xlim(week_start, week_end)
        ax.xaxis.set_major_locator(hour_locator)
        ax.xaxis.set_major_formatter(hour_fmt)
        ax.tick_params(axis='x', which='major', length=8, labelsize=8, rotation=0)
        ax.xaxis.set_minor_locator(mdates.MinuteLocator(byminute=[30]))
        ax.tick_params(axis='x', which='minor', length=3)
        ax.grid(alpha=0.3)

    for i, station in enumerate(stations):
        sub = df[df['station_name'] == station].set_index('Date').sort_index()

        # Find week boundaries
        dates_norm = sub.index.normalize().unique()
        mondays = [d for d in dates_norm if d.weekday() == 0]
        if not mondays:
            print(f"No Monday found for {station}; skipping.")
            continue
        week_start = mondays[0]
        week_end   = week_start + pd.Timedelta(days=6, hours=23)

        week_df = sub.loc[week_start:week_end]
        dates  = week_df.index
        actual = week_df['Electricity(kW)']
        pred   = week_df['Predicted(kW)']
        resid  = pred - actual

        ax1, ax2 = axes[i]

        # Left: Actual vs Predicted
        ax1.plot(dates, actual, label='จริง',   linewidth=2)
        ax1.plot(dates, pred,   linestyle='--', label='คาดการณ์', linewidth=1.5)
        ax1.set_ylabel('กำลังไฟ (kW)', fontproperties=thai_fp)
        ax1.set_title(f"{station}", fontproperties=thai_fp, fontsize=12, pad=10)
        ax1.legend(prop=thai_fp, fontsize=9)
        style_week_axis(ax1, week_start, week_end)

        # Overlay metrics box
        m = metrics_df.query("station_name == @station").iloc[0]
        metrics_text = (
            f"MAE:  {m['MAE']:.2f}\n"
            f"MSE:  {m['MSE']:.2f}\n"
            f"RMSE: {m['RMSE']:.2f}\n"
            f"WAPE: {m['WAPE']:.2f}"
        )
        ax1.text(0.98, 0.95, metrics_text,
                 transform=ax1.transAxes,
                 fontproperties=thai_fp,
                 va='top', ha='right', fontsize=8,
                 bbox=dict(boxstyle='round', facecolor='white', edgecolor='black'))

        # Right: Residuals
        ax2.plot(dates, resid, label='Residual', linewidth=1.5)
        ax2.set_ylabel('Residual (kW)', fontproperties=thai_fp)
        ax2.set_xlabel('วันในสัปดาห์', fontproperties=thai_fp)
        ax2.legend(prop=thai_fp, fontsize=9)
        style_week_axis(ax2, week_start, week_end)

    plt.tight_layout(rect=[0, 0, 1, 0.96])
    plt.show()