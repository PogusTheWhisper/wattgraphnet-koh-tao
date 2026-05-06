# Project Structure

This document describes the organized structure of the WattGraphNet repository.

## Directory Structure

```
WattGraphNet/
├── 📊 data/                          # Data directory
│   ├── raw/                          # Raw data files
│   │   └── Load-data/                # Original Excel files
│   ├── cleaned/                      # Processed and cleaned data
│   │   └── cleaned_data/             # Building-specific cleaned datasets
│   └── preprocessed/                 # Model-ready datasets
│       ├── all_data_df.csv           # Combined dataframe
│       ├── all_data_timeseries.csv   # Time series format
│       ├── error_analysis_metrics_with_bestmodel.csv
│       └── preprocessed_data/        # Additional preprocessed files
│
├── 📓 notebooks/                     # Jupyter notebooks
│   ├── eda.ipynb                     # Exploratory data analysis
│   ├── full_pipeline.ipynb          # Complete training pipeline
│   ├── experiment_WattGraphNet_Attention.ipynb  # WattGraphNet experiments
│   ├── comparision.ipynb            # Model comparison
│   └── error_analysis.ipynb         # Error analysis and metrics
│
├── 🤖 models/                        # Trained models
│   ├── autogluon/                    # AutoGluon models
│   │   ├── ag_models_ctx12_pred12/   # Context 12, Prediction 12 models
│   │   ├── ag_models_ctx2_pred12/    # Context 2, Prediction 12 models
│   │   ├── AutogluonModels/          # Base AutoGluon models
│   │   └── Autogluon_ctx12_pred12/   # Additional AutoGluon models
│   └── pytorch/                      # PyTorch models
│       └── best_model.pt             # Best performing model
│
├── 🛠️ src/                          # Source code
│   ├── model/                        # Model implementations
│   └── utils/                        # Utility functions
│
├── 📈 results/                       # Results and analysis
│   └── visualizations/               # Charts and interactive maps
│       ├── graph_map.html            # Interactive graph visualization
│       └── index.html                # Results dashboard
│
├── 📋 logs/                          # Training logs (empty, ready for use)
│
├── 📄 docs/                          # Documentation
│   ├── SuperAISS5 Final Poster (1).pdf  # Project poster
│   ├── WattGraphNet-paper-en.pdf     # Research paper
│   └── PROJECT_STRUCTURE.md          # This file
│
├── 🎨 Prompt_Font/                   # Font resources
│
├── .gitattributes                    # Git attributes
├── .gitignore                        # Git ignore rules
├── README.md                         # Main project documentation
└── requirements.txt                  # Python dependencies
```

## File Organization Principles

### Data Files
- **Raw Data**: Original Excel files with daily demand reports
- **Cleaned Data**: Processed data with consistent formatting
- **Preprocessed Data**: Model-ready datasets in CSV format

### Model Files
- **AutoGluon Models**: Automated ML models with different configurations
- **PyTorch Models**: Custom neural network implementations
- **Best Model**: The top-performing model for deployment

### Notebooks
- **EDA**: Data exploration and visualization
- **Pipeline**: End-to-end training and evaluation
- **Experiments**: Model architecture experiments
- **Analysis**: Performance analysis and error investigation

### Source Code
- **Model**: Core model implementations
- **Utils**: Helper functions and utilities

### Results
- **Visualizations**: Interactive charts and maps
- **Metrics**: Performance evaluation results

## Usage Guidelines

1. **Data Processing**: Start with notebooks/eda.ipynb for data exploration
2. **Model Training**: Use notebooks/full_pipeline.ipynb for complete workflow
3. **Experimentation**: Modify notebooks/experiment_WattGraphNet_Attention.ipynb
4. **Evaluation**: Run notebooks/comparision.ipynb for model comparison
5. **Analysis**: Use notebooks/error_analysis.ipynb for detailed analysis

## Model Configurations

### AutoGluon Models
- **ctx12_pred12**: 12-hour context, 12-hour prediction
- **ctx2_pred12**: 2-hour context, 12-hour prediction

### Evaluation Metrics
- **Primary**: MSE (Mean Squared Error)
- **Secondary**: MASE (Mean Absolute Scaled Error)
- **Validation**: Multi-window backtesting

## Data Sources

The project uses electricity consumption data from:
- จามจุรี 9 (Chamchuri 9 Building)
- จามจุรี 4 (Chamchuri 4 Building)
- จุลจักรพงษ์ (Chulalongkorn Building)
- บรมราชกุมารี (Boromrajakumari Building)
- วิทยนิเวศน์ (Wittayanives Building)
- สถานีชาร์จ (Charging Station)