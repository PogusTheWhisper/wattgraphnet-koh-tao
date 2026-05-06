"""
AutoGluon training script for WattGraphNet project.
This script provides a simple interface to train AutoGluon models.
"""

import pandas as pd
import numpy as np
from pathlib import Path
import argparse
import sys

# Add src to path for imports
sys.path.append(str(Path(__file__).parent))

from config import *
from utils_common import *

try:
    from autogluon.timeseries import TimeSeriesDataFrame, TimeSeriesPredictor
except ImportError:
    print("AutoGluon not installed. Please install with: pip install autogluon")
    sys.exit(1)

def prepare_timeseries_data(df: pd.DataFrame, 
                           target_col: str = 'demand',
                           item_id_col: str = 'building',
                           timestamp_col: str = 'datetime') -> TimeSeriesDataFrame:
    """
    Prepare data for AutoGluon TimeSeriesPredictor.
    
    Args:
        df: Input DataFrame
        target_col: Target column name
        item_id_col: Item ID column name  
        timestamp_col: Timestamp column name
        
    Returns:
        TimeSeriesDataFrame ready for AutoGluon
    """
    # Ensure proper column names
    df_prepared = df.copy()
    
    # Rename columns to AutoGluon expected format
    column_mapping = {
        timestamp_col: 'timestamp',
        item_id_col: 'item_id', 
        target_col: 'target'
    }
    
    for old_col, new_col in column_mapping.items():
        if old_col in df_prepared.columns:
            df_prepared = df_prepared.rename(columns={old_col: new_col})
    
    # Ensure timestamp is datetime
    df_prepared['timestamp'] = pd.to_datetime(df_prepared['timestamp'])
    
    # Create TimeSeriesDataFrame
    ts_df = TimeSeriesDataFrame(df_prepared)
    
    logger.info(f"TimeSeriesDataFrame created with shape: {ts_df.shape}")
    logger.info(f"Items: {ts_df.item_ids}")
    logger.info(f"Time range: {ts_df.timestamp.min()} to {ts_df.timestamp.max()}")
    
    return ts_df

def train_autogluon_model(train_data: TimeSeriesDataFrame,
                         model_path: str,
                         config: dict = None) -> TimeSeriesPredictor:
    """
    Train AutoGluon TimeSeriesPredictor.
    
    Args:
        train_data: Training data
        model_path: Path to save the model
        config: Model configuration
        
    Returns:
        Trained predictor
    """
    if config is None:
        config = AUTOGLUON_CONFIG
    
    logger.info("Starting AutoGluon training...")
    logger.info(f"Configuration: {config}")
    
    # Create predictor
    predictor = TimeSeriesPredictor(
        path=model_path,
        target='target',
        prediction_length=config['prediction_length'],
        eval_metric=config['eval_metric']
    )
    
    # Train model
    predictor.fit(
        train_data=train_data,
        time_limit=config['time_limit'],
        presets=config['presets'],
        hyperparameters={
            'TemporalFusionTransformer': {},
            'DeepAR': {},
            'PatchTST': {},
        }
    )
    
    logger.info("AutoGluon training completed!")
    
    return predictor

def evaluate_model(predictor: TimeSeriesPredictor,
                  test_data: TimeSeriesDataFrame) -> dict:
    """
    Evaluate trained model on test data.
    
    Args:
        predictor: Trained predictor
        test_data: Test data
        
    Returns:
        Dictionary of evaluation metrics
    """
    logger.info("Evaluating model...")
    
    # Make predictions
    predictions = predictor.predict(test_data)
    
    # Get leaderboard
    leaderboard = predictor.leaderboard(test_data, silent=True)
    
    logger.info("Model evaluation completed!")
    logger.info(f"Leaderboard:\n{leaderboard}")
    
    return {
        'predictions': predictions,
        'leaderboard': leaderboard,
        'best_model': leaderboard.iloc[0]['model'],
        'best_score': leaderboard.iloc[0]['score_val']
    }

def main():
    """Main training function."""
    parser = argparse.ArgumentParser(description='Train AutoGluon models for load forecasting')
    parser.add_argument('--data_path', type=str, default=str(ALL_DATA_TIMESERIES),
                       help='Path to training data CSV file')
    parser.add_argument('--model_path', type=str, default=str(AUTOGLUON_MODELS_DIR / 'new_model'),
                       help='Path to save the trained model')
    parser.add_argument('--time_limit', type=int, default=600,
                       help='Training time limit in seconds')
    parser.add_argument('--prediction_length', type=int, default=12,
                       help='Prediction horizon length')
    parser.add_argument('--context_length', type=int, default=12,
                       help='Context length for training')
    
    args = parser.parse_args()
    
    # Load data
    logger.info(f"Loading data from {args.data_path}")
    df = load_data(args.data_path)
    
    # Prepare data for AutoGluon
    ts_data = prepare_timeseries_data(df)
    
    # Split data
    train_size = int(len(ts_data) * TRAINING_CONFIG['train_split'])
    train_data = ts_data.iloc[:train_size]
    test_data = ts_data.iloc[train_size:]
    
    logger.info(f"Train data: {len(train_data)} samples")
    logger.info(f"Test data: {len(test_data)} samples")
    
    # Update config with command line arguments
    config = AUTOGLUON_CONFIG.copy()
    config.update({
        'time_limit': args.time_limit,
        'prediction_length': args.prediction_length,
        'context_length': args.context_length
    })
    
    # Train model
    predictor = train_autogluon_model(train_data, args.model_path, config)
    
    # Evaluate model
    results = evaluate_model(predictor, test_data)
    
    # Save results
    results_path = RESULTS_DIR / 'metrics' / 'autogluon_results.csv'
    save_results(results['leaderboard'], 'autogluon_leaderboard.csv', RESULTS_DIR / 'metrics')
    
    logger.info(f"Training completed! Model saved to {args.model_path}")
    logger.info(f"Best model: {results['best_model']} with score: {results['best_score']}")

if __name__ == "__main__":
    main()