# Quick Start Guide

This guide will help you get started with WattGraphNet quickly.

## 🚀 Setup (5 minutes)

### 1. Environment Setup
```bash
# Create conda environment
conda create -n wattgraphnet python=3.11
conda activate wattgraphnet

# Install PyTorch
conda install conda-forge::pytorch

# Install PyTorch Geometric
pip install torch_geometric
pip install pyg_lib torch_scatter torch_sparse torch_cluster torch_spline_conv -f https://data.pyg.org/whl/torch-2.7.0+cu128.html

# Install other dependencies
pip install -r requirements.txt
```

### 2. Verify Installation
```python
import torch
import torch_geometric
print(f"PyTorch: {torch.__version__}")
print(f"PyTorch Geometric: {torch_geometric.__version__}")
print(f"CUDA Available: {torch.cuda.is_available()}")
```

## 📊 Data Exploration (10 minutes)

### 1. Start with EDA
```bash
jupyter notebook notebooks/eda.ipynb
```

Key insights you'll discover:
- 📈 **Temporal Patterns**: Daily, weekly, and seasonal trends
- 🏢 **Building Profiles**: Different consumption patterns per building
- 🔗 **Correlations**: Relationships between buildings and time factors

### 2. Check Data Quality
The EDA notebook will show you:
- Missing data patterns
- Outlier detection
- Data distribution analysis

## 🤖 Model Training (15 minutes)

### Option 1: Quick AutoGluon Training
```bash
jupyter notebook notebooks/full_pipeline.ipynb
```

This will:
- ✅ Load preprocessed data
- ✅ Train multiple models automatically
- ✅ Compare performance
- ✅ Save best model

### Option 2: WattGraphNet Experiments
```bash
jupyter notebook notebooks/experiment_WattGraphNet_Attention.ipynb
```

This focuses on:
- 🧠 Graph neural network architecture
- 🎯 Attention mechanisms
- 📊 Spatial-temporal modeling

## 📈 Results Analysis (10 minutes)

### 1. Model Comparison
```bash
jupyter notebook notebooks/comparision.ipynb
```

Compare:
- **AutoGluon Models**: TemporalFusionTransformer, DeepAR, PatchTST
- **Custom Models**: WattGraphNet variants
- **Baseline Models**: SeasonalNaive, DynamicOptimizedTheta

### 2. Error Analysis
```bash
jupyter notebook notebooks/error_analysis.ipynb
```

Analyze:
- 📊 **Performance Metrics**: MSE, MASE, accuracy
- 🕐 **Temporal Errors**: Hour-by-hour analysis
- 🏢 **Building-specific**: Per-building performance
- 📉 **Error Patterns**: Systematic vs random errors

## 🎯 Key Results to Expect

### Model Performance
- **Best MSE**: ~0.02-0.05 (normalized)
- **Best MASE**: ~0.15-0.25
- **Training Time**: 5-15 minutes per model

### Insights
- 🏆 **Best Model**: Usually TemporalFusionTransformer or WattGraphNet
- ⏰ **Peak Hours**: Higher errors during demand peaks
- 🏢 **Building Variance**: Some buildings more predictable than others

## 🔍 Interactive Visualizations

### 1. Graph Map
Open `results/visualizations/graph_map.html` in your browser to see:
- 🗺️ **Spatial Relationships**: Building locations and connections
- 📊 **Load Patterns**: Interactive time series plots
- 🔗 **Graph Structure**: Adjacency matrix visualization

### 2. Results Dashboard
Open `results/visualizations/index.html` for:
- 📈 **Performance Metrics**: Model comparison charts
- 🎯 **Prediction Accuracy**: Actual vs predicted plots
- 📊 **Error Distribution**: Statistical analysis

## 🛠️ Troubleshooting

### Common Issues

1. **CUDA Out of Memory**
   ```python
   # Reduce batch size in model config
   batch_size = 32  # Instead of 64
   ```

2. **PyTorch Geometric Installation**
   ```bash
   # For CPU-only
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
   pip install torch_geometric
   ```

3. **Missing Data Files**
   - Check `data/preprocessed/` for CSV files
   - Run data preprocessing if files are missing

### Performance Tips

1. **GPU Usage**: Ensure CUDA is available for faster training
2. **Memory**: Close other applications if running out of RAM
3. **Time Limits**: Adjust AutoGluon time limits based on your hardware

## 📞 Next Steps

After completing the quick start:

1. **Experiment**: Modify model parameters in the notebooks
2. **Custom Data**: Add your own building data to `data/raw/`
3. **Production**: Deploy the best model using `models/pytorch/best_model.pt`
4. **Research**: Read the paper in `docs/WattGraphNet-paper-en.pdf`

## 🎯 Expected Timeline

- **Setup**: 5 minutes
- **Data Exploration**: 10 minutes  
- **Model Training**: 15 minutes
- **Results Analysis**: 10 minutes
- **Total**: ~40 minutes to full results

Happy forecasting! 🚀