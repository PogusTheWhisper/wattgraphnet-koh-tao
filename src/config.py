"""
Configuration file for WattGraphNet project.
Contains all model parameters, data paths, and training settings.
"""

import os
from pathlib import Path

# Project paths
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
MODELS_DIR = PROJECT_ROOT / "models"
RESULTS_DIR = PROJECT_ROOT / "results"
LOGS_DIR = PROJECT_ROOT / "logs"

# Data paths
RAW_DATA_DIR = DATA_DIR / "raw"
CLEANED_DATA_DIR = DATA_DIR / "cleaned"
PREPROCESSED_DATA_DIR = DATA_DIR / "preprocessed"

# Model paths
AUTOGLUON_MODELS_DIR = MODELS_DIR / "autogluon"
PYTORCH_MODELS_DIR = MODELS_DIR / "pytorch"

# Results paths
VISUALIZATIONS_DIR = RESULTS_DIR / "visualizations"
METRICS_DIR = RESULTS_DIR / "metrics"

# Data files
ALL_DATA_DF = PREPROCESSED_DATA_DIR / "all_data_df.csv"
ALL_DATA_TIMESERIES = PREPROCESSED_DATA_DIR / "all_data_timeseries.csv"
ERROR_ANALYSIS_METRICS = PREPROCESSED_DATA_DIR / "error_analysis_metrics_with_bestmodel.csv"

# Model configurations
AUTOGLUON_CONFIG = {
    "time_limit": 600,  # 10 minutes
    "presets": "fast_training",
    "eval_metric": "MSE",
    "prediction_length": 12,
    "context_length": 12,
    "models": [
        "TemporalFusionTransformer",
        "DeepAR", 
        "PatchTST",
        "SeasonalNaive",
        "DynamicOptimizedTheta"
    ]
}

WATTGRAPHNET_CONFIG = {
    "input_dim": 1,
    "hidden_dim": 64,
    "output_dim": 1,
    "num_layers": 3,
    "num_heads": 8,
    "dropout": 0.1,
    "learning_rate": 0.001,
    "batch_size": 32,
    "epochs": 100,
    "patience": 10,
    "context_length": 12,
    "prediction_length": 12
}

# Training settings
TRAINING_CONFIG = {
    "train_split": 0.7,
    "val_split": 0.15,
    "test_split": 0.15,
    "random_seed": 42,
    "device": "cuda" if os.environ.get("CUDA_AVAILABLE", "true").lower() == "true" else "cpu"
}

# Building information
BUILDINGS = {
    "charging_station": "สถานีชาร์จ",
    "chamchuri_9": "อาคารจามจุรี 9", 
    "chamchuri_4": "อาคารจามจุรี4",
    "chulalongkorn": "อาคารจุลจักรพงษ์",
    "boromrajakumari": "อาคารบรมราชกุมารี",
    "wittayanives": "อาคารวิทยนิเวศน์"
}

# Visualization settings
VIZ_CONFIG = {
    "figsize": (12, 8),
    "dpi": 300,
    "style": "seaborn-v0_8",
    "colors": ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"],
    "save_format": "png"
}

# Logging configuration
LOGGING_CONFIG = {
    "level": "INFO",
    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    "file": LOGS_DIR / "wattgraphnet.log"
}

# Evaluation metrics
METRICS = [
    "MSE",      # Mean Squared Error
    "RMSE",     # Root Mean Squared Error  
    "MAE",      # Mean Absolute Error
    "MAPE",     # Mean Absolute Percentage Error
    "MASE",     # Mean Absolute Scaled Error
    "R2"        # R-squared
]

# Model comparison settings
COMPARISON_CONFIG = {
    "cross_validation_folds": 5,
    "backtesting_windows": 10,
    "significance_level": 0.05,
    "bootstrap_samples": 1000
}