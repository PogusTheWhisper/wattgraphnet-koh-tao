"""
Common utility functions for WattGraphNet project.
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
import logging
from typing import Dict, List, Tuple, Optional, Union
import warnings
warnings.filterwarnings('ignore')

from config import *

def setup_logging():
    """Setup logging configuration."""
    LOGS_DIR.mkdir(exist_ok=True)
    logging.basicConfig(
        level=getattr(logging, LOGGING_CONFIG["level"]),
        format=LOGGING_CONFIG["format"],
        handlers=[
            logging.FileHandler(LOGGING_CONFIG["file"]),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)

def load_data(file_path: Union[str, Path]) -> pd.DataFrame:
    """
    Load data from CSV file with error handling.
    
    Args:
        file_path: Path to the CSV file
        
    Returns:
        DataFrame with loaded data
    """
    try:
        df = pd.read_csv(file_path)
        logging.info(f"Successfully loaded data from {file_path}")
        logging.info(f"Data shape: {df.shape}")
        return df
    except Exception as e:
        logging.error(f"Error loading data from {file_path}: {e}")
        raise

def save_results(data: Union[pd.DataFrame, Dict], 
                filename: str, 
                directory: Path = RESULTS_DIR) -> None:
    """
    Save results to file.
    
    Args:
        data: Data to save (DataFrame or Dict)
        filename: Name of the file
        directory: Directory to save to
    """
    directory.mkdir(exist_ok=True)
    filepath = directory / filename
    
    try:
        if isinstance(data, pd.DataFrame):
            data.to_csv(filepath, index=False)
        elif isinstance(data, dict):
            pd.DataFrame([data]).to_csv(filepath, index=False)
        logging.info(f"Results saved to {filepath}")
    except Exception as e:
        logging.error(f"Error saving results to {filepath}: {e}")
        raise

def calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """
    Calculate evaluation metrics.
    
    Args:
        y_true: True values
        y_pred: Predicted values
        
    Returns:
        Dictionary of metrics
    """
    from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
    
    metrics = {}
    
    # Basic metrics
    metrics['MSE'] = mean_squared_error(y_true, y_pred)
    metrics['RMSE'] = np.sqrt(metrics['MSE'])
    metrics['MAE'] = mean_absolute_error(y_true, y_pred)
    metrics['R2'] = r2_score(y_true, y_pred)
    
    # MAPE (handle division by zero)
    mask = y_true != 0
    if mask.any():
        metrics['MAPE'] = np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100
    else:
        metrics['MAPE'] = np.inf
    
    # MASE (Mean Absolute Scaled Error)
    if len(y_true) > 1:
        naive_forecast = np.roll(y_true, 1)[1:]  # Naive forecast (previous value)
        actual_values = y_true[1:]
        mae_naive = np.mean(np.abs(actual_values - naive_forecast))
        if mae_naive != 0:
            metrics['MASE'] = metrics['MAE'] / mae_naive
        else:
            metrics['MASE'] = np.inf
    else:
        metrics['MASE'] = np.inf
    
    return metrics

def plot_predictions(y_true: np.ndarray, 
                    y_pred: np.ndarray, 
                    title: str = "Predictions vs Actual",
                    save_path: Optional[Path] = None) -> None:
    """
    Plot predictions vs actual values.
    
    Args:
        y_true: True values
        y_pred: Predicted values  
        title: Plot title
        save_path: Path to save the plot
    """
    plt.style.use(VIZ_CONFIG["style"])
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=VIZ_CONFIG["figsize"])
    
    # Time series plot
    ax1.plot(y_true, label='Actual', color=VIZ_CONFIG["colors"][0])
    ax1.plot(y_pred, label='Predicted', color=VIZ_CONFIG["colors"][1])
    ax1.set_title(f'{title} - Time Series')
    ax1.set_xlabel('Time')
    ax1.set_ylabel('Value')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # Scatter plot
    ax2.scatter(y_true, y_pred, alpha=0.6, color=VIZ_CONFIG["colors"][2])
    min_val, max_val = min(y_true.min(), y_pred.min()), max(y_true.max(), y_pred.max())
    ax2.plot([min_val, max_val], [min_val, max_val], 'r--', alpha=0.8)
    ax2.set_title(f'{title} - Scatter Plot')
    ax2.set_xlabel('Actual')
    ax2.set_ylabel('Predicted')
    ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=VIZ_CONFIG["dpi"], bbox_inches='tight')
        logging.info(f"Plot saved to {save_path}")
    
    plt.show()

def create_time_features(df: pd.DataFrame, 
                        datetime_col: str = 'datetime') -> pd.DataFrame:
    """
    Create time-based features from datetime column.
    
    Args:
        df: Input DataFrame
        datetime_col: Name of datetime column
        
    Returns:
        DataFrame with additional time features
    """
    df = df.copy()
    
    # Ensure datetime column is datetime type
    df[datetime_col] = pd.to_datetime(df[datetime_col])
    
    # Extract time features
    df['hour'] = df[datetime_col].dt.hour
    df['day_of_week'] = df[datetime_col].dt.dayofweek
    df['day_of_month'] = df[datetime_col].dt.day
    df['month'] = df[datetime_col].dt.month
    df['quarter'] = df[datetime_col].dt.quarter
    df['year'] = df[datetime_col].dt.year
    
    # Cyclical encoding for periodic features
    df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
    df['day_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
    df['day_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
    df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
    df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
    
    # Weekend indicator
    df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
    
    logging.info("Time features created successfully")
    return df

def split_data(df: pd.DataFrame, 
               target_col: str,
               train_ratio: float = 0.7,
               val_ratio: float = 0.15) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Split data into train, validation, and test sets.
    
    Args:
        df: Input DataFrame
        target_col: Name of target column
        train_ratio: Ratio for training set
        val_ratio: Ratio for validation set
        
    Returns:
        Tuple of (train_df, val_df, test_df)
    """
    n = len(df)
    train_size = int(n * train_ratio)
    val_size = int(n * val_ratio)
    
    train_df = df[:train_size].copy()
    val_df = df[train_size:train_size + val_size].copy()
    test_df = df[train_size + val_size:].copy()
    
    logging.info(f"Data split - Train: {len(train_df)}, Val: {len(val_df)}, Test: {len(test_df)}")
    
    return train_df, val_df, test_df

def print_model_summary(metrics: Dict[str, float], model_name: str = "Model") -> None:
    """
    Print a formatted summary of model performance.
    
    Args:
        metrics: Dictionary of evaluation metrics
        model_name: Name of the model
    """
    print(f"\n{'='*50}")
    print(f"{model_name} Performance Summary")
    print(f"{'='*50}")
    
    for metric, value in metrics.items():
        if metric in ['MAPE']:
            print(f"{metric:>10}: {value:>10.2f}%")
        else:
            print(f"{metric:>10}: {value:>10.6f}")
    
    print(f"{'='*50}\n")

# Initialize logging when module is imported
logger = setup_logging()